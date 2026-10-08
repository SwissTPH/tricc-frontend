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

/** A project holding one process activity, which an intervention can list. */
async function projectWithProcessActivity(page: Page, name: string): Promise<void> {
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
  await page.getByTestId('iv-code-intervention').fill('sick-child')
  await page.getByTestId('iv-intent-intervention').fill('Children under five')
  await page.getByTestId('iv-cql-intervention').fill('AgeInMonths() < 60')
  await expect(page.getByTestId('intervention-settings-intervention-save')).toBeVisible()
  await expect(page.getByTestId('intervention-settings-intervention-close')).toBeVisible()
  await page.getByTestId('intervention-settings-intervention-save').click()
  await expect(page.getByTestId('intervention-settings-intervention')).toHaveCount(0)
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sick child consultation' })).toBeVisible()

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()

  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).toBeVisible()
  await expect(page.getByTestId('intervention-intervention-applicability')).toContainText(
    'Children under five',
  )
})

test('an activity in an intervention is no longer unassigned', async ({ page }) => {
  await projectWithProcessActivity(page, 'Assignment guideline')
  await expect(page.getByTestId('unassigned-triage-process')).toBeVisible()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  await expect(page.getByTestId('unassigned-triage-process')).toHaveCount(0)
})

test('the condition stays on the intervention, not on the activity reference', async ({ page }) => {
  await projectWithProcessActivity(page, 'Conditional guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  await page.getByTestId('configure-intervention-intervention').click()
  await page.getByTestId('iv-cql-intervention').fill('AgeInMonths() < 60')

  await expect(page.getByTestId('iv-cql-intervention')).toHaveValue('AgeInMonths() < 60')
  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).not.toContainText(
    'conditional',
  )
  await expect(page.locator('[data-testid^="iv-activity-cql-"]')).toHaveCount(0)
})

test('a reserved trigger mode is selectable but blocks export', async ({ page }) => {
  await projectWithProcessActivity(page, 'Trigger guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('configure-intervention-intervention').click()

  await page.getByTestId('iv-trigger-intervention').selectOption('planned')

  const issue = page.getByTestId('issue-intervention.reserved-trigger')
  await expect(issue).toBeVisible()
  await expect(issue).toContainText('planning layer')
})

test('read-only disables intervention editing entirely', async ({ page }) => {
  await projectWithProcessActivity(page, 'Read only intervention')
  await page.getByTestId('add-intervention').click()

  await page.getByTestId('read-only-toggle').check()
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
  await page.getByTestId('add-process-to-intervention').click()

  const picker = page.getByTestId('add-activity-to-intervention')
  // Scoped to the picker's own listbox.
  const suggestions = page.getByTestId('add-activity-to-intervention-list').getByRole('option')

  await picker.click()
  await expect(suggestions).toHaveCount(3)

  await picker.fill('triage-process-2')
  await expect(suggestions).toHaveCount(1)
  await expect(page.getByTestId('add-activity-to-intervention-option-triage-process-2')).toBeVisible()
})

test('the activity picker is fully keyboard operable', async ({ page }) => {
  await projectWithProcessActivity(page, 'Keyboard guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()

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
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')
  await page.getByTestId('add-process-to-intervention').click()

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
  await expect(page.getByTestId('activity-kind')).toHaveText('Process activity')
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
  await page.getByTestId('add-process-to-intervention').click()

  const picker = page.getByTestId('add-activity-to-intervention')
  await picker.click()

  await expect(page.getByTestId('add-activity-to-intervention-option-triage-process')).toBeVisible()
  await expect(page.getByTestId('add-activity-to-intervention-option-activity')).toHaveCount(0)
  await expect(page.getByTestId('issue-intervention.not-a-process-activity')).toHaveCount(0)
})

test('creates a process activity straight from the intervention', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Shortcut guideline')
  await page.getByTestId('create-project').click()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()

  // Nothing exists yet, so the picker says what to do and the shortcut creates one.
  await expect(page.getByTestId('add-activity-to-intervention-exhausted')).toContainText(
    'no processes yet',
  )

  await page.getByTestId('process-name-intervention').fill('registration')
  await page.getByTestId('create-process-activity-intervention').click()
  await expect(page.getByTestId('intervention-intervention-activity-registration-process')).toBeVisible()
  await page.getByTestId('tab-processes').click()
  await expect(page.getByTestId('nav-activity-registration-process')).toHaveAttribute(
    'data-kind',
    'process',
  )
})

test('overview, processes, and activities share one readable column', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 900 })
  await projectWithProcessActivity(page, 'Column width')

  const root = await page.locator('#root').boundingBox()
  if (!root) throw new Error('app column missing')
  expect(root.width).toBeLessThanOrEqual(72 * 16 + 1)
  expect(root.x).toBeGreaterThan(40)
  expect(root.x + root.width).toBeLessThan(1640)

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
})

test('intervention cards sit side by side, and a process chip opens it', async ({ page }) => {
  await projectWithProcessActivity(page, 'Cards guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')

  const first = page.getByTestId('intervention-intervention')
  const second = page.getByTestId('intervention-intervention-2')
  const wide = await boxes(first, second)
  expect(wide.secondX).toBeGreaterThan(wide.firstRight - 2)

  await page.setViewportSize({ width: 390, height: 800 })
  const narrow = await boxes(first, second)
  expect(narrow.secondY).toBeGreaterThan(narrow.firstBottom - 2)

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.getByTestId('intervention-intervention-activity-triage-process').getByRole('button').first().click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()
  await expect(page.getByTestId('activity-kind')).toHaveText('Process activity')
})

async function boxes(
  first: ReturnType<Page['getByTestId']>,
  second: ReturnType<Page['getByTestId']>,
): Promise<{ firstRight: number; firstBottom: number; secondX: number; secondY: number }> {
  const a = await first.boundingBox()
  const b = await second.boundingBox()
  if (!a || !b) throw new Error('intervention cards are missing')
  return { firstRight: a.x + a.width, firstBottom: a.y + a.height, secondX: b.x, secondY: b.y }
}

test('activities are ordered on the intervention', async ({ page }) => {
  await projectWithProcessActivity(page, 'Order guideline')
  await page.getByTestId('add-process').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()
  await page.getByTestId('nav-overview').click()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-process-to-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention', 'triage-process')
  await page.getByTestId('add-process-to-intervention').click()
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
