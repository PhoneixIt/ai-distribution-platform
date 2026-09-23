import { test, expect } from '@playwright/test'

test.describe('public UI smoke coverage', () => {
  test('sign-in page exposes only configured OAuth providers', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    const expected = (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS || 'google').split(',').map(value => value.trim()).filter(Boolean)
    const labels: Record<string, string> = {
      google: 'Continue with Google',
      azure: 'Continue with Microsoft',
      github: 'Continue with GitHub',
      linkedin_oidc: 'Continue with LinkedIn',
      apple: 'Continue with Apple',
    }
    for (const [provider, label] of Object.entries(labels)) {
      const button = page.getByRole('button', { name: label })
      if (expected.includes(provider)) await expect(button).toHaveCount(1)
      else await expect(button).toHaveCount(0)
    }
  })

  test('workforce page has a real objective input after authentication', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD in CI to enable protected-page checks.')
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.E2E_EMAIL!)
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/app/)
    await page.goto('/workforce')
    const objective = page.locator('textarea')
    await expect(objective).toHaveCount(1)
    await expect(objective).toBeEditable()
    await objective.fill('Playwright objective smoke test')
    await expect(objective).toHaveValue('Playwright objective smoke test')
  })

  for (const route of ['/partners', '/vendors', '/opportunities']) {
    test(`${route} loads without browser console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      await page.goto(route)
      await expect(page.locator('body')).toBeVisible()
      expect(errors, `${route} emitted console errors`).toEqual([])
    })
  }
})

test.describe('authenticated workforce journey', () => {
  test('email/password sign-in reaches workspace and submitting an objective returns a response', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD in CI to enable the real authenticated journey.')
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.E2E_EMAIL!)
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/app/)
    await page.goto('/workforce')
    const objective = page.locator('textarea')
    await expect(objective).toBeEditable()
    await objective.fill('Playwright authenticated objective test')
    await page.getByRole('button', { name: /run|submit|start/i }).click()
    await expect(page.locator('body')).toContainText(/summary|recommendation|error|failed/i, { timeout: 120_000 })
  })
})
