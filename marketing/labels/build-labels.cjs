// Rebuilds the box-label images from marketing/box-stickers.html (the single
// source of the label designs and the shared QR):
//   - one 1800x960 PNG per design (ivory-classic.png, warm-gradient.png, ...)
//   - box-labels-a4-print-sheet.pdf: A4, 8 labels of 90 x 48 mm (each design
//     twice), dashed cut lines; plus a PNG preview of the sheet.
// Run from the repo root:  node marketing/labels/build-labels.cjs
// (needs Playwright: npm i -g playwright, or NODE_PATH pointing at it)
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = __dirname;
const DESIGNS = ['ivory-classic', 'warm-gradient', 'festive-muggu', 'minimal-premium']; // page order

// Cell positions (mm) matching the original print sheet.
const COLS_MM = [10.06, 110.07];
const ROWS_MM = [40.75, 96.84, 152.67, 208.76];
const CELL_W = 90; const CELL_H = 48;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(ROOT, 'box-stickers.html'));
  await page.waitForTimeout(500);

  const { defs, svgs } = await page.evaluate(() => ({
    defs: document.querySelector('svg defs').parentElement.outerHTML,
    svgs: [...document.querySelectorAll('svg.sticker')].map((s) => s.outerHTML),
  }));
  if (svgs.length !== DESIGNS.length) throw new Error(`expected ${DESIGNS.length} stickers, got ${svgs.length}`);

  // Single-label PNGs at 1800x960.
  const single = await browser.newPage({ viewport: { width: 900, height: 480 }, deviceScaleFactor: 2 });
  for (let i = 0; i < svgs.length; i += 1) {
    await single.setContent(`<!doctype html><html><body style="margin:0">${defs}
      <div style="width:900px;height:480px">${svgs[i].replace('class="sticker"', 'width="900" height="480"')}</div></body></html>`);
    await single.waitForTimeout(300);
    await single.screenshot({ path: path.join(OUT, `${DESIGNS[i]}.png`), clip: { x: 0, y: 0, width: 900, height: 480 } });
  }

  // A4 print sheet.
  const cells = [];
  ROWS_MM.forEach((top, r) => COLS_MM.forEach((left) => {
    cells.push(`<div class="cell" style="left:${left}mm;top:${top}mm">${svgs[r].replace('class="sticker"', 'class="lbl"')}</div>`);
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
  await preview.screenshot({ path: path.join(OUT, 'box-labels-a4-print-sheet.png'), fullPage: false });

  await browser.close();
  console.log('Wrote', DESIGNS.map((d) => `${d}.png`).join(', '), '+ box-labels-a4-print-sheet.pdf/.png');
})();
