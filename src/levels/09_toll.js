FunAl.register({
  id: 'toll',
  title: '换一道题：过路费',
  goal: '让学习者在同一段楼梯上亲手试路，撞上两个直觉陷阱，发现「凭感觉走」和「躲开最贵的」都不可靠。',
  minutes: 3,
  async run(t) {
    const D = FunAl.data.toll;
    const tolls = D.tolls;

    await t.say('还是这段 6 级楼梯，还是一次只能上 1 级或 2 级。');
    await t.say('但这次每级台阶上贴了**过路费**：踩上去就要付那一级的钱。**跳过去的那级不用付。** 地面免费。');
    await t.say('问题也换了：不是「有几种走法」，而是——\n\n**走到第 6 级，最少要花多少钱？**');

    const box = t.canvas();
    const st = FunAl.widgets.stairs(box, {
      n: 6, tolls, hot: [D.pricey], controls: true, showCost: true,
      emptyHint: '走走看。每次走完会记下你花了多少。',
    });

    await t.ask.number('先押一个数：你觉得最少要多少钱？', {
      answer: null, unit: ' 元', button: '押上', placeholder: '你猜几元？',
    });

    await t.say('现在自己去试。走几条不同的路，看看能压到多低。');

    const logBox = t.canvas();
    logBox.innerHTML = '<div class="small muted" style="margin-bottom:8px">你试过的路线</div>';
    const tried = [];
    const chips = FunAl.widgets.routeChips(logBox, [], { format: (x) => x });
    const bestLine = t.el('div', '', '');
    logBox.appendChild(bestLine);
    let best = Infinity, bestRoute = null;
    const claimRow = t.el('div', 'btn-row');
    const claimBtn = t.el('button', 'btn primary', '我找到最省的了');
    claimRow.appendChild(claimBtn);
    logBox.appendChild(claimRow);

    st.onStep((ev) => {
      if (!ev.done) return;
      const key = ev.visited.join('-');
      if (!tried.includes(key)) {
        tried.push(key);
        const isBest = ev.cost < best;
        chips.add(`${ev.visited.join('→')}　${ev.cost} 元`, isBest ? 'gold' : '');
        if (isBest) { best = ev.cost; bestRoute = ev.visited.slice(); }
        bestLine.innerHTML = `<div class="small" style="margin-top:8px">试过 <strong>${tried.length}</strong> 条 · 目前最低 <strong style="color:var(--warn)">${best} 元</strong></div>`;
      }
      setTimeout(() => st.reset(), 800);
    });

    t.hints([
      '一共只有 13 条路，多试几条。',
      '试试「每一步都挑眼前便宜的那级」，看看花多少。',
      '再试试「绕开那个最贵的台阶」，看看是不是更便宜。',
    ]);
    await t.waitFor((resolve) => claimBtn.addEventListener('click', () => {
      if (tried.length < 3) { t.wrong(`你才试了 ${tried.length} 条。多试几条再说——一共有 13 条路。`); return; }
      claimBtn.disabled = true; st.enable(false); resolve(true);
    }));
    t.clearHints();
    t.learnerSays(`我试了 ${tried.length} 条，最低 ${best} 元`);

    if (best === D.bestCost) {
      t.right(`${best} 元——你确实试出了最省的那条。`);
      await t.ask.choice('那再问一句：**你怎么知道没有更省的？**', [
        '不知道。我只是没试到更省的，这不等于没有。',
        '知道，我试的那几条里它最省。',
      ], {
        correct: 0,
        feedback: { 1: `你试了 ${tried.length} 条，一共有 13 条。剩下那些你没看过——万一里面有更便宜的呢？「我找到的里面最省」和「所有路里最省」是两回事。` },
        explainRight: '对。**试出来不等于证明。** 6 级楼梯还能一条条试完，30 级就有一百多万条。这一屏最后会给你一个不用试的办法。',
      });
    } else {
      await t.say(`你的最低是 **${best} 元**。`);
    }

    await t.say('先看两个很多人会用的办法。它们听起来都挺有道理，但都不对。');

    t.note('办法一：每一步都挑眼前便宜的那级', `站在地面：第 1 级 ${tolls[1]} 元，第 2 级 ${tolls[2]} 元 → 去第 1 级。\n\n一路这样挑下去，走出来的是 **${D.greedy.path.join('→')}**，一共 **${D.greedy.cost} 元**。`);

    await t.ask.choice(`这个办法为什么会吃亏？`, [
      `因为「眼前便宜」不代表「往后也便宜」。挑了便宜的那级，可能被它带进更贵的后半段。`,
      `因为它算错了，重新算一遍就对了。`,
    ], {
      correct: 0,
      feedback: { 1: `它没算错，${D.greedy.path.join('→')} 确实是 ${D.greedy.cost} 元。问题是这条路本身就不是最省的。` },
      explainRight: '对。**只看下一步，看不到后面。**',
      hints: ['把它走出来的路线，跟你自己试出来的最好那条比一比。'],
    });

    t.note('办法二：躲开最贵的那级', `全场最贵的是第 ${D.pricey} 级，${tolls[D.pricey]} 元。躲开它最好的走法是 **${D.dodge.path.join('→')}**，一共 **${D.dodge.cost} 元**。\n\n比办法一好，但还是不够省。`);

    await t.say('揭晓。');
    st.clearMarks();
    st.showPath(D.bestPath.slice(1).map((v, i, arr) => v - (i === 0 ? D.bestPath[0] : arr[i - 1])));
    D.bestPath.forEach((i) => st.mark(i, 'gold'));
    await t.pause(700);

    await t.say(`最省的是 **${D.bestPath.join('→')}**，一共 **${D.bestCost} 元**。而且它是 13 条路里**唯一**花 ${D.bestCost} 元的。`);

    await t.ask.choice(`注意看这条最省路线。它踩上了第 ${D.pricey} 级——那个 **${tolls[D.pricey]} 元**的、全场最贵的台阶。这说明什么？`, [
      `说明「躲开贵的」这个直觉也靠不住。有时候非得踩那一脚，因为躲开它要绕更远的路。`,
      `说明这道题设计得不合理。`,
    ], {
      correct: 0,
      feedback: { 1: `价签就是题目给的条件，没有不合理。是**我们的直觉**不可靠：躲开第 ${D.pricey} 级最好也要 ${D.dodge.cost} 元，比踩上去的 ${D.bestCost} 元还贵 ${D.dodge.cost - D.bestCost} 元。` },
      explainRight: `对。躲开它最好 ${D.dodge.cost} 元，踩上去反而只要 ${D.bestCost} 元。**眼睛看着最刺眼的那个数字做决定，一样会错。**`,
      hints: [`比一比：躲开第 ${D.pricey} 级最好 ${D.dodge.cost} 元，最省的那条踩上去只要 ${D.bestCost} 元。`],
    });

    const guess = t.recallOne({ screen: 'toll', kind: 'number' });
    if (guess) await t.say(`（你开场押的是 ${guess.answer} 元。）`);

    await t.say(`两个直觉都被打掉了。6 级楼梯还能一条条试，可要是 30 级——**${FunAl.data.ways.table[30].toLocaleString('en-US')} 条路**，试是试不完的。`);
    await t.say('那就别试了，用你已经会的那套办法：**只看最后一步。**');
    t.done();
  },
});
