import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Import and export.
 *
 * The round trip matters more than either half: a project exported from this tool must
 * import back into it unchanged, or the archive is not a way to move work between
 * machines.
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

async function createProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('save-status')).toBeVisible()
}

test('the project list offers a way in besides creating', async ({ page, browserName }) => {
  await expect(page.getByTestId('import-archive')).toBeAttached()
  await expect(page.getByTestId('import-files')).toBeAttached()

  // Opening a folder is Chromium-only; the button is absent rather than broken elsewhere.
  if (browserName === 'chromium') {
    await expect(page.getByTestId('open-folder')).toBeVisible()
  } else {
    await expect(page.getByTestId('open-folder')).toHaveCount(0)
  }
})

test('exports a project and imports it back unchanged', async ({ page }) => {
  await createProject(page, 'Exportable guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-integer').click()
  await page.getByTestId('field-name').fill('weight')
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-archive').click(),
  ]).then(([d]) => d)

  expect(download.suggestedFilename()).toBe('Exportable guideline.tricc')
  const path = await download.path()
  if (!path) throw new Error('download produced no file')

  // Import it back as a second, independent project.
  await page.goto('/')
  await page.getByTestId('import-archive').setInputFiles(path)

  await expect(page.getByTestId('project-overview')).toBeVisible()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('node-n-integer')).toContainText('weight')
})

test('an imported project takes its name from the file, not the filename alone', async ({
  page,
}) => {
  await createProject(page, 'Named guideline')
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-archive').click(),
  ]).then(([d]) => d)
  const path = await download.path()
  if (!path) throw new Error('download produced no file')

  await page.goto('/')
  await page.getByTestId('import-archive').setInputFiles(path)
  await expect(page.getByTestId('project-overview')).toBeVisible()

  await page.goto('/')
  // Two entries now: the original and the import, both carrying the project's own title.
  await expect(page.getByRole('button', { name: 'Named guideline' })).toHaveCount(2)
})

test('a file that is not a project is refused with an explanation', async ({ page }) => {
  await page.getByTestId('import-archive').setInputFiles({
    name: 'not-a-project.tricc',
    mimeType: 'application/zip',
    buffer: Buffer.from('this is not a zip archive at all'),
  })

  await expect(page.getByTestId('import-error')).toBeVisible()
  await expect(page.getByTestId('import-error')).toContainText('could not be read')
  // The bad import left nothing behind.
  await expect(page.getByTestId('no-projects')).toBeVisible()
})

/** Write a project directory to a temp location and return its path. */
function writeProjectDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'tricc-import-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return root
}

test('imports a project directory from disk', async ({ page }) => {
  const dir = writeProjectDir({
    'tricc.yaml': [
      'title: Loaded from disk',
      'input_strategy: YamlStrategy',
      'output_strategies:',
      '- XLSFormCHTStrategy',
      'parameters:',
      '  languages:',
      '    default: en',
      '    available:',
      '    - en',
      'interventions:',
      '- id: screening',
      '  title: Screening',
      '  activity:',
      '  - activities/screening.activity.yaml',
      '  start:',
      '    on: demand',
      '',
    ].join('\n'),
    'activities/screening.activity.yaml':
      'id: screening\ntitle: Screening\nnodes:\n  - id: s\n    type: activity_start\n    name: screening\n',
  })

  try {
    await page.getByTestId('import-files').setInputFiles(dir)
    await expect(page.getByTestId('project-overview')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loaded from disk' })).toBeVisible()
    await expect(page.getByTestId('nav-activity-screening')).toBeVisible()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a directory with no tricc.yaml is refused rather than half-adopted', async ({ page }) => {
  const dir = writeProjectDir({
    'activities/orphan.activity.yaml': 'id: orphan\nnodes: []\n',
  })

  try {
    await page.getByTestId('import-files').setInputFiles(dir)
    await expect(page.getByTestId('import-error')).toContainText(
      'does not look like a TRICC project',
    )
    // Nothing was adopted: a half-imported project in the list is worse than none.
    await expect(page.getByTestId('no-projects')).toBeVisible()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
