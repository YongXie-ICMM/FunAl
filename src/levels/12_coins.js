FunAl.register({
  id: 'coins',
  title: '一道新题：凑硬币',
  goal: '学习者用四问清单独立解一道和楼梯毫无关系的题，并处理「凑不出来」的格子。',
  minutes: 5,
  async run(t) {
    const C = FunAl.data.coins;
    const U = C.unreachable;

    await t.say('楼梯没了。这道题跟台阶、跟走路，一点关系都没有。');
    t.note('题目', `你有 **${C.values.join(' 元、')} 元**三种硬币，每种要多少有多少。\n\n要**正好**凑出 **${C.target} 元**。\n\n**最少用几枚？**`);

    await t.ask.number('先押一个数。', { answer: null, unit: ' 枚', button: '押上', placeholder: '你猜几枚？' });

    await t.say('先随手凑凑看，找找感觉。');

    const trayBox = t.canvas();
    trayBox.innerHTML = '<div class="small muted" style="margin-bottom:10px">点硬币放进钱袋</div>';
    const btnRow = t.el('div', 'btn-row');
    C.values.forEach((v) => {
      const b = t.el('button', 'btn', `${v} 元`);
      b.addEventListener('click', () => add(v));
      btnRow.appendChild(b);
    });
    const clear = t.el('button', 'btn', '倒出来重凑');
    btnRow.appendChild(clear);
    trayBox.appendChild(btnRow);
    const purse = t.el('div', '', '');
    trayBox.appendChild(purse);
    const recBox = t.el('div', 'small muted', '');
    trayBox.appendChild(recBox);

    let coins = [], bestN = Infinity, bestSet = null;
    const found = [];
    function render() {
      const sum = coins.reduce((a, b) => a + b, 0);
      purse.innerHTML = `<div style="margin:10px 0;font-size:1.05rem">钱袋：${coins.length ? coins.map((c) => `<span class="w-chip" style="display:inline-block;margin:2px">${c} 元</span>`).join('') : '<span class="muted">空的</span>'}
        <div style="margin-top:6px">一共 <strong style="color:${sum === C.target ? 'var(--ok)' : 'var(--ink)'}">${sum}</strong> 元 · <strong>${coins.length}</strong> 枚</div></div>`;
      recBox.innerHTML = found.length
        ? `凑成 ${C.target} 元的组合你找到了 ${found.length} 种，最少的一种用了 <strong>${bestN}</strong> 枚（${bestSet.join('+')}）`
        : '';
    }
    function add(v) {
      const sum = coins.reduce((a, b) => a + b, 0);
      if (sum + v > C.target) { t.wrong(`放进去就超过 ${C.target} 元了（${sum} + ${v} = ${sum + v}）。题目要求**正好**凑够，不能多。`); return; }
      coins.push(v);
      const ns = coins.reduce((a, b) => a + b, 0);
      render();
      if (ns === C.target) {
        const key = coins.slice().sort().join('+');
        if (!found.includes(key)) {
          found.push(key);
          if (coins.length < bestN) { bestN = coins.length; bestSet = coins.slice().sort((a, b) => b - a); }
        }
        render();
        setTimeout(() => { coins = []; render(); }, 1400);
      }
    }
    clear.addEventListener('click', () => { coins = []; render(); });
    render();

    const goRow = t.el('div', 'btn-row');
    const goBtn = t.el('button', 'btn primary', '凑够了，往下走');
    goRow.appendChild(goBtn);
    trayBox.appendChild(goRow);
    t.hints(['先试试老实办法：先拿最大的 4 元，剩下 2 元怎么办？', '再试试完全不用 4 元的凑法。']);
    await t.waitFor((resolve) => goBtn.addEventListener('click', () => {
      if (!found.length) { t.wrong(`先至少凑成一次 ${C.target} 元再往下走。`); return; }
      goBtn.disabled = true; resolve(true);
    }));
    t.clearHints();
    t.learnerSays(`我找到 ${found.length} 种凑法，最少 ${bestN} 枚`);

    t.note('先看一个很自然、但会吃亏的办法', `**先拿最大面值的**：${C.greedyBig.coins.join(' + ')} = ${C.target} 元，用了 **${C.greedyBig.count} 枚**。\n\n可正确答案是 **${C.best} 枚**（${C.bestCoins.join(' + ')}）。**先拿大的又输了一次。**`);

    await t.say('好，正经做。**四个问题，你自己来答。** 你在楼梯上已经答过一遍了。');

    await t.ask.choice('**第一问：一格代表什么？**', [
      `每个**金额**一格：0 元、1 元、2 元……${C.target} 元。格子里写「凑这个金额最少要几枚」。`,
      `每种**硬币**一格：1 元一格、3 元一格、4 元一格。格子里写「这种硬币用几枚」。`,
      `每**枚**硬币一格：第 1 枚、第 2 枚……格子里写「这一枚是几元」。`,
    ], {
      correct: 0,
      feedback: {
        1: '只有三格的话，你没法「从小往大填」——3 元那格和 4 元那格谁在前谁在后？而且它也不是一道「更小的同类题」。\n\n格子的编号要能**从小排到大**，而且每一格都得是**同一道题的更小版本**。',
        2: '「第 1 枚是几元」不是一道能独立回答的题——它取决于后面几枚怎么配。而且你事先根本不知道要几枚。',
      },
      explainRight: `对。**每个金额一格**，格子里写「凑这个金额最少几枚」。\n\n这跟楼梯题一模一样：楼梯是「走到第 k 级」，这里是「凑到 k 元」。`,
      hints: [
        '想想楼梯题里，格子的编号是什么？（第几级）那这道题里，什么东西可以从小排到大？',
        '把题目念一遍：「凑出 6 元最少几枚」。把 6 换成一个更小的数，还是同一道题吗？',
      ],
    });

    await t.ask.multi(`**第二问：最后放进钱袋的那一枚，可能是几元？**（可多选）`, ['1 元', '3 元', '4 元', '6 元'], {
      correct: [0, 1, 2],
      feedback: (got) => {
        if (got.includes(3)) return '你没有 6 元的硬币。只有 1、3、4 元三种。';
        return `三种硬币都可能是最后放的那一枚。你少选了 ${3 - got.filter((g) => g < 3).length} 个。`;
      },
      explainRight: '对，三种都有可能。**楼梯题的最后一脚有 2 种，这道题的最后一枚有 3 种。** 这就是唯一的区别。',
      hints: ['你手上有几种硬币？每一种都有可能是最后放进去的那一枚吗？'],
    });

    await t.ask.choice(`那最后一枚如果是 3 元，剩下的是一道什么题？`, [
      `凑 ${C.target - 3} 元最少几枚——同一道题，数字更小。`,
      `凑 3 元最少几枚。`,
      `一道全新的题，跟原来没关系。`,
    ], {
      correct: 0,
      feedback: {
        1: '3 元是你**放进去**的那一枚，不是剩下要凑的。总共 6 元，放了 3 元，还差多少？',
        2: `「凑 ${C.target - 3} 元最少几枚」和「凑 ${C.target} 元最少几枚」是同一句话，只是数字变小了。这正是我们要的。`,
      },
      explainRight: `对。**剪掉最后一枚，剩下的还是同一道题，只是金额更小。** 判据满足，这套办法能用。`,
      hints: [`总共要凑 ${C.target} 元，最后一枚放了 3 元，前面已经凑了多少？`],
    });

    await t.ask.choice('**第三问：三个来源怎么合起来？**', [
      '在三个来源里**挑最小的**，再 **+1 枚**（最后那一枚自己也算一枚）。',
      '把三个来源**加起来**，再 +1 枚。',
      '在三个来源里挑最小的就行，不用 +1。',
    ], {
      correct: 0,
      feedback: {
        1: '三个来源是**三种不同的凑法**各自要几枚。你只会用其中一种，不会三种一起用。',
        2: `最后那一枚硬币，它自己也要占一枚。就像楼梯题里踩上那一级要付过路费一样——**最后一步自己的代价不能漏。**`,
      },
      explainRight: '对：**挑小的(三个来源) + 1 枚。**',
      hints: ['问自己：这三个数是三条不同的路，还是同一条路的三段？', '最后那一枚硬币，算不算一枚？'],
    });

    await t.ask.number('**第四问：起步格。凑 0 元，最少要几枚？**', {
      answer: 0,
      unit: ' 枚',
      feedback: (v) => v === 1
        ? '一枚都不用放，就已经凑够 0 元了。（楼梯题里地面是 1，因为那里数的是「走法」，「一步不走」也算一种。这里数的是「枚数」，一枚不放就是 0 枚。）'
        : `格子里写的是「要用几枚硬币」。要凑 0 元，你需要放几枚进去？`,
      hints: ['把题目念一遍：凑 0 元最少要几枚硬币？', '一枚都不放，钱袋里就是 0 元。'],
    });
    t.right('**0 枚。** 起步格又变了——因为格子里写的东西又变了。办法没变。');

    await t.say('四问答完，表自己就长出来了。填吧。');

    const box = t.canvas();
    const row = FunAl.widgets.cells(box, {
      n: C.target,
      label: (i) => `凑 ${i} 元`,
      values: { 0: 0 },
      title: '凑这个金额，最少几枚',
    });

    for (let a = 1; a <= C.target; a++) {
      const preds = C.values.map((v) => a - v);
      const valid = preds.filter((x) => x >= 0);
      row.links(a, valid, valid.map((x) => `−${a - x}`));
      const outOfRange = preds.filter((x) => x < 0);
      if (outOfRange.length) row.setSub(a, `${outOfRange.length} 条来路越界`);
      const opts = valid.map((x) => C.table[x]);
      t.hints([
        valid.length < C.values.length
          ? `注意：凑 ${a} 元时，有 ${C.values.length - valid.length} 种硬币比 ${a} 元还大，放不进去。只看剩下的 ${valid.length} 条来路。`
          : `三条来路：凑 ${valid.join(' 元、')} 元这几格。`,
        `它们分别是 ${opts.join('、')} 枚。挑最小的，再 +1。`,
      ]);
      await row.fill(a, {
        answer: C.table[a],
        onWrong: (v) => {
          const mn = Math.min(...opts);
          if (v === mn) t.wrong(`挑对了最小的（${mn} 枚），但漏了最后那一枚硬币自己。别忘了 +1。`);
          else if (v === opts.reduce((x, y) => x + y, 0) + 1) t.wrong('你把几个来源加起来了。它们是几种不同的凑法，你只用一种。');
          else if (v === Math.max(...opts) + 1) t.wrong(`你挑的是最大的那个。题目问**最少**几枚。`);
          else if (valid.length < C.values.length && v === C.table[a - C.values[C.values.length - 1]] + 1) t.wrong(`那一格越界了：凑 ${a} 元的时候，放不下一枚 ${C.values[C.values.length - 1]} 元的硬币。`);
          else t.wrong(`不对。来路是 ${valid.map((x) => `凑 ${x} 元（${C.table[x]} 枚）`).join('、')}。挑最小的，再 +1。`);
        },
        onRight: () => { row.markLink(C.from[a], 'pick'); },
      });
      t.clearHints();
      await t.pause(700);
      row.clearLinks();
    }

    const bet = t.recallOne({ screen: 'coins', kind: 'number' });
    t.right(`**凑 ${C.target} 元，最少 ${C.best} 枚。**${bet ? `（你开场押的是 ${bet.answer} 枚。）` : ''}`);
    await t.say(`倒着找回来：第 ${C.target} 格是从「凑 ${C.from[C.target]} 元」那格来的，所以最后一枚是 ${C.target - C.from[C.target]} 元。再往回，凑 ${C.from[C.target]} 元又是从「凑 0 元」来的，那一枚也是 ${C.from[C.target]} 元。\n\n所以是 **${C.bestCoins.join(' + ')}**。`);

    t.note('你刚才做了什么', `一道跟楼梯毫无关系的题，你用**同一套四问**做完了：\n\n**一格代表什么** → 每个金额一格\n**最后一步有哪几种** → 最后一枚是 1、3 还是 4 元\n**怎么合并** → 挑小的，再 +1\n**起步格填几** → 凑 0 元 = 0 枚`);

    await t.say('还有一个坑，遇到就会卡住，先给你踩一次。');
    t.note('如果凑不出来呢', `换一套硬币：**只有 ${U.values.join(' 元和 ')} 元**，没有 1 元了。\n\n那「凑 ${U.target} 元」怎么办？${U.target} − ${U.values[0]} = ${U.target - U.values[0]} 元凑不出，${U.target} − ${U.values[1]} = ${U.target - U.values[1]} 元也凑不出。**三条来路全军覆没。**`);

    await t.ask.choice(`那「凑 ${U.target} 元」那一格该填什么？`, [
      '填一个大到永远不会被挑中的数，表示「这一格根本凑不出来」。',
      '填 0。反正凑不出来，就当没有。',
      `填 ${U.target}。凑不出来就按最坏情况算。`,
    ], {
      correct: 0,
      feedback: {
        1: `填 0 会出事。往后算「凑 8 元」的时候，它会看到「凑 ${U.target} 元只要 0 枚」，于是以为 8 = ${U.target} + 3 只用 **1 枚**就够了。可 ${U.target} 元根本凑不出来，这条路是假的。**0 是个会骗人的数。**`,
        2: `${U.target} 也是个具体的数字，后面的格子照样会拿它去比大小，还是会算出假答案。你要的是一个**永远比不过任何真实答案**的东西。`,
      },
      explainRight: `对。写代码时通常填一个很大的数（比如 999999，或者「无穷大」）。它大到**永远不会在「挑小的」时候胜出**，于是不会污染后面的格子。\n\n最后如果目标那一格还是那个大数，就说明**真的凑不出来**。`,
      hints: [
        `试试填 0，然后自己算一下「凑 8 元」会得出什么。（真实答案是 2 枚：4 + 4。）`,
        '你要的是一个数，它大到在「挑小的」时候永远输。',
      ],
    });

    t.note(`这套硬币的完整表`, `**${U.values.join(' 元和 ')} 元**：\n\n${U.table.map((v, i) => `凑 ${i} 元 = ${v === null ? '**凑不出**' : v + ' 枚'}`).join('　·　')}\n\n注意 **凑 ${U.target} 元凑不出**，可 **凑 6 元只要 2 枚**（3 + 3）。凑不出的格子不会拖累它后面的格子。`);

    await t.say('最后一屏：把你带得走的东西收一收。');
    t.done();
  },
});
