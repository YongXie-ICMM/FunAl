FunAl.register({
  id: 'splits',
  title: '还有别的分法吗',
  goal: '学习者亲手用另外两种方式分堆，看到「按第一脚分」需要一个额外前提、「按用了几个 2 分」当场崩掉，从而拿到真正的判据。',
  minutes: 3,
  async run(t) {
    const D = FunAl.data.ways;
    const R = D.routes4;
    const chip = (r) => r.map((k) => `+${k}`).join(' ');
    const chipHead = (r) => `<span class="tail">+${r[0]}</span> ` + r.slice(1).map((k) => `+${k}`).join(' ');

    await t.say('上一屏你说「按第一脚分也行」。那就**真的试一次**，别嘴上说说。');

    const b1Box = t.canvas();
    const b1 = FunAl.widgets.buckets(b1Box, {
      cards: R,
      buckets: ['第一脚走 1 级', '第一脚走 2 级'],
      format: chipHead,
      answer: (r) => (r[0] === 1 ? 0 : 1),
      poolLabel: '这次看**开头**那个橙色数字。点卡片，再点筐。',
      onWrong: (r) => t.wrong(`这条路线的第一脚是 **+${r[0]}**，橙色标出来了。`),
    });
    t.hints(['这次看每张卡片最**左边**那个橙色数字。']);
    await t.waitFor((resolve) => { const iv = setInterval(() => { if (b1.counts()[0] + b1.counts()[1] === 5) { clearInterval(iv); setTimeout(() => resolve(true), 400); } }, 150); });
    t.clearHints();
    t.right(`**${b1.counts()[0]} 条 + ${b1.counts()[1]} 条 = 5 条。** 不重不漏，跟按最后一脚分一样干净。`);

    await t.say('那把第一脚也剪掉，看剩下什么。');
    await t.ask.confirm('剪掉第一脚');
    b1.cutTails();
    await t.pause(600);

    const leftBox = t.canvas();
    leftBox.innerHTML = `<div class="small muted" style="margin-bottom:8px">左筐剪掉第一脚之后，剩下这 3 条</div>`;
    FunAl.widgets.routeChips(leftBox, [[1, 1, 1], [1, 2], [2, 1]]);

    await t.ask.choice('这 3 条，是「到第 3 级」的全部走法吗？', [
      '不完全是。它们是「**从第 1 级**走到第 4 级」的走法，起点不一样。',
      '是的，一模一样。',
    ], {
      correct: 0,
      feedback: {
        1: '看仔细：剪掉第一脚之后，人已经站在**第 1 级**了，剩下的路是从第 1 级走到第 4 级。「到第 3 级」说的是从**地面**出发。起点不同。',
      },
      explainRight: '对。起点变了。',
      hints: ['剪掉第一脚之后，人站在哪一级？', '「到第 3 级」是从哪里出发的？'],
    });

    await t.ask.choice('那它们算不算「同一道题」？', [
      '算，但要多说一句：因为这段楼梯每一级都长得一样，从第 1 级往上走 3 级，跟从地面往上走 3 级完全一回事。',
      '不算，起点不一样就是两道题。',
    ], {
      correct: 0,
      feedback: {
        1: '这段楼梯上确实是一回事——台阶没有编号差别，从哪儿起步都一样。所以按第一脚分**在这道题上能用**。只是你得先说这句话。',
      },
      explainRight: '对。**能用，但多了一个前提：每级台阶都一样。**',
      hints: ['这段楼梯上，第 1 级和地面有什么区别吗？'],
    });

    t.note('两种分法都能走通', '按**最后一脚**分，剪完剩下的是「从地面到第 3 级」——**原题本身**，不用多说任何话。\n\n按**第一脚**分，剪完剩下的是「从第 1 级到第 4 级」。在这段楼梯上它和原题是一回事，因为台阶都一样。\n\n那要是台阶**不一样**呢（比如后面那道每级价钱都不同的楼梯）？照样能走通——只是格子里写的东西要跟着改：不再是「从地面到第 k 级」，而是「**从第 k 级出发到终点**最少要多少」，表从右往左填。\n\n**两种是一体两面，都对。** 这门课统一用最后一脚，只是因为那样格子的编号就是楼层号，读起来顺一点。');

    await t.say('再试第三种分法：**按这条路用了几个「2 级」来分。**');

    const b2Box = t.canvas();
    const b2 = FunAl.widgets.buckets(b2Box, {
      cards: R,
      buckets: ['一个 2 都没用', '用了 1 个 2', '用了 2 个 2'],
      format: chip,
      answer: (r) => r.filter((k) => k === 2).length,
      poolLabel: '数一数每张卡片里有几个 2。',
      onWrong: (r) => t.wrong(`这条是 ${chip(r)}，里面有 **${r.filter((k) => k === 2).length} 个 2**。`),
    });
    t.hints(['数卡片上有几个「+2」。']);
    await t.waitFor((resolve) => { const iv = setInterval(() => { if (b2.counts().reduce((a, b) => a + b, 0) === 5) { clearInterval(iv); setTimeout(() => resolve(true), 400); } }, 150); });
    t.clearHints();
    t.right(`**${b2.counts().join(' + ')} = 5 条。** 又是不重不漏。三种分法，三次都干净。`);

    await t.say('那问题来了：**干净就够了吗？**');
    await t.say('把中间那个筐（用了 1 个 2）拿出来，把那个 2 剪掉，看剩下什么。');
    await t.ask.confirm('把那个 2 剪掉');

    const collapseBox = t.canvas();
    collapseBox.innerHTML = `
      <div class="small muted" style="margin-bottom:8px">剪之前</div>
      <div class="w-chips">${[[1, 1, 2], [1, 2, 1], [2, 1, 1]].map((r) => `<div class="w-chip">${chip(r)}</div>`).join('')}</div>
      <div class="small muted" style="margin:14px 0 8px">剪掉那个 2 之后</div>
      <div class="w-chips">${[0, 1, 2].map(() => `<div class="w-chip dup">+1 +1</div>`).join('')}</div>`;
    await t.pause(800);

    await t.ask.choice('三张**不一样**的卡片，剪完变成了三张**一模一样**的卡片。而到第 2 级一共只有 2 条走法（+1+1 和 +2）。这说明什么？', [
      '说明这堆的数量（3）跟「到第 2 级的走法数」（2）对不上。剪完之后不是一一对应，套不下去了。',
      '说明剪错了，应该剪别的位置。',
      '说明这种分法也可以，只是麻烦一点。',
    ], {
      correct: 0,
      feedback: {
        1: '「用了 1 个 2」这个筐里，那个 2 可能在开头、中间、结尾。你剪哪一个？不管剪哪个，剩下的都不是一道「从地面到第几级」的题。',
        2: '不是麻烦，是**根本接不下去**。到第 2 级只有 2 条路，可这个筐有 3 条。你没法说「这个筐的数量 = 到第 2 级的走法数」，那这一步就白拆了。',
      },
      explainRight: '对。**分得干净，不代表能接着往下拆。**',
      hints: [
        '数一数：剪完剩下 3 张卡。可到第 2 级一共有几条走法？',
        '3 对 2，对不上。那你还能说「这个筐的数量等于某道小题的答案」吗？',
      ],
    });

    t.note('这才是真正的判据', '分法可以有很多种，**能用的只有一种**：\n\n**剪掉那一步之后，剩下的必须还是同一道题，只是数字更小；而且原来的卡片和剩下的卡片要一一对应，不多不少。**\n\n· 按最后一脚分 → 剩下「从地面到第 3 级」，**原题本身**。✓\n· 按第一脚分 → 剩下「从第 1 级到第 4 级」，得先说「台阶都一样」。这题行，别的题不一定。\n· 按用了几个 2 分 → 剩下的根本不是「到第几级」这种题。✗\n\n**「看最后一步」之所以到处都灵，就是因为它剪完永远落回原题。**');

    await t.say('判据有了。下一屏回到正题：用这条规律一路往上算——但要先填一个很多人会填错的格子。');
    t.done();
  },
});
