/* Rounded QR codes drawn as SVG (needs qrcode-generator). Optional centre logo. */
function qrSvg(text, opt) {
  opt = opt || {};
  if (typeof qrcode === 'undefined') return '';
  const dark = opt.dark || '#2B2118';
  const q = qrcode(0, opt.logo ? 'H' : 'M');
  q.addData(unescape(encodeURIComponent(text)));
  q.make();
  const n = q.getModuleCount();
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const hole = opt.logo ? Math.floor(n * 0.24) | 1 : 0;
  const h0 = (n - hole) / 2, h1 = h0 + hole;
  const inHole = (r, c) => hole && r >= h0 - 0.5 && r < h1 + 0.5 && c >= h0 - 0.5 && c < h1 + 0.5;
  let cells = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!q.isDark(r, c) || finder(r, c) || inHole(r, c)) continue;
      cells += `<rect x="${c + 0.06}" y="${r + 0.06}" width=".88" height=".88" rx=".3"/>`;
    }
  }
  let eyes = '';
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => {
    eyes += `<rect x="${c + 0.5}" y="${r + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="${dark}" stroke-width="1"/>` +
      `<rect x="${c + 2}" y="${r + 2}" width="3" height="3" rx="1" fill="${opt.eye || dark}"/>`;
  });
  let logo = '';
  if (opt.logo) {
    const s = hole - 0.6, o = (n - s) / 2;
    logo = opt.logo.replace('<svg ', `<svg x="${o}" y="${o}" width="${s}" height="${s}" `);
  }
  const m = 2;
  return `<svg class="qr" viewBox="${-m} ${-m} ${n + 2 * m} ${n + 2 * m}" role="img" aria-label="QR code" shape-rendering="geometricPrecision">` +
    `<rect x="${-m}" y="${-m}" width="${n + 2 * m}" height="${n + 2 * m}" fill="#fff" rx="2"/>` +
    `<g fill="${dark}">${cells}</g>${eyes}${logo}</svg>`;
}
