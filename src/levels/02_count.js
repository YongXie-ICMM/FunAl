FunAl.register({
  id: 'count4',
  title: '亲手数一数',
  goal: '让学习者亲手枚举出到第 4 级的 5 条走法，并确认「顺序不同就是不同走法」。',
  minutes: 3,
  async run(t) {
    const D = FunAl.data.ways;
    await t.say('楼梯缩短到 **4 级**。同样的规则：每次上 1 级或 2 级。');
    await t.say('先说清楚一件事，不然后面全乱。');

    await t.ask.choice('先走 1 级、再走 1 级、最后走 2 级（1+1+2），和先走 2 级、再走两次 1 级（2+1+1）——算同一种走法，还是两种？', [
      '算两种。脚步的先后顺序不一样。',
      '算一种。反正都是两个 1 和一个 2。',
    ], {
      correct: 0,
      feedback: {
        1: '想象你真的在爬这段楼梯：一种是先小步小步走、最后一大步跨上去；另一种是一上来就跨一大步。你的脚落在的台阶都不一样——第一种踩了第 1、2、4 级，第二种踩了第 2、3、4 级。踩过的台阶都不同，当然是两种走法。',
      },
      explainRight: '对。**一种走法 = 一整趟脚步的先后顺序。** 顺序不同就是不同的走法。',
      hints: [
        '别想公式，想你的脚。这两种走法，你的脚踩过的台阶一样吗？',
        '第一种（1+1+2）踩了第 1、2、4 级。第二种（2+1+1）踩了第 2、3、4 级。',
      ],
    });

    await t.say('好，现在你去数。走到第 4 级，每走成一趟，右边就多一张卡片。**走出重复的会被退回来。**');

    const box = t.canvas();
    const st = FunAl.widgets.stairs(box, { n: 4, controls: true, emptyHint: '从地面出发。' });
    const found = [];
    const chipBox = t.canvas();
    chipBox.innerHTML = '<div class="small muted" style="margin-bottom:8px">已经找到的走法</div>';
    const chips = FunAl.widgets.routeChips(chipBox, []);
    const counter = t.el('div', 'small muted', '已找到 0 条');
    chipBox.appendChild(counter);

    let resolveDone;
    const doneP = new Promise((r) => { resolveDone = r; });
    const claimRow = t.el('div', 'btn-row');
    const claimBtn = t.el('button', 'btn primary', '我找全了');
    claimRow.appendChild(claimBtn);
    chipBox.appendChild(claimRow);

    st.onStep((ev) => {
      if (!ev.done) return;
      const key = ev.path.join('');
      if (found.some((f) => f.join('') === key)) {
        chips.chips[found.findIndex((f) => f.join('') === key)].classList.add('dup');
        setTimeout(() => chips.chips.forEach((c) => c.classList.remove('dup')), 900);
        t.wrong(`**${ev.path.map((k) => '+' + k).join(' ')}** 这条你已经走过了，看右边第 ${found.findIndex((f) => f.join('') === key) + 1} 张卡。换一条没走过的。`);
      } else {
        found.push(ev.path.slice());
        chips.add(ev.path.slice());
        counter.textContent = `已找到 ${found.length} 条`;
      }
      setTimeout(() => st.reset(), 700);
    });

    t.hints([
      '还没走过的组合里，试试一上来就跨 2 级。',
      '把你找到的卡片按「第一步走了几级」看一眼：第一步走 1 级的有几条？走 2 级的有几条？',
      '第一步走 1 级的有 3 条，第一步走 2 级的有 2 条。',
    ]);

    claimBtn.addEventListener('click', () => {
      if (found.length === D.table[4]) {
        claimBtn.disabled = true;
        t.clearHints();
        resolveDone(true);
      } else if (found.length < D.table[4]) {
        t.wrong(`你找到了 ${found.length} 条，但还有没找到的。再想想：有没有哪种「先跨一大步」的走法你还没试过？`);
      }
    });
    await doneP;

    t.learnerSays(`我找全了，一共 ${found.length} 条`);
    t.right(`**${D.table[4]} 条，一条不多一条不少。** 这是你自己一条条走出来的，不是谁告诉你的。`);

    await t.say('把它们摆在一起看看：');
    const allBox = t.canvas();
    FunAl.widgets.routeChips(allBox, D.routes4);

    await t.ask.predict('那到第 6 级呢？先猜猜，也是这样一条条数的话，你觉得要数多少条？', [
      '十几条吧',
      '几十条',
      '上百条',
    ]);
    await t.say('到第 6 级是 **13 条**。还行。但楼梯再高一点，比如 30 级，就是 **1,346,269 条**——一秒钟数一条，你要数十五天。');
    await t.say('所以一条条数这条路走不通。得找个别的办法。');

    t.done();
  },
});
