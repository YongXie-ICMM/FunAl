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

    await t.say('但表里只有数字，**没有路线**。');
    await t.say('那条最省的路你早就见过了（上一道题揭晓过）。所以这一步的重点**不是找出它**，而是学会**怎么从一张只有数字的表里，把路线挖出来**——换一道题，你手上就只有这张表了。');
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

    await t.say('还有一个坑，遇到就会卡住。**换一组价签，你自己撞一次。**');

    const T2 = D.tie;
    const box2 = t.canvas();
    const row2 = FunAl.widgets.cells(box2, {
      n: 6,
      label: (i) => (i === 0 ? '地面' : `第 ${i} 级`),
      sub: (i) => (i === 0 ? '免费' : `过路费 ${T2.tolls[i]}`),
      title: '换一组价签，再填一次',
      values: { 0: T2.best[0], 1: T2.best[1], 2: T2.best[2], 3: T2.best[3] },
    });
    await t.say(`前四格我先填好了。你填**第 4、5、6 格**。`);

    for (let i = 4; i <= 6; i++) {
      row2.links(i, [i - 1, i - 2], ['+1', '+2']);
      const a = T2.best[i - 1], bb = T2.best[i - 2];
      t.hints([`第 ${i - 1} 级是 ${a} 元，第 ${i - 2} 级是 ${bb} 元。`, `挑小的，再加第 ${i} 级的 ${T2.tolls[i]} 元。`]);
      await row2.fill(i, {
        answer: T2.best[i],
        onWrong: (v) => {
          if (v === a + bb + T2.tolls[i]) t.wrong('又把两个来源加起来了。它们是两条路，你只走一条。');
          else if (v === Math.min(a, bb)) t.wrong(`挑对了小的（${Math.min(a, bb)}），但还没加第 ${i} 级的 ${T2.tolls[i]} 元。`);
          else t.wrong(`第 ${i - 1} 级 ${a} 元，第 ${i - 2} 级 ${bb} 元，挑小的，再加 ${T2.tolls[i]} 元。`);
        },
      });
      t.clearHints();
      await t.pause(700);
      row2.clearLinks();
    }

    row2.links(6, [5, 4], ['+1', '+2']);
    await t.ask.choice(`现在倒着问：第 6 格的 ${T2.best[6]} 元，是从哪一格来的？`, [
      `第 5 级（${T2.best[5]} 元）`,
      `第 4 级（${T2.best[4]} 元）`,
      `两个都行——它们一样小。`,
    ], {
      correct: 2,
      feedback: {
        0: `第 5 级确实能走通：${T2.best[5]} + ${T2.tolls[6]} = ${T2.best[6]}。但先看一眼第 4 级那格是多少。`,
        1: `第 4 级也确实能走通：${T2.best[4]} + ${T2.tolls[6]} = ${T2.best[6]}。那第 5 级那格呢？`,
      },
      explainRight: `对。第 5 级和第 4 级**都是 ${T2.best[5]} 元**，一样小。`,
      hints: [`把第 5 格和第 4 格的数字念一遍。`, `${T2.best[5]} 和 ${T2.best[4]}，哪个更小？`],
    });
    row2.markLink(5, 'pick'); row2.markLink(4, 'pick');

    await t.ask.choice('那这说明什么？', [
      `说明有**两条**一样省的路线，都花 ${T2.bestCost} 元。挑哪条都对。`,
      '说明这张表填错了。',
      '说明得挑左边那一格，规定就是这样。',
    ], {
      correct: 0,
      feedback: {
        1: '两个数一样大是很正常的事，不是错。你刚才每一格都是照规则算的。',
        2: '没有这种规定。两条路一样便宜，走哪条都花一样的钱。',
      },
      explainRight: `对。**格子里的数不会变，变的只是路线有几条。**`,
      hints: ['两个来源一样小，说明从哪边来，最后都花一样的钱。'],
    });

    const tieBox = t.canvas();
    tieBox.innerHTML = '<div class="small muted" style="margin-bottom:8px">两条路线，都是 ' + T2.bestCost + ' 元</div>';
    T2.paths.forEach((pth) => {
      const holder = t.el('div', '');
      holder.style.marginBottom = '12px';
      tieBox.appendChild(holder);
      const stt = FunAl.widgets.stairs(holder, { n: 6, tolls: T2.tolls, showCost: true, baseH: 30, stepH: 8 });
      const steps = pth.slice(1).map((v, k) => v - pth[k]);
      stt.showPath(steps);
      pth.forEach((i) => stt.mark(i, 'gold'));
    });

    t.note('平局怎么办', `倒着找路线的时候，如果两个来源一样小，**两条都是最省的**，随便走哪条。\n\n（如果题目只要一条，挑哪边都行；如果题目问「有几条最省路线」，那就是另一道题了——你得数，而不是挑。）`);

    await t.say('爬楼梯这个场景到此结束。下一屏是真正的考试：**一道和楼梯毫无关系的题**，你自己上。');
    t.done();
  },
});
