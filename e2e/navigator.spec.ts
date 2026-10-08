import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

/**
 * Processes and activities are two tabs. Search narrows the open tab. Expand opens the
 * rest of that list downward, and an expression that is already CQL is shown and checked.
 */

const migrated = join(dirname(fileURLToPath(import.meta.url)), '../examples/migrated')

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

async function createProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('save-status')).toBeVisible()
}

async function expectInsideViewport(page: Page, testId: string): Promise<void> {
  const box = await page.getByTestId(testId).boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error(`${testId} has no box`)
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
}

test('search and expand reach an activity or process that does not fit', async ({ page }) => {
  await createProject(page, 'Long list')

  for (let i = 0; i < 24; i++) {
    await page.getByTestId('add-activity').click()
    await page.getByTestId('create-activity').click()
  }
  await expectInsideViewport(page, 'activity-navigator')
  await expect(page.getByTestId('tab-activities')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('nav-expand')).toBeEnabled()

  const nav = page.getByTestId('activity-navigator')
  const collapsed = await nav.evaluate((el) => el.getBoundingClientRect().height)
  await page.getByTestId('nav-expand').click()
  await expect(nav).toHaveAttribute('data-expanded', 'true')
  await expect.poll(() => nav.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(collapsed + 16)

  await page.getByTestId('activity-search').fill('activity-15')
  await expect(page.getByTestId('nav-activity-activity-15')).toBeVisible()
  await expect(page.getByTestId('activity-list').locator('li')).toHaveCount(1)
  await page.getByTestId('nav-activity-activity-15').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()

  await page.getByTestId('tab-processes').click()
  const processes = [
    'alpha-segment',
    'bravo-segment',
    'charlie-segment',
    'delta-segment',
    'echo-segment',
    'foxtrot-segment',
    'golf-segment',
    'hotel-segment',
    'india-segment',
    'juliet-segment',
    'kilo-segment',
    'lima-segment',
    'mike-segment',
    'november-segment',
  ]
  for (const name of processes) {
    await page.getByTestId('add-process').click()
    await page.getByTestId('new-process-name').fill(name)
    await page.getByTestId('add-process-activity').click()
  }
  await expect(page.getByTestId('tab-processes')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('activity-navigator')).toHaveAttribute('data-expanded', 'true')

  await page.getByTestId('process-search').fill('hotel')
  await expect(page.getByTestId('nav-activity-hotel-segment-process')).toBeVisible()
  await expect(page.getByTestId('process-activity-list').locator('li')).toHaveCount(1)
  await expectInsideViewport(page, 'activity-navigator')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    (page.viewportSize()?.width ?? 0) + 1,
  )
})

test('the same controls still reach an entry on a narrow window', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await createProject(page, 'Narrow list')
  for (let i = 0; i < 8; i++) {
    await page.getByTestId('add-activity').click()
    await page.getByTestId('create-activity').click()
  }

  await expectInsideViewport(page, 'activity-navigator')
  await expect(page.getByTestId('nav-expand')).toBeEnabled()
  const collapsed = await page.getByTestId('activity-navigator').evaluate((el) => el.getBoundingClientRect().height)
  await page.getByTestId('nav-expand').click()
  await expect
    .poll(() => page.getByTestId('activity-navigator').evaluate((el) => el.getBoundingClientRect().height))
    .toBeGreaterThan(collapsed + 16)
  await expectInsideViewport(page, 'activity-navigator')
  await page.getByTestId('nav-expand').click()

  await page.getByTestId('activity-search').fill('activity-8')
  await expect(page.getByTestId('nav-activity-activity-8')).toBeVisible()
  await page.getByTestId('nav-activity-activity-8').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()
})

test('a plus opens a dialog and nothing is created until it is confirmed', async ({ page }) => {
  await createProject(page, 'Named library')

  await page.getByTestId('add-activity').click()
  const modal = page.getByTestId('library-modal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('New activity')
  await page.getByTestId('library-cancel').click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('activity-list').locator('li')).toHaveCount(0)

  await page.getByTestId('add-activity').click()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('activity-list').locator('li')).toHaveCount(0)

  await page.getByTestId('add-activity').click()
  await page.getByTestId('new-activity-name').fill('Weight measurement')
  await expect(page.getByTestId('new-activity-id')).toHaveText('weight-measurement')
  await page.getByTestId('create-activity').click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('nav-activity-weight-measurement')).toContainText('Weight measurement')
  await expect(page.getByTestId('activity-editor')).toBeVisible()

  await page.getByTestId('tab-processes').click()
  await page.getByTestId('add-process').click()
  await expect(modal).toContainText('New process')
  await expect(page.getByTestId('add-process-activity')).toBeDisabled()
  await page.getByTestId('library-modal-backdrop').click({ position: { x: 8, y: 8 } })
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('no-process-activities')).toBeVisible()

  await page.getByTestId('add-process').click()
  await page.getByTestId('new-process-name').fill('registration')
  await expect(page.getByTestId('new-process-id')).toHaveText('registration-process')
  await page.getByTestId('add-process-activity').click()
  await expect(page.getByTestId('nav-activity-registration-process')).toBeVisible()
  await expect(page.getByTestId('activity-process')).toHaveValue('registration')
})

test('import adds a file to the open tab and waits for confirmation', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'tricc-import-'))
  const cough = join(dir, 'cough.activity.yaml')
  const airway = join(dir, 'airway.activity.yaml')
  const drawing = join(dir, 'visit.drawio')
  writeFileSync(
    cough,
    [
      'id: cough',
      'title: Cough',
      'nodes:',
      '  - id: start',
      '    type: activity_start',
      '    name: cough',
      '    ui: { x: 40, y: 40 }',
      '  - id: n1',
      '    type: note',
      '    label: Ask about cough',
      '    ui: { x: 40, y: 140 }',
      'edges: []',
      '',
    ].join('\n'),
  )
  writeFileSync(
    airway,
    [
      'id: airway-process',
      'process: airway',
      'title: Airway',
      'nodes:',
      '  - id: start',
      '    type: start',
      '    name: airway',
      '    process: airway',
      '    form_id: ETAT',
      '    ui: { x: 40, y: 40 }',
      'edges: []',
      '',
    ].join('\n'),
  )
  writeFileSync(
    drawing,
    '<mxfile><diagram id="p1" name="Village visit"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><object id="s" label="Visit" odk_type="activity_start"><mxCell vertex="1" parent="1"><mxGeometry x="10" y="20" width="80" height="40" as="geometry"/></mxCell></object></root></mxGraphModel></diagram></mxfile>',
  )

  await createProject(page, 'Imported library')
  await expect(page.getByTestId('import-activity')).toBeVisible()

  await page.getByTestId('import-activity-file').setInputFiles(cough)
  const modal = page.getByTestId('import-modal')
  await expect(modal).toContainText('Nothing is added until you import.')
  await expect(page.getByTestId('import-id-cough')).toHaveText('cough')
  await page.getByTestId('import-cancel').click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('activity-list').locator('li')).toHaveCount(0)

  await page.getByTestId('import-activity-file').setInputFiles(cough)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('activity-list').locator('li')).toHaveCount(0)

  await page.getByTestId('import-activity-file').setInputFiles(airway)
  await expect(page.getByTestId('import-skipped')).toContainText('Processes tab')
  await expect(page.getByTestId('import-confirm')).toHaveCount(0)
  await page.getByTestId('import-modal-backdrop').click({ position: { x: 8, y: 8 } })
  await expect(modal).toHaveCount(0)

  await page.getByTestId('import-activity-file').setInputFiles(cough)
  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('nav-activity-cough')).toContainText('Cough')
  await expect(page.getByTestId('node-n1')).toContainText('Ask about cough')

  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('nav-activity-cough')).toHaveCount(0)

  await page.getByTestId('import-activity-file').setInputFiles(drawing)
  await expect(page.getByTestId('import-item-village-visit')).toBeVisible()
  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('nav-activity-village-visit')).toBeVisible()
  await expect(page.getByTestId('node-s')).toBeVisible()

  await page.getByTestId('tab-processes').click()
  await page.getByTestId('import-process-file').setInputFiles(airway)
  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('nav-activity-airway-process')).toBeVisible()
  await page.getByTestId('node-start').click()
  await expect(page.getByTestId('field-form-id')).toHaveValue('ETAT')
})

test('an imported decision shows its CQL and a broken quote is named', async ({ page }) => {
  await page.getByTestId('import-files').setInputFiles(migrated)
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expectInsideViewport(page, 'activity-navigator')

  await page.getByTestId('tab-processes').click()
  await page.getByTestId('process-search').fill('yi-tests')
  await expect(page.getByTestId('nav-activity-yi-tests')).toBeVisible()
  await expect(page.getByTestId('process-activity-list').locator('li')).toHaveCount(1)
  await page.getByTestId('process-search').fill('')

  await page.getByTestId('tab-activities').click()
  await page.getByTestId('activity-search').fill('weight')
  await expect(page.getByTestId('nav-activity-weight-measurement')).toBeVisible()
  await page.getByTestId('nav-activity-weight-measurement').click()
  await page.getByTestId('select-node-Gu58oViyXPmqma7RcGfT-26').click()

  const display = page.getByTestId('field-reference-display')
  await expect(display).toContainText('age_in_days')
  await expect(page.locator('[data-code="CHE.B6.DE07"]')).toHaveText('Weight (kilograms)')
  await expect(page.locator('[data-code="CHE.B6.DE07"]')).toHaveAttribute(
    'title',
    'Weight (kilograms) — CHE.B6.DE07',
  )
  await expect(page.locator('[data-code="age_in_days"]')).toHaveAttribute(
    'title',
    /no concept label/,
  )
  await page.getByRole('button', { name: 'About Weight (kilograms)' }).click()
  await expect(page.getByRole('note')).toContainText('CHE.B6.DE07')
  await page.getByRole('button', { name: 'Show question' }).click()
  await expect(page.getByTestId('field-name')).toHaveValue('CHE.B6.DE07')
  await expect(page.getByTestId('field-label')).toHaveValue('Weight (kilograms)')

  await page.getByTestId('tab-nodes').click()
  await page.getByTestId('select-node-Gu58oViyXPmqma7RcGfT-26').click()
  await expect(page.getByTestId('field-reference')).toHaveValue(
    '"age_in_days" < 60 and "CHE.B6.DE07" > 9',
  )
  await expect(page.getByTestId('field-reference-lint')).toHaveCount(0)
  await expect(page.getByText('not rewritten into CQL')).toHaveCount(0)

  await page.getByTestId('field-reference').fill('"age')
  await expect(page.getByTestId('field-reference-lint')).toContainText('closing quote')
  await expect(page.getByTestId('field-reference')).toHaveValue('"age')
})
