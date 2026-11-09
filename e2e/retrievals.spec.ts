import { expect, test, type Page } from '@playwright/test'

/**
 * Prefilled values and the retrieval dictionary (feature/20261109-project-retrievals.md,
 * fix/20261109-populate-source-period.md): a prefilled value gets its period, moves to the
 * retrieval dictionary, and a new retrieval is made from the dictionary.
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

test('a prefilled value moves to the retrieval dictionary, and a retrieval is made there', async ({
  page,
}) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Retrievals')
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()

  await placeNode(page, 'populate')
  await page.getByTestId('field-name').fill('prev_weight')
  await page.getByTestId('field-context').selectOption('history')
  await page.getByTestId('field-period').fill('30 days')
  await expect(page.getByTestId('field-period-invalid')).toBeVisible()
  await page.getByTestId('field-period').fill('P30D')
  await expect(page.getByTestId('field-period-invalid')).toHaveCount(0)

  await page.getByTestId('populate-move-to-retrieval').click()
  await expect(page.getByTestId('node-n-populate')).toHaveCount(0)

  await page.getByTestId('tab-dictionary').click()
  await page.locator('[data-dictionary="retrieve"]').click()
  await expect(page.getByTestId('dictionary-retrieve-note')).toBeVisible()
  await expect(page.getByTestId('concept-row-#prev_weight')).toContainText('History')
  await expect(page.getByTestId('concept-row-#prev_weight')).toContainText('P30D')

  await page.getByTestId('concept-add').click()
  await expect(page.getByTestId('concept-dialog')).toContainText('New retrieval')
  await page.getByTestId('concept-code').fill('#age_months')
  await page.getByTestId('concept-display').fill('Age in months')
  await page.getByTestId('retrieval-function').selectOption('AgeInMonths')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('concept-dialog')).toHaveCount(0)
  await expect(page.getByTestId('concept-row-#age_months')).toContainText('Age in months')
})
