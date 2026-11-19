import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  '/home/chris/.npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core/package.json',
);
const { chromium } = require('playwright-core');

const html = new URL('./meeting-prep.html', import.meta.url);
const pdf = fileURLToPath(new URL('./Jimmys-meeting-prep.pdf', import.meta.url));
const margin = '14mm';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  await page.goto(html.href);
  await page.pdf({
    path: pdf,
    format: 'A4',
    printBackground: true,
    margin: { top: margin, right: margin, bottom: margin, left: margin },
  });
} finally {
  await browser.close();
}
