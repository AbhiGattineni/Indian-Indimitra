// Inline-SVG placeholder for products without a real photo yet. Reliable
// (no external host), on-brand, and shows the item name so the grid reads well
// until the seller's own accurate photos are uploaded.

const PALETTE = [
  ['#FFE3D3', '#FF6B6B'], // coral
  ['#FFF0CC', '#F9A825'], // amber
  ['#D8F5F1', '#2BC4B8'], // teal
  ['#F3E6DA', '#8D6E63'], // brown
  ['#FCE1E4', '#E53935'], // red
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function placeholderImage(name = '') {
  const [bg, fg] = PALETTE[hash(name) % PALETTE.length];
  const safe = String(name).replace(/[<>&]/g, '').slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#ffffff"/>
    </linearGradient></defs>
    <rect width="400" height="240" fill="url(#g)"/>
    <circle cx="200" cy="96" r="40" fill="${fg}" opacity="0.18"/>
    <text x="200" y="104" font-family="Roboto, Arial, sans-serif" font-size="34" font-weight="700"
      fill="${fg}" text-anchor="middle" opacity="0.55">${safe.charAt(0).toUpperCase()}</text>
    <text x="200" y="180" font-family="Roboto, Arial, sans-serif" font-size="20" font-weight="600"
      fill="#333333" text-anchor="middle">${safe}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
