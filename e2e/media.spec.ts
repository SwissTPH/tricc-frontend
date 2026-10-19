import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Pictures (feature/20261012-images.md): the image library on the Media tab, pictures in
 * texts, a picture dropped on a node, and the files saved and exported with the project.
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

/** A 1×1 PNG. */
const DOT = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

async function newActivity(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
}

/** A decimal question named `weight_kg`, with a concept whose display is "Weight". */
async function weightQuestion(page: Page): Promise<Locator> {
  await page.getByTestId('add-decimal').click()
  await page.getByTestId('field-name').fill('weight_kg')
  await page.getByTestId('concept-create').click()
  await page.getByTestId('concept-display').fill('Weight')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('node-n-decimal-label')).toHaveText('Weight')
  return page.getByTestId('node-n-decimal')
}

/** Drop picture files on an element, as a file dragged from the desktop does. */
async function dropPicture(target: Locator, name: string, png: Buffer = DOT): Promise<void> {
  const transfer = await target.page().evaluateHandle(
    ({ name, b64 }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const dt = new DataTransfer()
      dt.items.add(new File([bytes], name, { type: 'image/png' }))
      return dt
    },
    { name, b64: png.toString('base64') },
  )
  await target.dispatchEvent('dragover', { dataTransfer: transfer })
  await target.dispatchEvent('drop', { dataTransfer: transfer })
}

/** A PNG `width` × `height`, drawn in the page. */
async function widePng(page: Page, width: number, height: number): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ({ width, height }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#c33'
      ctx.fillRect(0, 0, width, height)
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (const b of bytes) bin += String.fromCharCode(b)
      return btoa(bin)
    },
    { width, height },
  )
  return Buffer.from(b64, 'base64')
}

test('the Media tab adds a picture smaller than the preference, renames and deletes it', async ({ page }) => {
  await newActivity(page, 'Media library')
  await page.getByTestId('tab-media').click()
  await expect(page.getByTestId('no-images')).toBeVisible()

  const wide = await widePng(page, 2000, 100)
  await page.getByTestId('media-file').setInputFiles({ name: 'Red Band.png', mimeType: 'image/png', buffer: wide })
  const tile = page.getByTestId('media-image-red-band')
  await expect(tile).toBeVisible()
  // Wider than the 800 px default: made smaller, in proportion.
  await expect(tile).toContainText('800 × 40 px')
  await expect(page.getByTestId('media-users-red-band')).toHaveText('Not shown by any text')

  await page.getByTestId('media-rename-red-band').click()
  await page.getByTestId('media-rename-name').fill('muac-red')
  await page.getByTestId('media-rename-save').click()
  await expect(page.getByTestId('media-image-muac-red')).toBeVisible()
  await expect(page.getByTestId('media-image-red-band')).toHaveCount(0)

  await page.getByTestId('media-delete-muac-red').click()
  await page.getByTestId('media-delete-confirm').click()
  await expect(page.getByTestId('no-images')).toBeVisible()
})

test('a picture dropped on a node shows on top of it, is saved, and is exported', async ({ page }) => {
  await newActivity(page, 'Dropped picture')
  const node = await weightQuestion(page)
  const before = (await node.boundingBox())!

  await dropPicture(node, 'scale.png')
  const picture = page.getByTestId('node-n-decimal-picture')
  await expect(picture.locator('img')).toBeVisible()
  // On top, inside the node's own width; the words stay.
  const after = (await node.boundingBox())!
  expect(Math.round(after.width)).toBe(Math.round(before.width))
  await expect(page.getByTestId('node-n-decimal-label')).toHaveText('Weight')

  // The picture is first in the concept's questionnaire text.
  await page.getByTestId('concept-edit').click()
  await expect(page.getByTestId('concept-q-display').locator('img[data-image="scale"]')).toBeVisible()
  await page.getByTestId('concept-dialog-cancel').click()

  // The library lists it with the concept that shows it.
  await page.getByTestId('tab-media').click()
  await expect(page.getByTestId('media-users-scale')).toContainText('weight_kg')

  // Saved: a reload still shows it.
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
  await page.reload()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('node-n-decimal-picture').locator('img')).toBeVisible()

  // Exported: the archive carries the file next to the YAML.
  const download = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-archive').click()]).then(
    ([d]) => d,
  )
  const path = await download.path()
  if (!path) throw new Error('download produced no file')
  expect(readFileSync(path).toString('latin1')).toContain('media/images/scale.png')
})

test('the text editor inserts a picture from the library picker', async ({ page }) => {
  await newActivity(page, 'Picked picture')
  await weightQuestion(page)
  await page.getByTestId('concept-edit').click()
  await page.getByTestId('concept-q-display-format').click()
  await page.getByTestId('concept-q-display-image').click()
  await expect(page.getByTestId('image-picker-empty')).toBeVisible()
  await page.getByTestId('image-picker-file').setInputFiles({ name: 'chest.png', mimeType: 'image/png', buffer: DOT })
  // One new picture is inserted at once.
  await expect(page.getByTestId('image-picker')).toHaveCount(0)
  await expect(page.getByTestId('concept-q-display-rich').locator('img[data-image="chest"]')).toBeVisible()

  // Saved through both dialogs, the picture reaches the node.
  await page.getByTestId('concept-q-display-modal-save').click()
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('node-n-decimal-picture').locator('img')).toBeVisible()
})

test('the picker opens above the text editor and a library picture is clicked in', async ({ page }) => {
  await newActivity(page, 'Picker on top')
  await page.getByTestId('tab-media').click()
  await page.getByTestId('media-file').setInputFiles({ name: 'rash.png', mimeType: 'image/png', buffer: DOT })
  await expect(page.getByTestId('media-image-rash')).toBeVisible()
  await page.getByTestId('tab-activities').click()
  await page.getByTestId(`nav-activity-activity`).click()
  await weightQuestion(page)
  await page.getByTestId('concept-edit').click()
  await page.getByTestId('concept-q-display-format').click()
  await page.getByTestId('concept-q-display-image').click()
  // A real click: it fails when the text editor covers the picker.
  await page.getByTestId('image-pick-rash').click({ timeout: 5_000 })
  await expect(page.getByTestId('image-picker')).toHaveCount(0)
  await expect(page.getByTestId('concept-q-display-rich').locator('img[data-image="rash"]')).toBeVisible()
})

test('Escape closes the picture picker only', async ({ page }) => {
  await newActivity(page, 'Escape picker')
  await weightQuestion(page)
  await page.getByTestId('concept-edit').click()
  await page.getByTestId('concept-q-display-format').click()
  await page.getByTestId('concept-q-display-image').click()
  await expect(page.getByTestId('image-picker')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('image-picker')).toHaveCount(0)
  await expect(page.getByTestId('concept-q-display-modal')).toBeVisible()
  await expect(page.getByTestId('concept-dialog')).toBeVisible()
})

test('a picture drawn on a draw.io page joins the library and shows on its question', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Drawn pictures')
  await page.getByTestId('create-project').click()
  const cell = (id: string, attrs: string, label: string, y: number) =>
    `<object id="${id}" label="${label}" ${attrs}><mxCell vertex="1" parent="1"><mxGeometry x="40" y="${y}" width="160" height="48" as="geometry"/></mxCell></object>`
  const edge = (id: string, source: string, target: string) =>
    `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`
  const drawing = `<mxfile><diagram id="wm" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${[
    cell('ws', 'odk_type="activity_start"', 'Weight measurement', 20),
    cell('wk', 'odk_type="decimal" name="weight_kg"', 'Weight (kg)', 120),
    `<mxCell id="img" vertex="1" parent="1" style="shape=image;image=data:image/png,${DOT.toString('base64')};"><mxGeometry x="240" y="120" width="40" height="40" as="geometry"/></mxCell>`,
    edge('e1', 'ws', 'wk'),
    edge('e2', 'img', 'wk'),
  ].join('')}</root></mxGraphModel></diagram></mxfile>`

  await page.getByTestId('import-activity-file').setInputFiles({
    name: 'weight.drawio',
    mimeType: 'application/xml',
    buffer: Buffer.from(drawing),
  })
  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('node-wk-picture').locator('img')).toBeVisible()

  await page.getByTestId('tab-media').click()
  await expect(page.getByTestId('media-view')).toBeVisible()
  await expect(page.getByTestId('no-images')).toHaveCount(0)
})
