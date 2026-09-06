FunAl.register({
  id: 'hook',
  title: '先押一个数',
  goal: '让学习者知道这门课要干什么，并留下一个属于自己的猜测，供后面对账。',
  minutes: 2,
  async run(t) {
    t.html(`<div class="title-card">
      <h1>动态规划，从一段楼梯开始</h1>
      <p class="sub">不背公式。你会亲手算出每一个数字，最后再给你做过的事起名字。</p>
    </div>`);

    await t.say('手机地图算最快路线、输入法猜你下一个字、拼写检查把「recieve」改成「receive」——这些背后是同一个动作。');
    await t.say('这个动作有个名字，叫**动态规划**。名字听着吓人，其实你今天就能自己把它做出来。');
    await t.say('先看一段楼梯。规则只有一条：**每次只能上 1 级或者 2 级。**');

    const box = t.canvas();
    const st = FunAl.widgets.stairs(box, { n: 6, controls: true, emptyHint: '试着走上去，随便走。' });
    let reached = false;
    t.hints(['随便点「走 1 级」或者「走 2 级」，走到第 6 级就行。', '怎么走都可以，这一步没有对错。']);
    await t.waitFor((resolve) => st.onStep((ev) => { if (ev.done && !reached) { reached = true; resolve(ev); } }));
    t.clearHints();
    st.enable(false);
    t.learnerSays('走上去了：' + st.path.map((k) => '+' + k).join(' '));

    await t.say('好。你刚才走的只是**其中一种**走法。');
    await t.say('现在换个问题，这才是今天要解决的：\n\n**从地面走到第 6 级，一共有多少种不同的走法？**');

    await t.ask.number('先押一个数。随便猜，猜错完全没关系——课程最后会拿你现在这个猜测来对账。', {
      answer: null,
      placeholder: '你猜几种？',
      unit: ' 种',
      button: '押上',
      min: 1,
    });
    const bet = t.recallOne({ kind: 'number' });

    await t.say(`记下了：**${bet.answer} 种**。`);
    await t.say('接下来我不会告诉你答案。我们从一段更矮的楼梯开始，你自己数出来。');

    t.done();
  },
});
