/* ==========================================================================
   Olea — scan-to-order menu. The table number comes from the QR code
   (?t=5); the guest builds an order and sends it on WhatsApp, or keeps
   it to show the waiter.
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const qp = new URLSearchParams(location.search);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = (s) => ({
    get(k, d) { try { const v = s().getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { s().setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  });
  const ls = box(() => localStorage), ss = box(() => sessionStorage);

  const ITEM = Object.fromEntries(MENU.map((m) => [m.id, m]));
  const LANG = (c) => LANGS.find((l) => l.code === c);
  let lang = [qp.get('lang'), ls.get('olea-lang'), (navigator.language || 'en').slice(0, 2)].find((c) => c && PACK[c] && LANG(c)) || 'en';
  let L = PACK[lang];

  const tq = parseInt(qp.get('t') || qp.get('table'), 10);
  if (tq >= 1 && tq <= CAFE.tables) ss.set('olea-table', tq);
  let table = ss.get('olea-table', 0);

  let cart = ls.get('olea-cart', []).filter((l) => ITEM[l.id]);
  let visit = ls.get('olea-visit', null);
  // a visit belongs to one table; scanning another table's QR starts a new one
  if (!visit || Date.now() - visit.at > 6 * 3600e3 || (table && visit.table && visit.table !== table)) visit = { at: Date.now(), table, orders: [] };
  let orderNote = '';
  const state = { f: 'all', q: '' };
  const bill = { pay: 'card', split: 1 };

  /* ---------- helpers ---------- */
  const u = (k) => (L.ui[k] != null ? L.ui[k] : PACK.en.ui[k]);
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ''));
  const nm = (id, P) => (P || L).items[id][0];
  const ds = (id) => L.items[id][1];
  const money = (n) => CAFE.cur + n;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const img = (id) => `assets/img/${id}.jpg`;
  const norm = (s) => String(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ًͯ-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

  const I = {
    cup: '<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8.5 3c-.8 1 .8 2 0 3.2M12.5 3c-.8 1 .8 2 0 3.2"/>',
    ice: '<path d="M6 4h12l-1.6 15.2a2 2 0 0 1-2 1.8H9.6a2 2 0 0 1-2-1.8z"/><path d="M6.6 9.5h10.8"/><rect x="8.8" y="11.5" width="3" height="3" rx=".6"/><rect x="12.4" y="14" width="3" height="3" rx=".6"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l8-8"/>',
    egg: '<path d="M12 4c4.5 0 8 2.6 8 7.6 0 4.6-3.6 8.4-8 8.4s-8-3.8-8-8.4C4 6.6 7.5 4 12 4z"/><circle cx="12" cy="12.4" r="3.2"/>',
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M7.5 7.5c1-1.4 2-1.4 3 0s2 1.4 3 0 2-1.4 3 0"/>',
    cake: '<path d="M4 20h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path d="M4 15.2c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0"/><path d="M12 11V7.5"/><path d="M12 3.5c.9.9.9 2 0 2.7-.9-.7-.9-1.8 0-2.7z"/>',
    bell: '<path d="M5 17a7 7 0 0 1 14 0"/><path d="M3 17h18"/><path d="M4 20h16"/><path d="M12 10V8M10.5 8h3"/>',
    receipt: '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none"/>',
    spark: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    flame: '<path d="M12 21c-4 0-7-2.8-7-6.6 0-3.6 3-5.6 4-9.4 2.5 1.6 3.4 3.6 3.6 5.4 1-.8 1.6-2 1.7-3.4 2.4 2 3.7 4.6 3.7 7.4 0 3.8-3 6.6-6 6.6z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" fill="currentColor" stroke="none"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
    wa: '<path fill="currentColor" stroke="none" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.09c-.24.68-1.42 1.3-1.95 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.83 0-1.34.7-2 .95-2.28.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.33z"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/>',
    li: '<path fill="currentColor" stroke="none" d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0zM3.3 8.4h3.4V21H3.3zM9.2 8.4h3.25v1.73h.05c.45-.86 1.56-1.76 3.22-1.76 3.44 0 4.08 2.26 4.08 5.21V21h-3.4v-6.6c0-1.58-.03-3.6-2.2-3.6-2.2 0-2.53 1.71-2.53 3.48V21H9.2z"/>',
  };
  const ico = (n, c) => `<svg class="i${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  /* ---------- pricing & cart ---------- */
  function defaults(m) {
    const o = {};
    m.o.forEach((g) => { o[g] = OPTS[g].toggle ? false : OPTS[g].def; });
    return o;
  }
  function unit(id, o) {
    const m = ITEM[id];
    let p = m.p;
    m.o.forEach((g) => {
      const G = OPTS[g];
      if (G.toggle) { if (o[g]) p += G.toggle; } else { const c = G.c.find((x) => x[0] === o[g]); if (c) p += c[1]; }
    });
    return p;
  }
  function optText(line, P) {
    P = P || L;
    const out = [];
    ITEM[line.id].o.forEach((g) => {
      const G = OPTS[g], v = line.o[g];
      if (G.toggle) { if (v) out.push(P.opts[g][0]); } else if (v !== G.def || g === 'size' || g === 'sugar') out.push(P.opts[g][1][v]);
    });
    return out.join(lang === 'ar' ? '، ' : ', ');
  }
  const keyOf = (l) => l.id + '|' + JSON.stringify(l.o) + '|' + (l.n || '');
  const count = () => cart.reduce((s, l) => s + l.q, 0);
  const total = (lines) => (lines || cart).reduce((s, l) => s + unit(l.id, l.o) * l.q, 0);
  const qtyOf = (id) => cart.filter((l) => l.id === id).reduce((s, l) => s + l.q, 0);
  const visitTotal = () => visit.orders.reduce((s, o) => s + o.total, 0);
  function save() { ls.set('olea-cart', cart); ls.set('olea-visit', visit); }
  function addLine(id, o, q, n) {
    const line = { id, o: o || defaults(ITEM[id]), q: q || 1, n: n || '' };
    const k = keyOf(line);
    const ex = cart.find((l) => keyOf(l) === k);
    if (ex) ex.q += line.q; else cart.push(line);
    save(); refreshCart();
  }

  /* ---------- WhatsApp ---------- */
  function wa(text) {
    const url = 'https://wa.me/' + (CAFE.whatsapp || '') + '?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
    return url;
  }
  function orderText(lines, note) {
    const W = L.wa, H = PACK[CAFE.house];
    const rows = lines.map((l) => {
      let s = `• ${l.q} × ${nm(l.id)}`;
      if (lang !== CAFE.house) s += ` (${nm(l.id, H)})`;
      const ot = optText(l);
      if (ot) s += ` — ${ot}`;
      s += ` · ${money(unit(l.id, l.o) * l.q)}`;
      if (l.n) s += `\n   ↳ ${l.n}`;
      return s;
    });
    return [fill(W.order, { t: table }), '', ...rows, '', ...(note ? [`${W.note}: ${note}`] : []), `${W.total}: ${money(total(lines))}`, '', W.thanks].join('\n');
  }
  let afterPick = null;
  function needTable(fn) { if (table) fn(); else openPicker(fn); }

  function sendOrder() {
    if (!cart.length) return;
    needTable(() => {
      const url = wa(orderText(cart, orderNote));
      if (visit.table !== table) visit = { at: Date.now(), table, orders: [] };
      visit.orders.push({ at: Date.now(), lines: cart.map((l) => ({ ...l, o: { ...l.o } })), total: total() });
      cart = []; orderNote = ''; save(); refreshCart();
      openSheet('sent', `<div class="sh-pad done">
        <div class="done-ico">${ico('check')}</div>
        <h2 class="sh-t">${u('sentT')}</h2><p class="sh-p">${fill(u('sentP'), { t: table })}</p>
        <a class="again" href="${esc(url)}" target="_blank" rel="noopener">${ico('wa')} ${u('sentAgain')}</a>
        <button class="btn primary wide" data-act="close" type="button">${u('back')}</button></div>`);
    });
  }
  function callWaiter() {
    needTable(() => {
      wa(fill(L.wa.waiter, { t: table }));
      closeSheet();
      toast(fill(u('waiterOk'), { t: table }), 'bell');
    });
  }

  /* ---------- sheets ---------- */
  const sheet = $('#sheet'), body = $('#sheetBody'), scrim = $('#scrim');
  let sheetOpen = false, sheetKind = '';
  function openSheet(kind, html) {
    sheetKind = kind;
    body.innerHTML = html;
    sheet.className = 'sheet open s-' + kind;
    sheet.setAttribute('aria-hidden', 'false');
    scrim.classList.add('on');
    document.body.classList.add('lock');
    body.scrollTop = 0;
    if (!sheetOpen) { try { history.pushState({ olea: 1 }, ''); } catch (e) { /* ignore */ } }
    sheetOpen = true;
    $('#sheetX').setAttribute('aria-label', u('close'));
  }
  function closeSheet(fromPop) {
    if (!sheetOpen) return;
    sheetOpen = false; sheetKind = '';
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('on');
    document.body.classList.remove('lock');
    afterPick = null;
    if (!fromPop && history.state && history.state.olea) history.back();
  }
  addEventListener('popstate', () => { if (sheetOpen) closeSheet(true); });

  function openPicker(next) {
    afterPick = next || null;
    let g = '';
    for (let i = 1; i <= CAFE.tables; i++) g += `<button class="tp${i === table ? ' on' : ''}" data-table="${i}" type="button">${i}</button>`;
    openSheet('picker', `<div class="sh-pad">
      <div class="sh-ico">${ico('qr')}</div>
      <h2 class="sh-t">${u('pickT')}</h2><p class="sh-p">${next ? u('needTable') : u('pickP')}</p>
      <div class="tgrid">${g}</div>
      <button class="link-btn" data-act="close" type="button">${u('browse')}</button>
      <a class="owner" href="tables.html">${ico('qr')}<span>${u('owner')}</span>${ico('arrow', 'ar')}</a></div>`);
  }
  function setTable(n) {
    table = n; ss.set('olea-table', n);
    if (visit.table !== n) { if (visit.orders.length) visit = { at: Date.now(), table: n, orders: [] }; else visit.table = n; save(); }
    try { const p = new URLSearchParams(location.search); p.set('t', n); history.replaceState(history.state, '', '?' + p.toString() + location.hash); } catch (e) { /* ignore */ }
    renderSeat(); renderTry();
    const f = afterPick; afterPick = null;
    if (f) f(); else { closeSheet(); toast(`${u('table')} ${n}`, 'check'); }
  }

  /* item sheet */
  let cur = null;
  function openItem(id, edit) {
    const m = ITEM[id], line = edit != null ? cart[edit] : null;
    cur = { id, o: line ? { ...line.o } : defaults(m), q: line ? line.q : 1, n: line ? line.n : '', edit: line ? edit : null };
    const groups = m.o.map((g) => {
      const G = OPTS[g], P = L.opts[g];
      if (G.toggle) {
        return `<label class="tog"><input type="checkbox" data-tog="${g}"${cur.o[g] ? ' checked' : ''}><span class="tog-s"></span><span class="tog-l">${P[0]}</span><em dir="ltr">+${money(G.toggle)}</em></label>`;
      }
      return `<fieldset class="opt"><legend>${P[0]}</legend><div class="seg">${G.c.map(([v, d]) =>
        `<button type="button" class="${cur.o[g] === v ? 'on' : ''}" data-opt="${g}" data-v="${v}">${P[1][v]}${d ? `<em dir="ltr">${d > 0 ? '+' : '−'}${money(Math.abs(d))}</em>` : ''}</button>`).join('')}</div></fieldset>`;
    }).join('');
    const pr = ITEM[PAIR[id]];
    const al = m.al.length ? m.al.map((a) => `<span class="al">${L.al[a]}</span>`).join('') : `<span class="al ok">${u('noAl')}</span>`;
    openSheet('item', `<div class="is-img"><img src="${img(id)}" alt=""></div>
      <div class="sh-pad is">
        <div class="badges">${badges(m)}</div>
        <h2 class="is-t">${esc(nm(id))}</h2><p class="is-d">${esc(ds(id))}</p>
        <div class="is-meta"><span class="kc">${ico('flame')}${m.kcal} ${u('kcal')}</span><span class="is-al"><b>${u('allergens')}</b>${al}</span></div>
        ${groups ? `<div class="opts">${groups}</div>` : ''}
        <label class="fld"><span>${u('note')}</span><input id="itemNote" value="${esc(cur.n)}" placeholder="${esc(u('notePh'))}" maxlength="120"></label>
        ${pr ? `<div class="pair"><span class="pair-k">${ico('spark')}${u('pairs')}</span><div class="pair-c"><img src="${img(pr.id)}" alt=""><span class="pair-t"><b>${esc(nm(pr.id))}</b><em>${money(pr.p)}</em></span><button class="pair-add" data-add="${pr.id}" type="button" aria-label="${esc(u('add') + ' ' + nm(pr.id))}">${ico('plus')}</button></div></div>` : ''}
      </div>
      <div class="is-foot">
        <div class="qty"><button data-iq="-1" type="button" aria-label="−">${ico('minus')}</button><span id="iq">${cur.q}</span><button data-iq="1" type="button" aria-label="+">${ico('plus')}</button></div>
        <button class="btn primary grow" data-act="additem" id="addBtn" type="button">${cur.edit != null ? ico('check') : u('addTo')}<span class="dot">·</span><span id="ip">${money(unit(id, cur.o) * cur.q)}</span></button>
      </div>`);
  }
  const curPrice = () => { $('#ip').textContent = money(unit(cur.id, cur.o) * cur.q); $('#iq').textContent = cur.q; };

  function badges(m, short) {
    const show = ['pop', 'new', 'vegan', 'gf', 'nocaf'].filter((t) => m.t.includes(t));
    return (short ? show.slice(0, 2) : show).map((t) => `<span class="bdg b-${t}">${t === 'pop' ? ico('star') : t === 'vegan' ? ico('leaf') : ''}${L.tags[t]}</span>`).join('');
  }

  /* cart sheet */
  function openCart() {
    const vt = visitTotal();
    const lines = cart.map((l, i) => {
      const ot = optText(l);
      return `<li class="cl"><img src="${img(l.id)}" alt="">
        <div class="cl-t"><button class="cl-n" data-edit="${i}" type="button">${esc(nm(l.id))}</button>${ot ? `<small>${esc(ot)}</small>` : ''}${l.n ? `<small class="cl-note">“${esc(l.n)}”</small>` : ''}<b>${money(unit(l.id, l.o) * l.q)}</b></div>
        <div class="qty sm"><button data-lq="${i}" data-d="-1" type="button" aria-label="${l.q === 1 ? u('remove') : '−'}">${ico(l.q === 1 ? 'trash' : 'minus')}</button><span>${l.q}</span><button data-lq="${i}" data-d="1" type="button" aria-label="+">${ico('plus')}</button></div></li>`;
    }).join('');
    openSheet('cart', `<div class="sh-pad">
      <div class="cart-h"><h2 class="sh-t">${u('order')}</h2><button class="tbl-chip" data-act="picker" type="button">${table ? `${u('table')} ${table}` : u('pickT')}${ico('chev')}</button></div>
      ${cart.length ? `<ul class="cart-l">${lines}</ul>
        <label class="fld"><span>${u('orderNote')}</span><textarea id="orderNote" rows="2" placeholder="${esc(u('orderNotePh'))}" maxlength="200">${esc(orderNote)}</textarea></label>
        <div class="tot"><span>${u('total')}</span><b>${money(total())}</b></div>
        <h3 class="sub-h">${u('howT')}</h3>
        <button class="choice c-wa" data-act="send" type="button"><span class="ch-i">${ico('wa')}</span><span class="ch-t"><b>${u('sendWa')}</b><small>${u('sendWaP')}</small></span>${ico('arrow', 'ar')}</button>
        <button class="choice" data-act="wait" type="button"><span class="ch-i">${ico('bell')}</span><span class="ch-t"><b>${u('wait')}</b><small>${u('waitP')}</small></span>${ico('arrow', 'ar')}</button>`
      : `<div class="empty"><div class="empty-ico">${ico('cup')}</div><b>${u('empty')}</b><p>${u('emptyP')}</p><button class="btn" data-act="close" type="button">${u('back')}</button></div>`}
      ${vt ? `<div class="visit-mini"><span>${u('visit')}<b>${money(vt)}</b></span><button class="btn ghost sm" data-act="bill" type="button">${ico('receipt')}${u('billT')}</button></div>` : ''}
    </div>`);
  }

  function openShow() {
    needTable(() => {
      const H = PACK[CAFE.house];
      const rows = cart.map((l) => {
        const ot = optText(l);
        return `<li><span class="sq">${l.q}×</span><span class="sn"><b>${esc(nm(l.id))}</b>${lang !== CAFE.house ? `<i>${esc(nm(l.id, H))}</i>` : ''}${ot ? `<small>${esc(ot)}</small>` : ''}${l.n ? `<small class="cl-note">“${esc(l.n)}”</small>` : ''}</span><span class="sp">${money(unit(l.id, l.o) * l.q)}</span></li>`;
      }).join('');
      openSheet('show', `<div class="sh-pad show">
        <p class="show-k">${ico('bell')}${u('showT')}</p>
        <div class="show-n"><small>${u('table')}</small><b>${pad(table)}</b></div>
        <ul class="show-l">${rows}</ul>
        ${orderNote ? `<p class="show-note">“${esc(orderNote)}”</p>` : ''}
        <div class="tot big"><span>${u('total')}</span><b>${money(total())}</b></div>
        <button class="btn wa wide" data-act="waiter" type="button">${ico('wa')}${u('callNow')}</button>
        <button class="link-btn" data-act="cart" type="button">${ico('arrow', 'back')}${u('order')}</button></div>`);
    });
  }

  function openBill() {
    needTable(() => {
      const vt = visitTotal();
      const agg = {};
      visit.orders.forEach((o) => o.lines.forEach((l) => {
        const k = l.id + '|' + optText(l);
        agg[k] = agg[k] || { id: l.id, ot: optText(l), q: 0, sum: 0 };
        agg[k].q += l.q; agg[k].sum += unit(l.id, l.o) * l.q;
      }));
      const list = Object.values(agg).map((a) => `<li><span>${a.q}× ${esc(nm(a.id))}${a.ot ? ` <small>${esc(a.ot)}</small>` : ''}</span><b>${money(a.sum)}</b></li>`).join('');
      const each = vt && bill.split > 1 ? `<span class="each">${money(Math.ceil(vt / bill.split))} ${u('each')}</span>` : '';
      openSheet('bill', `<div class="sh-pad">
        <div class="sh-ico">${ico('receipt')}</div>
        <h2 class="sh-t">${u('billT')}</h2><p class="sh-p">${u('table')} ${table}</p>
        ${vt ? `<div class="visit"><h3>${u('visit')}</h3><ul>${list}</ul><div class="tot"><span>${u('total')}</span><b>${money(vt)}</b></div></div>` : ''}
        <h3 class="sub-h">${u('pay')}</h3>
        <div class="seg two">${['card', 'cash'].map((p) => `<button type="button" class="${bill.pay === p ? 'on' : ''}" data-pay="${p}">${u(p)}</button>`).join('')}</div>
        <h3 class="sub-h">${u('split')}</h3>
        <div class="split"><div class="qty sm"><button data-split="-1" type="button" aria-label="−">${ico('minus')}</button><span>${bill.split}</span><button data-split="1" type="button" aria-label="+">${ico('plus')}</button></div><span class="pp">${u('people')}</span>${each}</div>
        <button class="btn wa wide" data-act="sendbill" type="button">${ico('wa')}${u('sendBill')}</button></div>`);
    });
  }
  function sendBill() {
    const W = L.wa, vt = visitTotal();
    const t = [fill(W.bill, { t: table }), `${W.pay}: ${u(bill.pay)}`];
    if (bill.split > 1) t.push(fill(W.split, { n: bill.split }));
    if (vt) t.push(`${W.total}: ${money(vt)}`);
    wa(t.join('\n'));
    closeSheet();
    toast(fill(u('waiterOk'), { t: table }), 'receipt');
  }

  function openWifi() {
    const w = CAFE.wifi;
    openSheet('wifi', `<div class="sh-pad wifi">
      <div class="sh-ico">${ico('wifi')}</div><h2 class="sh-t">${u('wifiT')}</h2>
      <div class="wifi-qr">${qrSvg(`WIFI:T:WPA;S:${w.ssid};P:${w.pass};;`)}</div>
      <dl class="wifi-d"><div><dt>${u('network')}</dt><dd>${esc(w.ssid)}</dd></div><div><dt>${u('password')}</dt><dd class="mono">${esc(w.pass)}</dd></div></dl>
      <button class="btn primary wide" data-act="copywifi" type="button">${ico('copy')}<span id="cpy">${u('copy')}</span></button></div>`);
  }

  /* ---------- assistant ---------- */
  const KW = {
    waiter: ['waiter', 'waitress', 'staff', 'garson', 'serveur', 'serveuse', 'kellner', 'bedienung', 'نادل', 'جرسون'],
    bill: ['bill', 'receipt', 'hesap', 'fis', 'addition', 'rechnung', 'فاتوره', 'الحساب'],
    wifi: ['wifi', 'wi-fi', 'wlan', 'internet', 'password', 'sifre', 'parola', 'mot de passe', 'passwort', 'واي', 'انترنت', 'كلمه السر'],
    hours: ['hour', 'open', 'close', 'closing', 'saat', 'acik', 'kapan', 'horaire', 'ouvert', 'ferme', 'offnung', 'geoffnet', 'schlie', 'ساعات', 'مفتوح', 'تغلق', 'يغلق', 'دوام'],
    pay: ['pay', 'card', 'cash', 'contactless', 'odeme', 'odey', 'kart', 'nakit', 'temassiz', 'payer', 'carte', 'especes', 'zahlen', 'karte', 'kontaktlos', 'دفع', 'بطاقه', 'نقدا', 'كاش'],
    wait: ['how long', 'wait', 'minute', 'ne kadar', 'bekle', 'dakika', 'combien de temps', 'attendre', 'wie lange', 'warten', 'dauer', 'كم من الوقت', 'انتظار', 'دقائق'],
    allergy: ['allerg', 'alerj', 'nut', 'nuts', 'findik', 'fistik', 'noix', 'nuss', 'nusse', 'حساسيه', 'مكسرات'],
    lactose: ['lactose', 'dairy', 'milk free', 'laktoz', 'sutsuz', 'sans lait', 'laktose', 'milchfrei', 'لاكتوز', 'بدون حليب', 'البان'],
    gf: ['gluten', 'celiac', 'colyak', 'coeliaque', 'zoliakie', 'غلوتين', 'جلوتين'],
    vegan: ['vegan', 'vegetalien', 'plant based', 'نباتي'],
    nocaf: ['caffeine', 'decaf', 'kafein', 'cafeine', 'koffein', 'كافيين', 'sleep', 'uyku', 'dormir', 'schlaf', 'نوم'],
    kids: ['kid', 'kids', 'child', 'cocuk', 'enfant', 'kinder', 'اطفال', 'طفل'],
    cheap: ['cheap', 'budget', 'ucuz', 'uygun', 'pas cher', 'gunstig', 'billig', 'رخيص', 'ارخص'],
    strong: ['strong', 'kick', 'wake', 'energy', 'tired', 'sert', 'guclu', 'yorgun', 'uyan', 'enerji', 'corse', 'fort', 'reveil', 'fatigu', 'energie', 'stark', 'kraftig', 'mude', 'wach', 'قوي', 'طاقه', 'متعب', 'نشاط'],
    sweet: ['sweet', 'sugar', 'tatli', 'sekerli', 'sucre', 'gourmand', 'suße', 'suss', 'حلو', 'سكر'],
    dessert: ['dessert', 'cake', 'pastry', 'sweets', 'tatli', 'pasta', 'kek', 'gateau', 'patisserie', 'kuchen', 'nachtisch', 'حلوي', 'حلويات', 'كيك', 'تحليه'],
    cold: ['cold', 'iced', 'ice', 'refresh', 'soguk', 'buz', 'serin', 'ferah', 'froid', 'glace', 'frais', 'kalt', 'eis', 'erfrisch', 'بارد', 'مثلج', 'منعش'],
    hot: ['hot', 'warm', 'sicak', 'chaud', 'heiß', 'heiss', 'ساخن', 'دافئ'],
    light: ['light', 'healthy', 'diet', 'calorie', 'hafif', 'saglikli', 'diyet', 'kalori', 'leger', 'sain', 'sante', 'leicht', 'gesund', 'kalorien', 'خفيف', 'صحي', 'رجيم', 'سعرات'],
    breakfast: ['breakfast', 'brunch', 'morning', 'kahvalti', 'sabah', 'petit-dej', 'petit dej', 'fruhstuck', 'فطور', 'افطار'],
    food: ['hungry', 'eat', 'food', 'lunch', 'sandwich', 'salad', 'acik', 'aciktim', 'yemek', 'ogle', 'sandvic', 'salata', 'faim', 'manger', 'dejeuner', 'salade', 'hunger', 'essen', 'mittag', 'salat', 'جائع', 'جوعان', 'اكل', 'طعام', 'غداء', 'سلطه'],
    pop: ['popular', 'best', 'recommend', 'favourite', 'favorite', 'suggest', 'signature', 'populer', 'en iyi', 'oner', 'tavsiye', 'populaire', 'meilleur', 'recommand', 'conseil', 'beliebt', 'empfehl', 'beste', 'افضل', 'اقترح', 'تنصح', 'مشهور'],
    coffee: ['coffee', 'kahve', 'cafe', 'kaffee', 'قهوه'],
    tea: ['tea', 'cay', 'tee', 'infusion', 'شاي'],
    thanks: ['thank', 'thx', 'tesekkur', 'sagol', 'merci', 'danke', 'شكرا'],
    hi: ['hello', 'hey', 'hi', 'merhaba', 'selam', 'bonjour', 'salut', 'hallo', 'مرحبا', 'السلام', 'اهلا'],
  };
  const FILT = {
    strong: (m) => m.t.includes('strong'), sweet: (m) => m.t.includes('sweet'), dessert: (m) => m.cat === 'sweets',
    cold: (m) => m.t.includes('cold'), hot: (m) => ['coffee', 'tea'].includes(m.cat), vegan: (m) => m.t.includes('vegan'),
    nocaf: (m) => m.t.includes('nocaf'), light: (m) => m.t.includes('light'), breakfast: (m) => m.cat === 'breakfast',
    food: (m) => m.cat === 'food' || m.cat === 'breakfast', pop: (m) => m.t.includes('pop'), gf: (m) => m.t.includes('gf'),
    kids: (m) => m.t.includes('kids'), cheap: (m) => m.p <= 120, lactose: (m) => !m.al.includes('milk') && m.cat !== 'food',
    coffee: (m) => m.cat === 'coffee' || ['icedlatte', 'coldbrew', 'frappe'].includes(m.id), tea: (m) => ['tea', 'herbal', 'matcha'].includes(m.id),
  };
  const ARAB = /[؀-ۿ]/;
  const KWN = Object.fromEntries(Object.entries(KW).map(([k, v]) => [k, v.map(norm)]));
  const GENERIC = new Set(['coffee', 'kahve', 'kahvesi', 'cafe', 'caffe', 'kaffee', 'fresh', 'taze', 'frais', 'frischer', 'warm', 'iced', 'buzlu', 'glace', 'with', 'avec', 'sicak', 'heisse', 'water', 'suyu', 'cold', 'soguk', 'kalt', 'froid', 'brew', 'قهوه', 'شاي', 'طازج', 'ساخنه']);
  function hit(q, toks, w) {
    if (ARAB.test(w) || w.length > 4 || w.includes(' ')) return q.includes(w);
    return toks.some((t) => (w.length <= 3 ? t === w : t.startsWith(w)));
  }
  const cards = (list) => `<div class="ai-cards">${list.map((m) => `<div class="aic"><button class="aic-o" data-open="${m.id}" type="button"><img src="${img(m.id)}" alt=""><span><b>${esc(nm(m.id))}</b><em>${money(m.p)}</em></span></button><button class="aic-add" data-add="${m.id}" type="button" aria-label="${esc(u('add') + ' ' + nm(m.id))}">${ico('plus')}</button></div>`).join('')}</div>`;
  const act = (a, icon, label) => `<button class="ai-act" data-act="${a}" type="button">${ico(icon)}${label}</button>`;
  const chipsHtml = () => `<div class="ai-sugg">${L.ai.chips.map((c) => `<button data-ask="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div>`;

  function answer(raw) {
    const q = ' ' + norm(raw.replace(/thé/gi, 'tea')) + ' ';
    const toks = q.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const has = (k) => KWN[k].some((w) => hit(q, toks, w));
    const A = L.ai.a, T = (s) => `<p>${esc(s)}</p>`;
    if (has('waiter')) return T(fill(A.waiter, { t: table || '—' })) + act('waiter', 'bell', u('waiter'));
    if (has('bill')) return T(A.bill) + act('bill', 'receipt', u('billT'));
    if (has('wifi')) return T(fill(A.wifi, CAFE.wifi)) + act('wifi', 'wifi', u('wifiT'));
    if (has('hours')) return T(fill(A.hours, { o: CAFE.hours.open, c: CAFE.hours.close }));
    if (has('pay')) return T(A.pay) + act('bill', 'receipt', u('billT'));
    if (has('wait')) return T(A.wait);
    // a dish or drink named directly
    let best = 0, named = [];
    MENU.forEach((m) => {
      let s = 0;
      [nm(m.id), nm(m.id, PACK.en)].forEach((n) => {
        const nn = norm(n);
        if (q.includes(nn)) s += 5;
        nn.split(/\s+/).forEach((w) => { if (w.length >= 4 && !GENERIC.has(w) && toks.includes(w)) s += 1; });
      });
      if (s > best) { best = s; named = [m]; } else if (s && s === best) named.push(m);
    });
    if (best) return T(A.item) + cards(named.slice(0, 4));
    let intents = Object.keys(FILT).filter(has);
    // food and desserts are caffeine-free anyway (tiramisu aside)
    const noCafFood = intents.includes('nocaf') && intents.some((k) => ['dessert', 'food', 'breakfast'].includes(k));
    if (noCafFood) intents = intents.filter((k) => k !== 'nocaf');
    if (intents.length) {
      let list = MENU.filter((m) => intents.every((k) => FILT[k](m)) && !(noCafFood && m.id === 'tiramisu'));
      const alias = { tea: 'hot', coffee: 'hot' };
      let intro = intents.includes('lactose') ? A.lactose : A[intents.map((k) => alias[k] || k).find((k) => A[k])] || A.pop;
      if (!list.length) { list = MENU.filter(FILT[intents[0]]); intro = A.none; }
      list.sort((a, b) => b.t.includes('pop') - a.t.includes('pop'));
      return T(intro) + cards(list.slice(0, 6));
    }
    if (has('allergy')) return T(A.allergy);
    if (has('thanks')) return T(A.thanks);
    if (has('hi')) return T(A.hi) + chipsHtml();
    return T(A.fallback) + chipsHtml();
  }

  const chat = [];
  function openAI() {
    if (!chat.length) chat.push({ who: 'bot', html: `<p>${esc(L.ai.hello)}</p>` + chipsHtml() });
    renderAI();
  }
  function renderAI(typing) {
    openSheet('ai', `<div class="ai-head"><span class="ai-av">${ico('spark')}</span><div><b>${esc(L.ai.name)}</b><small>${esc(L.ai.role)}</small></div></div>
      <div class="ai-log" id="aiLog">${chat.map((m) => `<div class="msg ${m.who}">${m.html}</div>`).join('')}${typing ? '<div class="msg bot typing"><i></i><i></i><i></i></div>' : ''}</div>
      <form class="ai-form" id="aiForm"><input id="aiIn" placeholder="${esc(L.ai.ph)}" autocomplete="off" maxlength="160"><button type="submit" aria-label="${esc(L.ai.ph)}">${ico('send')}</button></form>`);
    const log = $('#aiLog');
    log.scrollTop = log.scrollHeight;
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    chat.push({ who: 'me', html: `<p>${esc(q)}</p>` });
    renderAI(true);
    setTimeout(() => { chat.push({ who: 'bot', html: answer(q) }); if (sheetKind === 'ai') renderAI(); }, REDUCED ? 0 : 550);
  }

  /* ---------- page rendering ---------- */
  function renderChrome() {
    const lg = LANG(lang);
    root.lang = lang; root.dir = lg.dir;
    document.title = `${CAFE.name} ${L.ui.tagline} — Menu`;
    $('#markHdr').innerHTML = MARK;
    $$('[data-t]').forEach((el) => { const [a, b] = el.dataset.t.split('.'); el.textContent = L[a][b]; });
    $('#langBtn').innerHTML = `${ico('globe', 'lang-globe')}<span class="lang-code">${lang.toUpperCase()}</span>${ico('chev', 'lang-chev')}`;
    $('#langBtn').setAttribute('aria-label', u('lang'));
    $('#langMenu').innerHTML = `<p class="lang-title">${ico('globe')}${u('lang')}</p>` + LANGS.map((l) =>
      `<button type="button" role="menuitem" class="${l.code === lang ? 'on' : ''}" data-lang="${l.code}"><span class="lflag">${FLAGS[l.code]}</span><span class="lang-n">${l.name}</span><span class="lang-tag">${l.code.toUpperCase()}</span></button>`).join('');
  }
  function renderSeat() {
    $('#tblPill').innerHTML = table ? `<small>${u('table')}</small><b>${pad(table)}</b>` : `${ico('qr')}<b>${u('table')}</b>`;
    $('#tblPill').classList.toggle('none', !table);
    $('#seat').innerHTML = table
      ? `<span class="seat-l">${u('seated')}</span><span class="seat-n"><small>${u('table')}</small><b>${pad(table)}</b></span><span class="seat-c">${u('change')}${ico('chev')}</span>`
      : `<span class="seat-q">${ico('qr')}</span><span class="seat-l strong">${u('pickT')}</span><span class="seat-c">${ico('arrow', 'ar')}</span>`;
    $('#seat').classList.toggle('none', !table);
  }
  function renderHero() {
    const d = new Date(), h = d.getHours(), mins = h * 60 + d.getMinutes();
    const tm = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
    const open = mins >= tm(CAFE.hours.open) && mins < tm(CAFE.hours.close);
    $('#greet').textContent = L.ui.greet[h < 12 ? 0 : h < 18 ? 1 : 2];
    $('#welcome').innerHTML = u('welcome').split(' ').map((w, i) => `<span class="w" style="--d:${i * 70 + 120}ms"><span>${esc(w)}</span></span>`).join(' ');
    $('#openState').className = 'open-dot' + (open ? ' on' : '');
    $('#openState').textContent = open ? u('open') : u('closed');
    $('#hoursTxt').textContent = `${u('daily')} · ${CAFE.hours.open} – ${CAFE.hours.close}`;
    $('#quick').innerHTML = [['waiter', 'bell'], ['bill', 'receipt'], ['wifi', 'wifi'], ['ai', 'spark']].map(([a, i]) =>
      `<button type="button" data-act="${a}"><span class="q-i">${ico(i)}</span><span>${u(a === 'ai' ? 'ask' : a)}</span></button>`).join('');
    renderSeat();
  }
  function renderTools() {
    $('#q').placeholder = u('search');
    $('#q').setAttribute('aria-label', u('search'));
    $('#filters').innerHTML = ['all', 'pop', 'vegan', 'gf', 'nocaf'].map((f) =>
      `<button type="button" class="${state.f === f ? 'on' : ''}" data-f="${f}">${f === 'pop' ? ico('star') : f === 'vegan' ? ico('leaf') : ''}${L.ui.f[f]}</button>`).join('');
    $('#catsIn').innerHTML = CATS.map((c) => `<button type="button" data-cat="${c.id}">${ico(c.icon)}<span>${L.cats[c.id][0]}</span></button>`).join('');
  }
  const matches = (m) => {
    if (state.f !== 'all' && !m.t.includes(state.f)) return false;
    if (!state.q) return true;
    return norm([nm(m.id), ds(m.id), nm(m.id, PACK.en), L.cats[m.cat][0]].join(' ')).includes(norm(state.q.trim()));
  };
  const row = (m) => `<article class="item" data-id="${m.id}">
    <button class="item-main" data-open="${m.id}" type="button">
      <span class="item-txt"><span class="item-n">${esc(nm(m.id))}</span><span class="item-d">${esc(ds(m.id))}</span>
      <span class="item-f"><span class="item-p">${money(m.p)}</span>${badges(m, true)}</span></span>
      <span class="item-img"><img src="${img(m.id)}" alt="" loading="lazy" width="300" height="234"></span>
    </button>
    <button class="add" data-add="${m.id}" type="button" aria-label="${esc(u('add') + ' ' + nm(m.id))}">${ico('plus')}<span class="add-n"></span></button>
  </article>`;
  function renderMenu() {
    const filtering = state.f !== 'all' || state.q;
    const favs = MENU.filter((m) => m.t.includes('pop'));
    $('#favs').hidden = !!filtering;
    $('#favs').innerHTML = `<div class="sec-h"><div><p class="kick">${ico('star')}${u('favT')}</p><h2>${u('favP')}</h2></div></div>
      <div class="fav-row">${favs.map((m) => `<article class="fav"><button class="fav-o" data-open="${m.id}" type="button"><img src="${img(m.id)}" alt="" loading="lazy"><span class="fav-t"><b>${esc(nm(m.id))}</b><em>${money(m.p)}</em></span></button><button class="add" data-add="${m.id}" type="button" aria-label="${esc(u('add') + ' ' + nm(m.id))}">${ico('plus')}<span class="add-n"></span></button></article>`).join('')}</div>`;
    let any = 0;
    $('#sections').innerHTML = CATS.map((c) => {
      const list = MENU.filter((m) => m.cat === c.id && matches(m));
      any += list.length;
      if (!list.length) return '';
      return `<section class="sec" id="c-${c.id}" data-sec="${c.id}">
        <header class="sec-h"><span class="sec-i">${ico(c.icon)}</span><div><h2>${L.cats[c.id][0]}</h2><p>${L.cats[c.id][1]}</p></div><span class="sec-n">${list.length}</span></header>
        <div class="list">${list.map(row).join('')}</div></section>`;
    }).join('');
    $('#nores').hidden = !!any;
    $('#nores').textContent = u('noRes');
    $$('#catsIn [data-cat]').forEach((b) => { b.hidden = !$('#c-' + b.dataset.cat); });
    refreshCounts();
    reveal();
    spy();
  }
  function renderAbout() {
    const so = socials();
    $('#about').innerHTML = `<div class="ab-pics"><img src="assets/img/barista.jpg" alt="" loading="lazy"><img src="assets/img/beans.jpg" alt="" loading="lazy"></div>
      <div class="ab-t"><p class="kick">${ico('leaf')}${u('aboutK')}</p><h2>${u('aboutT')}</h2><p>${u('aboutP')}</p>
      <ul class="ab-info"><li>${ico('clock')}<span><b>${u('hours')}</b>${u('daily')} · ${CAFE.hours.open} – ${CAFE.hours.close}</span></li>
      <li>${ico('wifi')}<span><b>${u('wifiT')}</b>${esc(CAFE.wifi.ssid)}</span><button class="btn ghost sm" data-act="wifi" type="button">${u('password')}</button></li>
      <li>${ico('pin')}<span><b>${u('address')}</b>${esc(CAFE.address)}</span></li></ul>
      <div class="so">${so}</div></div>`;
  }
  function socials() {
    return `<a href="https://wa.me/${CAFE.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp" class="so-wa">${ico('wa')}</a>` +
      `<a href="${CAFE.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram" class="so-ig">${ico('ig')}</a>` +
      `<a href="${CAFE.social.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn" class="so-li">${ico('li')}</a>`;
  }
  function renderFooter() {
    $('#ftr').innerHTML = `<div class="ftr-in">
      <div class="ftr-b"><span class="mark">${MARK}</span><div><b>${CAFE.name}</b><small>${u('tagline')}</small></div></div>
      <ul class="ftr-c"><li>${ico('pin')}${esc(CAFE.address)}</li><li>${ico('phone')}<a href="${CAFE.phoneHref}">${CAFE.phone}</a></li><li>${ico('clock')}${u('daily')} · ${CAFE.hours.open} – ${CAFE.hours.close}</li></ul>
      <div class="ftr-so"><span>${u('follow')}</span><div class="so">${socials()}</div></div>
      <div class="ftr-demo"><p>${u('demo')}</p><p>${u('credit')}</p><a href="tables.html">${ico('qr')}${u('tables')}</a></div></div>`;
  }
  function renderTry() {
    const el = $('#try');
    if (!matchMedia('(min-width: 1280px) and (hover: hover)').matches || ss.get('olea-try-x', false)) { el.hidden = true; return; }
    const t = table || 1;
    const url = location.origin + location.pathname + '?t=' + t + (lang !== 'en' ? '&lang=' + lang : '');
    el.innerHTML = `<button class="try-x" data-act="tryx" type="button" aria-label="${u('close')}">${ico('x')}</button>
      <div class="try-qr">${qrSvg(url, { logo: MARK })}</div>
      <div class="try-t"><b>${u('tryT')}</b><p>${fill(u('tryP'), { t })}</p><a href="tables.html">${ico('qr')}${u('tables')}</a></div>`;
    el.hidden = false;
  }
  function renderAll() {
    renderChrome(); renderHero(); renderTools(); renderMenu(); renderAbout(); renderFooter(); refreshCart(); renderTry();
    $('#aiFab').innerHTML = `<span class="fab-i">${ico('spark')}</span><span class="fab-t">${u('ask')}</span>`;
  }

  /* ---------- cart bar & counts ---------- */
  function refreshCounts() {
    $$('[data-add]').forEach((b) => {
      const n = qtyOf(b.dataset.add), s = $('.add-n', b);
      b.classList.toggle('has', n > 0);
      if (s) s.textContent = n || '';
      const it = b.closest('.item');
      if (it) it.classList.toggle('in-cart', n > 0);
    });
  }
  let lastCount = count();
  function refreshCart() {
    const n = count(), bar = $('#cartbar');
    bar.hidden = !n;
    document.body.classList.toggle('has-cart', !!n);
    bar.innerHTML = `<span class="cb-n">${n}</span><span class="cb-t">${u('view')}</span><span class="cb-p">${money(total())}</span>${ico('arrow', 'ar')}`;
    if (n !== lastCount && n) { bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); }
    lastCount = n;
    refreshCounts();
    if (sheetKind === 'cart') openCart();
  }

  function fly(from, id) {
    if (REDUCED || !from) return;
    const bar = $('#cartbar');
    if (bar.hidden) return;
    const a = from.getBoundingClientRect(), b = bar.getBoundingClientRect();
    const dot = document.createElement('img');
    dot.src = img(id); dot.className = 'flyer'; dot.alt = '';
    dot.style.left = a.left + a.width / 2 - 22 + 'px'; dot.style.top = a.top + a.height / 2 - 22 + 'px';
    document.body.appendChild(dot);
    const dx = b.left + 34 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = dot.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(.85)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.4 },
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.3,1)' });
    anim.onfinish = () => dot.remove();
  }

  let toastT;
  function toast(msg, icon) {
    const t = $('#toast');
    t.innerHTML = `${ico(icon || 'check')}<span>${esc(msg)}</span>`;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 2400);
  }

  /* ---------- motion ---------- */
  // reveal cards as they scroll into view (checked on scroll, no observer needed)
  let pending = [];
  function reveal() {
    pending = $$('.item, .fav, .sec-h').filter((e) => !e.classList.contains('in'));
    if (REDUCED) { pending.forEach((e) => e.classList.add('in')); pending = []; return; }
    revealCheck();
  }
  function revealCheck() {
    if (!pending.length) return;
    const lim = innerHeight * 0.96;
    let k = 0;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top > lim) return true;
      el.style.transitionDelay = Math.min(k++, 6) * 45 + 'ms';
      el.classList.add('in');
      return false;
    });
  }
  const hdr = $('#hdr'), hero = $('#hero');
  function offsetTop() { return hdr.offsetHeight + $('#cats').offsetHeight; }
  let activeCat = '';
  function spy() {
    const secs = $$('.sec');
    let id = secs.length ? secs[0].dataset.sec : '';
    const lim = offsetTop() + 24;
    secs.forEach((s) => { if (s.getBoundingClientRect().top <= lim) id = s.dataset.sec; });
    if (id === activeCat) return;
    activeCat = id;
    const wrap = $('#catsIn');
    $$('[data-cat]', wrap).forEach((b) => b.classList.toggle('on', b.dataset.cat === id));
    const on = $('[data-cat].on', wrap);
    if (on) {
      const r = on.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      wrap.scrollBy({ left: r.left + r.width / 2 - (w.left + w.width / 2), behavior: REDUCED ? 'auto' : 'smooth' });
    }
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY;
      hdr.classList.toggle('solid', y > hero.offsetHeight - hdr.offsetHeight - 10);
      $('#cats').classList.toggle('stuck', $('#cats').getBoundingClientRect().top <= hdr.offsetHeight + 1);
      if (!REDUCED && y < hero.offsetHeight) $('.hero-bg').style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(1.06)`;
      spy();
      revealCheck();
    });
  }, { passive: true });
  addEventListener('resize', () => renderTry());

  /* ---------- events ---------- */
  const langWrap = $('#lang');
  function setLang(c) {
    if (!PACK[c] || c === lang) { langWrap.classList.remove('open'); return; }
    lang = c; L = PACK[c]; ls.set('olea-lang', c);
    langWrap.classList.remove('open');
    activeCat = '';
    const reopen = sheetKind;
    renderAll();
    if (reopen === 'cart') openCart(); else if (reopen === 'ai') renderAI(); else if (reopen) closeSheet();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, label');
    if (!t) { if (!e.target.closest('#lang')) langWrap.classList.remove('open'); return; }
    if (t.id === 'langBtn') { langWrap.classList.toggle('open'); t.setAttribute('aria-expanded', langWrap.classList.contains('open')); return; }
    if (!t.closest('#lang')) langWrap.classList.remove('open');
    const d = t.dataset;
    if (d.lang) return setLang(d.lang);
    if (d.add) {
      e.preventDefault();
      const wasEmpty = !count();
      addLine(d.add);
      if (!wasEmpty) fly(t, d.add);
      if (t.classList.contains('pair-add') || t.classList.contains('aic-add')) { t.classList.add('done'); t.innerHTML = ico('check'); }
      toast(`${nm(d.add)} · ${u('added')}`, 'check');
      return;
    }
    if (d.open) return openItem(d.open);
    if (d.edit != null) return openItem(cart[+d.edit].id, +d.edit);
    if (d.table) return setTable(+d.table);
    if (d.f) { state.f = d.f; $$('#filters button').forEach((b) => b.classList.toggle('on', b.dataset.f === d.f)); renderMenu(); return; }
    if (d.cat) {
      const s = $('#c-' + d.cat);
      if (s) scrollTo({ top: s.getBoundingClientRect().top + scrollY - offsetTop() + 2, behavior: REDUCED ? 'auto' : 'smooth' });
      return;
    }
    if (d.opt) {
      cur.o[d.opt] = d.v;
      $$(`[data-opt="${d.opt}"]`).forEach((b) => b.classList.toggle('on', b === t));
      return curPrice();
    }
    if (d.iq) { cur.q = Math.max(1, Math.min(20, cur.q + +d.iq)); return curPrice(); }
    if (d.lq != null) {
      const l = cart[+d.lq];
      l.q += +d.d;
      if (l.q <= 0) cart.splice(+d.lq, 1);
      save(); refreshCart();
      return;
    }
    if (d.pay) { bill.pay = d.pay; return openBill(); }
    if (d.split) { bill.split = Math.max(1, Math.min(12, bill.split + +d.split)); return openBill(); }
    if (d.ask) return ask(d.ask);
    if (t.id === 'tblPill' || t.id === 'seat') return openPicker();
    if (t.id === 'cartbar') return openCart();
    if (t.id === 'aiFab') return openAI();
    if (t.id === 'sheetX') return closeSheet();
    switch (d.act) {
      case 'close': return closeSheet();
      case 'picker': return openPicker();
      case 'cart': return openCart();
      case 'waiter': return callWaiter();
      case 'bill': return openBill();
      case 'wifi': return openWifi();
      case 'ai': return openAI();
      case 'send': return sendOrder();
      case 'wait': return openShow();
      case 'sendbill': return sendBill();
      case 'tryx': ss.set('olea-try-x', true); $('#try').hidden = true; return;
      case 'copywifi': {
        const done = () => { const s = $('#cpy'); if (s) s.textContent = u('copied'); };
        if (navigator.clipboard) navigator.clipboard.writeText(CAFE.wifi.pass).then(done, done); else done();
        return;
      }
      case 'additem': {
        const note = ($('#itemNote') || {}).value || '';
        const line = { id: cur.id, o: { ...cur.o }, q: cur.q, n: note.trim() };
        if (cur.edit != null) { cart[cur.edit] = line; save(); refreshCart(); return openCart(); }
        const wasEmpty = !count();
        addLine(line.id, line.o, line.q, line.n);
        closeSheet();
        if (!wasEmpty) fly(t, line.id);
        toast(`${nm(line.id)} · ${u('added')}`, 'check');
        return;
      }
    }
  });
  document.addEventListener('change', (e) => {
    const d = e.target.dataset;
    if (d.tog && cur) { cur.o[d.tog] = e.target.checked; curPrice(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'orderNote') orderNote = e.target.value;
    if (e.target.id === 'q') { state.q = e.target.value; $('#qx').classList.toggle('on', !!state.q); renderMenu(); }
  });
  $('#qx').addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#qx').classList.remove('on'); renderMenu(); });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'aiForm') return;
    e.preventDefault();
    const inp = $('#aiIn');
    ask(inp.value);
  });
  scrim.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (sheetOpen) closeSheet(); langWrap.classList.remove('open'); }
  });

  renderAll();
  requestAnimationFrame(() => document.body.classList.add('ready'));
  if (!table && !qp.has('np')) setTimeout(() => { if (!sheetOpen && !table) openPicker(); }, 900);

  // expose a tiny hook for automated checks
  window.OLEA = { answer: (q) => answer(q), orderText: () => orderText(cart, orderNote), state: () => ({ lang, table, cart, visit }) };
})();
