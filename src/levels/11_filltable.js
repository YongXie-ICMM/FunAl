FunAl.register({
  id: 'filltable',
  title: '自己填最省表',
  goal: '学习者独立填完整张最省表，然后亲手把最省路线倒着找回来；并处理两个来路一样小的情况。',
  minutes: 4,
  async run(t) {
    const D = FunAl.data.toll;
    const tolls = D.tolls;

    await t.say('罚款那条规则去掉，回到原来那道题。这次整张表由你来填。');

    const box = t.canvas();
    const row = FunAl.widgets.cells(box, {
      n: 6,
      label: (i) => (i === 0 ? '地面' : `第 ${i} 级`),
      sub: (i) => (i === 0 ? '免费' : `过路费 ${tolls[i]}`),
      title: '到这一级，最少花多少钱',
    });

    row.mark(0, 'active');
    await t.ask.number('先定起步格：**地面**那一格填几？', {
      answer: 0,
      unit: ' 元',
      feedback: (v) => {
        if (v === 1) return '1 是**数走法**那道题的答案（一步不走也算一种走法）。这次格子里写的不是走法数，是**花了多少钱**。站在地面，你付过钱吗？';
        if (v === tolls[1]) return `${tolls[1]} 元是踩上**第 1 级**要付的钱。地面那一格问的是「走到地面最少花多少」。`;
        return '你还站在地面，一步没走，一分没付。';
      },
      hints: ['格子里写的是「到这一级最少花多少钱」。', '你现在就在地面上，还没踩过任何一级台阶。'],
    });
    row.set(0, 0, 'given');
    row.clearMarks();
    t.right('**0 元。** 注意这次起步格是 0，上一道题是 1——因为**格子里写的东西变了**。');

    t.note('起步格的通用办法', '不用背。**看格子里写的是什么，再问：最小的那种情况，这个东西是多少？**\n\n· 格子写「有几种走法」→ 地面：什么都不走，算 **1 种**。\n· 格子写「最少花多少钱」→ 地面：**0 元**。\n\n拿不准就用老办法：把规律往下多套一格，看这格必须填几才对得上。');

    await t.say('往上填。每一格的算法你已经知道了：**在左边两格里挑小的，再加上这一级的过路费。**');

    for (let i = 1; i <= 6; i++) {
      const preds = i === 1 ? [0] : [i - 1, i - 2];
      row.links(i, preds, preds.map((p) => `+${i - p}`));
      const a = D.best[i - 1];
      const bb = i >= 2 ? D.best[i - 2] : null;
      t.hints(i === 1
        ? [`到第 1 级只能从地面走 1 级上来。地面是 0 元，第 1 级的过路费是 ${tolls[1]} 元。`]
        : [`看两条弧线指向的格子：第 ${i - 1} 级是 ${a} 元，第 ${i - 2} 级是 ${bb} 元。`,
           `小的那个是 ${Math.min(a, bb)}。再加上第 ${i} 级自己的过路费 ${tolls[i]} 元。`]);
      await row.fill(i, {
        answer: D.best[i],
        onWrong: (v) => {
          if (i === 1) { t.wrong(`到第 1 级只有一条路：从地面走 1 级上来。0 + ${tolls[1]} = ${tolls[1]}。`); return; }
          if (v === a + bb + tolls[i]) t.wrong('你把两个来源加起来了。它们是两条不同的路，你只走一条，只挑一个。');
          else if (v === Math.min(a, bb)) t.wrong(`挑对了小的那个（${Math.min(a, bb)}），但还没加上第 ${i} 级自己的过路费 ${tolls[i]} 元。`);
          else if (v === Math.max(a, bb) + tolls[i]) t.wrong(`你挑的是大的那个（${Math.max(a, bb)}）。题目问最少，挑小的。`);
          else if (v === tolls[i]) t.wrong(`${tolls[i]} 只是这一级的过路费。你还得加上「走到上一站」已经花掉的钱。`);
          else t.wrong(`不对。第 ${i - 1} 级是 ${a} 元，第 ${i - 2} 级是 ${bb} 元，挑小的，再加 ${tolls[i]} 元。`);
        },
        onRight: () => {
          const src = D.from[i];
          row.markLink(src, 'pick');
          if (i >= 2) t.right(`挑小的(${a}, ${bb}) + ${tolls[i]} = **${D.best[i]}**`);
        },
      });
      t.clearHints();
      await t.pause(900);
      row.clearLinks();
    }

    t.right(`表填完了：到第 6 级最省 **${D.bestCost} 元**。跟你自己试出来的一样。`);

    await t.say('但表里只有数字，**没有路线**。那条最省的路到底怎么走？自己倒着找回来。');
    await t.say('从第 6 格开始，一路往回问：**这一格的数，是从哪一格来的？**');

    const chain = [];
    let cur = 6;
    while (cur > 0) { chain.push(cur); cur = D.from[cur]; }
    for (const k of chain) {
      const src = D.from[k];
      const preds = k === 1 ? [0] : [k - 1, k - 2];
      row.clearLinks();
      row.links(k, preds, preds.map((p) => `+${k - p}`));
      row.mark(k, 'gold');
      if (preds.length === 1) {
        await t.say(`第 ${k} 级只有一个来源：地面。`);
        row.mark(0, 'gold');
        continue;
      }
      const a = D.best[preds[0]], bb = D.best[preds[1]];
      await t.ask.choice(`第 ${k} 格是 ${D.best[k]} 元。它是从哪一格来的？`, [
        `第 ${preds[0]} 级（${a} 元）`,
        `第 ${preds[1]} 级（${bb} 元）`,
      ], {
        correct: preds.indexOf(src),
        feedback: (idx) => {
          const p = preds[idx], val = D.best[p];
          return `如果从第 ${p} 级来，这一格就该是 ${val} + ${tolls[k]} = ${val + tolls[k]} 元。可它写的是 ${D.best[k]} 元。对不上。`;
        },
        explainRight: `对：${D.best[src]} + ${tolls[k]} = ${D.best[k]}。所以最后一脚是从第 ${src} 级上来的。`,
        hints: [`哪一格的数字加上 ${tolls[k]} 元，正好等于 ${D.best[k]}？`],
      });
      row.markLink(src, 'pick');
      row.mark(src, 'gold');
      await t.pause(500);
    }
    row.clearLinks();

    const stBox = t.canvas();
    const st = FunAl.widgets.stairs(stBox, { n: 6, tolls, hot: [D.pricey], showCost: true });
    st.showPath([1, 2, 2, 1]);
    D.bestPath.forEach((i) => st.mark(i, 'gold'));
    t.right(`你倒着走出来的路线是 **${D.bestPath.join('→')}**，${D.bestCost} 元。这就是那条最省的路。`);

    t.note('怎么从表里找回路线', '表里每一格只写了一个数。想知道路线，就**倒着问**：这一格的数，减掉本级的过路费，等于左边哪一格？那一格就是它的来路。\n\n（写代码的时候，也可以填表时顺手记一下「我挑的是哪一格」，省得倒推。）');

    await t.ask.choice(`最后一个坑：如果倒着问的时候，**左边两格一样小**呢？`, [
      '那说明有两条一样省的路线，挑哪个都对。',
      '那说明表填错了。',
      '那要选左边那一格，规定就是这样。',
    ], {
      correct: 0,
      feedback: {
        1: '一样小是很正常的事，不是错。',
        2: '没有这种规定。两条路一样便宜，走哪条都花一样的钱。',
      },
      explainRight: '对。**格子里的数不会变，变的只是路线有几条。**',
      hints: ['两个来源一样小，说明从哪边来最后都花一样的钱。'],
    });

    t.note('举个真的例子', `把价签换成 **${D.tie.tolls.slice(1).join('、')}**，表就变成 **${D.tie.best.join(' / ')}**。\n\n第 6 格的两个来源都是 **6 元**，一样小。于是有两条最省路线，都花 **${D.tie.bestCost} 元**：\n\n· ${D.tie.paths[0].join('→')}\n· ${D.tie.paths[1].join('→')}`);

    await t.say('爬楼梯这个场景到此结束。下一屏是真正的考试：**一道和楼梯毫无关系的题**，你自己上。');
    t.done();
  },
});
