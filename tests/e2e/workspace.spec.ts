import { test, expect } from '@playwright/test';
import { modules } from '../../lib/catalog';
test('bilingual workspace supports patient registration, records, bed board and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hospital overview' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-en.png', fullPage: true });
  await page.getByRole('button', { name: 'Register patient', exact: true }).click();
  const name = `Test Patient ${Date.now()}`;
  await page.getByLabel('Full name in English').fill(name);
  await page.getByLabel('Full name in Arabic').fill('مريض اختبار');
  await page.getByLabel('Date of birth').fill('1990-01-15');
  await page.getByLabel('Phone', { exact: true }).fill('+963 900000123');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Register patient', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Patients', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search patients', exact: true }).fill(name);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open chart', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Patient chart', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New encounter', exact: true }).click();
  await page.getByLabel('Title in English', { exact: true }).fill('Test consultation');
  await page.getByLabel('Title in Arabic', { exact: true }).fill('استشارة اختبار');
  await page.getByLabel('Chief complaint', { exact: true }).fill('Evaluation fixture');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Admissions & beds', exact: true }).click();
  await expect(page.locator('.bed-tile')).toHaveCount(24);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to Arabic' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'نظرة عامة على المستشفى' })).toBeVisible();
  await page.screenshot({ path: 'test-results/dashboard-ar.png', fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
  await expect(page.getByRole('button', { name: 'الدخول إلى مساحة العمل' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile navigation works without horizontal document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hospital overview' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-dashboard.png', fullPage: true });
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: Array.from(document.querySelectorAll('*'))
      .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 2)
      .slice(0, 20)
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        width: e.getBoundingClientRect().width,
        right: e.getBoundingClientRect().right,
      })),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Patients', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Patient directory' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
test('reception cannot access clinical data or audit events', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Receptionist', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hospital overview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clinical workspace', exact: true })).toHaveCount(
    0,
  );
  const response = await page.request.get('/api/hospital');
  const data = await response.json();
  expect(data.audit).toEqual([]);
  expect(data.records.some((r: { module: string }) => r.module === 'encounters')).toBe(false);
  const rejected = await page.request.post('/api/hospital', {
    headers: { Origin: 'http://malicious.example' },
    data: { action: 'logout' },
  });
  expect(rejected.status()).toBe(403);
});
test('every department workspace renders in English and Arabic', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hospital overview' })).toBeVisible();
  for (const language of ['en', 'ar'] as const) {
    if (language === 'ar') await page.getByRole('button', { name: 'Switch to Arabic' }).click();
    for (const mod of modules) {
      await page
        .locator('.main-nav')
        .getByRole('button', { name: mod.name[language], exact: mod.id !== 'emergency' })
        .click();
      await expect(
        page.getByRole('heading', { name: mod.name[language], exact: true }),
      ).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

for (const demo of [true, false]) {
  test(
    'demo card and default password are ' + (demo ? 'enabled' : 'disabled'),
    async ({ page }) => {
      await page.route('**/api/hospital', (route) => route.fulfill({ json: { user: null, demo } }));
      await page.goto('/');
      await expect(
        page.getByRole('button', { name: 'Sign in to workspace', exact: true }),
      ).toBeVisible();
      await expect(page.locator('.demo-login')).toHaveCount(demo ? 1 : 0);
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue(
        demo ? 'ShamDemo2026!' : '',
      );
      if (demo) {
        await expect(page.locator('.demo-role-grid button')).toHaveCount(7);
        await expect(page.locator('.demo-login code')).toHaveText('ShamDemo2026!');
        await page.getByRole('button', { name: 'Receptionist', exact: true }).click();
        await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(
          'reception@sham.clinic',
        );
        await page.getByRole('button', { name: 'العربية', exact: true }).click();
        await expect(page.getByText('استكشف النسخة التجريبية', { exact: true })).toBeVisible();
      }
    },
  );
}
