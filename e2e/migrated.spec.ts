import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * The migrated slice: one activity file, listed on more than one intervention.
 * Import is the way an author opens a folder that already exists on disk.
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

test('opens the migrated project, shows one shared activity on two interventions, and edits a node', async ({
  page,
}) => {
  await page.getByTestId('import-files').setInputFiles(migrated)

  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Migrated clinical slice' })).toBeVisible()

  await expect(page.getByTestId('nav-activity-weight-measurement')).toHaveCount(1)
  await expect(page.getByTestId('used-by-weight-measurement')).toContainText('over-2-months')
  await expect(page.getByTestId('used-by-weight-measurement')).toContainText('young-infant')
  await expect(page.getByTestId('library-shared-weight-measurement')).toContainText(
    'One copy in the library',
  )

  await expect(page.getByTestId('intervention-over-2-months-activity-weight-measurement')).toHaveCount(0)
  await expect(page.getByTestId('intervention-young-infant-activity-yi-tests')).toBeVisible()
  await expect(page.getByTestId('intervention-combacal-flow-activity-combacal-simplify')).toBeVisible()

  await expect(page.getByTestId('library-shared-symptom-screening')).toHaveCount(1)
  await expect(
    page.getByTestId('intervention-combacal-hypertension-activity-symptom-screening'),
  ).toHaveCount(0)
  await expect(page.getByTestId('intervention-combacal-diabetes-activity-symptom-screening')).toHaveCount(
    0,
  )

  await expect(page.getByTestId('nav-activity-etat-airway')).toBeVisible()
  await page.getByTestId('tab-processes').click()
  await expect(page.getByTestId('nav-activity-combacal-simplify')).toBeVisible()
  await expect(page.getByTestId('nav-activity-yi-tests')).toBeVisible()
  await page.getByTestId('tab-activities').click()

  await page.getByTestId('nav-activity-weight-measurement').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()
  await page.getByRole('button', { name: 'Weight (kilograms)', exact: true }).click()
  await expect(page.getByTestId('field-label')).toHaveValue('Weight (kilograms)')
  await page.getByTestId('field-label').fill('Weight in kilograms')
  await page.getByTestId('tab-nodes').click()
  await expect(page.getByRole('button', { name: 'Weight in kilograms', exact: true })).toBeVisible()

  await expect(page.getByTestId('nav-activity-weight-measurement')).toHaveCount(1)
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })

  await page.getByTestId('nav-overview').click()
  await expect(page.getByTestId('intervention-young-infant-activity-yi-tests')).toContainText('Tests')
  await expect(page.getByTestId('nav-activity-weight-measurement')).toHaveCount(1)
})

test('marks a dangling goto and keeps proposed_diagnosis, with no Filter field', async ({
  page,
}) => {
  await page.getByTestId('import-files').setInputFiles(migrated)
  await expect(page.getByTestId('project-overview')).toBeVisible()

  await expect(page.getByTestId('issue-goto.dangling-link').first()).toBeVisible()

  await page.getByTestId('nav-activity-weight-measurement').click()
  const temperature = page.getByTestId('node-Gu58oViyXPmqma7RcGfT-30').getByTestId('goto-missing')
  await expect(temperature).toContainText('Missing activity')
  await expect(temperature).toContainText('⚠')

  await page.getByTestId('nav-activity-etat-airway').click()
  await expect(page.getByTestId('node-4fjCBxxlf2C2cA8FoHnW-59').getByTestId('goto-missing')).toContainText(
    'Missing activity',
  )
  await expect(page.getByTestId('node-TMVJByVCYcH1vvGJz3Hm-33').getByTestId('goto-missing')).toContainText(
    'Missing activity',
  )

  await page.getByRole('button', { name: 'Start airway and breathing assessement', exact: true }).click()
  await expect(page.getByTestId('field-form-id')).toHaveCount(0)
  await expect(page.getByTestId('field-filter')).toHaveCount(0)

  await page.getByTestId('nav-activity-urine-test').click()
  await expect(page.getByTestId('node-34')).toContainText('Possible urine infection')

  await page.getByTestId('tab-processes').click()
  await page.getByTestId('nav-activity-combacal-simplify').click()
  await page.getByRole('button', { name: 'Under 5', exact: true }).click()
  await expect(page.getByTestId('field-form-id')).toHaveValue('questionaire')
  await expect(page.getByTestId('field-filter')).toHaveCount(0)
})

test('moving a node on an imported diagram keeps the other nodes and edges visible', async ({
  page,
}) => {
  await page.getByTestId('import-files').setInputFiles(migrated)
  await page.getByTestId('nav-activity-weight-measurement').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()

  const nodes = page.locator('.react-flow__node')
  const edges = page.locator('.react-flow__edge')
  await expect(nodes).toHaveCount(13)
  await expect(edges).toHaveCount(12)
  await expect(page.getByTestId('node-Gu58oViyXPmqma7RcGfT-26')).toBeVisible()

  const weight = page.getByTestId('node-Gu58oViyXPmqma7RcGfT-21')
  const before = await weight.boundingBox()
  if (!before) throw new Error('weight node not rendered')

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 96, before.y + before.height / 2 + 64, {
    steps: 12,
  })

  await expect(nodes).toHaveCount(13)
  await expect(edges).toHaveCount(12)
  await expect(page.getByTestId('node-Gu58oViyXPmqma7RcGfT-26')).toBeVisible()
  await expect(page.getByTestId('node-Gu58oViyXPmqma7RcGfT-30')).toBeVisible()

  await page.mouse.up()

  await expect(nodes).toHaveCount(13)
  await expect(edges).toHaveCount(12)
  await expect(page.getByTestId('node-Gu58oViyXPmqma7RcGfT-26')).toBeVisible()
  await expect(page.getByTestId('node-Gu58oViyXPmqma7RcGfT-30')).toBeVisible()
  await expect(weight).toBeVisible()
  const hidden = await page.locator('.react-flow__node, .react-flow__edge').evaluateAll((els) =>
    els.filter((el) => getComputedStyle(el).visibility === 'hidden').map((el) => el.getAttribute('data-id')),
  )
  expect(hidden).toEqual([])
})
