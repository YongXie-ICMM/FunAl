FunAl.register({
  id: 'smoke', title: '控件冒烟测试 2', goal: 'tree/buckets/notebook smoke', minutes: 1,
  async run(t) {
    t.html('<div class="title-card"><h1>控件冒烟测试 2</h1></div>');
    await t.say('分桶：把 5 条路线按最后一步分开。');
    const routes = [[1,1,1,1],[1,1,2],[1,2,1],[2,1,1],[2,2]];
    const bk = FunAl.widgets.buckets(t.canvas(), {
      cards: routes, buckets: ['最后一步 +1（从第 3 级来）', '最后一步 +2（从第 2 级来）'],
      format: (r) => r.map((k) => `+${k}`).join(' ').replace(/(\+\d)$/, '<span class="tail">$1</span>'),
      answer: (r) => (r[r.length - 1] === 1 ? 0 : 1),
      onWrong: () => t.wrong('这条路线的最后一个数字不是这个。'),
    });
    await t.waitFor((resolve) => { bk.el.dataset.k = 1; const o = bk; const orig = o; setTimeout(function chk(){ if (o.counts()[0] + o.counts()[1] === 5) resolve(true); else setTimeout(chk, 200); }, 200); });
    t.right(`分完了：${bk.counts()[0]} 条 + ${bk.counts()[1]} 条`);
    await t.say('递归树 + 账本：点开问题卡。');
    const side = t.canvas(); side.className += ' w-side';
    const treeBox = document.createElement('div');
    const bookBox = document.createElement('div');
    side.append(treeBox, bookBox);
    const book = FunAl.widgets.notebook(bookBox, { title: '账本', rows: [2,3,4,5,6] });
    const tr = FunAl.widgets.tree(treeBox, { root: 6, memo: true, book });
    await t.waitFor((resolve) => tr.on((ev) => { if (ev.kind === 'solved' && ev.n === 6) resolve(ev.value); }));
    t.note('结果', `根节点 = ${tr.value}；真正算过 ${tr.stats.computed} 次，抄账本 ${tr.stats.lookups} 次。`);
    t.done();
  },
});
