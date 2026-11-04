import { expect, test, type Page } from '@playwright/test'

/**
 * The right-hand panel: 20% of the window, never under its minimum, resizable, collapsible,
 * reset by a window resize, collapsed by default under 1200px and full width under 900px
 * (GitHub RFC #9). Widths need real layout, so these cannot be component tests.
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

async function newProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
}

async function newActivity(page: Page, name: string): Promise<void> {
  await newProject(page, name)
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
}

const panel = (page: Page, id = 'flow-side-panel') => page.locator(`#${id}`)

async function panelWidth(page: Page, id = 'flow-side-panel'): Promise<number> {
  const box = await panel(page, id).boundingBox()
  if (!box) throw new Error('the panel is not shown')
  return Math.round(box.width)
}

/** Drag the panel's edge by `dx` pixels (negative widens it). */
async function dragEdge(page: Page, dx: number): Promise<void> {
  const box = await page.getByTestId('panel-resizer').boundingBox()
  if (!box) throw new Error('no resize handle')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y, { steps: 4 })
  await page.mouse.move(x + dx, y, { steps: 4 })
  await page.mouse.up()
}

test('the flow inspector is 20% of the window, never under 320px', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel width')
  expect(await panelWidth(page)).toBe(320)

  await page.setViewportSize({ width: 1920, height: 800 })
  await expect.poll(() => panelWidth(page)).toBe(384)
})

test('dragging resizes the panel, a window resize resets it', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel drag')

  await dragEdge(page, -200)
  await expect.poll(() => panelWidth(page)).toBeGreaterThan(500)

  // Just below the minimum it stops at the minimum.
  await dragEdge(page, (await panelWidth(page)) - 300)
  await expect.poll(() => panelWidth(page)).toBe(320)

  await dragEdge(page, -200)
  await page.setViewportSize({ width: 1500, height: 800 })
  await expect.poll(() => panelWidth(page)).toBe(320)
})

test('dragging well past the minimum collapses the panel to a rail', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel collapse')

  await dragEdge(page, 150)
  await expect(page.getByTestId('panel-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => panelWidth(page)).toBe(32)
  await expect(page.getByTestId('tab-nodes')).toHaveCount(0)

  // A collapsed panel stays collapsed when the window changes.
  await page.setViewportSize({ width: 1700, height: 800 })
  await expect.poll(() => panelWidth(page)).toBe(32)

  await page.getByTestId('panel-toggle').click()
  await expect.poll(() => panelWidth(page)).toBe(340)
  await expect(page.getByTestId('tab-nodes')).toBeVisible()
})

test('the toggle hides the panel; a selection while hidden leaves a dot', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel toggle')

  await page.getByTestId('panel-toggle').click()
  await expect.poll(() => panelWidth(page)).toBe(32)
  await expect(page.getByTestId('panel-dot')).toHaveCount(0)

  await page.getByTestId('node-start').click()
  await expect(page.getByTestId('panel-dot')).toBeVisible()
  await expect(page.getByTestId('panel-toggle')).toHaveAttribute('aria-expanded', 'false')

  await page.getByTestId('panel-toggle').click()
  await expect(page.getByTestId('node-properties')).toContainText('activity_start')
})

test('under 1200px a page opens with the panel collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await newActivity(page, 'Panel narrow')
  await expect(page.getByTestId('panel-toggle')).toHaveAttribute('aria-expanded', 'false')
  expect(await panelWidth(page)).toBe(32)
})

test('shrinking the window past 1200px or 900px collapses the panel', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel shrink')
  const toggle = page.getByTestId('panel-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await page.setViewportSize({ width: 1100, height: 800 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  // Growing never reopens it.
  await page.setViewportSize({ width: 1600, height: 800 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await page.setViewportSize({ width: 1000, height: 800 })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.setViewportSize({ width: 850, height: 800 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('under 900px an open panel covers the canvas', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 800 })
  await newActivity(page, 'Panel phone')
  const toggle = page.getByTestId('panel-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(await panelWidth(page)).toBe(32)

  await toggle.click()
  const body = await page.locator('.tricc-editor__body').boundingBox()
  await expect.poll(() => panelWidth(page)).toBe(Math.round(body!.width))
  await expect(page.getByTestId('panel-resizer')).toBeHidden()

  await page.getByTestId('panel-toggle').click()
  await expect.poll(() => panelWidth(page)).toBe(32)
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
})

test('every flow shares the panel width and state', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newActivity(page, 'Panel shared')
  await dragEdge(page, -200)
  await expect.poll(() => panelWidth(page)).toBeGreaterThan(500)
  const width = await panelWidth(page)

  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  await expect.poll(() => panelWidth(page)).toBe(width)

  await page.getByTestId('panel-toggle').click()
  // Through the project page and back: the flow page is mounted again.
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('panel-toggle')).toHaveAttribute('aria-expanded', 'false')
})

test('every inspector tab can be reached by scrolling the tab row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await newActivity(page, 'Panel tabs')
  await page.getByTestId('node-start').click()
  await expect(page.getByTestId('tab-details')).toBeVisible()

  const tabs = page.locator('#flow-side-panel [role="tablist"]')
  const clipped = await tabs.evaluate((row) =>
    [...row.querySelectorAll('button')]
      .filter((b) => b.scrollWidth > b.clientWidth + 1)
      .map((b) => b.textContent),
  )
  expect(clipped).toEqual([])

  const last = page.getByTestId('tab-validation')
  await last.scrollIntoViewIfNeeded()
  await last.click()
  await expect(last).toHaveAttribute('aria-selected', 'true')
})

test('the project panel has a 340px minimum and the same controls', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await newProject(page, 'Project panel')
  expect(await panelWidth(page, 'project-side-panel')).toBe(340)

  await page.setViewportSize({ width: 2000, height: 800 })
  await expect.poll(() => panelWidth(page, 'project-side-panel')).toBe(400)

  await dragEdge(page, -100)
  await expect.poll(() => panelWidth(page, 'project-side-panel')).toBe(500)

  await page.getByTestId('panel-toggle').click()
  await expect.poll(() => panelWidth(page, 'project-side-panel')).toBe(32)
  await page.getByTestId('panel-toggle').click()
  await expect(page.getByTestId('tab-info')).toBeVisible()
})
