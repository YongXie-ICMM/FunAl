FunAl.register({
  id: 'laststep',
  title: '最后一脚从哪来',
  goal: '学习者亲手把 5 条路线按最后一步分成两堆，双向验证不重不漏，剪掉最后一步后看到两堆正好是两道更小的同类题。',
  minutes: 4,
  async run(t) {
    const D = FunAl.data.ways;
    const fmt = (r) => r.map((k, i) => (i === r.length - 1 ? `<span class="tail">+${k}</span>` : `+${k}`)).join(' ');

    await t.say('一条条数走不通。那换个问法。');
    await t.say('别管一整趟怎么走。**只看最后一脚。**');

    await t.ask.multi('你已经站在第 4 级了。你的**最后一脚**，是从哪一级踩上来的？（可能不止一个答案）', [
      '第 1 级', '第 2 级', '第 3 级', '第 4 级',
    ], {
      correct: [1, 2],
      feedback: (got) => {
        if (got.includes(3)) return '第 4 级就是你现在站的地方。你没法从第 4 级踩到第 4 级——那等于没动。';
        if (got.includes(0)) return '从第 1 级踩到第 4 级要跨 3 级，一脚跨不了那么远。规则是一次最多 2 级。';
        if (got.length === 1 && got[0] === 2) return '第 3 级对，但还有一个。一脚除了走 1 级，还能走几级？';
        if (got.length === 1 && got[0] === 1) return '第 2 级对，但还有一个。一脚除了走 2 级，还能走几级？';
        return '一脚只能走 1 级或 2 级。从第 4 级往回退 1 级、退 2 级，分别是哪两级？';
      },
      explainRight: '对。**只有两种可能：从第 3 级跨 1 级上来，或者从第 2 级跨 2 级上来。** 没有第三种。',
      hints: [
        '从第 4 级往回退。退 1 级到哪？退 2 级到哪？',
        '一脚最多跨 2 级，所以往回最多退 2 级。',
      ],
    });

    await t.say('那就把你刚才找到的 5 条路线，按**最后一脚**分成两堆。');
    const bkBox = t.canvas();
    const bk = FunAl.widgets.buckets(bkBox, {
      cards: D.routes4,
      buckets: ['最后一脚从第 3 级上来（+1）', '最后一脚从第 2 级上来（+2）'],
      format: fmt,
      answer: (r) => (r[r.length - 1] === 1 ? 0 : 1),
      poolLabel: '点一张卡片，再点它该进的筐。橙色的那个数字就是最后一脚。',
      onWrong: (r) => t.wrong(`这条路线的最后一脚是 **+${r[r.length - 1]}**，橙色标出来了。走 +${r[r.length - 1]} 才能上第 4 级的话，你得站在第 ${4 - r[r.length - 1]} 级。`),
    });
    t.hints(['看每张卡片最右边那个橙色的数字，它就是最后一脚。', '最后一脚是 +1 的进左筐，是 +2 的进右筐。']);
    await t.waitFor((resolve) => { bkBox.addEventListener('click', function chk() { if (bk.counts()[0] + bk.counts()[1] === 5) { setTimeout(() => resolve(true), 300); bkBox.removeEventListener('click', chk); } }); });
    t.clearHints();
    t.right(`分完了：左筐 **${bk.counts()[0]} 条**，右筐 **${bk.counts()[1]} 条**。`);

    await t.say('先别急着相加。得先确认这两个筐是**干净**的。两件事要查。');

    await t.ask.choice('第一件：有没有哪条路线，**两个筐都能进**？', [
      '没有。一条路线只有一个最后一脚。',
      '有，有些路线两边都放得下。',
    ], {
      correct: 0,
      feedback: { 1: '找一条试试看。任何一条路线，它的最后一个数字要么是 1，要么是 2，不可能同时是两个。所以它只能进一个筐。' },
      explainRight: '对。所以**没有一条路线被数了两次**。',
      hints: ['随便挑一条卡片，看它最后一个数字。它能同时是 1 又是 2 吗？'],
    });

    await t.ask.choice('第二件，反过来问：有没有哪条到第 4 级的路线，**两个筐都进不去**、被漏掉了？', [
      '没有。任何一条路都得有最后一脚，而最后一脚只能是 +1 或 +2。',
      '可能有，我们只是没找到而已。',
    ], {
      correct: 0,
      feedback: {
        1: '假设真有这么一条被漏掉的路。它总得走到第 4 级吧？那它的最后一脚是几级？只能是 1 或 2。是 1 就该在左筐，是 2 就该在右筐。所以它漏不掉。',
      },
      explainRight: '对。**每条路都有最后一脚，最后一脚只有两种，所以一条也漏不掉。**',
      hints: ['假设真有一条被漏掉的路，它走到第 4 级的最后一脚是几级？', '最后一脚只能是 1 级或 2 级。是 1 就该在左筐，是 2 就该在右筐。哪儿也去不了的路存在吗？'],
    });

    t.note('不重也不漏', '两个筐**没有重复**、也**没有遗漏**。到这一步，两个筐里的数量才可以放心相加。');

    await t.say('现在做一件事：**把每张卡片的最后一脚剪掉。** 看看剩下什么。');
    await t.ask.confirm('剪掉最后一脚');
    bk.cutTails();
    await t.pause(600);

    await t.say('左筐那 3 条，剪掉 +1 之后，剩下的是 **+1+1+1、+1+2、+2+1**——这是三条走到**第 3 级**的路。');
    await t.say('右筐那 2 条，剪掉 +2 之后，剩下的是 **+1+1、+2**——这是两条走到**第 2 级**的路。');

    await t.say('可它们是**全部**吗？左筐剪完只有 3 条，会不会到第 3 级其实有第 4 条路，只是没出现在这儿？自己去找一下。');

    const box3 = t.canvas();
    box3.innerHTML = '<div class="small muted" style="margin-bottom:6px">这是一段 3 级的楼梯。去找第 4 条路。</div>';
    const st3 = FunAl.widgets.stairs(box3, { n: 3, controls: true, emptyHint: '走走看。' });
    const found3 = [];
    const chip3 = FunAl.widgets.routeChips(box3, []);
    const note3 = t.el('div', 'small muted', '找到 0 条');
    box3.appendChild(note3);
    const row3 = t.el('div', 'btn-row');
    const giveUp = t.el('button', 'btn', '找不到第 4 条了');
    row3.appendChild(giveUp);
    box3.appendChild(row3);
    st3.onStep((ev) => {
      if (!ev.done) return;
      const key = ev.path.join('');
      if (found3.some((f) => f.join('') === key)) t.wrong(`**${ev.path.map((k) => '+' + k).join(' ')}** 这条刚走过。`);
      else { found3.push(ev.path.slice()); chip3.add(ev.path.slice()); note3.textContent = `找到 ${found3.length} 条`; }
      setTimeout(() => st3.reset(), 600);
    });
    t.hints(['3 级楼梯，一次 1 级或 2 级。把能想到的都走一遍。', '试试 +1+1+1、+1+2、+2+1。还有第四种吗？']);
    await t.waitFor((resolve) => giveUp.addEventListener('click', () => {
      if (found3.length < 3) { t.wrong(`你才找到 ${found3.length} 条，还没找全呢。到第 3 级至少有 3 条。`); return; }
      giveUp.disabled = true; st3.enable(false); resolve(true);
    }));
    t.clearHints();
    t.learnerSays('找不到第 4 条');
    t.right('找不到，因为**真的只有 3 条**。左筐剪完剩下的那 3 条，就是到第 3 级的全部走法，一条不多一条不少。');

    await t.say('反过来也成立：随便拿一条到第 3 级的路，末尾接上 +1，它就变成一条到第 4 级、最后一脚是 +1 的路。**一对一，两边严丝合缝。**');

    t.note('你自己推出来的', '**到第 4 级的走法数 = 到第 3 级的走法数 + 到第 2 级的走法数**\n\n也就是 **5 = 3 + 2**。\n\n这不是我告诉你的公式，是你把 5 张卡片分了两堆、又剪掉最后一脚看出来的。');

    await t.ask.choice('顺手问一句：刚才我们按「最后一脚」分。那按「**第一脚**」分行不行？', [
      '也行，一样能分成不重不漏的两堆。',
      '不行，只有最后一脚能分。',
    ], {
      correct: 0,
      feedback: {
        1: '真的试一下：第一脚走 1 级的有 3 条，走 2 级的有 2 条。也是不重不漏。所以按第一脚分**确实也行**。别人告诉你「必须看最后一步」的时候，这句话其实说得太满了。',
      },
      explainRight: '对，按第一脚分**也是**不重不漏的。这里没有骗你。',
      hints: ['自己数一下：这 5 条里，第一脚走 1 级的有几条？走 2 级的有几条？'],
    });

    await t.say('那为什么大家都说「看最后一步」？关键不在分得干不干净，**在于剪掉之后剩下的是什么。**');
    await t.say('剪掉**最后**一脚，剩下的是「从地面走到第 3 级」——和原来那道题一模一样，只是数字变小了。你可以直接接着往下问。');
    await t.say('剪掉**第一**脚，剩下的是「从第 1 级走到第 4 级」。它不是原来那道题，你得先说服自己「这跟从地面走到第 3 级是一回事」。这段楼梯上确实是一回事，因为每级台阶都长得一样。');
    await t.say('但等一下你会遇到一段**每级价钱都不一样**的楼梯。到那时，「从第 1 级出发」和「从地面出发」就不再是同一道题了，按第一脚分当场散架。');

    t.note('真正的判据', '不是「必须看最后一步」，而是：\n\n**剪掉那一步之后，剩下的必须还是同一道题，只是数字更小。**\n\n看最后一步之所以好用，是因为它剪完剩下的永远是「从地面到第 k 级」，永远是原题本身。');

    t.aside('深入一点：那按「用了几个 2 级」来分呢？', '也能分干净：用 0 个 2 的有 1 条，用 1 个 2 的有 3 条，用 2 个 2 的有 1 条。1 + 3 + 1 = 5，没错。\n\n可是剪掉之后剩下什么？不是一道更小的同类题，而是一道全新的题（「用 1 个 2 走到第 4 级有几种」）。它没法接着往下拆，套娃断在这里。\n\n所以分法可以有很多种，能用的只有那些**剪完还剩同一道题**的分法。');

    await t.say('下一屏，你会用这条规律一路往上算——但先得填一个很多人会填错的格子。');
    t.done();
  },
});
