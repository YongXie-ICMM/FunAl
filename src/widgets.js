/* FunAl shared widgets. Same look everywhere so the learner recognises "the same staircase / the same row of cells".
 *
 *   const st = FunAl.widgets.stairs(container, { n: 6, tolls: [0,1,2,9,1,5,1], controls: true, maxStep: 2 })
 *     st.onStep(({ pos, path, cost, done }) => ...)   fired after each move; done = reached n
 *     st.step(k) / st.reset() / st.setCurrent(i) / st.mark(i,'cls') / st.clearMarks() / st.enable(bool) / st.pickable(fn)
 *     st.path  -> [1,2,1]   st.visited -> [0,1,3,4]   st.cost -> total tolls paid
 *
 *   const row = FunAl.widgets.cells(container, { n: 6, label: i => `第 ${i} 级`, sub: i => `过路费 ${toll[i]}`, values: {0: 1, 1: 1} })
 *     row.set(i, v) / row.get(i) / row.mark(i,'cls') / row.links(i, [i-1, i-2]) / row.clearLinks()
 *     await row.fill(i, { answer: 5, onWrong: v => t.wrong('...'), onRight: v => ... })  loops until correct
 *
 *   FunAl.widgets.routeChips(container, ['1+1+2', '2+2'], { onClick })  -> row of route chips
 *   FunAl.widgets.person()  -> a small SVG figure element
 */
(function () {
  'use strict';
  const { el, esc, addStyle } = FunAl;

  addStyle(`
  .w-stairs { display: flex; flex-direction: column; gap: 12px; }
  .w-stairs-row {
    display: flex; align-items: flex-end; gap: 6px; padding: 8px 4px 4px; min-height: 60px;
    overflow-x: auto; overflow-y: hidden;
    background-image:
      linear-gradient(to right, var(--paper) 30%, transparent),
      linear-gradient(to left,  var(--paper) 30%, transparent),
      radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.13), transparent),
      radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.13), transparent);
    background-position: 0 0, 100% 0, 0 0, 100% 0;
    background-repeat: no-repeat;
    background-size: 40px 100%, 40px 100%, 12px 100%, 12px 100%;
    background-attachment: local, local, scroll, scroll;
  }
  .w-step { flex: 1 0 56px; min-width: 56px; max-width: 130px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
    background: var(--accent-soft); border: 1.5px solid var(--line); border-radius: 10px 10px 4px 4px; height: var(--h, 48px); transition: background .2s, border-color .2s; }
  .w-step .w-step-label { position: absolute; bottom: 6px; font-size: .78rem; color: var(--ink); opacity: .8; white-space: nowrap; }
  .w-step .w-tag { position: absolute; top: -14px; right: -4px; background: var(--paper); border: 1.5px solid var(--warn); color: var(--warn); font-weight: 700; font-size: .78rem; padding: 0 6px; border-radius: 6px; line-height: 1.4; }
  .w-step .w-tag.hot { background: var(--warn); color: var(--on-accent); }
  .w-step .w-person { position: absolute; bottom: 26px; width: 26px; height: 34px; }
  .w-step.visited::after { content: ""; position: absolute; top: 6px; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .w-step.current { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 22%, var(--paper)); }
  .w-step.finish { border-color: var(--ok); }
  .w-step.pickable { cursor: pointer; }
  .w-step.pickable:hover { border-color: var(--accent); }
  .w-step.good { border-color: var(--ok); background: var(--ok-soft); }
  .w-step.bad { border-color: var(--warn); background: var(--warn-soft); }
  .w-step.gold { border-color: #c9a227; background: #fff7d6; }
  .w-step.dim { opacity: .45; }
  .w-stairs-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .w-path { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; min-height: 28px; color: var(--muted); font-size: .95rem; }
  .w-path .chip { background: var(--paper); border: 1.5px solid var(--line); border-radius: 999px; padding: 1px 10px; font-weight: 600; color: var(--ink); }
  .w-path .chip.two { border-color: var(--accent); }
  .w-cost { font-weight: 700; color: var(--warn); }
  .w-extra { font-weight: 700; color: #c0392b; }

  .w-cells { overflow-x: auto; overflow-y: visible;
    background-image:
      linear-gradient(to right, var(--paper) 30%, transparent),
      linear-gradient(to left,  var(--paper) 30%, transparent),
      radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.13), transparent),
      radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.13), transparent);
    background-position: 0 0, 100% 0, 0 0, 100% 0;
    background-repeat: no-repeat;
    background-size: 40px 100%, 40px 100%, 12px 100%, 12px 100%;
    background-attachment: local, local, scroll, scroll; }
  .w-cells-inner { position: relative; min-width: max-content; }
  .w-cells-title { font-weight: 600; margin-bottom: 8px; }
  .w-cells-row { display: flex; gap: 8px; align-items: flex-start; padding-top: 40px; }
  .w-cell { flex: 1 0 62px; min-width: 62px; max-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .w-cell .w-cell-idx { font-size: .8rem; color: var(--ink); font-weight: 600; white-space: nowrap; }
  .w-cell .w-cell-val { width: 100%; min-height: 54px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--paper); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; transition: background .2s, border-color .2s; }
  .w-cell .w-cell-val.empty { color: var(--muted); font-weight: 400; }
  .w-cell .w-cell-val.filled { background: var(--hint-soft); border-color: #d9b64a; }
  .w-cell .w-cell-val.given { background: var(--accent-soft); }
  .w-cell .w-cell-val.active { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .w-cell .w-cell-val.good { border-color: var(--ok); background: var(--ok-soft); }
  .w-cell .w-cell-val.gold { border-color: #c9a227; background: #fff7d6; }
  .w-cell .w-cell-val.src { border-color: var(--accent); background: var(--accent-soft); }
  .w-cell .w-cell-val.pick-me { cursor: pointer; }
  .w-cell .w-cell-val.pick-me:hover { border-color: var(--accent); background: var(--accent-soft); }
  .w-cell .w-cell-val.bad-flash { border-color: var(--warn); background: var(--warn-soft); }
  .w-cell .w-cell-val input { width: 100%; min-width: 0; height: 100%; min-height: 50px; border: 0; background: transparent; text-align: center; font: inherit; font-size: 1.25rem; font-weight: 700; color: var(--ink); outline: none;
    -moz-appearance: textfield; appearance: textfield; }
  .w-cell .w-cell-val input::-webkit-outer-spin-button,
  .w-cell .w-cell-val input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .w-cell .w-cell-sub { font-size: .78rem; color: var(--warn); font-weight: 600; min-height: 1.2em; white-space: nowrap; }
  .w-cells svg.w-links { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .w-cells svg.w-links path { fill: none; stroke: var(--accent); stroke-width: 2.2; }
  .w-cells svg.w-links path.pick { stroke: var(--ok); stroke-width: 3; }
  .w-cells svg.w-links path.dim { stroke: var(--line); stroke-dasharray: 4 4; }
  .w-cells svg.w-links text { font-size: 12px; fill: var(--muted); font-weight: 600; }
  .w-cell-ok { display: flex; gap: 6px; margin-top: 6px; }
  .w-fill-row { display: flex; gap: 8px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
  .w-fill-row .eq { font-family: var(--mono); font-size: 1rem; color: var(--muted); }

  .w-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .w-chip { border: 1.5px solid var(--line); background: var(--paper); border-radius: 10px; padding: 6px 12px; font-weight: 600; font-family: var(--mono); font-size: .95rem; }
  .w-chip.btn-like { cursor: pointer; }
  .w-chip.btn-like:hover { border-color: var(--accent); }
  .w-chip.dup { border-color: var(--warn); background: var(--warn-soft); }
  .w-chip.new { animation: pop .3s ease-out; }
  .w-chip.gold { border-color: #c9a227; background: #fff7d6; }

  /* ---- tree ---- */
  .w-tree { overflow-x: auto; padding: 4px 0 8px; }
  .w-tree-inner { display: inline-block; min-width: 100%; }
  .w-node { display: flex; flex-direction: column; align-items: center; }
  .w-node-box { border: 1.5px solid var(--line); background: var(--paper); border-radius: 10px; padding: 5px 10px; font-weight: 600; font-size: .9rem; white-space: nowrap; position: relative; }
  .w-node-box.can { cursor: pointer; border-color: var(--accent); color: var(--accent); }
  .w-node-box.can:hover { background: var(--accent-soft); }
  .w-node-box.leaf { border-color: var(--ok); background: var(--ok-soft); }
  .w-node-box.dup { border-color: var(--warn); background: var(--warn-soft); }
  .w-node-box.cached { border-color: var(--ok); background: var(--ok-soft); color: var(--ok); }
  .w-node-box.solved { background: var(--accent-soft); }
  .w-node-kids { display: flex; gap: 10px; align-items: flex-start; padding-top: 16px; position: relative; }
  .w-node-kids::before { content: ""; position: absolute; top: 0; left: 50%; width: 1.5px; height: 8px; background: var(--line); }
  .w-node-kid { position: relative; padding-top: 10px; }
  .w-node-kid::before { content: ""; position: absolute; top: 0; left: 50%; width: 1.5px; height: 10px; background: var(--line); }
  .w-node-kids > .w-node-kid + .w-node-kid::after { content: ""; position: absolute; top: 0; right: 50%; width: 100%; height: 1.5px; background: var(--line); }
  .w-tree-hud { display: flex; gap: 16px; flex-wrap: wrap; align-items: baseline; margin-bottom: 8px; font-size: .95rem; }
  .w-tree-hud b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }

  /* ---- buckets ---- */
  .w-buckets { display: flex; flex-direction: column; gap: 12px; }
  .w-bucket-pool { display: flex; gap: 8px; flex-wrap: wrap; min-height: 44px; padding: 8px; border: 1.5px dashed var(--line); border-radius: 12px; }
  .w-bucket-pool:empty::after { content: "卡片都分完了"; color: var(--muted); font-size: .9rem; }
  .w-bucket-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .w-bucket { flex: 1 1 200px; border: 1.5px solid var(--line); border-radius: 12px; padding: 10px; background: var(--paper); min-height: 96px; }
  .w-bucket.armed { border-color: var(--accent); background: var(--accent-soft); cursor: pointer; }
  .w-bucket-title { font-weight: 600; font-size: .9rem; margin-bottom: 8px; }
  .w-bucket-title .cnt { color: var(--muted); font-weight: 400; }
  .w-bucket-items { display: flex; gap: 8px; flex-wrap: wrap; min-height: 34px; }
  .w-card { border: 1.5px solid var(--line); background: var(--paper); border-radius: 10px; padding: 5px 10px; font-family: var(--mono); font-weight: 600; font-size: .92rem; cursor: pointer; }
  .w-card.sel { border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 0 3px var(--accent-soft); }
  .w-card.in { cursor: default; }
  .w-card .tail { color: var(--warn); }
  .w-card.cut .tail { text-decoration: line-through; opacity: .45; }
  .w-card.shake { animation: shake .3s; }
  @keyframes shake { 25% { transform: translateX(-4px);} 75% { transform: translateX(4px);} }

  /* ---- notebook ---- */
  .w-book { border: 1.5px solid var(--line); border-radius: 12px; background: var(--hint-soft); padding: 10px 12px; min-width: 170px; }
  .w-book-title { font-weight: 700; font-size: .9rem; margin-bottom: 6px; }
  .w-book-row { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px dashed rgba(0,0,0,.15); padding: 3px 0; font-size: .92rem; }
  .w-book-row .v { font-weight: 700; }
  .w-book-row.empty .v { color: var(--muted); font-weight: 400; }
  .w-book-row.fresh { animation: pop .3s ease-out; }
  .w-side { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .w-side-main { flex: 1 1 320px; min-width: 0; }
  .w-side-aside { flex: 0 0 auto; position: sticky; top: 60px; }
  @media (max-width: 620px) { .w-side { flex-direction: column; } .w-side-aside { position: static; width: 100%; } }

  @keyframes pop { from { transform: scale(.85); opacity: 0; } to { transform: none; opacity: 1; } }
  `);

  function person() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 26 34');
    s.setAttribute('class', 'w-person');
    s.innerHTML = '<circle cx="13" cy="6" r="5" fill="var(--accent)"/><path d="M13 11v11M13 14l-7 6M13 14l7 6M13 22l-5 10M13 22l5 10" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" fill="none"/>';
    return s;
  }

  /* ---------------- stairs ---------------- */
  function stairs(container, opts) {
    const o = Object.assign({ n: 6, tolls: null, controls: false, maxStep: 2, labels: null, start: 0, baseH: 40, stepH: 13, showCost: false }, opts);
    const root = el('div', 'w-stairs');
    const row = el('div', 'w-stairs-row');
    const steps = [];
    for (let i = 0; i <= o.n; i++) {
      const st = el('div', 'w-step' + (i === o.n ? ' finish' : ''));
      st.style.setProperty('--h', (o.baseH + i * o.stepH) + 'px');
      const label = o.labels ? o.labels(i) : (i === 0 ? '地面' : (i === o.n ? `第 ${i} 级·终点` : `第 ${i} 级`));
      st.appendChild(el('div', 'w-step-label', esc(label)));
      if (o.tolls && i > 0 && o.tolls[i] != null) st.appendChild(el('div', 'w-tag' + (o.hot && o.hot.includes(i) ? ' hot' : ''), esc(`${o.tolls[i]} 元`)));
      st.dataset.i = i;
      row.appendChild(st);
      steps.push(st);
    }
    root.appendChild(row);
    const fig = person();
    const pathRow = el('div', 'w-path');
    root.appendChild(pathRow);
    let controls = null, b1 = null, b2 = null, br = null;
    if (o.controls) {
      controls = el('div', 'w-stairs-controls');
      b1 = el('button', 'btn primary', '走 1 级');
      b2 = el('button', 'btn primary', '走 2 级');
      br = el('button', 'btn', '重来');
      controls.append(b1, b2, br);
      if (o.maxStep >= 3) { const b3 = el('button', 'btn primary', '走 3 级'); controls.insertBefore(b3, br); b3.addEventListener('click', () => api.step(3)); }
      root.appendChild(controls);
      b1.addEventListener('click', () => api.step(1));
      b2.addEventListener('click', () => api.step(2));
      br.addEventListener('click', () => api.reset());
    }
    container.appendChild(root);

    const listeners = [];
    const api = {
      el: root, steps, pos: o.start, path: [], visited: [o.start], cost: 0, enabled: true,
      onStep(fn) { listeners.push(fn); return api; },
      render() {
        steps.forEach((s, i) => {
          s.classList.toggle('current', i === api.pos);
          s.classList.toggle('visited', api.visited.includes(i) && i !== api.pos);
        });
        if (fig.parentNode) fig.parentNode.removeChild(fig);
        steps[api.pos].appendChild(fig);
        pathRow.innerHTML = '';
        if (api.path.length) {
          pathRow.appendChild(el('span', '', '走法：'));
          api.path.forEach((k, idx) => {
            pathRow.appendChild(el('span', 'chip' + (k === 2 ? ' two' : ''), `+${k}`));
            if (idx < api.path.length - 1) pathRow.appendChild(el('span', '', '·'));
          });
          if (o.tolls && o.showCost) {
            pathRow.appendChild(el('span', 'w-cost', `　过路费 ${api.cost} 元`));
            if (o.extraCost) {
              pathRow.appendChild(el('span', 'w-extra', api.extra ? `　+ 罚款 ${api.extra} 元` : '　+ 罚款 0 元'));
              pathRow.appendChild(el('span', 'w-cost', `　= ${api.cost + api.extra} 元`));
            }
          }
        } else {
          pathRow.appendChild(el('span', 'muted small', o.emptyHint || '还没走。'));
        }
        if (controls) {
          const canMove = api.enabled && api.pos < o.n;
          b1.disabled = !canMove || api.pos + 1 > o.n;
          b2.disabled = !canMove || api.pos + 2 > o.n;
          controls.querySelectorAll('button').forEach((b) => { if (b.textContent === '走 3 级') b.disabled = !canMove || api.pos + 3 > o.n; });
        }
      },
      step(k) {
        if (!api.enabled || api.pos + k > o.n) return false;
        api.pos += k;
        api.path.push(k);
        api.visited.push(api.pos);
        if (o.tolls) api.cost += (o.tolls[api.pos] || 0);
        if (o.extraCost) api.extra = o.extraCost(api.path);
        api.render();
        const ev = { pos: api.pos, path: api.path.slice(), visited: api.visited.slice(), cost: api.cost, extra: api.extra, total: api.cost + api.extra, done: api.pos === o.n };
        listeners.forEach((fn) => fn(ev));
        return true;
      },
      reset() { api.pos = o.start; api.path = []; api.visited = [o.start]; api.cost = 0; api.extra = 0; api.render(); listeners.forEach((fn) => fn({ pos: api.pos, path: [], visited: [o.start], cost: 0, done: false, reset: true })); },
      setCurrent(i) { api.pos = i; api.render(); },
      enable(v) { api.enabled = v !== false; api.render(); },
      mark(i, cls) { if (steps[i]) steps[i].classList.add(cls); },
      unmark(i, cls) { if (steps[i]) steps[i].classList.remove(cls); },
      clearMarks() { steps.forEach((s) => s.classList.remove('good', 'bad', 'gold', 'dim')); },
      pickable(fn) {
        steps.forEach((s, i) => {
          s.classList.toggle('pickable', !!fn);
          s.onclick = fn ? () => fn(i, s) : null;
        });
      },
      hideControls() { if (controls) controls.hidden = true; },
      showControls() { if (controls) controls.hidden = false; },
      showPath(path) { // display a given route on the stairs without moving the learner
        api.reset(); api.enabled = false;
        path.forEach((k) => { api.pos += k; api.path.push(k); api.visited.push(api.pos); if (o.tolls) api.cost += (o.tolls[api.pos] || 0); });
        if (o.extraCost) api.extra = o.extraCost(api.path);
        api.render();
      },
    };
    api.render();
    return api;
  }

  /* ---------------- cells (a DP row) ---------------- */
  function cells(container, opts) {
    const o = Object.assign({ n: 6, label: (i) => `第 ${i} 级`, sub: null, values: {}, title: '', placeholder: '?' }, opts);
    const outer = el('div', 'w-cells');
    if (o.title) outer.appendChild(el('div', 'w-cells-title', esc(o.title)));
    const root = el('div', 'w-cells-inner');
    outer.appendChild(root);
    const row = el('div', 'w-cells-row');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'w-links');
    root.appendChild(svg);
    const items = [];
    const vals = {};
    for (let i = 0; i <= o.n; i++) {
      const c = el('div', 'w-cell');
      const v = el('div', 'w-cell-val empty', esc(o.placeholder));
      c.appendChild(v);
      c.appendChild(el('div', 'w-cell-idx', esc(o.label(i))));
      const sub = el('div', 'w-cell-sub', o.sub ? esc(o.sub(i)) : '');
      c.appendChild(sub);
      row.appendChild(c);
      items.push({ c, v, sub });
    }
    root.appendChild(row);
    container.appendChild(outer);

    const api = {
      el: outer, items,
      get(i) { return vals[i]; },
      set(i, value, cls) {
        vals[i] = value;
        const v = items[i].v;
        v.innerHTML = esc(String(value));
        v.classList.remove('empty', 'active', 'given', 'filled', 'good', 'gold', 'src');
        v.classList.add(cls || 'filled');
      },
      mark(i, cls) { items[i].v.classList.add(cls); },
      unmark(i, cls) { items[i].v.classList.remove(cls); },
      clearMarks(cls) { items.forEach((it) => it.v.classList.remove(...(cls ? [cls] : ['active', 'good', 'gold', 'src']))); },
      setSub(i, text) { items[i].sub.textContent = text; },
      links(i, preds, labels) {
        api.clearLinks();
        const rr = root.getBoundingClientRect();
        const to = items[i].v.getBoundingClientRect();
        const tx = to.left - rr.left + to.width / 2, ty = to.top - rr.top;
        preds.forEach((p, k) => {
          if (p < 0 || p > o.n) return;
          const from = items[p].v.getBoundingClientRect();
          const fx = from.left - rr.left + from.width / 2, fy = from.top - rr.top;
          const lift = 22 + Math.abs(i - p) * 8;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${fx} ${fy} C ${fx} ${fy - lift}, ${tx} ${ty - lift}, ${tx} ${ty}`);
          path.dataset.from = p;
          svg.appendChild(path);
          if (labels && labels[k] != null) {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', (fx + tx) / 2); t.setAttribute('y', ty - lift + 2); t.setAttribute('text-anchor', 'middle');
            t.textContent = labels[k];
            svg.appendChild(t);
          }
        });
      },
      markLink(from, cls) { svg.querySelectorAll('path').forEach((p) => { if (Number(p.dataset.from) === from) p.classList.add(cls); }); },
      clearLinks() { svg.innerHTML = ''; },
      /* Let the learner click cells; pass null to switch it off. */
      pickable(fn) {
        items.forEach((it, i) => {
          it.v.classList.toggle('pick-me', !!fn);
          it.v.onclick = fn ? () => fn(i, it) : null;
        });
      },
      /* Loop until the learner types the right integer into cell i. */
      fill(i, opts2) {
        const f = Object.assign({ answer: null, onWrong: null, onRight: null, button: '填上' }, opts2);
        const v = items[i].v;
        v.classList.remove('empty'); v.classList.add('active');
        v.innerHTML = '';
        const input = el('input');
        input.type = 'number'; input.inputMode = 'numeric'; input.placeholder = '?';
        v.appendChild(input);
        const okRow = el('div', 'w-cell-ok');
        const ok = el('button', 'btn primary', f.button);
        okRow.appendChild(ok);
        items[i].c.appendChild(okRow);
        setTimeout(() => input.focus({ preventScroll: true }), 60);
        const accepted = Array.isArray(f.answer) ? f.answer : [f.answer];
        return new Promise((resolve) => {
          const submit = () => {
            const raw = input.value.trim();
            if (!/^-?\d+$/.test(raw)) { input.focus(); return; }
            const n = Number(raw);
            if (f.answer == null || accepted.includes(n)) {
              okRow.remove();
              api.set(i, n, 'good');
              if (f.onRight) f.onRight(n);
              resolve(n);
            } else {
              input.value = '';
              input.focus();
              v.classList.add('bad-flash');
              setTimeout(() => v.classList.remove('bad-flash'), 400);
              if (f.onWrong) f.onWrong(n);
            }
          };
          ok.addEventListener('click', submit);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        });
      },
    };
    Object.keys(o.values).forEach((k) => api.set(Number(k), o.values[k], 'given'));
    return api;
  }

  /* ---------------- route chips ---------------- */
  function routeChips(container, routes, opts) {
    const o = Object.assign({ onClick: null, format: (r) => (Array.isArray(r) ? r.map((k) => `+${k}`).join(' ') : String(r)) }, opts);
    const root = el('div', 'w-chips');
    container.appendChild(root);
    const api = {
      el: root, chips: [],
      add(route, cls) {
        const ch = el('div', 'w-chip new' + (cls ? ' ' + cls : '') + (o.onClick ? ' btn-like' : ''), esc(o.format(route)));
        if (o.onClick) ch.addEventListener('click', () => o.onClick(route, ch));
        root.appendChild(ch); api.chips.push(ch);
        return ch;
      },
      clear() { root.innerHTML = ''; api.chips = []; },
    };
    (routes || []).forEach((r) => api.add(r));
    return api;
  }


  /* ---------------- recursion tree ---------------- */
  /* nodes are "问题卡"; the learner clicks one to split it into its sub-questions.
     opts: { root, children(n) -> [subs] or null for a leaf, leafValue(n), label(n),
             memo: bool (offer "查账本" when a value is known), book: notebook api } */
  function tree(container, opts) {
    const o = Object.assign({ root: 6, label: (n) => `到第 ${n} 级？`, children: (n) => (n <= 1 ? null : [n - 1, n - 2]),
      leafValue: () => 1, memo: false, book: null, hud: true, autoLeaf: true }, opts);
    const root = el('div', 'w-tree');
    const hud = el('div', 'w-tree-hud');
    const inner = el('div', 'w-tree-inner');
    if (o.hud) container.appendChild(hud);
    root.appendChild(inner);
    container.appendChild(root);

    const seen = new Map();      // value -> times this question has appeared
    const listeners = [];
    let opened = 0, dupCount = 0, computed = 0, lookups = 0, cards = 0;
    const computedSet = new Set();   // which distinct questions were actually worked out
    const pending = [];   // nodes the learner has not opened yet

    function hudRender() {
      if (!o.hud) return;
      hud.innerHTML = '';
      const add = (label, v, cls) => { const d = el('div', cls || '', `${esc(label)} <b>${typeof v === 'number' ? v.toLocaleString('en-US') : v}</b>`); hud.appendChild(d); };
      if (o.hudLabels) { o.hudLabels(add, { opened, dupCount, computed, lookups, cards, distinctComputed: computedSet.size }); return; }
      add('屏幕上的问题卡：', cards);
      if (!o.memo) add('其中是重复的：', dupCount);
      else { add('真正算过的小题：', computedSet.size); add('直接抄账本：', lookups); }
    }

    function makeNode(n, depth) {
      cards++;
      const node = el('div', 'w-node');
      const box = el('div', 'w-node-box', esc(o.label(n)));
      node.appendChild(box);
      const times = (seen.get(n) || 0) + 1;
      seen.set(n, times);
      const kidsOf = o.children(n);
      const known = o.book && o.book.get(n) != null;
      const state = { n, node, box, expanded: false, value: null };

      if (!kidsOf) {                                  // a leaf: answer is obvious
        state.value = o.leafValue(n);
        box.classList.add('leaf');
        box.innerHTML = esc(o.label(n) + ' = ' + state.value);
        return state;
      }
      if (times > 1 && !o.memo) { box.classList.add('dup'); dupCount++; }
      if (o.memo && known) box.classList.add('cached');
      box.classList.add('can');
      pending.push(state);
      box.onclick = () => {
        if (state.expanded) return;
        if (o.memo && o.book && o.book.get(n) != null) {   // take it from the notebook
          state.expanded = true;
          state.value = o.book.get(n);
          box.classList.remove('can'); box.classList.add('cached');
          box.innerHTML = esc(o.label(n) + ' = ' + state.value) + ' <span class="small">（抄的）</span>';
          lookups++; hudRender();
          listeners.forEach((f) => f({ kind: 'lookup', n, value: state.value, api }));
          if (state.parent) settle(state.parent);   // an answer copied from the book still counts upward
          return;
        }
        state.expanded = true;
        opened++;
        box.classList.remove('can');
        const kidsWrap = el('div', 'w-node-kids');
        state.kids = kidsOf.map((k) => {
          const w = el('div', 'w-node-kid');
          const child = makeNode(k, depth + 1);
          child.parent = state;
          w.appendChild(child.node);
          kidsWrap.appendChild(w);
          return child;
        });
        node.appendChild(kidsWrap);
        computed++;
        computedSet.add(n);
        hudRender();
        settle(state);
        listeners.forEach((f) => f({ kind: 'open', n, api }));
      };
      return state;
    }

    /* when every child of a node has a value, the node gets one too (and goes into the book) */
    function settle(state) {
      if (!state.kids || state.value != null) return;
      if (state.kids.some((k) => k.value == null)) return;
      state.value = state.kids.reduce((a, k) => a + k.value, 0);
      state.box.classList.add('solved');
      state.box.innerHTML = esc(o.label(state.n) + ' = ' + state.value);
      if (o.book) o.book.set(state.n, state.value);
      listeners.forEach((f) => f({ kind: 'solved', n: state.n, value: state.value, api }));
      if (state.parent) settle(state.parent);
    }

    const rootState = makeNode(o.root, 0);
    inner.appendChild(rootState.node);
    hudRender();

    const api = {
      el: root, rootState,
      on(fn) { listeners.push(fn); return api; },
      get stats() { return { opened, dupCount, computed, lookups, cards, distinct: seen.size, distinctComputed: computedSet.size }; },
      /* Open every remaining card at once, for learners who have felt enough of the tedium. */
      expandAll(limit) {
        let guard = limit || 4000;
        while (guard-- > 0) {
          const next = root.querySelector('.w-node-box.can');
          if (!next) break;
          next.click();
        }
        hudRender();
        return api.stats;
      },
      get remaining() { return root.querySelectorAll('.w-node-box.can').length; },
      get value() { return rootState.value; },
      allOpened() {
        const walk = (s) => (s.kids ? s.kids.every(walk) : true) && (s.value != null);
        return walk(rootState);
      },
      scrollRight() { root.scrollLeft = root.scrollWidth; },
    };
    return api;
  }

  /* ---------------- buckets (tap card, then tap bucket: works on phones) ---------------- */
  function buckets(container, opts) {
    const o = Object.assign({ cards: [], buckets: [], answer: () => 0, format: (c) => String(c),
      onWrong: null, onRight: null, onDone: null, poolLabel: '把下面的卡片一张张分进两个筐：' }, opts);
    const root = el('div', 'w-buckets');
    if (o.poolLabel) root.appendChild(el('div', 'small muted', esc(o.poolLabel)));
    const pool = el('div', 'w-bucket-pool');
    root.appendChild(pool);
    const row = el('div', 'w-bucket-row');
    const bs = o.buckets.map((b, i) => {
      const box = el('div', 'w-bucket');
      box.appendChild(el('div', 'w-bucket-title', esc(b) + ' <span class="cnt">（0 张）</span>'));
      const items = el('div', 'w-bucket-items');
      box.appendChild(items);
      box.onclick = () => place(i);
      row.appendChild(box);
      return { box, items, count: 0, cards: [] };
    });
    root.appendChild(row);
    container.appendChild(root);

    let selected = null;
    let placed = 0;
    const cardEls = o.cards.map((c, i) => {
      const e = el('div', 'w-card', o.format(c));
      e.onclick = () => {
        if (e.classList.contains('in')) return;
        if (selected) selected.el.classList.remove('sel');
        selected = { c, el: e, i };
        e.classList.add('sel');
        bs.forEach((b) => b.box.classList.add('armed'));
      };
      pool.appendChild(e);
      return e;
    });

    function place(bi) {
      if (!selected) return;
      const want = o.answer(selected.c, selected.i);
      if (want !== bi) {
        selected.el.classList.add('shake');
        setTimeout(() => selected && selected.el.classList.remove('shake'), 320);
        if (o.onWrong) o.onWrong(selected.c, bi, want);
        return;
      }
      const e = selected.el;
      e.classList.remove('sel'); e.classList.add('in');
      bs[bi].items.appendChild(e);
      bs[bi].count++;
      bs[bi].cards.push(selected.c);
      bs[bi].box.querySelector('.cnt').textContent = `（${bs[bi].count} 张）`;
      bs.forEach((b) => b.box.classList.remove('armed'));
      const done = ++placed === o.cards.length;
      if (o.onRight) o.onRight(selected.c, bi, done);
      selected = null;
      if (done && o.onDone) o.onDone(bs.map((b) => b.cards));
    }

    return {
      el: root, buckets: bs,
      counts() { return bs.map((b) => b.count); },
      cutTails(cls) { cardEls.forEach((e) => e.classList.add(cls || 'cut')); },
      highlight(bi, cls) { bs[bi].box.classList.add(cls || 'armed'); },
    };
  }

  /* ---------------- notebook / 账本 ---------------- */
  function notebook(container, opts) {
    const o = Object.assign({ title: '账本', rows: [], label: (k) => `到第 ${k} 级`, empty: '还没记' }, opts);
    const root = el('div', 'w-book');
    root.appendChild(el('div', 'w-book-title', esc(o.title)));
    const map = {};
    const rows = {};
    o.rows.forEach((k) => {
      const r = el('div', 'w-book-row empty');
      r.appendChild(el('span', '', esc(o.label(k))));
      r.appendChild(el('span', 'v', esc(o.empty)));
      root.appendChild(r);
      rows[k] = r;
    });
    container.appendChild(root);
    return {
      el: root,
      get(k) { return map[k]; },
      set(k, v) {
        map[k] = v;
        const r = rows[k];
        if (!r) return;
        r.classList.remove('empty');
        r.classList.add('fresh');
        r.querySelector('.v').textContent = String(v);
        setTimeout(() => r.classList.remove('fresh'), 400);
      },
      clear() { Object.keys(map).forEach((k) => { delete map[k]; const r = rows[k]; if (r) { r.classList.add('empty'); r.querySelector('.v').textContent = o.empty; } }); },
      size() { return Object.keys(map).length; },
    };
  }

  FunAl.widgets = { stairs, cells, routeChips, person, tree, buckets, notebook };
})();
