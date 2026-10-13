const { chromium } = require(process.env.BLC_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.BLC_BROWSER_EXECUTABLE});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    // Only read requests are allowed during this regression check.
    await page.route('**/*', route => {
      if (route.request().method() === 'GET') return route.continue();
      writes.push(route.request().method() + ' ' + route.request().url());
      return route.abort();
    });
    await page.goto('http://localhost:3000/?lang=de');
    await page.waitForSelector('.import-status.is-valid');
    const germanPaths = await page.locator('.curve-observed').evaluateAll(paths => paths.map(p => p.getAttribute('d')));
    const count = await page.locator('#seriesCount').textContent();
    await page.locator('#languageSelect').selectOption('en');
    await page.waitForURL('**/*lang=en*');
    await page.waitForSelector('.import-status.is-valid');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.deepEqual(await page.locator('.curve-observed').evaluateAll(paths => paths.map(p => p.getAttribute('d'))), germanPaths);
    assert.equal(await page.locator('#legendHandle').textContent(), 'Legend');
    assert.equal(await page.locator('#seriesCount').textContent(), count.replace('von', 'of').replace('Kurven', 'curves'));
    await page.locator('#filterHandle').click();
    await page.getByPlaceholder('Search curves or foundations').fill('forest');
    assert.equal(await page.locator('.curve-selection-table tbody tr:visible').count(), 1);
    await page.locator('.curve-selection-table tbody tr:visible input').check();
    await page.getByPlaceholder('Search curves or foundations').fill('');
    assert.equal(await page.locator('.curve-selection-table tbody tr:visible').count(), 28);
    await page.locator('[data-close-panel="filterPanel"]').click();
    await page.locator('#legendHandle').click();
    await page.locator('.legend-series').filter({hasText:'Remaining global forest area'}).click();
    await page.locator('[data-close-panel="legendPanel"]').click();
    assert.ok((await page.locator('#curveDetailContent').innerText()).includes('Data provenance for this segment'));
    await page.locator('#languageSelect').selectOption('de');
    await page.waitForURL('**/*lang=de*');
    await page.waitForSelector('.import-status.is-valid', {state:'attached'});
    assert.equal(await page.locator('#legendHandle').textContent(), 'Legende');
    await page.setViewportSize({width:844, height:390});
    await page.goto('http://localhost:3000/?view=zustand&lang=en');
    await page.waitForSelector('.import-status.is-valid', {state:'attached'});
    assert.equal((await page.locator('.embed-full-link').textContent()).trim(), 'Explore all series →');
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log('Browser checks passed: DE↔EN, identical chart geometry, preserved selection, English search/details, embedded mobile view, no write requests or JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
