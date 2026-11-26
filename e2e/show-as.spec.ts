import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Show as (feature/20261126-questionnaire-pages.md): Page / Section / Inline / Default on
 * activities, gotos and groups, and the conversion of `instance: -1` on open.
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

function writeProjectDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'tricc-show-as-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return root
}

const TRICC_YAML = [
  'title: Show as',
  'input_strategy: YamlStrategy',
  'parameters:',
  '  languages:',
  '    default: en',
  '    available:',
  '    - en',
  'interventions:',
  '- id: visit',
  '  title: Visit',
  '  activity:',
  '  - activities/triage.activity.yaml',
  '  - activities/cough.activity.yaml',
  '  start:',
  '    on: demand',
  '',
].join('\n')

const COUGH = [
  'id: cough',
  'title: Cough',
  'nodes:',
  '  - id: s',
  '    type: activity_start',
  '    name: cough',
  '',
].join('\n')

async function openTriage(page: Page, triage: string): Promise<() => void> {
  const dir = writeProjectDir({
    'tricc.yaml': TRICC_YAML,
    'activities/triage.activity.yaml': triage,
    'activities/cough.activity.yaml': COUGH,
  })
  await page.getByTestId('import-files').setInputFiles(dir)
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await page.getByTestId('tab-activities').click()
  await page.getByTestId('library-card-triage').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  return () => rmSync(dir, { recursive: true, force: true })
}

const triageWith = (goto: string[]) =>
  [
    'id: triage',
    'title: Triage',
    'nodes:',
    '  - id: s',
    '    type: activity_start',
    '    name: triage',
    '  - id: g',
    '    type: goto',
    '    link: cough',
    ...goto.map((line) => `    ${line}`),
    'edges:',
    '  - id: e1',
    '    source: s',
    '    target: g',
    '',
  ].join('\n')

test('a goto with instance -1 opens as Show as: Inline, with a discussion on it', async ({
  page,
}) => {
  const cleanup = await openTriage(page, triageWith(['instance: -1']))
  try {
    await expect(page.getByTestId('node-g-show-as')).toHaveText('Inline')
    await expect(page.getByTestId('node-g-instance')).toHaveCount(0)
    await page.getByTestId('node-g').click()
    await expect(page.getByTestId('field-show-as')).toHaveValue('inline')
    await page.getByTestId('tab-discussion').click()
    await expect(page.getByTestId('discussion-section')).toContainText('instance -1')
    await expect(page.getByTestId('discussion-section')).toContainText('TRICC')
  } finally {
    cleanup()
  }
})

test('Show as on a goto, an activity and a group, and back to Default', async ({ page }) => {
  const cleanup = await openTriage(page, triageWith([]))
  try {
    await page.getByTestId('node-g').click()
    const select = page.getByTestId('field-show-as')
    await expect(select.locator('option[value=""]')).toHaveText(
      'Default (as the activity: Section)',
    )
    await select.selectOption('inline')
    await expect(page.getByTestId('node-g-show-as')).toHaveText('Inline')
    await select.selectOption('')
    await expect(page.getByTestId('node-g-show-as')).toHaveCount(0)

    // The activity itself, from its settings.
    await page.getByTestId('node-s').click()
    await page.getByTestId('root-activity-settings').click()
    await page.getByTestId('field-show-as').selectOption('page')
    await expect(page.getByTestId('node-s-show-as')).toHaveText('Page')
    await page.keyboard.press('Escape')

    // A group of questions shown Inline is only a frame.
    const addGroup = page.getByTestId('add-group')
    if ((await addGroup.count()) === 0) await page.getByTestId('tab-nodes').click()
    await addGroup.click()
    await page.getByTestId('field-show-as').selectOption('inline')
    await expect(page.getByTestId('group-group')).toHaveAttribute('data-show-as', 'inline')
    await expect(page.getByTestId('group-group-show-as')).toHaveText('Inline')
  } finally {
    cleanup()
  }
})
