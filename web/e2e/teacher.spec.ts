import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const shots = 'test-results/teacher';
mkdirSync(shots, { recursive: true });
test('notice publication filters free corrections and stamps', async ({ page }) => {
  await page.goto('/dev/teacher.html#8a/uebersicht');
  await page.getByLabel('Nachricht', { exact: true }).fill('Hello class!');
  await page.getByRole('button', { name: 'Veröffentlichen', exact: true }).click();
  await expect(page.locator('.status')).toHaveText('Nachricht veröffentlicht.');
  await page.getByRole('button', { name: 'Tafelmodus', exact: true }).click();
  await expect(page.locator('.board-notice')).toHaveText('Hello class!');
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await page.getByRole('button', { name: 'Entfernen', exact: true }).click();
  await expect(page.getByLabel('Nachricht', { exact: true })).toHaveValue('');
  await page.locator('.overview-tile').filter({ hasText: 'Nicht aktiv seit' }).getByRole('button').click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Klasse 8b', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page
    .getByRole('navigation', { name: 'Arbeitsseiten' })
    .getByRole('link', { name: 'Münzen & Stempel', exact: true })
    .click();
  await page.locator('#coinForm [name=pupil]').selectOption({ label: 'Fuchsb' });
  await page.locator('#coinForm [name=delta]').fill('7');
  await page.locator('#coinForm [name=note]').fill('Testkorrektur');
  await page.locator('#coinForm').getByRole('button', { name: 'Buchen', exact: true }).click();
  const row = page.locator('.coin-row').filter({ has: page.getByText('Fuchsb', { exact: true }) });
  await expect(row.locator('output')).toHaveText('7');
  await page.getByRole('checkbox', { name: 'Fuchsb', exact: true }).check();
  await page.getByRole('button', { name: 'Stempel buchen', exact: true }).click();
  await expect(page.locator('.stamp-status')).toContainText('1 Stempel gebucht');
  await expect(row.locator('output')).toHaveText('107');
  await expect(page.getByRole('checkbox', { name: 'Fuchsb', exact: true })).toBeDisabled();
});
test('teacher workspace pages and private pupil details', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [id, title] of [
    ['uebersicht', 'Übersicht'],
    ['schueler', 'Schüler'],
    ['muenzen', 'Münzen & Stempel'],
    ['quests', 'Daily Quests'],
    ['konten', 'Konten'],
    ['dorf', 'Dorf & Regeln'],
  ]) {
    await page.goto(`/dev/teacher.html#8a/${id}`);
    await expect(page.locator('.teacher-page-content')).not.toHaveText('Lädt …');
    await expect(page.locator('.teacher-page-content section,.overview-grid')).not.toHaveCount(0);
    await page.screenshot({ path: `${shots}/1440-${id}.png`, fullPage: true });
    await expect(
      page.getByRole('navigation', { name: 'Arbeitsseiten' }).getByRole('link', { name: title, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/dev/teacher.html#8a/schueler');
  await page.getByRole('button', { name: 'Details zu Fuchs', exact: true }).click();
  await expect(page.locator('.pupil-detail')).toContainText('Kontoauszug');
  await page.screenshot({ path: `${shots}/1440-detail.png`, fullPage: true });
  expect(errors).toEqual([]);
});
for (const size of [
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
])
  test(`teacher coins tablet ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/dev/teacher.html?wait=120#8a/muenzen');
    const row = page.locator('.coin-row').filter({ has: page.getByText('Fuchs', { exact: true }) });
    await expect(row.locator('output')).toHaveText('0');
    await page.getByRole('button', { name: 'Mitarbeit', exact: true }).click();
    const add = row.getByRole('button', { name: '20 Münzen zu Fuchs hinzufügen', exact: true });
    await add.dblclick();
    await expect(row.locator('output')).toHaveText('20');
    await expect(page.locator('.booking-feedback')).toContainText('+20 Münzen für Fuchs (Mitarbeit)');
    await page.screenshot({ path: `${shots}/${size.width}-coins-undo.png`, fullPage: true });
    await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
    await expect(row.locator('output')).toHaveText('0');
    await page.getByRole('checkbox', { name: 'alle', exact: true }).check();
    await expect(page.locator('.multi-bar')).toContainText('Für 12 markierte:');
    await page.locator('.multi-bar').getByRole('button', { name: '+10', exact: true }).click();
    await expect(row.locator('output')).toHaveText('10');
    await page.screenshot({ path: `${shots}/${size.width}-multi.png`, fullPage: true });
    for (const b of await page.locator('.quick-buttons button,.multi-bar button').all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (size.width < 1024) {
      await page.getByRole('button', { name: 'Menü', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Menü', exact: true })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      await page
        .getByRole('navigation', { name: 'Arbeitsseiten' })
        .getByRole('link', { name: 'Schüler', exact: true })
        .click();
      await expect(page.locator('h1')).toHaveText('Schüler');
    }
    expect(errors).toEqual([]);
  });
test('class board has no individual values', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/dev/teacher.html#8a/tafel');
  await expect(page.locator('.board-total')).toHaveText('87 von 108');
  await expect(page.locator('.teacher-nav')).toBeHidden();
  await expect(page.locator('.teacher-top')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toMatch(/Fuchs|Biber|Münzen|XP|nicht aktiv/);
  await page.screenshot({ path: `${shots}/1920-board.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('h1')).toHaveText('Übersicht');
});
test('account creation and reset print one current QR card', async ({ page }) => {
  await page.goto('/dev/teacher.html#8a/konten');
  await page.locator('#singleForm [name=nickname]').fill('testfuchs');
  await page.locator('#singleForm [name=password]').fill('test123');
  await page.locator('#singleForm').getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(page.locator('.status')).toContainText('angelegt');
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole('button', { name: 'Karten drucken', exact: true }).click();
  await expect(page.locator('.cards svg')).toHaveCount(1);
  await page.locator('#resetForm [name=pupil]').selectOption({ label: 'testfuchs' });
  await page.locator('#resetForm [name=password]').fill('neues123');
  await page.locator('#resetForm').getByRole('button', { name: 'Setzen', exact: true }).click();
  await expect(page.locator('.status')).toContainText('Passwort neu gesetzt');
  await page.getByRole('button', { name: 'Karten drucken', exact: true }).click();
  await expect(page.locator('.cards svg')).toHaveCount(1);
  await expect(page.locator('.card-pass')).toHaveText('Passwort: neues123');
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: `${shots}/access-card.png`, fullPage: true });
});
test('read only village shows no pupil write controls', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1180, height: 820 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/teacher.html?readOnly=1');
  await expect(page.locator('.read-only-band')).toContainText('Ansicht von Fuchs – nur ansehen');
  await expect(page.locator('.stage canvas')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${shots}/read-only-village.png` });
  await page.getByRole('button', { name: 'Aufgaben', exact: true }).click();
  await expect(page.locator('.read-only-list')).toContainText('What is');
  await expect(page.locator('input,select,textarea,.avatar-badge,.build-bar')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      (window as unknown as { teacherFixture: { calls: string[] } }).teacherFixture.calls.every((n) =>
        ['teacher_village_members', 'teacher_pupil_quests'].includes(n),
      ),
    ),
  ).toBe(true);
  await page.screenshot({ path: `${shots}/read-only-quests.png` });
  expect(errors).toEqual([]);
});
test('class notice is visible on the market board', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dev/galerie.html?view=byte&notice=1');
  await page.waitForFunction(
    () => (window as unknown as { galerie?: { ready: boolean } }).galerie?.ready === true,
  );
  await page.screenshot({ path: `${shots}/market-notice.png` });
});
