import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * A project folder whose tricc.yaml lists draw.io files, including a page stored as
 * base64 + raw deflate. Opening does not rewrite the drawing. Saving writes activity YAML.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '../examples/drawio-open')

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

test('opens a plain diagram and a compressed diagram from tricc.yaml', async ({ page }) => {
  const plainBefore = readFileSync(join(root, 'diagrams/plain.drawio'))
  const compressedBefore = readFileSync(join(root, 'diagrams/compressed.drawio'))

  await page.getByTestId('import-files').setInputFiles(root)
  await expect(page.getByRole('heading', { name: 'Draw.io open' })).toBeVisible()

  await expect(page.getByTestId('nav-activity-village-visit')).toHaveCount(1)
  await expect(page.getByTestId('nav-activity-pulse-check')).toHaveCount(1)

  await page.getByTestId('nav-activity-village-visit').click()
  await expect(page.getByTestId('node-w1')).toContainText('Weight')
  await expect(page.getByTestId('node-u1')).toContainText('Unmapped type: mystery_shape')
  await page.getByTestId('node-s1').click()
  await expect(page.getByTestId('field-form-id')).toHaveCount(0)

  await page.getByTestId('nav-activity-pulse-check').click()
  await expect(page.getByTestId('node-p1')).toContainText('Pulse')

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('nav-activity-pulse-check').click()
  await expect(page.getByTestId('node-p1')).toContainText('Pulse')
  await page.getByTestId('nav-activity-village-visit').click()
  await expect(page.getByTestId('node-u1')).toContainText('Unmapped type: mystery_shape')

  expect(readFileSync(join(root, 'diagrams/plain.drawio'))).toEqual(plainBefore)
  expect(readFileSync(join(root, 'diagrams/compressed.drawio'))).toEqual(compressedBefore)
})
