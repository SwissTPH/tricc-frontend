import { expect, test, type Page } from '@playwright/test'

/**
 * End-to-end journeys.
 *
 * Each is independent — no shared mutable state, no ordering dependency. IndexedDB is
 * cleared per test so "no projects yet" means what it says.
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

test('creates a project and lands in its overview', async ({ page }) => {
  await expect(page.getByTestId('no-projects')).toBeVisible()

  await createProject(page, 'IMCI sick child')

  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'IMCI sick child' })).toBeVisible()
  await expect(page.getByTestId('no-interventions')).toBeVisible()
})

test('adds an activity, adds a node, and the work survives a reload', async ({ page }) => {
  await createProject(page, 'Reload guideline')

  await page.getByTestId('add-activity').click()
  await expect(page.getByTestId('activity-editor')).toBeVisible()

  await page.getByTestId('add-integer').click()
  await page.getByTestId('field-name').fill('weight')
  await expect(page.getByTestId('node-n-integer')).toContainText('weight')

  // Continuous save is debounced; wait for it to settle rather than guessing.
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })

  await page.reload()
  await page.getByTestId('nav-activity-activity').click()
  await expect(page.getByTestId('node-n-integer')).toContainText('weight')
})

test('the palette refuses a second start node', async ({ page }) => {
  await createProject(page, 'Palette guideline')
  await page.getByTestId('add-activity').click()

  // The new activity already has an activity_start.
  await expect(page.getByTestId('add-activity_start')).toHaveCount(0)
  await expect(page.getByTestId('add-note')).toBeVisible()
})

test('the palette never offers an injection-only type', async ({ page }) => {
  await createProject(page, 'Injection guideline')
  await page.getByTestId('add-activity').click()

  await expect(page.getByTestId('add-factor')).toHaveCount(0)
  // bridge and wait are drawable, and must be offered.
  await expect(page.getByTestId('add-bridge')).toBeVisible()
  await expect(page.getByTestId('add-wait')).toBeVisible()
})

test('an intent without CQL blocks export and explains why', async ({ page }) => {
  await createProject(page, 'Handoff guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('add-note').click()

  await page.getByTestId('field-relevance-intent').fill('Only for children under five')

  const issue = page.getByTestId('issue-expression.open-handoff')
  await expect(issue).toBeVisible()
  await expect(issue).toHaveAttribute('data-severity', 'error')
  await expect(issue).toContainText('CQL')

  // Editing is never blocked while invalid.
  await page.getByTestId('field-relevance-expression').fill('AgeInMonths() < 60')
  await expect(page.getByTestId('issue-expression.open-handoff')).toHaveCount(0)
})

test('validation surfaces inline without preventing further editing', async ({ page }) => {
  await createProject(page, 'Validation guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('add-select_one').click()

  await expect(page.getByTestId('issue-select.no-options')).toBeVisible()
  await page.getByTestId('field-label').fill('Which colour?')
  await expect(page.getByTestId('field-label')).toHaveValue('Which colour?')
})

test('read-only removes every mutating affordance and restores them', async ({ page }) => {
  await createProject(page, 'Read only guideline')
  await page.getByTestId('add-activity').click()
  await expect(page.getByTestId('add-note')).toBeVisible()

  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('add-note')).toHaveCount(0)
  await expect(page.getByTestId('add-integer')).toHaveCount(0)

  await page.getByTestId('read-only-toggle').uncheck()
  await expect(page.getByTestId('add-note')).toBeVisible()
})

test('an added intervention appears in the overview', async ({ page }) => {
  await createProject(page, 'Intervention guideline')
  await page.getByTestId('add-intervention').click()

  await expect(page.getByTestId('intervention-intervention')).toBeVisible()
  await expect(page.getByTestId('intervention-intervention-trigger')).toContainText('on-demand')
})

test('an activity in no intervention is visible rather than hidden', async ({ page }) => {
  await createProject(page, 'Orphan guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('nav-overview').click()

  await expect(page.getByTestId('unassigned-activity')).toBeVisible()
})

test('the storage mode is stated persistently, and per project', async ({ page, browserName }) => {
  await page.goto('/')
  const indicator = page.getByTestId('storage-mode')
  await expect(indicator).toBeVisible()

  // Chromium can bind a project to a folder; Firefox cannot, and the user must be told.
  if (browserName === 'chromium') {
    await expect(indicator).toContainText('until you save them to a folder')
  } else {
    await expect(indicator).toContainText('cannot write to a folder')
  }

  // A new project is browser-backed regardless, and says so once opened.
  await createProject(page, 'Storage guideline')
  await expect(indicator).toContainText('Saved in this browser')
})

test('preferences set a display name, with no account anywhere', async ({ page }) => {
  await page.getByTestId('nav-preferences').click()
  await expect(page.getByTestId('preferences')).toBeVisible()

  await page.getByTestId('display-name').fill('Dr Adeline')
  await page.reload()
  await page.getByTestId('nav-preferences').click()
  await expect(page.getByTestId('display-name')).toHaveValue('Dr Adeline')

  // No sign-in, password or account surface exists.
  await expect(page.getByText(/sign in|log in|password|account/i)).toHaveCount(0)
})

test('a project reopens from the project list', async ({ page }) => {
  await createProject(page, 'Reopen guideline')
  await page.getByTestId('add-activity').click()
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })

  await page.goto('/')
  await expect(page.getByTestId('project-list')).toBeVisible()
  await page.getByRole('button', { name: 'Reopen guideline' }).click()
  await expect(page.getByTestId('nav-activity-activity')).toBeVisible()
})
