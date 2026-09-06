FunAl.register({
  id: 'smoke', title: '原语冒烟测试 3', goal: 'multi/order/match/recall', minutes: 1,
  async run(t) {
    t.html('<div class="title-card"><h1>原语冒烟测试 3</h1></div>');
    await t.ask.multi('最后一脚可能从哪几级踩上来？（可多选）', ['第 2 级', '第 3 级', '第 4 级'], {
      correct: [0, 1],
      feedback: (got) => got.includes(2) ? '第 4 级就是终点本身，不能从它踩到它。' : '还漏了一个来源。',
      explainRight: '对，只有这两个来源。',
      hints: ['一步只能走 1 级或 2 级。'],
    });
    await t.ask.order('把口诀排成正确顺序：', ['一、格子里写什么？', '二、最后一步有哪几种？', '三、起步格填几？'], {
      shuffled: [2, 0, 1],
      feedback: (idx, next) => `还不到这一句。第 ${next + 1} 句应该先回答的是更靠前的问题。`,
      explainRight: '顺序对了。',
    });
    await t.ask.match('把名字连到你做过的事：', [
      { term: '状态', did: '每个格子代表的那道小题', explain: '对，状态就是「我在算哪道小题」。' },
      { term: '转移', did: '一格是怎么由左边几格算出来的' },
      { term: '边界', did: '不用算就知道答案的那几格' },
    ], { rightOrder: [1, 2, 0] });
    const guess = t.recallOne({ kind: 'multi' });
    t.note('回头看', `你刚才多选题答的是「${guess.answer}」，一共记录了 ${t.recall().length} 次作答。`);
    t.done();
  },
});
