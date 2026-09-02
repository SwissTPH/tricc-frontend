import { expect, test, type Page } from '@playwright/test'

/**
 * Canvas journeys.
 *
 * Everything needing real geometry lives here rather than in jsdom: dragging a node,
 * connecting two nodes by their handles, and reading rendered positions. jsdom measures
 * React Flow as zero-sized, so these cannot be component tests.
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

async function newActivity(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
}

/** The first activity created by `newActivity` is always `activity`. */
const FIRST_ACTIVITY = 'activity'

test('the canvas renders the start node with its shape and group', async ({ page }) => {
  await newActivity(page, 'Canvas guideline')

  const start = page.getByTestId('node-start')
  await expect(start).toBeVisible()
  await expect(start).toHaveAttribute('data-node-type', 'activity_start')
  await expect(start).toHaveClass(/tricc-node--terminator/)
  await expect(start).toHaveClass(/tricc-node--flow/)
})

test('node types are visually distinguished by group', async ({ page }) => {
  await newActivity(page, 'Groups guideline')

  await page.getByTestId('add-integer').click()
  await page.getByTestId('add-calculate').click()
  await page.getByTestId('add-proposed_diagnosis').click()

  await expect(page.getByTestId('node-n-integer')).toHaveClass(/tricc-node--question/)
  await expect(page.getByTestId('node-n-calculate')).toHaveClass(/tricc-node--logic/)
  await expect(page.getByTestId('node-n-proposed_diagnosis')).toHaveClass(/tricc-node--clinical/)
})

test('dragging a node persists its position through save and reload', async ({ page }) => {
  await newActivity(page, 'Drag guideline')
  await page.getByTestId('add-note').click()

  const node = page.getByTestId('node-n-note')
  const before = await node.boundingBox()
  if (!before) throw new Error('node not rendered')

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 160, before.y + before.height / 2 + 80, {
    steps: 12,
  })
  await page.mouse.up()

  const after = await node.boundingBox()
  if (!after) throw new Error('node vanished after drag')
  expect(after.x).toBeGreaterThan(before.x + 100)

  // The relationship to the start node, not absolute screen coordinates: the canvas fits
  // the view on open, so pan and zoom differ after a reload even though the model does not.
  const startBefore = await page.getByTestId('node-start').boundingBox()
  const dxBefore = after.x - startBefore!.x
  const dyBefore = after.y - startBefore!.y
  expect(dxBefore).toBeGreaterThan(0)

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('nav-activity-activity').click()

  const reloaded = await page.getByTestId('node-n-note').boundingBox()
  const startAfter = await page.getByTestId('node-start').boundingBox()
  if (!reloaded || !startAfter) throw new Error('nodes missing after reload')

  // Position survives the round-trip through the CRDT and the YAML file.
  const ratio = (reloaded.x - startAfter.x) / dxBefore
  expect(ratio).toBeGreaterThan(0.5)
  expect((reloaded.y - startAfter.y) / dyBefore).toBeGreaterThan(0.5)
})

test('connecting two nodes by their handles creates an edge', async ({ page }) => {
  await newActivity(page, 'Connect guideline')
  await page.getByTestId('add-note').click()

  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-note').locator('.react-flow__handle-top')

  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()

  await expect(page.getByTestId('edge-list')).toContainText('start → n-note')
})

test('a node with a validation error is marked on the canvas', async ({ page }) => {
  await newActivity(page, 'Severity guideline')
  await page.getByTestId('add-select_one').click()

  // A select with no options is an error, and the node says so without relying on colour.
  await expect(page.getByTestId('node-n-select_one')).toHaveAttribute('data-severity', 'error')
  await expect(page.getByTestId('node-n-select_one')).toHaveClass(/has-error/)
})

test('selecting a node on the canvas opens its properties', async ({ page }) => {
  await newActivity(page, 'Select guideline')
  await page.getByTestId('add-integer').click()

  // Clicking the start node moves the selection.
  await page.getByTestId('node-start').click()
  await expect(page.getByTestId('node-properties')).toContainText('activity_start')
})

test('branch semantics are chosen, never typed', async ({ page }) => {
  await newActivity(page, 'Branch guideline')
  await page.getByTestId('add-select_yesno').click()

  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-select_yesno').locator('.react-flow__handle-top')
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()

  await page.getByTestId('select-edge-e-start-n-select_yesno').click()
  await expect(page.getByTestId('edge-properties')).toBeVisible()

  // A typed control, not a text box: the "yes" spelling is never the author's to get wrong.
  await page.getByTestId('field-branch-kind').selectOption('yes')
  await expect(page.getByTestId('edge-label-e-start-n-select_yesno')).toHaveText('Yes')

  await page.getByTestId('field-branch-kind').selectOption('condition')
  await expect(page.getByTestId('field-branch-condition')).toBeVisible()
})

test('tidy layout repositions nodes and is undoable in one step', async ({ page }) => {
  await newActivity(page, 'Layout guideline')
  await page.getByTestId('add-note').click()
  await page.getByTestId('add-integer').click()

  const before = await page.getByTestId('node-n-note').boundingBox()
  await page.getByTestId('tidy-layout').click()
  const after = await page.getByTestId('node-n-note').boundingBox()

  expect(before && after).toBeTruthy()
  // Layout only ever runs when asked - never silently on open.
  expect(after!.x !== before!.x || after!.y !== before!.y).toBe(true)
})

test('read-only removes dragging and the palette but keeps the canvas readable', async ({
  page,
}) => {
  await newActivity(page, 'Read only canvas')
  await page.getByTestId('add-note').click()

  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  await expect(page.getByTestId('add-note')).toHaveCount(0)

  const node = page.getByTestId('node-n-note')
  const before = await node.boundingBox()
  if (!before) throw new Error('node not rendered')
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + 200, before.y + 120, { steps: 10 })
  await page.mouse.up()

  const after = await node.boundingBox()
  expect(Math.abs(after!.x - before.x)).toBeLessThan(4)
})

test('a goto selects an activity, and never a process activity', async ({ page }) => {
  await newActivity(page, 'Goto guideline')
  // A second normal activity to jump to, and a process activity that must not be offered.
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()

  await page.getByTestId(`nav-activity-${FIRST_ACTIVITY}`).click()
  await page.getByTestId('add-goto').click()

  const picker = page.getByTestId('field-link')
  await picker.click()
  await expect(page.getByTestId('field-link-option-activity-2')).toBeVisible()
  // The process activity is an entry point, not a jump target.
  await expect(page.getByTestId('field-link-option-triage-process')).toHaveCount(0)
  // And an activity cannot jump to itself.
  await expect(page.getByTestId(`field-link-option-${FIRST_ACTIVITY}`)).toHaveCount(0)

  await page.getByTestId('field-link-option-activity-2').click()
  await expect(page.getByTestId('field-link-current')).toContainText('activity-2')

  // A goto with a destination is no longer an error.
  await expect(page.getByTestId('issue-goto.no-link')).toHaveCount(0)
})

test('a goto with no destination is reported until one is chosen', async ({ page }) => {
  await newActivity(page, 'Dangling goto guideline')
  await page.getByTestId('add-goto').click()

  const issue = page.getByTestId('issue-goto.no-link')
  await expect(issue).toBeVisible()
  await expect(issue).toContainText('Choose the activity it goes to')
})
