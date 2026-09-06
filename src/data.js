/* All numbers the course shows the learner. Verified by tools/verify_answers.py --
 * run that script after changing anything here. */
FunAl.data = {
  /* ---- problem 1: how many ways up, 1 or 2 stairs at a time ---- */
  ways: {
    table: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269],   // table[i] = 到第 i 级的走法数（i 从 0 到 30）
    routes4: [[1, 1, 1, 1], [2, 1, 1], [1, 2, 1], [1, 1, 2], [2, 2]],          // 全部 5 条
    routes3: [[1, 1, 1], [2, 1], [1, 2]],                                       // 全部 3 条
    routes2: [[1, 1], [2]],                                                     // 全部 2 条
    /* 没记性地拆：卡片张数永远是 2 × 走法数 − 1，点开次数是走法数 − 1。下面是抽查值。 */
    naive: { 4: { cards: 9, clicks: 4 }, 6: { cards: 25, clicks: 12 }, 8: { cards: 67, clicks: 33 },
             10: { cards: 177, clicks: 88 }, 20: { cards: 21891, clicks: 10945 }, 30: { cards: 2692537, clicks: 1346268 } },
    /* 有账本：真正算过的次数 = 不同的小问题个数，和点开顺序无关 */
    memoComputes: { 4: 3, 6: 5, 8: 7, 10: 9, 20: 19, 30: 29 },
  },

  /* ---- problem 2: cheapest way up a toll staircase (6 stairs, the ground is free) ----
   * Chosen so three different intuitions all fail:
   *   walking greedily (18), dodging the priciest stair (16), and the table (12).
   * The cheapest route has to step on the most expensive stair, and it is the only
   * route that costs 12. The answer avoids 5, 8, 13, 21 so it cannot be mistaken for
   * one of the counting answers. */
  toll: {
    tolls: [0, 1, 7, 8, 7, 1, 2],          // tolls[i] = 踩上第 i 级要付的钱
    pricey: 3,                             // 全场最贵的那一级
    best: [0, 1, 7, 9, 14, 10, 12],        // best[i] = 到第 i 级最少花多少
    from: [null, 0, 0, 1, 2, 3, 5],        // from[i] = 最省时是从第几级来的
    bestPath: [0, 1, 3, 5, 6],
    bestCost: 12,
    allCosts: [12, 16, 17, 17, 18, 18, 18, 19, 19, 24, 25, 25, 26],   // 全部 13 条路，从便宜到贵
    greedy: { path: [0, 1, 2, 4, 5, 6], cost: 18 },                   // 每步挑眼前便宜的
    dodge: { path: [0, 2, 4, 6], cost: 16 },                          // 躲开最贵的第 3 级
    /* the route the "swap the first half" argument uses */
    swap: { path: [0, 2, 4, 5, 6], cost: 17, headTo5: 15, bestHeadTo5: 10, tail: 2, after: 12 },
    /* a second set of prices where two sources tie, so backtracking has two answers */
    tie: { tolls: [0, 2, 3, 2, 3, 2, 1], best: [0, 2, 3, 4, 6, 6, 7], bestCost: 7,
           paths: [[0, 1, 3, 5, 6], [0, 2, 4, 6]] },
  },

  /* ---- problem 3 (transfer): fewest coins to make 6 with 1, 3, 4 ---- */
  coins: {
    values: [1, 3, 4], target: 6,
    table: [0, 1, 2, 1, 1, 2, 2],          // table[a] = 凑 a 元最少几枚
    from: [null, 0, 1, 0, 0, 4, 3],        // from[a] = 最省时的上一格
    bestCoins: [3, 3], best: 2,
    greedyBig: { coins: [4, 1, 1], count: 3 },   // 先拿最大面值会用 3 枚
    unreachable: { values: [3, 4], target: 5, table: [0, null, null, 1, 1, null, 2, 2, 2] },  // null = 凑不出
  },

  /* ---- the counterexample: when one number per cell is not enough ----
   * Same staircase, one added rule: a 3 fine for two 2-steps in a row.
   * A table that remembers only which stair you are on says 12, and no route
   * costs 12 - the cheapest really costs 15. Remembering one more thing (was my
   * last step a 2?) turns the single row of cells into two rows, and those give 15. */
  broken: {
    penalty: 3,
    rule: '连着走两次 2 级，罚 3 元',
    oldTableSays: 12,
    byOne: [null, 1, 8, 15, 16, 16, 15],   // 到第 k 级、且最后一步是走 1 级上来的，最少花多少
    byTwo: [null, null, 7, 9, 15, 13, 18], // 到第 k 级、且最后一步是跨 2 级上来的
    realBest: 15,
    realPath: [0, 1, 3, 5, 6],
    realSteps: [1, 2, 2, 1],
    realBreakdown: { toll: 12, penalty: 3 },
    /* every route to stair 6, with the fine included, cheapest first */
    allRoutes: [
      { steps: [1, 2, 2, 1], toll: 12, penalty: 3, total: 15 },
      { steps: [1, 1, 2, 1, 1], toll: 18, penalty: 0, total: 18 },
      { steps: [1, 2, 1, 2], toll: 18, penalty: 0, total: 18 },
      { steps: [2, 1, 2, 1], toll: 18, penalty: 0, total: 18 },
      { steps: [1, 1, 1, 2, 1], toll: 19, penalty: 0, total: 19 },
      { steps: [1, 2, 1, 1, 1], toll: 19, penalty: 0, total: 19 },
      { steps: [1, 1, 2, 2], toll: 17, penalty: 3, total: 20 },
      { steps: [2, 2, 1, 1], toll: 17, penalty: 3, total: 20 },
      { steps: [2, 2, 2], toll: 16, penalty: 6, total: 22 },
      { steps: [2, 1, 1, 2], toll: 24, penalty: 0, total: 24 },
      { steps: [1, 1, 1, 1, 2], toll: 25, penalty: 0, total: 25 },
      { steps: [2, 1, 1, 1, 1], toll: 25, penalty: 0, total: 25 },
      { steps: [1, 1, 1, 1, 1, 1], toll: 26, penalty: 0, total: 26 },
    ],
  },
};
