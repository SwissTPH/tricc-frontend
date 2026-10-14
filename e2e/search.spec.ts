import { expect, test, type Page } from '@playwright/test'

/**
 * Project search and data dictionaries (feature/20261014-project-search-and-dictionaries.md):
 * the bar searches concepts, processes, activities and nodes at once; the Data dictionary tab
 * lists the dictionaries, a calculation's concept goes to the calculate one. Also the
 * "none of these" answer of a select.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? []
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve) => {
            if (!db.name) return resolve()
            const req = indexedDB.deleteDatabase(db.name)
            req.onsuccess = req.onerror = req.onblocked = () => resolve()
          }),
      ),
    )
    localStorage.clear()
  })
  await page.reload()
})

async function placeNode(page: Page, type: string): Promise<void> {
  const button = page.getByTestId(`add-${type}`)
  if ((await button.count()) === 0) await page.getByTestId('tab-nodes').click()
  await button.click()
}

async function newConcept(page: Page, name: string, display: string): Promise<void> {
  await page.getByTestId('field-name').fill(name)
  await page.getByTestId('concept-create').click()
  await page.getByTestId('concept-display').fill(display)
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('concept-dialog')).toHaveCount(0)
}

test('a calculation concept goes to the calculate dictionary, listed next to the default one', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Dictionaries')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()

  await placeNode(page, 'decimal')
  await newConcept(page, 'weight_kg', 'Weight')
  await placeNode(page, 'calculate')
  await page.getByTestId('field-name').fill('weight_for_age')
  await page.getByTestId('concept-create').click()
  // The node's own dictionary is chosen; every dictionary is offered.
  const choice = page.getByTestId('concept-dictionary')
  await expect(choice.locator('option')).toHaveCount(2)
  await expect(choice.locator('option:checked')).toContainText('calculations and diagnoses')
  await page.getByTestId('concept-display').fill('Weight for age')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('node-n-calculate-label')).toHaveText('Weight for age')

  await page.getByTestId('tab-dictionary').click()
  const chips = page.getByTestId('dictionary-list').locator('button')
  await expect(chips).toHaveCount(2)
  await expect(chips.first()).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('concept-row-weight_kg')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_for_age')).toHaveCount(0)
  await page.locator('[data-dictionary="calculate"]').click()
  await expect(page.getByTestId('dictionary-calculate-note')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_for_age')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_kg')).toHaveCount(0)
})

test('the project search shows hits by source and opens a node', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Search')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('new-activity-name').fill('Weight check')
  await page.getByTestId('create-activity').click()
  await placeNode(page, 'decimal')
  await newConcept(page, 'weight_kg', 'Weight')

  // The list filter moved to the list row; the bar searches the project.
  await expect(page.getByTestId('activity-search')).toBeVisible()
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('project-search').fill('WEIGHT')
  await page.getByTestId('project-search').press('Enter')
  const results = page.getByTestId('project-search-results')
  await expect(results.getByTestId('project-search-concepts')).toContainText('Data dictionary (1)')
  await expect(results.getByTestId('project-search-activities')).toContainText('Weight check')
  await expect(results.getByTestId('project-search-nodes')).toContainText('Weight')
  await results.getByTestId('search-hit-node-weight-check-n-decimal').click()
  await expect(results).toHaveCount(0)
  await expect(page.getByTestId('field-name')).toHaveValue('weight_kg')

  await page.getByTestId('project-search').fill('nothing like this')
  await page.getByTestId('project-search').press('Enter')
  await expect(page.getByTestId('project-search-none')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('project-search-results')).toHaveCount(0)
})

test('one answer of a select can be "none of these", from the question or the answer', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('None answer')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await placeNode(page, 'select_multiple')
  await page.getByTestId('field-name').fill('danger_signs')
  for (const [code, display] of [
    ['convulsions', 'Convulsions'],
    ['no_sign', 'None of these signs'],
  ]) {
    await page.getByTestId('add-option-new').click()
    await page.getByTestId('concept-code').fill(code!)
    await page.getByTestId('concept-display').fill(display!)
    await page.getByTestId('concept-dialog-save').click()
    await expect(page.getByTestId('concept-dialog')).toHaveCount(0)
  }
  const none = page.getByTestId('field-none-option')
  await expect(none).toHaveValue('')
  const boxes = page.locator('[data-testid^="option-none-"]')
  await expect(boxes).toHaveCount(2)

  // From the question: the answer is marked, on the panel and on the node.
  await none.selectOption({ label: 'None of these signs' })
  await expect(boxes.nth(1)).toBeChecked()
  await expect(boxes.nth(0)).not.toBeChecked()
  await expect(page.locator('.tricc-node__answer-none')).toHaveCount(1)

  // From the answer: only one at a time.
  await boxes.nth(0).check()
  await expect(boxes.nth(1)).not.toBeChecked()
  await expect(none.locator('option:checked')).toHaveText('Convulsions')
  await boxes.nth(0).uncheck()
  await expect(none).toHaveValue('')
  await expect(page.locator('.tricc-node__answer-none')).toHaveCount(0)
})

test('repeat and instance are offered on every node holding a value, and on the activity', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Repeats')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()

  // A calculation: both fields, and badges on the node.
  await placeNode(page, 'calculate')
  await page.getByTestId('field-repeat').fill('2')
  await page.getByTestId('field-instance').fill('3')
  await expect(page.getByTestId('node-n-calculate-repeat')).toHaveText('Repeat 2')
  await expect(page.getByTestId('node-n-calculate-instance')).toHaveText('Instance 3')
  await page.getByTestId('field-instance').fill('')
  await expect(page.getByTestId('node-n-calculate-instance')).toHaveCount(0)

  // A decision is only a node: neither.
  await placeNode(page, 'rhombus')
  await expect(page.getByTestId('field-repeat')).toHaveCount(0)
  await expect(page.getByTestId('field-instance')).toHaveCount(0)

  // The activity start: in the activity settings.
  await page.getByTestId('configure-activity').click()
  await page.getByTestId('activity-settings').getByTestId('field-repeat').fill('-1')
  await page.getByTestId('activity-settings-save').click()
  await page.getByTestId('configure-activity').click()
  await expect(page.getByTestId('activity-settings').getByTestId('field-repeat')).toHaveValue('-1')
})
