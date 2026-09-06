/* FunAl engine: a conversational, step-by-step tutoring runtime.
 *
 * Each screen is registered with FunAl.register({ id, title, goal, minutes, run(t) }).
 * `run` is an async function that talks to the learner through `t`:
 *
 *   await t.say('文字')                         tutor bubble (supports **bold**, `code`, line breaks)
 *   await t.ask.choice('问题', ['甲','乙'], {correct: 1, feedback: {0: '为什么甲不对'}, hints: [...]})
 *   await t.ask.predict('先猜猜', ['甲','乙'])   any answer accepted; returns index (use before a reveal)
 *   await t.ask.number('几种？', {answer: 5, feedback: v => v === 4 ? '差一点……' : null, hints: [...]})
 *   await t.ask.confirm('我数完了')              a single button
 *   const box = t.canvas()                       a card for custom widgets (DOM you build yourself)
 *   await t.waitFor(resolve => ...)              wait until your widget calls resolve(value)
 *   t.hints([...]) / t.clearHints()              hint ladder for a custom widget
 *   t.note('小结', '正文')                       highlighted callout
 *   t.learnerSays('文字')                        echo the learner's action as a right-side bubble
 *   t.record({kind, prompt, answer, correct})    log an answer for the recap and the AI mentor
 *   t.done()                                     screen complete; shows the "下一屏" button
 *
 * Everything the learner does is recorded in FunAl.state.log so the final screen can "look back".
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'funal.dp.v1';
  const $ = (id) => document.getElementById(id);
  const screens = [];
  const state = { index: 0, completed: new Set(), log: [], attempts: [] };
  let current = null; // { screen, cancelled, prompt, hints, hintsShown }

  // ---------- utilities ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function md(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      .split(/\n\s*\n/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function scrollTo(node) {
    requestAnimationFrame(() => node.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }
  function addStyle(css) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (s) {
        state.completed = new Set(s.completed || []);
        state.index = Math.min(s.index || 0, Math.max(0, screens.length - 1));
        state.log = Array.isArray(s.log) ? s.log : [];
      }
    } catch (e) { /* storage unavailable: run without memory */ }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: [...state.completed], index: state.index, log: state.log.slice(-400),
      }));
    } catch (e) { /* ignore */ }
  }
  function reset() {
    state.completed = new Set(); state.index = 0; state.log = []; state.attempts = [];
    save();
    showScreen(0);
  }

  // ---------- registry ----------
  function register(screen) {
    if (!screen || !screen.id || typeof screen.run !== 'function') throw new Error('bad screen');
    screens.push(screen);
  }

  // ---------- chrome: topbar, toc, dock ----------
  function renderChrome() {
    const i = state.index;
    const s = screens[i];
    $('topbarTitle').textContent = s ? `${i + 1} / ${screens.length} · ${s.title}` : '';
    const prog = $('topbarProgress');
    prog.innerHTML = '';
    screens.forEach((sc, k) => {
      const d = el('span', 'dot' + (state.completed.has(sc.id) ? ' done' : '') + (k === i ? ' now' : ''));
      d.title = sc.title;
      prog.appendChild(d);
    });
    const toc = $('toc');
    toc.innerHTML = '';
    screens.forEach((sc, k) => {
      const b = el('button', (state.completed.has(sc.id) ? 'done' : '') + (k === i ? ' now' : ''));
      b.innerHTML = `<span class="n">${k + 1}</span><span>${esc(sc.title)}</span>`;
      b.addEventListener('click', () => { toggleToc(false); showScreen(k); });
      toc.appendChild(b);
    });
    const actions = el('div', 'toc-actions');
    const rb = el('button', '', '从头开始（清除进度）');
    rb.addEventListener('click', () => { if (confirm('清除已保存的进度，从第一屏重新开始？')) { toggleToc(false); reset(); } });
    actions.appendChild(rb);
    toc.appendChild(actions);
  }
  function toggleToc(force) {
    const toc = $('toc');
    const open = force != null ? force : toc.hidden;
    toc.hidden = !open;
    $('tocBtn').setAttribute('aria-expanded', String(open));
  }
  function setDock({ hint, next }) {
    const hb = $('hintBtn');
    const nb = $('nextBtn');
    hb.hidden = !hint;
    nb.hidden = !next;
    if (next) nb.textContent = next;
  }
  function updateHintButton() {
    const hb = $('hintBtn');
    if (!current || !current.hints || !current.hints.length) { hb.hidden = true; return; }
    hb.hidden = false;
    const left = current.hints.length - current.hintsShown;
    hb.disabled = left <= 0;
    hb.textContent = left > 0 ? (current.hintsShown === 0 ? '需要提示' : `再提示一点（还剩 ${left}）`) : '提示已用完';
  }
  function showHint() {
    if (!current || !current.hints) return;
    const k = current.hintsShown;
    if (k >= current.hints.length) return;
    current.hintsShown++;
    const b = el('div', 'bubble hint reveal', `<span class="hint-tag">提示 ${k + 1}</span>` + md(current.hints[k]));
    $('feed').appendChild(b);
    scrollTo(b);
    state.attempts.push({ screen: current.screen.id, kind: 'hint', n: k + 1, text: current.hints[k] });
    updateHintButton();
  }

  // ---------- tutor API ----------
  function makeTutor(run) {
    const feed = $('feed');
    const halted = () => new Promise(() => {}); // never resolves: stops a cancelled script
    const guard = () => (run.cancelled ? halted() : null);

    function append(node) { feed.appendChild(node); scrollTo(node); return node; }
    function setPrompt(prompt, hints) {
      run.prompt = prompt || run.prompt;
      run.hints = hints || [];
      run.hintsShown = 0;
      updateHintButton();
    }
    function clearPrompt() { run.hints = []; run.hintsShown = 0; updateHintButton(); }
    function record(entry) {
      const e = Object.assign({ screen: run.screen.id, t: Date.now() }, entry);
      state.log.push(e);
      state.attempts.push(e);
      save();
    }

    const t = {
      screen: run.screen,
      state,
      el, md, esc, addStyle, sleep,
      async say(text, opts = {}) {
        const g = guard(); if (g) return g;
        const b = append(el('div', 'bubble tutor reveal' + (opts.cls ? ' ' + opts.cls : ''), md(text)));
        await sleep(opts.pause == null ? 320 : opts.pause);
        if (run.cancelled) return halted();
        return b;
      },
      learnerSays(text) {
        if (run.cancelled) return null;
        return append(el('div', 'bubble learner reveal', md(text)));
      },
      right(text) { if (run.cancelled) return null; return append(el('div', 'bubble tutor right reveal', md(text))); },
      wrong(text) { if (run.cancelled) return null; return append(el('div', 'bubble tutor wrong reveal', md(text))); },
      /* A collapsible aside: curious learners open it, everyone else walks past. */
      aside(title, text) {
        if (run.cancelled) return null;
        const d = el('details', 'aside reveal');
        const sum = el('summary', '', esc(title));
        d.appendChild(sum);
        d.appendChild(el('div', 'aside-body', md(text)));
        d.addEventListener('toggle', () => { if (d.open) record({ kind: 'aside', prompt: title, answer: '展开了' }); });
        return append(d);
      },
      note(title, text) {
        if (run.cancelled) return null;
        return append(el('div', 'note reveal', (title ? `<div class="note-title">${esc(title)}</div>` : '') + md(text)));
      },
      html(html, cls) { if (run.cancelled) return null; return append(el('div', 'block reveal' + (cls ? ' ' + cls : ''), html)); },
      canvas(cls) { if (run.cancelled) return null; return append(el('div', 'canvas reveal' + (cls ? ' ' + cls : ''))); },
      hints(list) { setPrompt(null, list || []); },
      clearHints() { clearPrompt(); },
      record,
      pause(ms) { return run.cancelled ? halted() : sleep(ms); },
      waitFor(setup) {
        const g = guard(); if (g) return g;
        return new Promise((resolve) => setup((v) => { if (!run.cancelled) resolve(v); }));
      },
      ask: {
        /* After the hints run out and the learner is still stuck, let them out.
           Being trapped on one screen is the worst outcome in a single-page lesson. */
        offerWayOut(box, resolve, reveal) {
          if (box.querySelector('.way-out')) return;
          const row = el('div', 'btn-row reveal way-out');
          const b = el('button', 'btn', '卡住了，给我答案，继续往下');
          row.appendChild(b);
          b.addEventListener('click', () => {
            if (run.cancelled) return;
            row.remove();
            record({ kind: 'gave_up', prompt: run.prompt, answer: '看了答案' });
            reveal();
            clearPrompt();
            resolve();
          });
          box.parentNode.insertBefore(row, box.nextSibling);
        },
        /* Multiple choice with a correct answer. Resolves with the correct index once chosen. */
        async choice(prompt, options, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          const correct = Array.isArray(opts.correct) ? opts.correct : [opts.correct];
          setPrompt(prompt, opts.hints);
          const box = append(el('div', 'choices reveal'));
          let missed = 0;
          return new Promise((resolve) => {
            options.forEach((label, i) => {
              const b = el('button', '', md(label));
              b.addEventListener('click', async () => {
                if (run.cancelled) return;
                t.learnerSays(label);
                const ok = correct.includes(i);
                record({ kind: 'choice', prompt, answer: label, correct: ok });
                if (ok) {
                  b.classList.add('right');
                  box.querySelectorAll('button').forEach((x) => (x.disabled = true));
                  clearPrompt();
                  if (opts.explainRight) t.right(typeof opts.explainRight === 'function' ? opts.explainRight(i) : opts.explainRight);
                  resolve(i);
                } else {
                  b.classList.add('wrong');
                  b.disabled = true;
                  /* feedback may be a function of the index, or an object keyed by index
                     (with an optional `default`). A screen that supplies neither is a bug:
                     say so loudly in the console rather than showing an empty platitude. */
                  let fb = null;
                  if (typeof opts.feedback === 'function') fb = opts.feedback(i);
                  else if (opts.feedback) fb = opts.feedback[i] != null ? opts.feedback[i] : opts.feedback.default;
                  if (typeof fb === 'function') fb = fb(i);
                  if (!fb) {
                    console.warn(`[FunAl] no diagnosis for wrong answer ${i} of "${prompt}"`);
                    fb = '这个选项不对。回到上面的画面，对着数字再看一遍。';
                  }
                  t.wrong(fb);
                  if (++missed >= (run.hints.length || 0) + 2) {
                    t.ask.offerWayOut(box, () => resolve(correct[0]), () => {
                      const right = box.querySelectorAll('button')[correct[0]];
                      if (right) right.classList.add('right');
                      box.querySelectorAll('button').forEach((x) => (x.disabled = true));
                      if (opts.explainRight) t.right(typeof opts.explainRight === 'function' ? opts.explainRight(correct[0]) : opts.explainRight);
                    });
                  }
                }
              });
              box.appendChild(b);
            });
          });
        },
        /* Prediction: every answer is accepted. Resolves with the chosen index. */
        async predict(prompt, options, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          setPrompt(prompt, opts.hints);
          const box = append(el('div', 'choices reveal'));
          return new Promise((resolve) => {
            options.forEach((label, i) => {
              const b = el('button', '', md(label));
              b.addEventListener('click', () => {
                if (run.cancelled) return;
                t.learnerSays(label);
                record({ kind: 'predict', prompt, answer: label });
                b.classList.add('picked');
                box.querySelectorAll('button').forEach((x) => (x.disabled = true));
                clearPrompt();
                resolve(i);
              });
              box.appendChild(b);
            });
          });
        },
        /* Integer answer. opts.feedback(v) may return a diagnosis string for a specific wrong value. */
        async number(prompt, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          setPrompt(prompt, opts.hints);
          let missed = 0;
          const row = append(el('div', 'numask reveal'));
          const input = el('input');
          input.type = 'number'; input.inputMode = 'numeric'; input.placeholder = opts.placeholder || '填一个数字';
          if (opts.min != null) input.min = opts.min;
          const unit = el('span', 'unit', esc(opts.unit || ''));
          const btn = el('button', 'btn primary', opts.button || '确定');
          row.append(input, unit, btn);
          setTimeout(() => input.focus({ preventScroll: true }), 80);
          const free = opts.answer == null;              // a free prediction: any integer is accepted
          const accepted = Array.isArray(opts.answer) ? opts.answer : [opts.answer];
          return new Promise((resolve) => {
            const submit = () => {
              if (run.cancelled) return;
              const raw = input.value.trim();
              if (raw === '' || !/^-?\d+$/.test(raw)) { input.focus(); return; }
              const v = Number(raw);
              t.learnerSays(String(v) + (opts.unit || ''));
              const ok = free || accepted.includes(v);
              record({ kind: 'number', prompt, answer: v, correct: free ? undefined : ok });
              if (ok) {
                input.disabled = true; btn.disabled = true;
                clearPrompt();
                if (opts.explainRight) t.right(typeof opts.explainRight === 'function' ? opts.explainRight(v) : opts.explainRight);
                resolve(v);
              } else {
                let fb = opts.feedback ? opts.feedback(v) : null;
                if (!fb) fb = opts.defaultFeedback || `不是 ${v}。别急着猜，回到上面的画面，一个一个数。`;
                t.wrong(fb);
                input.value = ''; input.focus();
                if (++missed >= (run.hints.length || 0) + 2) {
                  t.ask.offerWayOut(row, () => resolve(accepted[0]), () => {
                    input.value = String(accepted[0]);
                    input.disabled = true; btn.disabled = true;
                    if (opts.explainRight) t.right(typeof opts.explainRight === 'function' ? opts.explainRight(accepted[0]) : opts.explainRight);
                    else t.right(`答案是 **${accepted[0]}${opts.unit || ''}**。别卡在这儿，往下走，后面还会再用到它。`);
                  });
                }
              }
            };
            btn.addEventListener('click', submit);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
          });
        },

        /* Multiple-select: the learner ticks several options, then submits. */
        async multi(prompt, options, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          setPrompt(prompt, opts.hints);
          const want = (opts.correct || []).slice().sort().join(',');
          let missed = 0;
          const box = append(el('div', 'choices reveal'));
          const picked = new Set();
          const btns = options.map((label, i) => {
            const b = el('button', 'multi', md(label));
            b.addEventListener('click', () => {
              if (run.cancelled || b.disabled) return;
              if (picked.has(i)) { picked.delete(i); b.classList.remove('picked'); }
              else { picked.add(i); b.classList.add('picked'); }
              submit.disabled = picked.size === 0;
            });
            box.appendChild(b);
            return b;
          });
          const row = append(el('div', 'btn-row reveal'));
          const submit = el('button', 'btn primary', opts.button || '就选这些');
          submit.disabled = true;
          row.appendChild(submit);
          return new Promise((resolve) => {
            submit.addEventListener('click', () => {
              if (run.cancelled) return;
              const got = [...picked].sort();
              t.learnerSays(got.length ? got.map((i) => options[i]).join('、') : '一个都不选');
              const ok = got.join(',') === want;
              record({ kind: 'multi', prompt, answer: got.map((i) => options[i]).join('、'), correct: ok });
              if (ok) {
                btns.forEach((b, i) => { b.disabled = true; if (picked.has(i)) b.classList.add('right'); });
                submit.remove();
                clearPrompt();
                if (opts.explainRight) t.right(opts.explainRight);
                resolve(got);
              } else {
                const fb = opts.feedback ? opts.feedback(got) : null;
                t.wrong(fb || '这一组不对。看看漏了哪个，或者多选了哪个。');
                if (++missed >= (run.hints.length || 0) + 2) {
                  t.ask.offerWayOut(row, () => resolve((opts.correct || []).slice()), () => {
                    btns.forEach((x, i) => { x.disabled = true; x.classList.toggle('right', (opts.correct || []).includes(i)); x.classList.toggle('picked', (opts.correct || []).includes(i)); });
                    submit.remove();
                    if (opts.explainRight) t.right(opts.explainRight);
                  });
                }
              }
            });
          });
        },
        /* Put shuffled cards into the right order by tapping them one at a time. */
        async order(prompt, items, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          setPrompt(prompt, opts.hints);
          const shuffled = opts.shuffled || items.map((_, i) => i).slice().reverse();
          let missed = 0;
          const wrap = append(el('div', 'order reveal'));
          const slots = el('div', 'order-slots');
          const pool = el('div', 'order-pool');
          wrap.append(slots, pool);
          let next = 0;
          const btns = shuffled.map((idx) => {
            const b = el('button', 'order-card', md(items[idx]));
            b.addEventListener('click', () => {
              if (run.cancelled || b.disabled) return;
              if (idx !== next) {
                b.classList.add('shake');
                setTimeout(() => b.classList.remove('shake'), 320);
                const fb = opts.feedback ? opts.feedback(idx, next) : null;
                t.wrong(fb || `这一句不是现在该放的。先想想：在做这一句之前，你必须先知道什么？`);
                record({ kind: 'order', prompt, answer: items[idx], correct: false });
                if (++missed >= (run.hints.length || 0) + 2) {
                  t.ask.offerWayOut(wrap, () => resolve_(true), () => {
                    while (next < items.length) {
                      const slot = el('div', 'order-slot');
                      slot.innerHTML = `<span class="n">${next + 1}</span>` + md(items[next]);
                      slots.appendChild(slot);
                      next++;
                    }
                    pool.innerHTML = '';
                    if (opts.explainRight) t.right(opts.explainRight);
                  });
                }
                return;
              }
              b.disabled = true;
              b.classList.add('placed');
              const slot = el('div', 'order-slot');
              slot.innerHTML = `<span class="n">${next + 1}</span>` + md(items[idx]);
              slots.appendChild(slot);
              b.remove();
              next++;
              if (next === items.length) {
                record({ kind: 'order', prompt, answer: '顺序全对', correct: true });
                clearPrompt();
                if (opts.explainRight) t.right(opts.explainRight);
                resolve_(true);
              }
            });
            pool.appendChild(b);
            return b;
          });
          let resolve_;
          return new Promise((r) => { resolve_ = r; });
        },
        /* Match each term on the left to the thing the learner actually did, on the right. */
        async match(prompt, pairs, opts = {}) {
          const g = guard(); if (g) return g;
          if (prompt) await t.say(prompt, { pause: 120 });
          setPrompt(prompt, opts.hints);
          const wrap = append(el('div', 'match reveal'));
          const leftCol = el('div', 'match-col');
          const rightCol = el('div', 'match-col');
          wrap.append(leftCol, rightCol);
          const rightOrder = opts.rightOrder || pairs.map((_, i) => i).slice().reverse();
          let sel = null, done = 0, missed = 0;
          const lefts = pairs.map((p, i) => {
            const b = el('button', 'match-card', md(p.term));
            b.addEventListener('click', () => {
              if (run.cancelled || b.disabled) return;
              if (sel) sel.classList.remove('sel');
              sel = b; b.classList.add('sel');
              rightCol.querySelectorAll('button:not(:disabled)').forEach((r) => r.classList.add('armed'));
            });
            b.dataset.i = i;
            leftCol.appendChild(b);
            return b;
          });
          rightOrder.forEach((i) => {
            const p = pairs[i];
            const b = el('button', 'match-card', md(p.did));
            b.addEventListener('click', () => {
              if (run.cancelled || b.disabled || !sel) return;
              const li = Number(sel.dataset.i);
              if (li !== i) {
                b.classList.add('shake');
                setTimeout(() => b.classList.remove('shake'), 320);
                const fb = opts.feedback ? opts.feedback(pairs[li].term, p.did) : null;
                t.wrong(fb || `「${pairs[li].term}」说的不是这件事。再看看你到底在哪一屏做过这个动作。`);
                record({ kind: 'match', prompt, answer: pairs[li].term + ' → ' + p.did, correct: false });
                if (++missed >= (run.hints.length || 0) + 3) {
                  t.ask.offerWayOut(wrap, () => resolveAll(true), () => {
                    leftCol.querySelectorAll('button').forEach((x) => { x.disabled = true; x.classList.add('right'); x.classList.remove('sel'); });
                    rightCol.querySelectorAll('button').forEach((x) => { x.disabled = true; x.classList.add('right'); x.classList.remove('armed'); });
                    const lines = pairs.map((q) => `**${q.term.replace(/\*/g, '')}** → ${q.did}`).join('\n\n');
                    t.note('正确的对应', lines);
                  });
                }
                return;
              }
              sel.disabled = true; sel.classList.remove('sel'); sel.classList.add('right');
              b.disabled = true; b.classList.add('right');
              rightCol.querySelectorAll('button').forEach((r) => r.classList.remove('armed'));
              sel = null;
              record({ kind: 'match', prompt, answer: p.term + ' → ' + p.did, correct: true });
              if (p.explain) t.right(p.explain);
              if (++done === pairs.length) { clearPrompt(); resolveAll(true); }
            });
            rightCol.appendChild(b);
          });
          let resolveAll;
          return new Promise((r) => { resolveAll = r; });
        },
        /* A single button the learner presses when ready. */
        async confirm(label, opts = {}) {
          const g = guard(); if (g) return g;
          const row = append(el('div', 'btn-row reveal'));
          const b = el('button', 'btn ' + (opts.cls || 'primary'), esc(label));
          row.appendChild(b);
          return new Promise((resolve) => {
            b.addEventListener('click', () => {
              if (run.cancelled) return;
              b.disabled = true;
              if (opts.echo !== false) { row.remove(); t.learnerSays(label); }
              resolve(true);
            });
          });
        },
      },
      /* Look back at what the learner answered earlier (used by the recap screen). */
      recall(filter) {
        return state.log.filter((e) => {
          if (!filter) return true;
          if (filter.screen && e.screen !== filter.screen) return false;
          if (filter.kind && e.kind !== filter.kind) return false;
          if (filter.promptIncludes && !(e.prompt || '').includes(filter.promptIncludes)) return false;
          return true;
        });
      },
      recallOne(filter) { const l = t.recall(filter); return l.length ? l[l.length - 1] : null; },
      done(opts = {}) {
        if (run.cancelled) return;
        state.completed.add(run.screen.id);
        state.index = screens.indexOf(run.screen);
        save();
        renderChrome();
        const isLast = state.index >= screens.length - 1;
        const next = screens[state.index + 1];
        setDock({ hint: false, next: opts.label || (isLast ? '回到目录' : `下一屏：${next.title}`) });
        clearPrompt();
      },
    };
    return t;
  }

  // ---------- screen lifecycle ----------
  async function showScreen(i) {
    if (i < 0 || i >= screens.length) return;
    if (current) current.cancelled = true;
    const screen = screens[i];
    state.index = i;
    save();
    const run = { screen, cancelled: false, prompt: '', hints: [], hintsShown: 0 };
    current = run;
    const feed = $('feed');
    feed.innerHTML = '';
    window.scrollTo({ top: 0 });
    renderChrome();
    setDock({ hint: false, next: null });
    const t = makeTutor(run);
    try {
      await screen.run(t);
    } catch (err) {
      if (!run.cancelled) {
        console.error(err);
        feed.appendChild(el('div', 'bubble tutor error', md(`这一屏出了点技术问题（${esc(err.message || err)}）。你可以打开目录跳到下一屏，然后把这个问题告诉作者。`)));
        setDock({ hint: false, next: i + 1 < screens.length ? `下一屏：${screens[i + 1].title}` : null });
        state.completed.add(screen.id);
      }
    }
  }

  // ---------- AI mentor (optional; only when served by mentor_server.py) ----------
  const Mentor = {
    available: false,
    history: [],
    /* Only look for a mentor where one could plausibly be running: the local proxy,
       or anywhere the reader opts in with ?mentor=1. Probing from a static host would
       just print a 404 in everyone's console. */
    couldHaveServer() {
      if (/[?&]mentor=1\b/.test(location.search)) return true;
      return location.protocol.startsWith('http') && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    },
    async init() {
      if (!this.couldHaveServer()) { $('mentorBtn').hidden = true; return; }
      try {
        const r = await fetch('api/mentor/health', { cache: 'no-store' });
        const j = await r.json();
        this.available = !!j.ai;
      } catch (e) { this.available = false; }
      $('mentorBtn').hidden = !this.available;
    },
    context() {
      const sc = current ? current.screen : null;
      return {
        screen_id: sc ? sc.id : null,
        screen_title: sc ? sc.title : null,
        screen_goal: sc ? sc.goal || null : null,
        current_prompt: current ? current.prompt : null,
        hints_available: current ? current.hints : [],
        hints_shown: current ? current.hintsShown : 0,
        recent_attempts: state.attempts.slice(-6).map((a) => ({ kind: a.kind, prompt: a.prompt, answer: a.answer, correct: a.correct, n: a.n })),
      };
    },
    async ask(question) {
      const res = await fetch('api/mentor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: this.context(), history: this.history.slice(-8) }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || ('HTTP ' + res.status));
      this.history.push({ role: 'user', content: question }, { role: 'assistant', content: j.reply });
      return j.reply;
    },
  };
  function wireMentor() {
    const sheet = $('mentor');
    const log = $('mentorLog');
    const addM = (cls, text) => { const m = el('div', 'm ' + cls, md(text)); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
    $('mentorBtn').addEventListener('click', () => {
      sheet.hidden = !sheet.hidden;
      if (!sheet.hidden) {
        if (!log.childElementCount) addM('sys', '说说你卡在哪里。导师只会反问和提示，答案还是你自己找到的。');
        $('mentorInput').focus();
      }
    });
    $('mentorClose').addEventListener('click', () => { sheet.hidden = true; });
    $('mentorForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('mentorInput');
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      addM('me', q);
      state.attempts.push({ screen: current ? current.screen.id : null, kind: 'mentor_question', text: q });
      const wait = addM('sys', '导师在想……（它会先想一会儿，大约十几秒）');
      $('mentorSend').disabled = true;
      try {
        const reply = await Mentor.ask(q);
        wait.remove();
        addM('ai', reply);
      } catch (err) {
        wait.remove();
        addM('sys', `导师暂时联系不上（${esc(err.message)}）。先用页面底部的“需要提示”。`);
      } finally {
        $('mentorSend').disabled = false;
        input.focus();
      }
    });
  }

  // ---------- boot ----------
  function start() {
    load();
    renderChrome();
    $('tocBtn').addEventListener('click', () => toggleToc());
    document.addEventListener('click', (e) => {
      const toc = $('toc');
      if (!toc.hidden && !toc.contains(e.target) && e.target !== $('tocBtn')) toggleToc(false);
    });
    $('hintBtn').addEventListener('click', showHint);
    $('nextBtn').addEventListener('click', () => {
      if (state.index + 1 < screens.length) showScreen(state.index + 1);
      else { toggleToc(true); }
    });
    wireMentor();
    Mentor.init();
    showScreen(state.index);
  }

  window.FunAl = { register, start, showScreen, state, screens, el, md, esc, addStyle, sleep, Mentor };
})();
