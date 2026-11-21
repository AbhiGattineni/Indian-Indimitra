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
//   node marketing/labels/build-labels.cjs --colors --out colors
// --colors gives each of the 8 labels its own colour (panel + accents).
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
const COLORS = process.argv.includes('--colors');
// [panel gradient from, panel gradient to, accent (brand/line art), rule]
const PALETTE = [
  ['#F9881F', '#FF6B6B', '#E8663D', '#F9881F'], // coral-orange (original)
  ['#E8A100', '#D97706', '#B86E00', '#E8A100'], // marigold
  ['#A12A3B', '#6E1423', '#9B2335', '#C9A227'], // temple maroon
  ['#2F9E44', '#1B6E2E', '#2B8A3E', '#E0A100'], // leaf green
  ['#4453B8', '#24306E', '#3B4BA8', '#E35D6A'], // indigo
  ['#119DA4', '#0B6470', '#0B7D88', '#F2A541'], // peacock teal
  ['#8A4AB0', '#55256F', '#7B3FA0', '#E9A23B'], // royal purple
  ['#C0622F', '#7A3317', '#A0481F', '#E8A13A'], // terracotta
];
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

  if (COLORS) {
    stickers.forEach((st, i) => {
      const [from, to, accent, rule] = PALETTE[i % PALETTE.length];
      st.html = st.html
        .replace(/stop-color="#F9881F"/, `stop-color="${from}"`)
        .replace(/stop-color="#FF6B6B"/, `stop-color="${to}"`)
        .replace(/stroke="#B0553F"/, `stroke="${accent}"`)                      // line art
        .replace(/(data-field="brand"[^>]*?)fill="#E8663D"|fill="#E8663D"([^>]*data-field="brand")/, (m) => m.replace('#E8663D', accent))
        .replace(/rx="1.5" fill="#F9881F"/, `rx="1.5" fill="${rule}"`)            // divider rule
        .replace(/fill="#B0553F">Straight from India/, `fill="${accent}">Straight from India`);
    });
  }
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
