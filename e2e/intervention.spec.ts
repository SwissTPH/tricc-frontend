import { expect, test, type Page } from '@playwright/test'

/**
 * An intervention lists activities. The condition lives on the intervention, not on each reference.
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

/** Drive the typeahead the way an author does: type, then pick from the list. */
async function pickActivity(page: Page, testId: string, activityId: string): Promise<void> {
  await page.getByTestId(testId).fill(activityId)
  await page.getByTestId(`${testId}-option-${activityId}`).click()
}

/** Segments are added in the intervention editor: open it (if it is not open) and add one. */
async function openSegmentPicker(page: Page, iv = 'intervention'): Promise<void> {
  if ((await page.getByTestId(`intervention-settings-${iv}`).count()) === 0) {
    await page.getByTestId(`configure-intervention-${iv}`).click()
  }
  await page.getByTestId(`add-process-to-${iv}`).click()
}

async function closeEditor(page: Page, iv = 'intervention'): Promise<void> {
  await page.getByTestId(`intervention-settings-${iv}-close`).click()
  await expect(page.getByTestId(`intervention-settings-${iv}`)).toHaveCount(0)
}

/** A project holding one process activity, which an intervention can list. */
async function projectWithProcessActivity(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await page.getByTestId('tab-processes').click()
  await page.getByTestId('add-process').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  await page.getByTestId('nav-overview').click()
}

test('builds an intervention from scratch and it survives a reload', async ({ page }) => {
  await projectWithProcessActivity(page, 'Intervention guideline')

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('configure-intervention-intervention').click()

  await page.getByTestId('iv-title-intervention').fill('Sick child consultation')
  await page.getByTestId('iv-name-intervention').fill('sick-child')
  await page.getByTestId('iv-intent-intervention').fill('Children under five')
  await page.getByTestId('iv-cql-intervention').fill('AgeInMonths() < 60')
  await expect(page.getByTestId('intervention-settings-intervention-save')).toBeVisible()
  await expect(page.getByTestId('intervention-settings-intervention-close')).toBeVisible()
  await page.getByTestId('intervention-settings-intervention-save').click()
  await expect(page.getByTestId('intervention-settings-intervention')).toHaveCount(0)
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).toBeVisible()
  await closeEditor(page)
  await expect(page.getByTestId('intervention-intervention')).toContainText(
    'Sick child consultation',
  )
  await expect(page.getByTestId('segment-intervention-triage-process')).toBeVisible()

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()

  await expect(page.getByTestId('segment-intervention-triage-process')).toBeVisible()
  await expect(page.getByTestId('intervention-intervention-applicability')).toContainText(
    'Children under five',
  )
})

test('an activity in an intervention is no longer unassigned', async ({ page }) => {
  await projectWithProcessActivity(page, 'Assignment guideline')
  await expect(page.getByTestId('unassigned-triage-process')).toBeVisible()

  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  await expect(page.getByTestId('unassigned-triage-process')).toHaveCount(0)
})

test('the condition stays on the intervention, not on the activity reference', async ({ page }) => {
  await projectWithProcessActivity(page, 'Conditional guideline')
  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  // Back in the intervention editor once the segment is added.
  await page.getByTestId('iv-cql-intervention').fill('AgeInMonths() < 60')

  await expect(page.getByTestId('iv-cql-intervention')).toHaveValue('AgeInMonths() < 60')
  await expect(
    page.getByTestId('intervention-intervention-activity-triage-process'),
  ).not.toContainText('conditional')
  await expect(page.locator('[data-testid^="iv-activity-cql-"]')).toHaveCount(0)
})

test('a reserved trigger mode is selectable but blocks export', async ({ page }) => {
  await projectWithProcessActivity(page, 'Trigger guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('configure-intervention-intervention').click()

  await page.getByTestId('iv-trigger-intervention').selectOption('planned')
  await closeEditor(page)
  await page.getByTestId('tab-validation').click()

  const issue = page.getByTestId('issue-intervention.reserved-trigger')
  await expect(issue).toBeVisible()
  await expect(issue).toContainText('planning layer')
})

test('read-only disables intervention editing entirely', async ({ page }) => {
  await projectWithProcessActivity(page, 'Read only intervention')
  await page.getByTestId('add-intervention').click()

  await page.getByTestId('mode-menu').click()
  await page.getByTestId('mode-viewing').click()
  await page.getByTestId('configure-intervention-intervention').click()

  await expect(page.getByTestId('iv-title-intervention')).toBeDisabled()
  await expect(page.getByTestId('intervention-settings-intervention-save')).toHaveCount(0)
  await page.getByTestId('intervention-settings-intervention-close').click()
  await expect(page.getByTestId('intervention-settings-intervention')).toHaveCount(0)
  await expect(page.getByTestId('add-activity-to-intervention')).toHaveCount(0)
  await expect(page.getByTestId('create-process-activity-intervention')).toHaveCount(0)
  await expect(page.getByTestId('delete-intervention-intervention')).toHaveCount(0)
})

test('deleting an intervention asks first', async ({ page }) => {
  await projectWithProcessActivity(page, 'Delete intervention')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('configure-intervention-intervention').click()

  await page.getByTestId('delete-intervention-intervention').click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await expect(page.getByTestId('intervention-intervention')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByTestId('intervention-settings-intervention')).toBeVisible()

  await page.getByTestId('delete-intervention-intervention').click()
  await page.getByTestId('delete-intervention-intervention-cancel').click()
  await expect(page.getByTestId('intervention-intervention')).toBeVisible()

  await page.getByTestId('delete-intervention-intervention').click()
  await page.getByTestId('delete-intervention-intervention-confirm').click()
  await expect(page.getByTestId('intervention-intervention')).toHaveCount(0)
  await expect(page.getByTestId('no-interventions')).toBeVisible()
})

test('the activity picker searches rather than listing everything', async ({ page }) => {
  await projectWithProcessActivity(page, 'Search guideline')
  // Two more process activities, so filtering has something to do.
  for (const _ of [1, 2]) {
    await page.getByTestId('add-process').click()
    await page.getByTestId('new-process-name').fill('triage')
    await page.getByTestId('add-process-activity').click()
    await page.getByTestId('nav-overview').click()
  }

  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)

  const picker = page.getByTestId('add-activity-to-intervention')
  // Scoped to the picker's own listbox.
  const suggestions = page.getByTestId('add-activity-to-intervention-list').getByRole('option')

  await picker.click()
  await expect(suggestions).toHaveCount(3)

  await picker.fill('triage-process-2')
  await expect(suggestions).toHaveCount(1)
  await expect(
    page.getByTestId('add-activity-to-intervention-option-triage-process-2'),
  ).toBeVisible()
})

test('the activity picker is fully keyboard operable', async ({ page }) => {
  await projectWithProcessActivity(page, 'Keyboard guideline')
  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)

  const picker = page.getByTestId('add-activity-to-intervention')
  await picker.focus()
  await expect(picker).toHaveAttribute('aria-expanded', 'true')

  // Arrow to highlight, Enter to pick - no mouse involved.
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).toBeVisible()
})

test('the picker says so when there is nothing left to add', async ({ page }) => {
  await projectWithProcessActivity(page, 'Exhausted guideline')
  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')
  await openSegmentPicker(page)

  await expect(page.getByTestId('add-activity-to-intervention-exhausted')).toContainText(
    'already listed',
  )
})

test('the two kinds of activity are listed and marked separately', async ({ page }) => {
  await projectWithProcessActivity(page, 'Kinds guideline')
  await page.getByTestId('tab-activities').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('nav-overview').click()

  await expect(page.getByTestId('nav-activity-activity')).toHaveAttribute('data-kind', 'activity')
  await page.getByTestId('tab-processes').click()
  const processEntry = page.getByTestId('nav-activity-triage-process')
  await expect(page.getByTestId('process-activity-list')).toContainText('triage')
  await expect(processEntry).toHaveAttribute('data-kind', 'process')

  // The editor says which kind is open, and only a process activity names a process.
  await processEntry.click()
  await expect(page.getByTestId('activity-kind')).toHaveText('Segment')
  await expect(page.getByTestId('activity-process')).toHaveValue('triage')

  await page.getByTestId('tab-activities').click()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('activity-kind')).toHaveText('Activity')
  await expect(page.getByTestId('activity-process')).toHaveCount(0)
})

test('a normal activity can be listed on an intervention', async ({ page }) => {
  await projectWithProcessActivity(page, 'Wrapper guideline')
  await page.getByTestId('tab-activities').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('nav-overview').click()

  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)

  const picker = page.getByTestId('add-activity-to-intervention')
  await picker.click()

  await expect(page.getByTestId('add-activity-to-intervention-option-triage-process')).toBeVisible()
  await expect(page.getByTestId('add-activity-to-intervention-option-activity')).toHaveCount(0)
  await expect(page.getByTestId('issue-intervention.not-a-process-activity')).toHaveCount(0)
})

test('creates a process activity straight from the intervention', async ({ page }) => {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Shortcut guideline')
  await page.getByTestId('create-project').click()

  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)

  // Nothing exists yet, so the picker says what to do and the shortcut creates one.
  await expect(page.getByTestId('add-activity-to-intervention-exhausted')).toContainText(
    'no segments yet',
  )

  await page.getByTestId('process-name-intervention').fill('registration')
  await page.getByTestId('create-process-activity-intervention').click()
  await expect(
    page.getByTestId('intervention-intervention-activity-registration-process'),
  ).toBeVisible()
  await closeEditor(page)
  await page.getByTestId('tab-processes').click()
  await expect(page.getByTestId('nav-activity-registration-process')).toHaveAttribute(
    'data-kind',
    'process',
  )
})

test('overview, processes, and activities use the full browser width', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 900 })
  await projectWithProcessActivity(page, 'Column width')

  const root = await page.locator('#root').boundingBox()
  if (!root) throw new Error('app column missing')
  expect(root.x).toBeLessThanOrEqual(1)
  expect(root.width).toBeGreaterThanOrEqual(1680 - 1)

  await page.getByTestId('tab-processes').click()
  const processes = await page.getByTestId('activity-navigator').boundingBox()
  expect(processes!.width).toBeLessThanOrEqual(root.width + 1)
  await page.getByTestId('nav-activity-triage-process').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()

  await page.getByTestId('tab-activities').click()
  const activities = await page.getByTestId('activity-navigator').boundingBox()
  expect(activities!.width).toBeLessThanOrEqual(root.width + 1)
  const editor = await page.getByTestId('activity-editor').boundingBox()
  expect(editor!.width).toBeLessThanOrEqual(root.width + 1)
  expect(editor!.width).toBeGreaterThanOrEqual(1680 - 32)
})

test('the intervention table lists segments as sub-rows, filters, and opens one', async ({
  page,
}) => {
  await projectWithProcessActivity(page, 'Table guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')
  await page.getByTestId('iv-labels-intervention').fill('malaria,')
  await closeEditor(page)

  // Rows stack in one table; the segment is a sub-row, expanded by default.
  const first = await page.getByTestId('intervention-intervention').boundingBox()
  const second = await page.getByTestId('intervention-intervention-2').boundingBox()
  expect(second!.y).toBeGreaterThan(first!.y)
  const segment = page.getByTestId('segment-intervention-triage-process')
  await expect(segment).toBeVisible()

  await page.getByTestId('expand-all-interventions').click()
  await expect(segment).toHaveCount(0)
  await page.getByTestId('expand-all-interventions').click()
  await expect(segment).toBeVisible()

  // By name or code, and by label.
  await page.getByTestId('intervention-filter').fill('intervention-2')
  await expect(page.getByTestId('intervention-intervention')).toHaveCount(0)
  await expect(page.getByTestId('intervention-intervention-2')).toBeVisible()
  await page.getByTestId('intervention-filter').fill('')
  await page.getByTestId('intervention-label-filter').click()
  await page.getByRole('option', { name: 'malaria' }).click()
  await expect(page.getByTestId('intervention-intervention')).toBeVisible()
  await expect(page.getByTestId('intervention-intervention-2')).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByTestId('open-segment-intervention-triage-process').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()
  await expect(page.getByTestId('activity-kind')).toHaveText('Segment')
})

test('activities are ordered on the intervention', async ({ page }) => {
  await projectWithProcessActivity(page, 'Order guideline')
  await page.getByTestId('add-process').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()
  await page.getByTestId('nav-overview').click()

  await page.getByTestId('add-intervention').click()
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')
  await openSegmentPicker(page)
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process-2')

  const listed = page.getByTestId('iv-activities-intervention').getByRole('listitem')
  await expect(listed.first()).toHaveAttribute(
    'data-testid',
    'intervention-intervention-activity-triage-process',
  )

  await page.getByTestId('move-down-intervention-triage-process').click()
  await expect(listed.first()).toHaveAttribute(
    'data-testid',
    'intervention-intervention-activity-triage-process-2',
  )
})
