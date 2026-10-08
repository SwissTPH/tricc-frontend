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
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
}

/** The first activity created by `newActivity` is always `activity`. */
const FIRST_ACTIVITY = 'activity'

/**
 * Add a node from the palette. Adding one opens Details, which hides the palette,
 * so a later add returns to the Nodes tab first.
 */
async function placeNode(page: Page, type: string): Promise<void> {
  const button = page.getByTestId(`add-${type}`)
  if ((await button.count()) === 0) await page.getByTestId('tab-nodes').click()
  await button.click()
}

/** Palette, canvas, and node panel, as the author sees them. */
function editorPanes(): {
  body: { right: number }
  palette: { x: number; width: number; right: number } | null
  canvas: { width: number; right: number }
  inspector: { x: number; width: number; right: number }
} {
  const box = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, width: r.width, right: r.right }
  }
  const body = document.querySelector('.tricc-editor__body')
  const canvas = document.querySelector('[data-testid="activity-canvas"]')
  const inspector = document.querySelector('.tricc-inspector')
  if (!body || !canvas || !inspector) throw new Error('editor panes are missing')
  const palette = document.querySelector('.tricc-palette')
  return {
    body: box(body),
    palette: palette ? box(palette) : null,
    canvas: box(canvas),
    inspector: box(inspector),
  }
}

/** Nodes and edges React Flow has measured and not hidden. A visibility of `hidden` is the blank canvas. */
async function expectDiagramPainted(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(hiddenDiagramIds))
    .toEqual([])
}

function hiddenDiagramIds(): string[] {
  return Array.from(document.querySelectorAll('.react-flow__node, .react-flow__edge'))
    .filter((el) => {
      const style = getComputedStyle(el)
      const box = el.getBoundingClientRect()
      return style.visibility === 'hidden' || style.display === 'none' || (box.width === 0 && box.height === 0)
    })
    .map((el) => el.getAttribute('data-id') ?? 'edge')
}

/** Counts frames where a node or edge is hidden. One hidden frame is the canvas going blank. */
async function watchDiagram(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = { frames: 0, stop: false }
    ;(window as unknown as { __diagramWatch: typeof state }).__diagramWatch = state
    const tick = () => {
      if (state.stop) return
      const hidden = Array.from(document.querySelectorAll('.react-flow__node, .react-flow__edge')).some((el) => {
        const style = getComputedStyle(el)
        const box = el.getBoundingClientRect()
        return style.visibility === 'hidden' || style.display === 'none' || (box.width === 0 && box.height === 0)
      })
      if (hidden) state.frames += 1
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

async function hiddenFrames(page: Page): Promise<number> {
  return page.evaluate(() => {
    const state = (window as unknown as { __diagramWatch?: { frames: number; stop: boolean } }).__diagramWatch
    if (state) state.stop = true
    return state?.frames ?? 0
  })
}

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

  await placeNode(page, 'integer')
  await placeNode(page, 'calculate')
  await placeNode(page, 'proposed_diagnosis')

  await expect(page.getByTestId('node-n-integer')).toHaveClass(/tricc-node--question/)
  await expect(page.getByTestId('node-n-calculate')).toHaveClass(/tricc-node--logic/)
  await expect(page.getByTestId('node-n-proposed_diagnosis')).toHaveClass(/tricc-node--clinical/)
})

test('Delete removes the selected node and the selected edge', async ({ page }) => {
  await newActivity(page, 'Delete key')
  await placeNode(page, 'note')
  const note = page.getByTestId('node-n-note')
  await expect(note).toBeVisible()
  await expect(note).toHaveClass(/is-selected/)

  await page.keyboard.press('Delete')
  await expect(note).toHaveCount(0)
  await expect(page.getByTestId('node-start')).toBeVisible()

  await placeNode(page, 'note')
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-note').locator('.react-flow__handle-top')
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await page.getByTestId('tab-connection').click()
  await page.getByTestId('select-edge-e-start-n-note').click()
  await page.keyboard.press('Delete')
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
  await expect(page.getByTestId('node-start')).toBeVisible()
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  await page.getByTestId('select-node-n-note').click()
  const name = page.getByTestId('field-name')
  await name.click()
  await name.fill('note')
  await name.press('ArrowLeft')
  await page.keyboard.press('Delete')
  await expect(name).toHaveValue('not')
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  await page.getByTestId('node-n-note').click()
  await page.keyboard.press('Backspace')
  await expect(page.getByTestId('node-n-note')).toHaveCount(0)
  await expect(page.getByTestId('node-start')).toBeVisible()
})

test('dragging one node leaves the other nodes and edges visible', async ({ page }) => {
  await newActivity(page, 'Drag keeps the diagram')
  await placeNode(page, 'note')
  await placeNode(page, 'integer')

  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-note').locator('.react-flow__handle-top')
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()

  const nodes = page.locator('.react-flow__node')
  const edges = page.locator('.react-flow__edge')
  await expect(nodes).toHaveCount(3)
  await expect(edges).toHaveCount(1)
  await expectDiagramPainted(page)
  await watchDiagram(page)

  const note = page.getByTestId('node-n-note')
  const before = await note.boundingBox()
  if (!before) throw new Error('node not rendered')
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  // Drag up as well as across. A downward drag from a fitted diagram leaves the Firefox
  // viewport, and the pointer position that comes back is not the one that was requested.
  await page.mouse.move(before.x + before.width / 2 + 120, before.y + before.height / 2 - 80, {
    steps: 10,
  })
  await page.mouse.up()

  // A single hidden frame is the diagram disappearing under the pointer.
  expect(await hiddenFrames(page)).toBe(0)
  await expect(nodes).toHaveCount(3)
  await expect(edges).toHaveCount(1)
  await expectDiagramPainted(page)
  await expect(page.getByTestId('node-start')).toBeVisible()
  await expect(page.getByTestId('node-n-integer')).toBeVisible()
  await expect(note).toBeVisible()
  const after = await note.boundingBox()
  if (!after) throw new Error('dragged node vanished')
  expect(after.x).toBeGreaterThan(before.x + 60)
})

test('dragging a node persists its position through save and reload', async ({ page }) => {
  await newActivity(page, 'Drag guideline')
  await placeNode(page, 'note')

  const node = page.getByTestId('node-n-note')
  const before = await node.boundingBox()
  if (!before) throw new Error('node not rendered')

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 160, before.y + before.height / 2 - 80, {
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
  await placeNode(page, 'note')

  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-note').locator('.react-flow__handle-top')

  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()

  await expect(page.getByTestId('branch-modal')).toHaveCount(0)
  await page.getByTestId('tab-connection').click()
  await expect(page.getByTestId('edge-list')).toContainText('start → n-note')
})

test('a node with a validation error is marked on the canvas', async ({ page }) => {
  await newActivity(page, 'Severity guideline')
  await placeNode(page, 'select_one')

  // A select with no options is an error, and the node says so without relying on colour.
  await expect(page.getByTestId('node-n-select_one')).toHaveAttribute('data-severity', 'error')
  await expect(page.getByTestId('node-n-select_one')).toHaveClass(/has-error/)
})

test('a select shows each answer, and a link from an answer follows it', async ({ page }) => {
  await newActivity(page, 'Answers')
  await placeNode(page, 'select_one')
  await page.getByTestId('add-option').click()
  await page.getByTestId('option-name-option').fill('fever')
  await page.getByTestId('option-label-option').fill('Fever')
  await page.getByTestId('add-option').click()
  await page.getByTestId('option-name-option-2').fill('rash')
  await page.getByTestId('option-label-option-2').fill('Fever and a rash today')

  await expect(page.getByTestId('node-n-select_one-answer-option')).toHaveText('Fever')
  await expect(page.getByTestId('node-n-select_one-answer-option-2')).toHaveText(
    'Fever and a rash today',
  )

  await placeNode(page, 'note')
  await page.locator('.react-flow__controls-fitview').click()
  await connectFromHandle(
    page,
    page.getByTestId('node-n-select_one-answer-option-2').locator('.react-flow__handle'),
    'node-n-note',
  )

  const label = page.getByTestId('edge-label-e-n-select_one-n-note')
  await expect(label).toHaveText('Fever and a rash tod…')
  await expect(label).toHaveAttribute('title', 'Fever and a rash today')
  await expect(page.getByTestId('field-branch-condition')).toHaveValue("Answer('rash')")
  await expect(page.getByTestId('edge-answer')).toHaveText('Follows Fever and a rash today.')
  await page.getByTestId('tab-connection').click()
  await expect(page.getByTestId('edge-list')).toContainText('(Fever and a rash tod…)')

  const fromTheAnswer = await page.evaluate(() => {
    const path = document.querySelector('.react-flow__edge path')
    const handle = document.querySelector(
      '[data-testid="node-n-select_one-answer-option-2"] .react-flow__handle',
    )
    if (!(path instanceof SVGPathElement) || !handle) return 999
    const start = path.getPointAtLength(0)
    const point = new DOMPoint(start.x, start.y).matrixTransform(path.getScreenCTM()!)
    const box = handle.getBoundingClientRect()
    return Math.abs(point.y - (box.y + box.height / 2))
  })
  expect(fromTheAnswer).toBeLessThan(16)

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('edge-label-e-n-select_one-n-note')).toHaveText('Fever and a rash tod…')
  await expect(page.getByTestId('edge-label-e-n-select_one-n-note')).toHaveAttribute(
    'title',
    'Fever and a rash today',
  )
})

test('the node output is not the first answer output', async ({ page }) => {
  await newActivity(page, 'Node out')
  await placeNode(page, 'select_one')
  await page.getByTestId('add-option').click()
  await page.getByTestId('option-name-option').fill('fever')
  await page.getByTestId('option-label-option').fill('Fever')
  await page.getByTestId('add-option').click()
  await page.getByTestId('option-name-option-2').fill('rash')
  await page.getByTestId('option-label-option-2').fill('Rash')
  // A click would stack the note on the select and cover its bottom output.
  const canvasBox = await page.getByTestId('activity-canvas').boundingBox()
  if (!canvasBox) throw new Error('canvas missing')
  await page.getByTestId('tab-nodes').click()
  const addNote = page.getByTestId('add-note')
  await addNote.scrollIntoViewIfNeeded()
  const addBox = await addNote.boundingBox()
  if (!addBox) throw new Error('palette missing')
  await page.mouse.move(addBox.x + addBox.width / 2, addBox.y + addBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.72, canvasBox.y + 72, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  await page.locator('.react-flow__controls-fitview').click()

  await connectNodes(page, 'node-n-select_one', 'node-n-note')

  await expect(page.getByTestId('edge-answer')).toHaveCount(0)
  await expect(page.getByTestId('field-branch-condition')).toHaveCount(0)
  await page.getByTestId('tab-connection').click()
  await expect(page.getByTestId('edge-list')).toHaveText('n-select_one → n-note')

  const gaps = await page.evaluate(() => {
    const path = document.querySelector('.react-flow__edge path')
    const bottom = document.querySelector(
      '[data-testid="node-n-select_one"] > .react-flow__handle-bottom',
    )
    const first = document.querySelector(
      '[data-testid="node-n-select_one-answer-option"] .react-flow__handle',
    )
    if (!(path instanceof SVGPathElement) || !bottom || !first) return null
    const start = path.getPointAtLength(0)
    const point = new DOMPoint(start.x, start.y).matrixTransform(path.getScreenCTM()!)
    const distance = (el: Element) => {
      const box = el.getBoundingClientRect()
      return Math.hypot(point.x - (box.x + box.width / 2), point.y - (box.y + box.height / 2))
    }
    return { bottom: distance(bottom), first: distance(first) }
  })
  if (!gaps) throw new Error('edge or handles missing')
  expect(gaps.bottom).toBeLessThan(16)
  expect(gaps.first).toBeGreaterThan(gaps.bottom + 8)
})

test('selecting a node on the canvas opens its properties', async ({ page }) => {
  await newActivity(page, 'Select guideline')
  await placeNode(page, 'integer')

  // Clicking the start node moves the selection.
  await page.getByTestId('node-start').click()
  await expect(page.getByTestId('node-properties')).toContainText('activity_start')
})

test('the inspector shows details, nodes, and connection one at a time', async ({ page }) => {
  await newActivity(page, 'Inspector tabs')

  await expect(page.getByTestId('tab-details')).toHaveCount(0)
  await expect(page.getByTestId('tab-nodes')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('node-list')).toBeVisible()
  await expect(page.getByTestId('edge-list')).toHaveCount(0)
  await expect(page.getByTestId('validation-summary')).toHaveCount(0)

  await page.getByTestId('tab-validation').click()
  await expect(page.getByTestId('validation-scope')).toHaveText('Whole activity')
  await expect(page.getByTestId('issue-activity.no-end')).toBeVisible()
  await page.getByTestId('tab-nodes').click()

  await page.getByTestId('tab-connection').click()
  await expect(page.locator('#inspector-connection')).toBeVisible()
  await expect(page.getByText('This activity has no connections.')).toBeVisible()
  await expect(page.getByTestId('node-list')).toHaveCount(0)
  await expect(page.getByTestId('node-properties')).toHaveCount(0)

  await page.getByTestId('tab-nodes').click()
  await page.getByTestId('select-node-start').click()
  await expect(page.getByTestId('tab-details')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('node-properties')).toContainText('activity_start')
  await expect(page.getByTestId('node-list')).toHaveCount(0)
  await expect(page.getByTestId('edge-list')).toHaveCount(0)

  await page.getByTestId('tab-nodes').click()
  await expect(page.getByTestId('node-list')).toBeVisible()
  await expect(page.getByTestId('node-properties')).toHaveCount(0)
  await expect(page.getByTestId('tab-details')).toBeVisible()

  await page.getByTestId('tab-validation').click()
  await expect(page.getByTestId('validation-scope')).toHaveText('This node')
  await expect(page.getByTestId('issue-activity.no-end')).toHaveCount(0)

  const fit = await page.evaluate(() => {
    const inspector = document.querySelector('.tricc-inspector')
    const tabs = document.querySelector('.tricc-inspector__tabs')
    if (!inspector || !tabs) return null
    const column = inspector.getBoundingClientRect()
    const bar = tabs.getBoundingClientRect()
    const clipped = [...tabs.querySelectorAll('button')]
      .filter((button) => button.scrollWidth > button.clientWidth + 1)
      .map((button) => button.textContent ?? '')
    return { columnRight: column.right, barRight: bar.right, width: column.width, clipped }
  })
  expect(fit).toBeTruthy()
  expect(fit!.barRight).toBeLessThanOrEqual(fit!.columnRight + 1)
  expect(fit!.width).toBeGreaterThan(280)
  expect(fit!.width).toBeLessThan(360)
  expect(fit!.clipped).toEqual([])

  await page.setViewportSize({ width: 390, height: 700 })
  const narrow = await page.evaluate(() => {
    const inspector = document.querySelector('.tricc-inspector')
    const tabs = document.querySelector('.tricc-inspector__tabs')
    if (!inspector || !tabs) return null
    const column = inspector.getBoundingClientRect()
    const bar = tabs.getBoundingClientRect()
    const clipped = [...tabs.querySelectorAll('button')]
      .filter((button) => button.scrollWidth > button.clientWidth + 1)
      .map((button) => button.textContent ?? '')
    return { overflow: bar.right - column.right, clipped }
  })
  expect(narrow).not.toBeNull()
  expect(narrow!.overflow).toBeLessThanOrEqual(1)
  expect(narrow!.clipped).toEqual([])
})

test('branch semantics are chosen, never typed', async ({ page }) => {
  await newActivity(page, 'Branch guideline')
  await placeNode(page, 'select_yesno')

  const source = page.getByTestId('node-start').locator('.react-flow__handle-bottom')
  const target = page.getByTestId('node-n-select_yesno').locator('.react-flow__handle-top')
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('handles not rendered')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()

  await page.getByTestId('tab-connection').click()
  await page.getByTestId('select-edge-e-start-n-select_yesno').click()
  await expect(page.getByTestId('edge-properties')).toBeVisible()

  // A typed control, not a text box: the "yes" spelling is never the author's to get wrong.
  await page.getByTestId('field-branch-kind').selectOption('yes')
  await expect(page.getByTestId('edge-label-e-start-n-select_yesno')).toHaveText('Yes')

  await page.getByTestId('field-branch-kind').selectOption('condition')
  await expect(page.getByTestId('field-branch-condition')).toBeVisible()
})

test('an edge from a yes/no or a rhombus asks for the branch before it is created', async ({ page }) => {
  await newActivity(page, 'Branch on connect')
  await placeNode(page, 'select_yesno')
  await placeNode(page, 'note')
  await page.locator('.react-flow__controls-fitview').click()
  await page.getByTestId('tab-connection').click()

  await connectNodes(page, 'node-n-select_yesno', 'node-n-note')
  const modal = page.getByTestId('branch-modal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('yes/no question')
  await expect(page.getByTestId('edge-list')).not.toContainText('n-select_yesno')

  await page.getByTestId('branch-cancel').click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('edge-list')).not.toContainText('n-select_yesno')

  await connectNodes(page, 'node-n-select_yesno', 'node-n-note')
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('edge-list')).not.toContainText('n-select_yesno')

  await connectNodes(page, 'node-n-select_yesno', 'node-n-note')
  await expect(modal).toBeVisible()
  await page.getByTestId('branch-modal-backdrop').click({ position: { x: 8, y: 8 } })
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('edge-list')).not.toContainText('n-select_yesno')

  await connectNodes(page, 'node-n-select_yesno', 'node-n-note')
  await page.getByTestId('branch-choice-follow').click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByTestId('edge-label-e-n-select_yesno-n-note')).toHaveText('Follow')
  await expect(page.getByTestId('field-branch-kind')).toHaveValue('continue')
  await expect(page.getByTestId('field-branch-kind').locator('option:checked')).toHaveText('Follow')
  await page.getByTestId('tab-connection').click()
  await expect(page.getByTestId('edge-list')).toContainText('n-select_yesno → n-note (Follow)')

  await placeNode(page, 'rhombus')
  await placeNode(page, 'integer')
  await page.locator('.react-flow__controls-fitview').click()
  await connectNodes(page, 'node-n-rhombus', 'node-n-integer')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('decision')
  await page.getByTestId('branch-choice-yes').click()
  await expect(page.getByTestId('edge-label-e-n-rhombus-n-integer')).toHaveText('Yes')
  await page.getByTestId('tab-connection').click()
  await expect(page.getByTestId('edge-list')).toContainText('n-rhombus → n-integer (Yes)')

  await placeNode(page, 'decimal')
  await page.locator('.react-flow__controls-fitview').click()
  await connectNodes(page, 'node-n-rhombus', 'node-n-decimal')
  await page.getByTestId('branch-choice-no').click()
  await expect(page.getByTestId('edge-label-e-n-rhombus-n-decimal')).toHaveText('No')
})

async function connectFromHandle(
  page: Page,
  source: ReturnType<Page['getByTestId']>,
  targetTestId: string,
): Promise<void> {
  const target = page.getByTestId(targetTestId).locator('.react-flow__handle-top')
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error(`handles not rendered for → ${targetTestId}`)
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()
}

async function connectNodes(page: Page, sourceTestId: string, targetTestId: string): Promise<void> {
  const source = page.getByTestId(sourceTestId).locator('.react-flow__handle-bottom')
  const target = page.getByTestId(targetTestId).locator('.react-flow__handle-top')
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error(`handles not rendered for ${sourceTestId} → ${targetTestId}`)
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 14 })
  await page.mouse.up()
}

test('Ctrl+Z undoes the last change and Ctrl+Shift+Z or Ctrl+Y restores it', async ({ page }) => {
  await newActivity(page, 'Undo guideline')
  // Edits inside the capture window are one undo step. Let that window close
  // so the node is its own step, not the project that was just created.
  await page.waitForTimeout(600)
  await placeNode(page, 'note')
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  await page.waitForTimeout(600)

  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('node-n-note')).toHaveCount(0)

  await page.keyboard.press('Control+Shift+z')
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('node-n-note')).toHaveCount(0)
  await page.keyboard.press('Control+y')
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  // The activity search is not a document edit, so its undo must not remove the node.
  await page.getByTestId('activity-search').fill('note')
  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  await page.getByTestId('read-only-toggle').check()
  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('node-n-note')).toBeVisible()
})

test('tidy layout repositions nodes and is undoable in one step', async ({ page }) => {
  await newActivity(page, 'Layout guideline')
  await placeNode(page, 'note')
  await placeNode(page, 'integer')

  const before = await page.getByTestId('node-n-note').boundingBox()
  await page.getByTestId('tidy-layout').click()
  const after = await page.getByTestId('node-n-note').boundingBox()

  expect(before && after).toBeTruthy()
  // Layout only ever runs when asked - never silently on open.
  expect(after!.x !== before!.x || after!.y !== before!.y).toBe(true)
})

test('dragging a palette entry drops the node under the pointer', async ({ page }) => {
  await newActivity(page, 'Palette drop')
  const canvasBox = await page.getByTestId('activity-canvas').boundingBox()
  if (!canvasBox) throw new Error('canvas missing')

  const dropAt = async (testId: string, across: number, down: number) => {
    const sourceLocator = page.getByTestId(testId)
    await sourceLocator.scrollIntoViewIfNeeded()
    const source = await sourceLocator.boundingBox()
    if (!source) throw new Error(`${testId} missing`)
    const target = {
      x: canvasBox.x + canvasBox.width * across,
      y: canvasBox.y + canvasBox.height * down,
    }
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 12 })
    await expect(page.getByTestId('palette-drag-ghost')).toBeVisible()
    await page.mouse.up()
    return target
  }

  const noteAt = await dropAt('add-note', 0.72, 0.38)
  const note = page.getByTestId('node-n-note')
  await expect(note).toBeVisible()
  const noteBox = await note.boundingBox()
  if (!noteBox) throw new Error('note missing')
  expect(Math.abs(noteBox.x - noteAt.x)).toBeLessThan(28)
  expect(Math.abs(noteBox.y - noteAt.y)).toBeLessThan(28)

  await page.getByTestId('tab-nodes').click()
  const numberAt = await dropAt('add-integer', 0.42, 0.7)
  const number = page.getByTestId('node-n-integer')
  await expect(number).toBeVisible()
  const numberBox = await number.boundingBox()
  if (!numberBox) throw new Error('integer missing')
  expect(Math.abs(numberBox.x - numberAt.x)).toBeLessThan(28)
  expect(Math.abs(numberBox.y - numberAt.y)).toBeLessThan(28)
  expect(Math.abs(noteBox.x - numberBox.x) + Math.abs(noteBox.y - numberBox.y)).toBeGreaterThan(80)
})

test('a palette drag released off the diagram adds nothing', async ({ page }) => {
  await newActivity(page, 'Palette cancel')
  const button = page.getByTestId('add-note')
  await button.scrollIntoViewIfNeeded()
  const source = await button.boundingBox()
  if (!source) throw new Error('palette missing')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2 + 48, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByTestId('node-n-note')).toHaveCount(0)
  await expect(page.getByTestId('palette-drag-ghost')).toHaveCount(0)
})

test('read-only removes dragging and the palette but keeps the canvas readable', async ({
  page,
}) => {
  await newActivity(page, 'Read only canvas')

  const writable = await page.evaluate(editorPanes)
  expect(writable.palette).not.toBeNull()
  expect(writable.palette!.x).toBeGreaterThan(writable.canvas.right - 2)

  await placeNode(page, 'note')
  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  await expect(page.getByTestId('add-note')).toHaveCount(0)

  const locked = await page.evaluate(editorPanes)
  // Add a node sits in the inspector. Hiding it does not change the canvas width.
  expect(locked.palette).toBeNull()
  expect(locked.inspector.width).toBeGreaterThan(280)
  expect(locked.inspector.width).toBeLessThan(400)
  expect(Math.abs(locked.inspector.width - writable.inspector.width)).toBeLessThan(2)
  expect(locked.inspector.x).toBeGreaterThan(locked.canvas.right - 2)
  expect(Math.abs(locked.inspector.right - locked.body.right)).toBeLessThan(2)
  expect(Math.abs(locked.canvas.width - writable.canvas.width)).toBeLessThan(2)

  const node = page.getByTestId('node-n-note')
  const before = await node.boundingBox()
  if (!before) throw new Error('node not rendered')
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + 200, before.y + 120, { steps: 10 })
  await page.mouse.up()

  const after = await node.boundingBox()
  expect(Math.abs(after!.x - before.x)).toBeLessThan(4)

  await page.setViewportSize({ width: 390, height: 700 })
  const narrow = await page.evaluate(editorPanes)
  expect(narrow.palette).toBeNull()
  expect(narrow.inspector.width).toBeGreaterThan(280)
  expect(narrow.inspector.width).toBeLessThan(400)
  expect(narrow.inspector.x).toBeGreaterThan(narrow.canvas.right - 2)
  expect(Math.abs(narrow.inspector.right - narrow.body.right)).toBeLessThan(2)
})

test('a quantity keeps its unit', async ({ page }) => {
  await newActivity(page, 'Quantity')
  await placeNode(page, 'quantity')
  await expect(page.getByTestId('node-n-quantity')).toHaveClass(/tricc-node--question/)
  await page.getByTestId('field-unit').fill('kg')
  await page.getByTestId('field-unit-system').fill('http://unitsofmeasure.org')
  await page.getByTestId('field-unit-code').fill('kg')
  await page.getByTestId('field-min').fill('0')
  await page.getByTestId('field-max').fill('200')

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('nav-activity-activity').click()
  await page.getByTestId('node-n-quantity').click()
  await expect(page.getByTestId('field-unit')).toHaveValue('kg')
  await expect(page.getByTestId('field-unit-system')).toHaveValue('http://unitsofmeasure.org')
  await expect(page.getByTestId('field-unit-code')).toHaveValue('kg')
  await expect(page.getByTestId('field-min')).toHaveValue('0')
  await expect(page.getByTestId('field-max')).toHaveValue('200')
})

test('a goto selects an activity, and never a process activity', async ({ page }) => {
  await newActivity(page, 'Goto guideline')
  // A second normal activity to jump to, and a process activity that must not be offered.
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('tab-processes').click()
  await page.getByTestId('add-process').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()

  await page.getByTestId('tab-activities').click()
  await page.getByTestId(`nav-activity-${FIRST_ACTIVITY}`).click()
  await placeNode(page, 'goto')

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
  await page.getByTestId('tab-validation').click()
  await expect(page.getByTestId('issue-goto.no-link')).toHaveCount(0)
})

test('a goto with no destination is reported until one is chosen', async ({ page }) => {
  await newActivity(page, 'Dangling goto guideline')
  await placeNode(page, 'goto')
  await page.getByTestId('tab-validation').click()

  const issue = page.getByTestId('issue-goto.no-link')
  await expect(issue).toBeVisible()
  await expect(issue).toContainText('Choose the activity it goes to')
})
