// Rebuilds the box-label images from marketing/box-stickers.html (the single
// source of the label designs and the shared QR):
//   - one 1800x960 PNG per design (ivory-classic.png, ... indigo-block-print.png)
//   - box-labels-a4-print-sheet.pdf: A4, 8 different labels of 90 x 48 mm
//     with dashed cut lines; plus a PNG preview of the sheet.
//
// The store brand under INDIMITRA is a setting, so the same sheet works for
// any store:
//   node marketing/labels/build-labels.cjs
//   node marketing/labels/build-labels.cjs --brand "Raza Gift Shop" --brand-te "" --out raza
// --brand-te "" drops the Telugu line; --out writes into marketing/labels/<out>/.
// Needs Playwright (npm i -g playwright; NODE_PATH=$(npm root -g)).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const BRAND = arg('brand', null);
const BRAND_TE = arg('brand-te', null);
const OUT = arg('out', null) ? path.join(__dirname, arg('out')) : __dirname;
fs.mkdirSync(OUT, { recursive: true });

const ROOT = path.resolve(__dirname, '..');
// A4 cell positions (mm), 2 columns x 4 rows, as on the original sheet.
const COLS_MM = [10.06, 110.07];
const ROWS_MM = [40.75, 96.84, 152.67, 208.76];
const CELL_W = 90; const CELL_H = 48;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto('file://' + path.join(ROOT, 'box-stickers.html'));
  await page.waitForTimeout(500);

  const { defs, stickers } = await page.evaluate(({ brand, brandTe }) => {
    document.querySelectorAll('[data-field="brand"]').forEach((el) => {
      if (brand != null) el.textContent = el.dataset.case === 'upper' ? brand.toUpperCase() : brand;
    });
    document.querySelectorAll('[data-field="brand-te"]').forEach((el) => {
      if (brandTe != null) el.textContent = brandTe;
    });
    return {
      defs: document.querySelector('svg defs symbol#qr').closest('svg').outerHTML,
      stickers: [...document.querySelectorAll('svg.sticker')].map((s) => ({
        name: s.getAttribute('aria-label').replace(/ label$/, ''),
        html: s.outerHTML,
      })),
    };
  }, { brand: BRAND, brandTe: BRAND_TE });
  const cellCount = COLS_MM.length * ROWS_MM.length;
  if (stickers.length !== cellCount) throw new Error(`expected ${cellCount} designs, got ${stickers.length}`);

  // Single-label PNGs at 1800x960.
  const single = await browser.newPage({ viewport: { width: 900, height: 480 }, deviceScaleFactor: 2 });
  for (const st of stickers) {
    await single.setContent(`<!doctype html><html><body style="margin:0">${defs}
      <div style="width:900px;height:480px">${st.html.replace('class="sticker"', 'width="900" height="480"')}</div></body></html>`);
    await single.waitForTimeout(300);
    await single.screenshot({ path: path.join(OUT, `${slug(st.name)}.png`), clip: { x: 0, y: 0, width: 900, height: 480 } });
  }

  // A4 print sheet: one of each design, in page order.
  const cells = [];
  ROWS_MM.forEach((top, r) => COLS_MM.forEach((left, c) => {
    const st = stickers[r * COLS_MM.length + c];
    cells.push(`<div class="cell" style="left:${left}mm;top:${top}mm">${st.html.replace('class="sticker"', 'class="lbl"')}</div>`);
  }));
  const sheet = `<!doctype html><html><head><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; width: 210mm; height: 297mm; background: #fff; }
    .cell { position: absolute; width: ${CELL_W}mm; height: ${CELL_H}mm; box-sizing: border-box;
            outline: 0.25mm dashed #b5b5b5; }
    .lbl { width: 100%; height: 100%; display: block; }
  </style></head><body>${defs}${cells.join('')}</body></html>`;
  const a4 = await browser.newPage();
  await a4.setContent(sheet);
  await a4.waitForTimeout(500);
  await a4.pdf({ path: path.join(OUT, 'box-labels-a4-print-sheet.pdf'), format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const preview = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 3 });
  await preview.setContent(sheet);
  await preview.waitForTimeout(500);
  await preview.screenshot({ path: path.join(OUT, 'box-labels-a4-print-sheet.png') });

  await browser.close();
  console.log(`Wrote ${stickers.length} label PNGs + box-labels-a4-print-sheet.pdf/.png to ${path.relative(process.cwd(), OUT) || '.'}`);
})();
