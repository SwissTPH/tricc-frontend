import { expect, test, type Page } from '@playwright/test'

/**
 * Where the author is: the breadcrumb in the top bar grows as gotos are followed and
 * resets when an activity is opened from the list. An activity lists the gotos that lead
 * to it. The project list has each project's gear and bin.
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

async function addActivity(page: Page): Promise<void> {
  await page.getByTestId('nav-overview').click()
  await page.getByTestId('add-activity').click()
  await page.getByTestId('create-activity').click()
  await expect(page.getByTestId('activity-canvas')).toBeVisible()
}

/** In the open activity, a goto to `target`. */
async function addGoto(page: Page, target: string): Promise<void> {
  const button = page.getByTestId('add-goto')
  if ((await button.count()) === 0) await page.getByTestId('tab-nodes').click()
  await button.click()
  await page.getByTestId('field-link').click()
  await page.getByTestId(`field-link-option-${target}`).click()
}

function crumbs(page: Page) {
  return page.getByTestId('breadcrumbs').locator('li')
}

test('the breadcrumb follows gotos and resets from the activity list', async ({ page }) => {
  await createProject(page, 'Trail guideline')
  await addActivity(page) // activity
  await addActivity(page) // activity-2
  await addActivity(page) // activity-3

  // activity → activity-2 → activity-3, each through a goto.
  await page.getByTestId('nav-activity-activity').click()
  await addGoto(page, 'activity-2')
  await page.getByTestId('nav-activity-activity-2').click()
  await addGoto(page, 'activity-3')

  await page.getByTestId('nav-activity-activity').click()
  await expect(crumbs(page)).toHaveCount(3)
  await page.getByTestId('goto-follow-n-goto').click()
  await expect(page.getByTestId('crumb-activity-2')).toHaveAttribute('aria-current', 'page')
  await page.getByTestId('goto-follow-n-goto').click()
  await expect(crumbs(page)).toHaveCount(5)
  await expect(page.getByTestId('crumb-activity-3')).toHaveAttribute('aria-current', 'page')

  // Back along the trail.
  await page.getByTestId('crumb-activity').click()
  await expect(crumbs(page)).toHaveCount(3)
  await expect(page.getByTestId('crumb-activity')).toHaveAttribute('aria-current', 'page')

  // From the list: only that activity after the project.
  await page.getByTestId('goto-follow-n-goto').click()
  await expect(crumbs(page)).toHaveCount(4)
  await page.getByTestId('nav-activity-activity-3').click()
  await expect(crumbs(page)).toHaveCount(3)
  await expect(page.getByTestId('crumb-activity-3')).toBeVisible()
  await expect(page.getByTestId('crumb-activity')).toHaveCount(0)

  // The project is the overview, home is the project list.
  await page.getByTestId('nav-overview').click()
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(crumbs(page)).toHaveCount(2)
  await page.getByTestId('nav-home').click()
  await expect(page.getByTestId('project-list')).toBeVisible()
})

test('an activity lists the gotos that lead to it, and each opens its caller', async ({ page }) => {
  await createProject(page, 'Callers guideline')
  await addActivity(page) // activity
  await addActivity(page) // activity-2
  await page.getByTestId('nav-activity-activity').click()
  await addGoto(page, 'activity-2')

  await page.getByTestId('goto-follow-n-goto').click()
  await page.locator('[data-node-type="activity_start"]').click()
  await page.getByTestId('called-by-activity-n-goto').click()
  // Back on the calling activity, with its goto selected; the trail cut back to it.
  await expect(page.getByTestId('crumb-activity')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('crumb-activity-2')).toHaveCount(0)
  await expect(page.getByTestId('field-link-current')).toContainText('activity-2')

  // The same list in the activity settings.
  await page.getByTestId('nav-activity-activity-2').click()
  await page.locator('[data-node-type="activity_start"]').click()
  await page.getByTestId('root-activity-settings').click()
  await page.getByTestId('activity-settings').getByTestId('called-by-activity-n-goto').click()
  await expect(page.getByTestId('activity-settings')).toHaveCount(0)
  await expect(page.getByTestId('crumb-activity')).toHaveAttribute('aria-current', 'page')
})

test('the project list has a gear and a bin for each project', async ({ page }) => {
  await createProject(page, 'Listed guideline')
  await page.getByTestId('nav-home').click()
  const open = page.getByTestId('project-list').locator('li [data-testid^="open-"]')
  await expect(open).toHaveCount(1)
  const id = (await open.getAttribute('data-testid'))!.replace(/^open-/, '')

  await page.getByTestId(`configure-${id}`).click()
  await expect(page.getByTestId('project-settings')).toBeVisible()
  await expect(page).not.toHaveURL(/settings=1/)

  await page.goto('/')
  await page.getByTestId(`delete-${id}`).click()
  await expect(page.getByTestId('delete-project-note')).toContainText('deleted')
  await page.getByTestId('delete-project-confirm').click()
  await expect(page.getByTestId('no-projects')).toBeVisible()
})
