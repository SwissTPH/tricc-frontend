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
  await page.getByTestId('create-activity').click()
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
  await page.getByTestId('create-activity').click()

  // The new activity already has an activity_start.
  await expect(page.getByTestId('add-activity_start')).toHaveCount(0)
  await expect(page.getByTestId('add-note')).toBeVisible()
})

test('an activity can finish in more than one place', async ({ page }) => {
  await createProject(page, 'Several ends')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()

  await page.getByTestId('add-activity_end').click()
  await page.getByTestId('tab-nodes').click()
  await expect(page.getByTestId('add-activity_end')).toBeVisible()
  await page.getByTestId('add-activity_end').click()

  await expect(page.getByTestId('node-n-activity_end')).toBeVisible()
  await expect(page.getByTestId('node-n-activity_end-2')).toBeVisible()
})

test('the palette never offers an injection-only type', async ({ page }) => {
  await createProject(page, 'Injection guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()

  await expect(page.getByTestId('add-factor')).toHaveCount(0)
  // bridge, wait, and continue with are drawable, and must be offered.
  await expect(page.getByTestId('add-bridge')).toBeVisible()
  await expect(page.getByTestId('add-wait')).toBeVisible()
  await expect(page.getByTestId('add-continue_with')).toBeVisible()
  await expect(page.getByTestId('add-continue_with')).toHaveText('Continue with')
})

test('a continue with node keeps the intervention, condition, and ISO delay', async ({ page }) => {
  await createProject(page, 'Follow up guideline')
  await page.getByTestId('add-intervention').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()

  await page.getByTestId('add-continue_with').click()
  await page.getByTestId('field-continue-intervention').selectOption('intervention')
  await page.getByTestId('field-continue-condition').fill('AgeInMonths() >= 2')
  await page.getByTestId('field-continue-delay').fill('P3D')
  await expect(page.getByText('An ISO-8601 period, for example P3D.')).toBeVisible()
  await expect(page.getByTestId('field-filter')).toHaveCount(0)

  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })
  await page.reload()
  await page.getByTestId('nav-activity-activity').click()
  await page.getByTestId('node-n-continue_with').click()
  await expect(page.getByTestId('field-continue-intervention')).toHaveValue('intervention')
  await expect(page.getByTestId('field-continue-condition')).toHaveValue('AgeInMonths() >= 2')
  await expect(page.getByTestId('field-continue-delay')).toHaveValue('P3D')
})

test('an intent without CQL blocks export and explains why', async ({ page }) => {
  await createProject(page, 'Handoff guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-note').click()

  await page.getByTestId('field-relevance-intent').fill('Only for children under five')
  await page.getByTestId('tab-validation').click()

  const issue = page.getByTestId('issue-expression.open-handoff')
  await expect(issue).toBeVisible()
  await expect(issue).toHaveAttribute('data-severity', 'error')
  await expect(issue).toContainText('CQL')

  // Editing is never blocked while invalid.
  await page.getByTestId('tab-details').click()
  await page.getByTestId('field-relevance-expression').fill('AgeInMonths() < 60')
  await page.getByTestId('tab-validation').click()
  await expect(page.getByTestId('issue-expression.open-handoff')).toHaveCount(0)
})

test('validation surfaces inline without preventing further editing', async ({ page }) => {
  await createProject(page, 'Validation guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-select_one').click()
  await page.getByTestId('tab-validation').click()

  await expect(page.getByTestId('issue-select.no-options')).toBeVisible()
  await page.getByTestId('tab-details').click()
  await page.getByTestId('field-label').fill('Which colour?')
  await expect(page.getByTestId('field-label')).toHaveValue('Which colour?')
})

test('read-only removes every mutating affordance and restores them', async ({ page }) => {
  await createProject(page, 'Read only guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('add-note')).toBeVisible()

  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('add-activity')).toHaveCount(0)
  await expect(page.getByTestId('import-activity')).toHaveCount(0)
  await expect(page.getByTestId('add-note')).toHaveCount(0)
  await expect(page.getByTestId('add-integer')).toHaveCount(0)

  await page.getByTestId('read-only-toggle').uncheck()
  await expect(page.getByTestId('add-activity')).toBeVisible()
  await expect(page.getByTestId('import-activity')).toBeVisible()
  await expect(page.getByTestId('add-note')).toBeVisible()
})

test('undo and redo arrows sit in the single top bar', async ({ page }) => {
  await createProject(page, 'History')
  const bar = page.locator('body > #root header')
  await expect(bar).toHaveCount(1)
  await expect(bar.getByTestId('save-status')).toBeVisible()
  await expect(bar.getByTestId('export-archive')).toBeVisible()
  await expect(bar.getByTestId('undo')).toBeDisabled()
  await expect(bar.getByTestId('redo')).toBeDisabled()
  await expect(page.locator('.tricc-project-bar')).toHaveCount(0)

  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-note').click()
  await expect(page.getByTestId('node-n-note')).toBeVisible()
  await expect(page.getByTestId('undo')).toBeEnabled()

  await page.getByTestId('undo').click()
  await expect(page.getByTestId('node-n-note')).toHaveCount(0)
  await expect(page.getByTestId('redo')).toBeEnabled()
  await page.getByTestId('redo').click()
  await expect(page.getByTestId('node-n-note')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 700 })
  await expect(page.getByTestId('undo')).toBeVisible()
  await expect(page.getByTestId('redo')).toBeVisible()
  const headerOverflows = await page.evaluate(() => {
    const header = document.querySelector('#root > header')
    if (!header) return true
    const box = header.getBoundingClientRect()
    return box.right > window.innerWidth + 1 || box.left < -1
  })
  expect(headerOverflows).toBe(false)

  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('undo')).toBeDisabled()
  await expect(page.getByTestId('redo')).toBeDisabled()
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
  await page.getByTestId('create-activity').click()
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
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', {
    timeout: 10_000,
  })

  await page.goto('/')
  await expect(page.getByTestId('project-list')).toBeVisible()
  await page.getByRole('button', { name: 'Reopen guideline', exact: true }).click()
  await expect(page.getByTestId('nav-activity-activity')).toBeVisible()
})

test('the activity gear sets its name and applicability, and the bin deletes it', async ({ page }) => {
  await createProject(page, 'Settings guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()

  await page.getByTestId('configure-activity').click()
  await expect(page.getByTestId('activity-settings')).toBeVisible()
  await page.getByTestId('act-name').fill('weight_measurement')
  await page.getByTestId('act-intent').fill('Children under five')
  await page.getByTestId('act-cql').fill('AgeInMonths() < 60')
  await page.getByTestId('activity-settings-save').click()
  await expect(page.getByTestId('activity-settings')).toHaveCount(0)

  await page.getByTestId('delete-activity').click()
  await expect(page.getByTestId('delete-activity-dialog')).toBeVisible()
  await page.getByTestId('delete-activity-confirm').click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByTestId('activity-canvas')).toHaveCount(0)
})

test('the activity bin is hidden when read-only, and the gear still shows the settings', async ({ page }) => {
  await createProject(page, 'Read-only settings guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('read-only-toggle').check()
  await expect(page.getByTestId('delete-activity')).toHaveCount(0)
  await page.getByTestId('configure-activity').click()
  await expect(page.getByTestId('act-name')).toBeDisabled()
  await expect(page.getByTestId('activity-settings-delete')).toHaveCount(0)
})

test('a question gets a concept, and the dictionary lists and edits it', async ({ page }) => {
  await createProject(page, 'Dictionary guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-decimal').click()
  await page.getByTestId('field-name').fill('weight_kg')
  await page.getByTestId('field-label').fill('Weight (kg)')
  await page.getByTestId('concept-create').click()
  await expect(page.getByTestId('concept-dialog')).toBeVisible()
  await expect(page.getByTestId('concept-code')).toHaveValue('weight_kg')
  await page.getByTestId('concept-q-display').fill('Weigh the child and enter the weight in kilograms')
  await page.getByTestId('concept-type').selectOption('Vital')
  await page.getByTestId('concept-dialog-save').click()
  await expect(page.getByTestId('concept-dialog')).toHaveCount(0)
  await expect(page.getByTestId('concept-card-code')).toHaveText('weight_kg')

  // Cancel leaves the concept as it was.
  await page.getByTestId('concept-edit').click()
  await page.getByTestId('concept-display').fill('Changed my mind')
  await page.getByTestId('concept-dialog-cancel').click()
  await expect(page.getByTestId('concept-card-display')).toHaveText('Weight (kg)')

  await page.getByTestId('tab-dictionary').click()
  await expect(page.getByTestId('dictionary-view')).toBeVisible()
  const row = page.getByTestId('concept-row-weight_kg')
  await expect(row).toContainText('Weight (kg)')
  await expect(row).toContainText('Weigh the child and enter the weight in kilograms')
  await page.getByTestId('concept-search').fill('kilo')
  await expect(row).toBeVisible()
  await row.click()
  await expect(page.getByTestId('concept-delete')).toBeDisabled()
  await page.getByTestId('concept-use-activity-n-decimal').click()
  await expect(page.getByTestId('concept-card-code')).toHaveText('weight_kg')
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
})

test('a questionnaire text gets bold and data from an earlier answer', async ({ page }) => {
  await createProject(page, 'Formatted guideline')
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await page.getByTestId('add-decimal').click()
  await page.getByTestId('field-name').fill('dose')
  await page.getByTestId('concept-create').click()
  await page.getByTestId('concept-display').fill('Dose')
  await page.getByTestId('concept-dialog-save').click()
  await page.getByTestId('tab-nodes').click()
  await page.getByTestId('add-note').click()
  await page.getByTestId('field-name').fill('give_dose')
  await page.getByTestId('concept-create').click()
  await page.getByTestId('concept-display').fill('Give dose')

  // Format opens the editor in its own, larger modal.
  await page.getByTestId('concept-q-display-format').click()
  await expect(page.getByTestId('concept-q-display-modal')).toBeVisible()
  const editor = page.getByTestId('concept-q-display-rich')
  await editor.click()
  await page.getByTestId('concept-q-display-bold').click()
  await page.keyboard.type('Give ')
  // The data list reads "<code>: <display>".
  await expect(page.getByTestId('concept-q-display-insert').locator('option[value="dose"]')).toHaveText('dose: Dose')
  await page.getByTestId('concept-q-display-insert').selectOption('dose')
  await page.keyboard.type(' mg')
  await page.keyboard.press('Enter')
  await page.getByTestId('concept-q-display-bold').click()
  await page.getByTestId('concept-q-display-color').selectOption('#d32f2f')
  await page.keyboard.type('Danger')
  await expect(editor.locator('strong').first()).toContainText('Give')
  await expect(editor.locator('[data-interp="dose"]')).toHaveText('${dose}')
  await expect(editor.locator('span[style*="color"]')).toHaveText('Danger')
  // Escape closes the format modal only; the concept dialog stays open.
  await page.getByTestId('concept-q-display-modal-save').click()
  await expect(page.getByTestId('concept-q-display-modal')).toHaveCount(0)
  await expect(page.getByTestId('concept-dialog')).toBeVisible()
  const preview = page.getByTestId('concept-q-display')
  await expect(preview.locator('strong').first()).toContainText('Give')
  await expect(preview.locator('span[style*="color"]')).toHaveText('Danger')
  await page.getByTestId('concept-dialog-save').click()

  // The node shows it as plain text; reopened, it is still formatted.
  await expect(page.getByTestId('node-n-note-label')).toHaveText('Give ${dose} mg Danger')
  await page.getByTestId('concept-edit').click()
  await page.getByTestId('concept-q-display-format').click()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('concept-q-display-modal')).toHaveCount(0)
  await expect(page.getByTestId('concept-dialog')).toBeVisible()
  await page.getByTestId('concept-dialog-cancel').click()
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-state', 'saved', { timeout: 10_000 })
})

test('concept types come from the preferences', async ({ page }) => {
  await page.getByTestId('nav-preferences').click()
  await page.getByTestId('pref-concept-types').fill('Vital\nCounselling')
  await page.goto('/')
  await createProject(page, 'Types guideline')
  await page.getByTestId('tab-dictionary').click()
  await page.getByTestId('concept-add').click()
  await expect(page.getByTestId('concept-type').locator('option')).toHaveText(['—', 'Vital', 'Counselling'])
})

test('the project gear renames it, and the bin deletes it after confirmation', async ({ page }) => {
  await createProject(page, 'Draft project')
  await page.getByTestId('configure-project').click()
  await page.getByTestId('project-title').fill('IMCI 2026')
  await page.getByTestId('project-settings-save').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IMCI 2026')

  await page.getByTestId('delete-project').click()
  await expect(page.getByTestId('delete-project-note')).toContainText('deleted')
  await page.getByTestId('delete-project-confirm').click()
  await expect(page.getByTestId('no-projects')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('no-projects')).toBeVisible()
})

test('a renamed project shows its new name in the project list', async ({ page }) => {
  await createProject(page, 'Old name')
  await page.getByTestId('configure-project').click()
  await page.getByTestId('project-title').fill('New name')
  await page.getByTestId('project-settings-save').click()
  await page.goto('/')
  await expect(page.getByText('New name')).toBeVisible()
  await expect(page.getByText('Old name')).toHaveCount(0)
})

