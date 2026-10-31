const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'نظرة عامة', exact: true }).waitFor();
});
test('dashboard calculations, range, language and responsive widths', async ({ page }) => {
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('raff-data')));
  expect(data.products).toHaveLength(24);
  expect(data.orders).toHaveLength(64);
  for (const o of data.orders) {
    expect(o.subtotal).toBe(o.items.reduce((a, x) => a + x.unitPrice * x.quantity, 0));
    expect(o.total).toBe(o.subtotal + o.shipping - o.discount);
  }
  await page.locator('.heading-actions select').selectOption('7');
  const count = data.orders.filter(
    (o) => Date.now() - Date.parse(o.createdAt) < 7 * 86400000,
  ).length;
  await expect(page.locator('.donut-label strong')).toHaveText(
    new Intl.NumberFormat('ar-EG').format(count),
  );
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('.heading-actions select')).toHaveValue('7');
  await expect(page).toHaveTitle('Overview | Raff');
  for (const width of [360, 390, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBeTruthy();
  }
  await page.screenshot({ path: 'qa/dashboard-en.png', fullPage: true });
});
test('orders search, filters, pagination, detail return and browser navigation', async ({
  page,
}) => {
  await page.goto('/orders');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.locator('.pagination select').selectOption('20');
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.locator('.filter-bar input').first().fill('customer1@');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page).toHaveURL(/q=customer1/);
  const listUrl = page.url();
  await page.locator('tbody .order-link').first().click();
  await expect(page.locator('h1')).toContainText('RF-1048');
  await page.locator('.back-link').click();
  await expect(page).toHaveURL(listUrl);
  await page.getByRole('button', { name: 'مسح الفلاتر' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await page.goBack();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.goto('/orders?status=delivered&from=2000-01-01&to=2100-01-01&size=50');
  const expected = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('raff-data')).orders.filter((o) => o.status === 'delivered')
        .length,
  );
  await expect(page.locator('tbody tr')).toHaveCount(expected);
  await page.goto('/orders?status=invalid');
  await expect(page.getByRole('heading', { name: 'لا توجد نتائج مطابقة' })).toBeVisible();
  await page.goto('/orders/nope');
  await expect(page.getByRole('heading', { name: 'الطلب غير موجود' })).toBeVisible();
});
test('status rules, cancellation confirmation, timeline and persistence', async ({ page }) => {
  await page.goto('/orders/o1');
  await expect(page.locator('#next-status option')).toHaveCount(3);
  await page.locator('#next-status').selectOption('processing');
  await page.getByRole('button', { name: 'حفظ التحديث' }).click();
  await expect(page.locator('h1 .badge')).toHaveText('قيد التجهيز');
  await expect(page.locator('.timeline>div')).toHaveCount(2);
  await page.locator('#next-status').selectOption('cancelled');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'حفظ التحديث' }).click();
  await expect(page.locator('h1 .badge')).toHaveText('قيد التجهيز');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'حفظ التحديث' }).click();
  await expect(page.locator('.terminal')).toBeVisible();
  await page.reload();
  await expect(page.locator('h1 .badge')).toHaveText('ملغي');
  const history = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('raff-data')).orders.find((o) => o.id === 'o1').statusHistory,
  );
  expect(history).toHaveLength(3);
  expect(history[2].from).toBe('processing');
});
test('create product, normalization, unique SKU, unsaved protection, edit and snapshots', async ({
  page,
}) => {
  await page.goto('/products/new');
  await page.getByRole('button', { name: 'حفظ المنتج', exact: true }).click();
  await expect(page.locator('#arName')).toBeFocused();
  await page.locator('#arName').fill('منتج جديد');
  await page.locator('#enName').fill('New product');
  await page.locator('#sku').fill('rf-0001');
  await page.locator('#price').fill('١٢٣٫٤٥');
  await page.locator('#stock').fill('١٢');
  await page.locator('#sku').blur();
  await expect(page.locator('#sku-error')).toContainText('مستخدم');
  await page.locator('#sku').fill('TEST-NEW');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('#arName')).toHaveValue('منتج جديد');
  page.once('dialog', (d) => d.dismiss());
  await page.locator('aside nav a[href="/orders"]').click();
  await expect(page).toHaveURL(/products\/new/);
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await page.reload();
  const product = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('raff-data')).products.find((p) => p.sku === 'TEST-NEW'),
  );
  expect(product.price).toBe(12345);
  expect(product.stock).toBe(12);
  const before = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('raff-data')).orders),
  );
  await page.goto('/products/p1/edit?return=%2Fproducts%3Fstock%3Dlow');
  await page.locator('#enName').fill('Updated lamp');
  await page.locator('#price').fill('200');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page).toHaveURL(/stock=low/);
  const after = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('raff-data')).orders),
  );
  expect(after).toBe(before);
  await page.goto('/products/invalid/edit');
  await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
});
test('corrupt storage is preserved, explicit reset and unavailable storage', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('raff-data', '{broken'));
  await page.reload();
  await expect(page.locator('.error-notice')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('raff-data'))).toBe('{broken');
  page.once('dialog', (d) => d.accept());
  await page.locator('.reset-button').click();
  await expect(page.locator('.error-notice')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('raff-data')).version)).toBe(1);
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new Error('quota');
    };
    Storage.prototype.getItem = function () {
      throw new Error('blocked');
    };
  });
  await page.reload();
  await expect(page.locator('.error-notice')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'نظرة عامة', exact: true })).toBeVisible();
});
test('mobile drawer focus, escape, navigation and overflow on all pages', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await page.locator('.mobile-menu').click();
  await expect(page.locator('aside')).toHaveClass('open');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('aside a').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.mobile-menu')).toBeFocused();
  await page.locator('.mobile-menu').click();
  await page.locator('aside nav a').nth(1).click();
  await expect(page.locator('aside')).not.toHaveClass('open');
  for (const route of ['/orders', '/products', '/products/new', '/orders/o1', '/unknown']) {
    await page.goto(route);
    await page.locator('h1').waitFor();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  }
  await page.goto('/dashboard');
  await page.screenshot({ path: 'qa/dashboard-mobile.png', fullPage: true });
});

test('refined presentation reconciles all totals and preserves saved business data', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'English' }).click();
  const original = await page.evaluate(() => localStorage.getItem('raff-data'));
  const data = JSON.parse(original);
  await page.locator('.heading-actions select').selectOption('90');
  await expect(page.locator('.donut-label strong')).toHaveText('64');
  const counts = await page.locator('.status-legend strong').allTextContents();
  expect(counts.reduce((a, n) => a + Number(n.replaceAll(',', '')), 0)).toBe(64);
  const shares = await page.locator('.status-legend>div>span:last-child').allTextContents();
  expect(shares.reduce((a, n) => a + parseInt(n), 0)).toBe(100);
  const revenue = data.orders
    .filter((o) => o.status === 'delivered')
    .reduce((a, o) => a + o.total, 0);
  const formatter = new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  });
  await expect(page.locator('.stat-value').first()).toHaveText(formatter.format(revenue / 100));
  await page.locator('.chart-summary summary').click();
  const amounts = await page.locator('.chart-data tbody td:nth-child(2)').allTextContents();
  expect(amounts.reduce((a, n) => a + Math.round(Number(n.replace(/[^0-9.]/g, '')) * 100), 0)).toBe(
    revenue,
  );
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(13);
  await page.locator('.heading-actions select').selectOption('30');
  await expect(page.locator('.stat-card').last().locator('.trend')).toHaveClass('trend workload');
  const low = data.products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const out = data.products.filter((p) => p.stock === 0).length;
  await expect(page.locator('.inventory-summary a').first().locator('strong')).toHaveText(
    String(low),
  );
  await expect(page.locator('.inventory-summary a').last().locator('strong')).toHaveText(
    String(out),
  );
  await page.locator('.inventory-summary a').first().click();
  await expect(page).toHaveURL(/stock=low/);
  await expect(page.locator('tbody tr')).toHaveCount(low);
  await page.goto('/products?size=50');
  const sources = await page
    .locator('raff-product-image img')
    .evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  expect(sources).toHaveLength(24);
  expect(new Set(sources).size).toBe(24);
  for (const src of sources) {
    const r = await page.request.get(src);
    expect(r.ok()).toBeTruthy();
    expect(await r.text()).toContain('<svg');
  }
  await page
    .locator('raff-product-image img')
    .evaluateAll((els) => els.forEach((e) => (e.loading = 'eager')));
  await expect
    .poll(() =>
      page
        .locator('raff-product-image img')
        .evaluateAll((els) => els.every((e) => e.naturalWidth > 0)),
    )
    .toBeTruthy();
  await page.screenshot({ path: 'qa/refined-products-en.png', fullPage: true });
  expect(await page.evaluate(() => localStorage.getItem('raff-data'))).toBe(original);
  await page.goto('/dashboard');
  for (const lang of ['en', 'ar']) {
    if (lang === 'ar') await page.getByRole('button', { name: 'العربية' }).click();
    for (const width of [360, 390, 768, 1280, 1536]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBeTruthy();
      expect(
        await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      const sizes = await page
        .locator('.stat-top,.panel-heading p,.legend-label,.page-footer')
        .evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
      expect(sizes.every((n) => n >= 14)).toBeTruthy();
      expect(
        await page
          .locator('.stat-value')
          .evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth)),
      ).toBeTruthy();
    }
  }
});
