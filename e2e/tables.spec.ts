import { expect, test, type Page } from '@playwright/test'

/**
 * Decision tables (feature/20261120-decision-table-editor.md): a table is made from the Tables
 * tab, its input takes a concept, rows are filled and reordered, and the test panel follows.
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

async function cell(page: Page, row: number, column: number, value: string): Promise<void> {
  const input = page.getByTestId(`table-cell-${row}-${column}`)
  await input.fill(value)
  await input.press('Enter')
}

test('a dosing table is made, tested and reordered', async ({ page }) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Dosing')
  await page.getByTestId('create-project').click()

  // A weight concept to read when a call leaves the weight out.
  await page.getByTestId('tab-dictionary').click()
  await page.getByTestId('concept-add').click()
  await page.getByTestId('concept-code').fill('weight')
  await page.getByTestId('concept-display').fill('Weight (kg)')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('concept-dialog')).toHaveCount(0)

  await page.getByTestId('tab-tables').click()
  await expect(page.getByTestId('no-tables')).toBeVisible()
  await page.getByTestId('table-add').click()
  await expect(page.getByTestId('table-editor')).toBeVisible()

  await page.getByTestId('table-id').fill('diazepam')
  await page.getByTestId('table-id').press('Enter')
  await page.getByTestId('table-input-0-name').fill('weight')
  await page.getByTestId('table-input-0-name').press('Enter')
  await page.getByTestId('table-input-0-concept-search').fill('Weight')
  await page.getByTestId('table-input-0-concept-search-option-weight').click()
  await expect(page.getByTestId('table-input-0-concept')).toContainText('weight')
  await page.getByTestId('table-output-0-name').fill('dose')
  await page.getByTestId('table-output-0-name').press('Enter')

  await cell(page, 0, 0, '[3..10)')
  await cell(page, 0, 1, '0.4')
  await page.getByTestId('table-add-rule').click()
  await cell(page, 1, 0, '>= 10')
  await cell(page, 1, 1, '1.2')
  await expect(page.getByTestId('table-editor')).toContainText(`DMN('diazepam', weight)`)

  await page.getByTestId('table-test-weight').fill('11.5')
  await expect(page.getByTestId('table-test-result')).toContainText('Row 2 gives 1.2')
  await expect(page.getByTestId('table-rule-1')).toHaveAttribute('data-kept', 'true')

  // A catch-all first row wins under "first", until it is moved down.
  await page.getByTestId('table-add-rule').click()
  await cell(page, 2, 1, '0')
  await page.getByTestId('table-rule-up-2').click()
  await page.getByTestId('table-rule-up-1').click()
  await expect(page.getByTestId('table-test-result')).toContainText('Row 1 gives 0')
  await page.getByTestId('table-rule-down-0').click()
  await page.getByTestId('table-rule-down-1').click()
  await expect(page.getByTestId('table-test-result')).toContainText('Row 2 gives 1.2')

  await page.getByTestId('table-policy').selectOption('rule_order')
  await expect(page.getByTestId('table-test-result')).toContainText('List: [1.2], [0]')

  await cell(page, 0, 0, '[3..x)')
  await expect(page.getByTestId('table-cell-0-0')).toHaveAttribute('aria-invalid', 'true')

  await page.getByTestId('table-back').click()
  await expect(page.getByTestId('table-row-diazepam')).toContainText('List')
  await expect(page.getByTestId('tab-tables')).toContainText('1')
})
