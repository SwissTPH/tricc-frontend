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

test('a calculation concept goes to the calculate dictionary, listed next to the default one', async ({
  page,
}) => {
  await page.getByTestId('new-project').click()
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
  await expect(chips).toHaveCount(3)
  await expect(chips.first()).toHaveAttribute('aria-current', 'true')
  await expect(page.getByTestId('concept-row-weight_kg')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_for_age')).toHaveCount(0)
  await page.locator('[data-dictionary="calculate"]').click()
  await expect(page.getByTestId('dictionary-calculate-note')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_for_age')).toBeVisible()
  await expect(page.getByTestId('concept-row-weight_kg')).toHaveCount(0)
})

test('the project search shows hits by source and opens a node', async ({ page }) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Search')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('new-activity-name').fill('Weight check')
  await page.getByTestId('create-activity').click()
  await placeNode(page, 'decimal')
  await newConcept(page, 'weight_kg', 'Weight')

  // The bar searches the project.
  await page.getByTestId('nav-overview').click()
  // Selecting the bar opens the command palette, focused on its query.
  await page.getByTestId('project-search').click()
  await expect(page.getByTestId('project-search-input')).toBeFocused()
  await page.getByTestId('project-search-input').fill('WEIGHT')
  const results = page.getByTestId('project-search-results')
  await expect(results.getByTestId('project-search-concepts')).toContainText('Data dictionary (1)')
  await expect(results.getByTestId('project-search-activities')).toContainText('Weight check')
  await expect(results.getByTestId('project-search-nodes')).toContainText('Weight')
  await results.getByTestId('search-hit-node-weight-check-n-decimal').click()
  await expect(results).toHaveCount(0)
  await expect(page.getByTestId('field-name')).toHaveValue('weight_kg')

  await page.getByTestId('project-search').click()
  await page.getByTestId('project-search-input').fill('nothing like this')
  await expect(page.getByTestId('project-search-none')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('project-search-results')).toHaveCount(0)

  // Ctrl+F opens the same search, without actions; pressed again it closes it, so the
  // browser's own find can open.
  await page.keyboard.press('Control+f')
  await expect(page.getByTestId('project-search-input')).toBeFocused()
  await expect(page.getByTestId('project-search-results')).toHaveAttribute('data-mode', 'search')
  await expect(page.getByTestId('palette-actions')).toHaveCount(0)
  await page.keyboard.press('Control+f')
  await expect(page.getByTestId('project-search-results')).toHaveCount(0)
})

test('Ctrl+K lists actions above the search and runs the chosen one', async ({ page }) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Commands')
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('project-search')).toBeVisible()

  // While the new project is still settling, a focus change can close the palette at once;
  // press again until it stays (pressing Ctrl+K again keeps an open palette open).
  const palette = page.getByTestId('project-search-results')
  await expect(async () => {
    await page.keyboard.press('Control+k')
    await expect(palette).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(palette).toHaveAttribute('data-mode', 'commands')
  await expect(page.getByTestId('project-search-input')).toBeFocused()
  await expect(palette.getByTestId('command-create.activity')).toBeVisible()
  await expect(palette.getByTestId('command-edit.undo')).toContainText(/Ctrl\+Z|⌘Z/)

  // Typing narrows the actions; Enter runs the first.
  await page.getByTestId('project-search-input').fill('dict')
  await expect(palette.getByTestId('command-create.activity')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(palette).toHaveCount(0)
  await expect(page.getByTestId('dictionary-view')).toBeVisible()

  // A command that opens a dialog: the new-activity draft.
  await page.keyboard.press('Control+k')
  await page.getByTestId('project-search-input').fill('new activity')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('new-activity-name')).toBeVisible()
})

test('in Viewing mode Ctrl+K offers no edits, and switches back to Editing', async ({ page }) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Viewing')
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('project-search')).toBeVisible()
  await page.getByTestId('mode-menu').click()
  await page.getByTestId('mode-viewing').click()

  await page.keyboard.press('Control+k')
  const palette = page.getByTestId('project-search-results')
  await expect(palette.getByTestId('command-nav.dictionary')).toBeVisible()
  await expect(palette.getByTestId('command-create.activity')).toHaveCount(0)
  await expect(palette.getByTestId('command-edit.undo')).toHaveCount(0)
  await expect(palette.getByTestId('command-app.mode')).toContainText('Switch to Editing')
  await palette.getByTestId('command-app.mode').click()
  await expect(page.getByTestId('mode-menu')).toHaveAttribute('data-mode', 'editing')
})

test('one answer of a select can be "none of these", from the question or the answer', async ({
  page,
}) => {
  await page.getByTestId('new-project').click()
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

test('repeat and instance are offered on every node holding a value, and on the activity', async ({
  page,
}) => {
  await page.getByTestId('new-project').click()
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

test('a repeated question shows its own text for its repeat, and keeps it after a reload', async ({
  page,
}) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Repeat texts')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()

  // The first temperature, with its concept.
  await placeNode(page, 'decimal')
  await newConcept(page, 'temp', 'Temperature')
  await expect(page.getByTestId('node-n-decimal-label')).toHaveText('Temperature')

  // The same concept collected again, in repeat 2: same text until it has its own.
  await placeNode(page, 'decimal')
  await page.getByTestId('field-name').fill('temp')
  await page.getByTestId('field-repeat').fill('2')
  await expect(page.getByTestId('node-n-decimal-2-label')).toHaveText('Temperature')
  await expect(page.getByTestId('concept-card-repeat-text')).toHaveText(
    'same text as the first time',
  )

  // Its own text, from the concept card.
  await page.getByTestId('concept-repeat-text').click()
  await expect(page.getByTestId('concept-text-0-repeat')).toHaveValue('2')
  await page.getByTestId('concept-text-0-value').fill('Second temperature measurement')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('concept-dialog')).toHaveCount(0)

  await expect(page.getByTestId('node-n-decimal-2-label')).toHaveText(
    'Second temperature measurement',
  )
  await expect(page.getByTestId('node-n-decimal-label')).toHaveText('Temperature')
  await expect(page.getByTestId('concept-repeat-text')).toHaveText('Edit text for repeat 2')

  // Saved: both texts come back.
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('tab-activities').click()
  await page.getByTestId('library-card-activity').click()
  await expect(page.getByTestId('node-n-decimal-label')).toHaveText('Temperature')
  await expect(page.getByTestId('node-n-decimal-2-label')).toHaveText(
    'Second temperature measurement',
  )
})
