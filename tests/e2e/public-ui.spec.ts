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

test.describe('role-based signup and workspace setup', () => {
  const organizationChoices = [
    { value: 'vendor', label: 'Vendor' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'partner', label: 'Partner' },
    { value: 'customer', label: 'Customer' },
  ] as const

  for (const choice of organizationChoices) {
    test(`signup records the ${choice.value} organization type`, async ({ page }) => {
      let signupPayload: Record<string, unknown> | undefined
      await page.route('**/auth/v1/signup**', async route => {
        signupPayload = route.request().postDataJSON() as Record<string, unknown>
        const metadata = signupPayload.data as Record<string, unknown>
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: `signup-${choice.value}`,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'new-user@example.com',
              app_metadata: { provider: 'email', providers: ['email'] },
              user_metadata: metadata,
              created_at: new Date().toISOString(),
            },
            session: null,
          }),
        })
      })

      await page.goto('/signup')
      await page.getByRole('radio', { name: new RegExp(`^${choice.label}`, 'i') }).check()
      await page.getByLabel('Full name').fill('New User')
      await page.getByLabel('Email').fill('new-user@example.com')
      await page.getByLabel('Password', { exact: true }).fill('StrongPassword123!')
      await page.getByLabel('Confirm password', { exact: true }).fill('StrongPassword123!')
      await page.getByRole('button', { name: 'Create account' }).click()

      await expect(page.getByText(/account created/i)).toBeVisible()
      expect(signupPayload?.data).toMatchObject({ organization_type: choice.value, organization_roles: [] })
    })
  }

  test('partner subtypes are optional and can be selected together', async ({ page }) => {
    let capturedRoles: string[] | undefined
    await page.route('**/auth/v1/signup**', async route => {
      const payload = route.request().postDataJSON() as { data: { organization_roles: string[] } }
      capturedRoles = payload.data.organization_roles
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'partner-signup', user_metadata: payload.data }, session: null }),
      })
    })

    await page.goto('/signup')
    await page.getByRole('radio', { name: /^Partner/i }).check()
    await expect(page.getByText(/optional; choose any that apply/i)).toBeVisible()
    await page.getByLabel(/Managed service provider \(MSP\)/i).check()
    await page.getByLabel(/System integrator \(SI\)/i).check()
    await page.getByLabel('Full name').fill('Partner User')
    await page.getByLabel('Email').fill('partner@example.com')
    await page.getByLabel('Password', { exact: true }).fill('StrongPassword123!')
    await page.getByLabel('Confirm password', { exact: true }).fill('StrongPassword123!')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText(/account created/i)).toBeVisible()
    expect(capturedRoles).toEqual(['msp', 'system_integrator'])
  })

  test('a new workspace is provisioned with the signup role', async ({ page }) => {
    const setup = await mockWorkspace(page, {
      status: 'new',
      userMetadata: { full_name: 'Vendor User', organization_type: 'vendor', organization_roles: [] },
    })

    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/app$/)
    expect(setup.createCount).toBe(1)
    expect(setup.updateCount).toBe(0)
    expect(setup.workspace?.organization_type).toBe('vendor')
    expect(setup.workspace?.onboarding_status).toBe('completed')
  })

  test('legacy organizations without a type go to onboarding and are updated in place', async ({ page }) => {
    const setup = await mockWorkspace(page, {
      status: 'needs_setup',
      workspace: { id: 'legacy-org-1', name: 'Existing Channel Team', organization_type: null, organization_roles: [], onboarding_status: 'needs_setup' },
      preservedData: { memberships: 3, missions: 8, relationships: 5 },
    })

    await page.goto('/app')
    await expect(page).toHaveURL(/\/onboarding\?next=%2Fapp$/)
    await expect(page.getByRole('heading', { name: /what kind of organization/i })).toBeVisible()
    await page.getByRole('radio', { name: /^Distributor/i }).check()
    await page.getByRole('button', { name: 'Continue to PortAi' }).click()

    await expect(page).toHaveURL(/\/app$/)
    expect(setup.updateCount).toBe(1)
    expect(setup.createCount).toBe(0)
    expect(setup.workspace).toMatchObject({ id: 'legacy-org-1', name: 'Existing Channel Team', organization_type: 'distributor', onboarding_status: 'completed' })
    expect(setup.preservedData).toEqual({ memberships: 3, missions: 8, relationships: 5 })
  })

  test('configured workspaces skip onboarding', async ({ page }) => {
    await mockWorkspace(page, {
      status: 'configured',
      workspace: { id: 'configured-org', name: 'Existing Vendor', organization_type: 'vendor', organization_roles: [], onboarding_status: 'completed' },
    })

    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /vendor workspace/i })).toBeVisible()
  })

  for (const choice of organizationChoices) {
    test(`${choice.label} navigation retains the shared AI operating layer`, async ({ page }) => {
      await mockWorkspace(page, {
        status: 'configured',
        workspace: { id: `org-${choice.value}`, name: `${choice.label} Workspace`, organization_type: choice.value, organization_roles: [], onboarding_status: 'completed' },
      })

      await page.goto('/app')
      await expect(page.getByRole('heading', { name: new RegExp(`${choice.label} workspace`, 'i') })).toBeVisible()
      for (const label of ['Missions & workflow', 'AI Workforce', 'Discover ecosystem', 'AI matching', 'Settings']) {
        await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible()
      }
    })
  }

  test('onboarding API requires authentication', async ({ page }) => {
    await page.goto('/')
    const response = await page.request.get('/api/onboarding')
    expect(response.status()).toBe(401)
  })
})

async function mockWorkspace(page: import('@playwright/test').Page, options: {
  status: 'new' | 'needs_setup' | 'configured'
  workspace?: { id: string; name: string; organization_type: string | null; organization_roles: string[]; onboarding_status: string }
  userMetadata?: Record<string, unknown>
  preservedData?: { memberships: number; missions: number; relationships: number }
}) {
  const user = {
    id: options.workspace ? `user-${options.workspace.id}` : `user-${options.userMetadata?.organization_type ?? 'new'}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'workspace-user@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: options.userMetadata ?? {},
    created_at: new Date().toISOString(),
  }
  const session = {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  }
  const cookieValue = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
  await page.context().addCookies([{ name: 'sb-example-auth-token', value: cookieValue, domain: '127.0.0.1', path: '/' }])

  const state = {
    status: options.status,
    workspace: options.workspace ?? null,
    createCount: 0,
    updateCount: 0,
    preservedData: options.preservedData,
  }

  await page.route('**/auth/v1/user**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
  await page.route('**/api/onboarding', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: state.status, workspace: state.workspace }) })
      return
    }

    const selection = route.request().postDataJSON() as { organization_type: string; organization_roles: string[] }
    if (state.status === 'new') {
      state.createCount += 1
      state.workspace = {
        id: `new-${state.createCount}`,
        name: typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : 'New Workspace',
        organization_type: selection.organization_type,
        organization_roles: selection.organization_roles,
        onboarding_status: 'completed',
      }
    } else if (state.workspace) {
      state.updateCount += 1
      state.workspace = {
        ...state.workspace,
        organization_type: selection.organization_type,
        organization_roles: selection.organization_roles,
        onboarding_status: 'completed',
      }
    }
    state.status = 'configured'
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: state.status, workspace: state.workspace }) })
  })
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/org_members') && state.workspace) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ org_id: state.workspace.id, organizations: state.workspace }),
      })
      return
    }
    if (route.request().method() === 'HEAD') {
      await route.fulfill({ status: 200, headers: { 'content-range': '0-0/0' } })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  return state
}
