FunAl.register({
  id: 'naive',
  title: '一台没记性的机器',
  goal: '学习者亲手把「从上往下问」的过程展开，亲眼看到同一道小题被反复问，并感受到楼梯变高时的爆炸。',
  minutes: 3,
  async run(t) {
    const D = FunAl.data.ways;

    await t.say('现在你来当那台机器。');
    t.note('这台机器的规矩（先说清楚，全程不变）', '**一、** 它只会一条规律：到第 k 级 = 到第 k−1 级 + 到第 k−2 级。\n\n**二、** 它知道两件事不用问：到第 1 级是 1 种，到地面是 1 种。\n\n**三、** 它**没有记性**。刚算过的答案，转头就忘。要用就得重新问一遍。\n\n屏幕上每出现一张卡片，就代表**它问了一道小题**。计数器数的就是卡片张数，从头到尾都是这个意思。');

    await t.ask.predict('先押一个数：为了算出「到第 6 级有几种」，这台机器一共会问出多少张卡片？', [
      '十来张吧',
      '二十几张',
      '上百张',
    ]);

    await t.say('自己点点看。点一张卡片，它就裂成它要问的那两道小题。**橙色**的卡片表示：这道题以前已经出现过了。');

    const box = t.canvas();
    const tr = FunAl.widgets.tree(box, { root: 6, memo: false, label: (n) => `到第 ${n} 级？` });

    const row = t.el('div', 'btn-row');
    const allBtn = t.el('button', 'btn', '够了，剩下的自动展开');
    row.appendChild(allBtn);
    box.appendChild(row);
    allBtn.addEventListener('click', () => { tr.expandAll(); });

    t.hints([
      '点任何一张还是蓝色的卡片，它就会裂开。',
      '一直点到没有蓝色卡片为止。橙色的是你以前见过的题。',
      '嫌慢就按「够了，剩下的自动展开」。',
    ]);
    await t.waitFor((resolve) => tr.on((ev) => { if (ev.kind === 'solved' && ev.n === 6) setTimeout(() => resolve(true), 400); }));
    t.clearHints();
    allBtn.disabled = true;

    const st = tr.stats;
    t.learnerSays(`展开完了：${st.cards} 张卡片`);
    t.right(`**${D.naive[6].cards} 张卡片**，其中 **${st.dupCount} 张**是以前出现过的重复问题。它们全被重新算了一遍。`);

    await t.say('找一找那些橙色卡片。「**到第 2 级？**」这一道，它一共问了 **5 遍**，每一遍都从头重算，每一遍答案都是 2。');
    await t.say('它不是笨，它只是**没记性**。规律本身没问题，问题出在照着规律往下问的时候，同一道小题会一次次冒出来。');

    t.note('给这件事起个名字', '同一道小题被反复问到，叫**重复子问题**。\n\n这个词你现在可以记，因为你刚才亲眼数过那些橙色卡片。');

    await t.say('6 级楼梯还好，25 张而已。楼梯高一点会怎样？自己拉一下。');

    const sBox = t.canvas();
    sBox.innerHTML = '<div class="small muted" style="margin-bottom:10px">楼梯有多高？</div>';
    const sl = t.el('input');
    sl.type = 'range'; sl.min = '6'; sl.max = '30'; sl.value = '6'; sl.step = '1';
    sl.style.cssText = 'width:100%;';
    const out = t.el('div', '', '');
    sBox.append(sl, out);
    const paint = () => {
      const n = Number(sl.value);
      const cards = 2 * D.table[n] - 1;   // always: one card per node of the tree
      const secs = cards;
      const human = secs < 90 ? `${secs} 秒`
        : secs < 5400 ? `${Math.round(secs / 60)} 分钟`
        : secs < 172800 ? `${(secs / 3600).toFixed(1)} 小时`
        : secs < 5184000 ? `${Math.round(secs / 86400)} 天`
        : `${(secs / 2592000).toFixed(1)} 个月`;
      out.innerHTML = `<div style="font-size:1.1rem;margin-top:10px">
        <div>楼梯 <strong>${n}</strong> 级 · 答案是 <strong>${D.table[n].toLocaleString('en-US')}</strong> 种走法</div>
        <div style="margin-top:6px">这台没记性的机器要问 <strong style="color:var(--warn);font-size:1.4rem">${cards.toLocaleString('en-US')}</strong> 张卡片</div>
        <div class="small muted" style="margin-top:4px">一秒问一张的话，要问 ${human}</div>
        <div class="small" style="margin-top:8px;color:var(--ok)">可是真正**不同**的小题，从头到尾只有 ${n + 1} 道（到地面、到第 1 级……到第 ${n} 级）</div>
      </div>`;
      out.innerHTML = out.innerHTML.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    };
    sl.addEventListener('input', paint);
    paint();

    t.hints(['把滑块一路拉到最右边（30 级）看看。']);
    await t.ask.confirm('我拉到 30 级看过了');
    t.clearHints();

    await t.say(`30 级楼梯：答案是 **${D.table[30].toLocaleString('en-US')}** 种，而这台机器要问 **${D.naive[30].cards.toLocaleString('en-US')}** 张卡片——一秒一张要问一个月。`);
    await t.say('可**真正不同的小题只有 31 道**。');

    await t.ask.choice('那问题到底出在哪？', [
      '出在它把同一道题算了无数遍。不同的题其实很少。',
      '出在那条规律不对，得换一条规律。',
      '出在楼梯太高了，这种题就是没法算。',
    ], {
      correct: 0,
      feedback: {
        1: '规律是你自己验证过的，它没错——你用它算出了 13，和亲手数的一致。错的不是规律，是使用规律的方式。',
        2: '30 级楼梯只有 31 道不同的小题，这一点也不多。所以不是题太大，是同一道题被算了太多遍。',
      },
      explainRight: '对。**要算的东西很少，重复的劳动很多。**',
      hints: ['比一比两个数：要问 269 万张卡片，可不同的小题只有 31 道。', '那 269 万张卡片里，绝大多数是同一批题反复出现。'],
    });

    await t.say('那修起来就很自然了：**算过的，记下来。**');
    await t.say('下一屏，你给这台机器一个账本。');

    t.done();
  },
});
