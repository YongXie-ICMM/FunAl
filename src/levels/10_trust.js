FunAl.register({
  id: 'trust',
  title: '凭什么信小格子',
  goal: '让学习者亲手把一条路的前半段换掉，看到后半段一分不变；再用一条新规则让这套办法当场失灵，得到「什么时候能用」的判据。',
  minutes: 4,
  async run(t) {
    const D = FunAl.data.toll;
    const B = FunAl.data.broken;
    const tolls = D.tolls;

    await t.say('这一屏回答一个应该被问的问题：**凭什么相信小格子里那个数？**');
    await t.say(`具体点说：算到第 6 级的时候，我们直接拿了「到第 5 级最省 ${D.best[5]} 元」这个数。万一整条最省的路，它走到第 5 级时**偏偏没走那条最省的前半段**呢？`);

    await t.ask.predict('先押一个：有没有可能出现这种事——一条最省的整路，它的前半段却不是最省的？', [
      '有可能', '不可能',
    ]);

    await t.say(`拿一条真实存在的路来看：**${D.swap.path.join('→')}**，总共 **${D.swap.cost} 元**。`);

    const box = t.canvas();
    const st = FunAl.widgets.stairs(box, { n: 6, tolls, hot: [D.pricey], showCost: true });
    st.showPath([2, 2, 1, 1]);
    D.swap.path.forEach((i) => st.mark(i, 'bad'));

    await t.say(`把它从第 5 级剪成两段：\n\n**前半段** ${D.swap.path.slice(0, 4).join('→')}，花了 **${D.swap.headTo5} 元**。\n\n**后半段** 5→6，花了 **${D.swap.tail} 元**。`);
    await t.say(`可账本说，到第 5 级最省只要 **${D.swap.bestHeadTo5} 元**（走 ${D.bestPath.slice(0, 4).join('→')}）。那就把前半段换掉。`);

    await t.ask.confirm('把前半段换成最省的那段');
    st.clearMarks();
    st.showPath([1, 2, 2, 1]);
    D.bestPath.forEach((i) => st.mark(i, 'gold'));
    await t.pause(700);

    await t.ask.number('换完之后，这条路总共花多少？', {
      answer: D.swap.after,
      unit: ' 元',
      feedback: (v) => {
        if (v === D.swap.cost) return '总价一定会变——你把 ' + D.swap.headTo5 + ' 元的前半段换成了 ' + D.swap.bestHeadTo5 + ' 元的，便宜了 ' + (D.swap.headTo5 - D.swap.bestHeadTo5) + ' 元。';
        if (v === D.swap.bestHeadTo5) return `这是新前半段的钱。别忘了后半段 5→6 那 ${D.swap.tail} 元还得付。`;
        return `新前半段 ${D.swap.bestHeadTo5} 元，后半段 ${D.swap.tail} 元。加起来。`;
      },
      hints: [`前半段现在是 ${D.swap.bestHeadTo5} 元。`, `后半段 5→6 还是 ${D.swap.tail} 元，一分没变。`],
    });

    await t.ask.choice(`关键在这里：换掉前半段之后，后半段 5→6 那 ${D.swap.tail} 元，变了吗？`, [
      `没变。还是 ${D.swap.tail} 元。`,
      `变了，前面的路不一样了，后面当然也不一样。`,
    ], {
      correct: 0,
      feedback: {
        1: `看价签：后半段就是「从第 5 级踩上第 6 级」，要付的是第 6 级的 ${tolls[6]} 元。这笔钱只跟**你现在站在第 5 级**有关，跟你**怎么走到第 5 级的**一点关系都没有。`,
      },
      explainRight: `对。**后半段要花多少，只看你现在站在哪一级，不看你是怎么来的。**`,
      hints: ['后半段要付的是哪一级的过路费？', '那一级的价签，会因为你前面怎么走而变化吗？'],
    });

    t.note('所以小格子可以信', `假如有一条最省的整路，它的前半段**不是**到那一级最省的——\n\n那我就把前半段换成最省的那段。后半段一分不变，总价却降了。\n\n于是「原来那条是最省的」这句话就被推翻了。**所以这种事根本不会发生。**\n\n这就是为什么每一格只需要记**一个数**：到这一级最省多少。`);

    await t.say('好。现在我要把这套办法**弄坏**给你看。');

    t.note('加一条新规则', `**${B.rule}。**\n\n价签一个都没变，走法规则也没变。只多了这一条。`);

    await t.say(`老表算出来的最省是 **${B.oldTableSays} 元**，走 ${D.bestPath.join('→')}。你去把这条路再走一遍，看看现在要付多少。`);

    const box2 = t.canvas();
    const st2 = FunAl.widgets.stairs(box2, {
      n: 6, tolls, hot: [D.pricey], controls: true, showCost: true,
      emptyHint: '走走看。这次连着跨两次 2 级会被罚款。',
      extraCost: (path) => {
        let pen = 0;
        for (let i = 1; i < path.length; i++) if (path[i] === 2 && path[i - 1] === 2) pen += B.penalty;
        return pen;
      },
    });
    let seenTotal = null;
    st2.onStep((ev) => { if (ev.done) { seenTotal = ev.total; setTimeout(() => st2.reset(), 1600); } });
    t.hints([`走 ${D.bestPath.join('→')} 这条：先 +1，再 +2，再 +2，最后 +1。`, '注意中间连着跨了两次 2 级。']);
    await t.waitFor((resolve) => { const iv = setInterval(() => { if (seenTotal !== null) { clearInterval(iv); resolve(seenTotal); } }, 150); });
    t.clearHints();
    st2.enable(false);

    await t.ask.number(`那现在，到第 6 级真正的最省是多少？（13 条路都算上罚款）`, {
      answer: B.realBest,
      unit: ' 元',
      feedback: (v) => {
        if (v === B.oldTableSays) return `${B.oldTableSays} 元是**老表**说的。可你刚才亲手走了那条路，它现在要付 ${B.realBest} 元。老表没把罚款算进去。`;
        if (v < B.realBest) return `没有这么便宜的走法。全部 13 条路加上罚款之后，最便宜的一条是 ${B.realBest} 元。`;
        return `比 ${B.realBest} 贵了。最省的还是 ${D.bestPath.join('→')} 这条：过路费 ${B.realBreakdown.toll} 元 + 罚款 ${B.realBreakdown.penalty} 元。`;
      },
      hints: ['先看你刚走的那条要多少。', `其他路要么过路费更高，要么也躲不掉罚款。最便宜的还是那条：${B.realBreakdown.toll} + ${B.realBreakdown.penalty}。`],
    });

    const cheap = B.allRoutes.filter((r) => r.total < B.realBest);
    t.note('看清楚发生了什么', `老表说 **${B.oldTableSays} 元**。\n\n可 13 条路里，最便宜的一条要 **${B.realBest} 元**。\n\n花 ${B.oldTableSays} 元的走法有 **${cheap.length + (B.allRoutes.filter((r) => r.total === B.oldTableSays).length)} 条**——一条都没有。\n\n**老表不是漏掉了更好的路，它算出了一个买不到的价钱。**`);

    await t.ask.choice('为什么这次不灵了？', [
      '因为站在第 5 级的时候，「我是怎么来的」开始影响后面要花多少了——上一步是不是跨了 2 级，决定了下一步会不会被罚。',
      '因为罚款让这道题变得太难，没法算。',
    ], {
      correct: 0,
      feedback: {
        1: '难不难先放一边。真正的变化是：**光知道「我在第 5 级」，已经不够决定后面了。** 还得知道你上一步是怎么迈的。',
      },
      explainRight: '对。**上一屏那句话失效了：后半段要花多少，不再只看你站在哪一级。**',
      hints: ['回想刚才那句关键的话：「后半段花多少，只看你现在站在哪一级」。这句话现在还成立吗？', '罚不罚款，取决于你**上一步**是怎么迈的。'],
    });

    t.note('这就是判据（每道新题都该问一遍）', '**站在这一格，只知道格子的编号，够不够决定后面怎么走？**\n\n· 够 → 每格记**一个数**就行。\n· 不够 → 说明格子里少记了东西。把少的那一样补进去。');

    await t.say('那这道被弄坏的题，还能救吗？能。**每一级挂两张纸条**，分开记：');

    const box3 = t.canvas();
    const rowA = FunAl.widgets.cells(box3, {
      n: 6, label: (i) => (i === 0 ? '地面' : `第 ${i} 级`),
      title: '我是走 1 级上来的：最少花多少',
      values: Object.fromEntries(B.byOne.map((v, i) => [i, v]).filter(([, v]) => v != null)),
      placeholder: '×',
    });
    const rowB = FunAl.widgets.cells(box3, {
      n: 6, label: (i) => (i === 0 ? '地面' : `第 ${i} 级`),
      title: '我是跨 2 级上来的：最少花多少',
      values: Object.fromEntries(B.byTwo.map((v, i) => [i, v]).filter(([, v]) => v != null)),
      placeholder: '×',
    });
    rowB.el.style.marginTop = '18px';
    rowA.mark(6, 'gold');

    await t.say(`两排纸条填完，答案就出来了：第 6 级两张纸条是 **${B.byOne[6]}** 和 **${B.byTwo[6]}**，挑小的 → **${B.realBest} 元**。跟穷举的结果一模一样。`);

    t.note('一排不够，就两排', '格子里要记的东西多了一样（我最后一步是怎么迈的），**一排格子就变成了两排**。\n\n办法完全没变，还是「看最后一步、从小往大填」。变的只是**一格里要记几样东西**。\n\n以后你会遇到要记两样东西的题（比如在网格里走，得知道你在第几行第几列）。那时候一排格子就会变成**一整面**。看着吓人，做的还是同一件事。');

    await t.say('回到没有罚款的那道题。下一屏，你自己把最省表填完，然后**亲手把最省路线倒着找回来**。');
    t.done();
  },
});
