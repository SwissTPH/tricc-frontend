import { expect, test, type Page } from '@playwright/test'

/**
 * Layer 0 editing: an intervention is only useful once activities can be put into it.
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

/** A project holding one process activity for `triage`, which is what an intervention lists. */
async function projectWithProcessActivity(page: Page, name: string): Promise<void> {
  await page.getByTestId('new-project-name').fill(name)
  await page.getByTestId('create-project').click()
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
  await page.getByTestId('nav-overview').click()
}

test('builds an intervention from scratch and it survives a reload', async ({ page }) => {
  await projectWithProcessActivity(page, 'Intervention guideline')

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()

  await page.getByTestId('iv-title-intervention').fill('Sick child consultation')
  await page.getByTestId('iv-code-intervention').fill('sick-child')
  await page.getByTestId('iv-intent-intervention').fill('Children under five')
  await page.getByTestId('iv-cql-intervention').fill('AgeInMonths() < 60')

  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process')

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
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process')

  await expect(page.getByTestId('unassigned-triage-process')).toHaveCount(0)
})

test('per-reference applicability marks the activity conditional', async ({ page }) => {
  await projectWithProcessActivity(page, 'Conditional guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process')

  await page.getByTestId('iv-activity-cql-intervention-triage-process').fill('"Diarrhoea reported"')

  await expect(page.getByTestId('intervention-intervention-activity-triage-process')).toContainText(
    'conditional',
  )
})

test('a reserved trigger mode is selectable but blocks export', async ({ page }) => {
  await projectWithProcessActivity(page, 'Trigger guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()

  await page.getByTestId('iv-trigger-intervention').selectOption('planned')

  const issue = page.getByTestId('issue-intervention.reserved-trigger')
  await expect(issue).toBeVisible()
  await expect(issue).toContainText('planning layer')
})

test('read-only disables intervention editing entirely', async ({ page }) => {
  await projectWithProcessActivity(page, 'Read only intervention')
  await page.getByTestId('add-intervention').click()

  await page.getByTestId('read-only-toggle').check()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()

  await expect(page.getByTestId('iv-title-intervention')).toBeDisabled()
  await expect(page.getByTestId('add-process-intervention')).toHaveCount(0)
  await expect(page.getByTestId('delete-intervention-intervention')).toHaveCount(0)
})

test('the activity picker searches rather than listing everything', async ({ page }) => {
  await projectWithProcessActivity(page, 'Search guideline')
  // Two more process activities for the same process, so filtering has something to do.
  for (const _ of [1, 2]) {
    await page.getByTestId('new-process-name').fill('triage')
    await page.getByTestId('add-process-activity').click()
    await page.getByTestId('nav-overview').click()
  }

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()

  const picker = page.getByTestId('add-activity-to-intervention-triage')
  // Scoped to the picker's own listbox: the trigger-mode select on the same panel also
  // contains options, and a page-wide role query would count those too.
  const suggestions = page
    .getByTestId('add-activity-to-intervention-triage-list')
    .getByRole('option')

  await picker.click()
  await expect(suggestions).toHaveCount(3)

  await picker.fill('triage-process-2')
  await expect(suggestions).toHaveCount(1)
  await expect(
    page.getByTestId('add-activity-to-intervention-triage-option-triage-process-2'),
  ).toBeVisible()
})

test('the activity picker is fully keyboard operable', async ({ page }) => {
  await projectWithProcessActivity(page, 'Keyboard guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()

  const picker = page.getByTestId('add-activity-to-intervention-triage')
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
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process')

  await expect(page.getByTestId('add-activity-to-intervention-triage-exhausted')).toContainText(
    'already listed',
  )
})

test('the two kinds of activity are listed and marked separately', async ({ page }) => {
  await projectWithProcessActivity(page, 'Kinds guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('nav-overview').click()

  const processEntry = page.getByTestId('nav-activity-triage-process')
  const normalEntry = page.getByTestId('nav-activity-activity')

  await expect(page.getByTestId('process-activity-list')).toContainText('triage')
  await expect(processEntry).toHaveAttribute('data-kind', 'process')
  await expect(normalEntry).toHaveAttribute('data-kind', 'activity')

  // The editor says which kind is open, and only a process activity names a process.
  await processEntry.click()
  await expect(page.getByTestId('activity-kind')).toHaveText('Process activity')
  await expect(page.getByTestId('activity-process')).toHaveValue('triage')

  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('activity-kind')).toHaveText('Activity')
  await expect(page.getByTestId('activity-process')).toHaveCount(0)
})

test('a normal activity cannot be an intervention process entry', async ({ page }) => {
  await projectWithProcessActivity(page, 'Wrapper guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('nav-overview').click()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()

  const picker = page.getByTestId('add-activity-to-intervention-triage')
  await picker.click()

  // The wrapper is offered; the normal activity it would wrap is not.
  await expect(
    page.getByTestId('add-activity-to-intervention-triage-option-triage-process'),
  ).toBeVisible()
  await expect(page.getByTestId('add-activity-to-intervention-triage-option-activity')).toHaveCount(
    0,
  )
})

test('creates a process activity straight from the intervention', async ({ page }) => {
  await page.getByTestId('new-project-name').fill('Shortcut guideline')
  await page.getByTestId('create-project').click()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('registration')
  await page.getByTestId('add-process-intervention').click()

  // No process activity exists yet, so the picker says so and the shortcut creates one.
  await expect(
    page.getByTestId('add-activity-to-intervention-registration-exhausted'),
  ).toContainText('No process activity starts "registration" yet')

  await page.getByTestId('create-process-activity-intervention-registration').click()
  await expect(
    page.getByTestId('intervention-intervention-activity-registration-process'),
  ).toBeVisible()
  await expect(page.getByTestId('nav-activity-registration-process')).toHaveAttribute(
    'data-kind',
    'process',
  )
})

test('activities are ordered within a process', async ({ page }) => {
  await projectWithProcessActivity(page, 'Order guideline')
  await page.getByTestId('new-process-name').fill('triage')
  await page.getByTestId('add-process-activity').click()
  await page.getByTestId('nav-overview').click()

  await page.getByTestId('add-intervention').click()
  await page.getByTestId('edit-intervention-intervention').getByText('Edit').click()
  await page.getByTestId('process-name-intervention').fill('triage')
  await page.getByTestId('add-process-intervention').click()
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process')
  await pickActivity(page, 'add-activity-to-intervention-triage', 'triage-process-2')

  const listed = page.getByTestId('iv-process-intervention-triage').getByRole('listitem')
  await expect(listed.first()).toContainText('triage-process')

  // Order on the link is what expresses sequence, so it has to be changeable.
  await page.getByTestId('move-down-intervention-triage-triage-process').click()
  await expect(listed.first()).toContainText('triage-process-2')
})
