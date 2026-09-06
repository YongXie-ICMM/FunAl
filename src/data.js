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

  /* ---- problem 2: cheapest way up a toll staircase (6 stairs, ground is free) ---- */
  toll: {
    tolls: [0, 1, 8, 1, 1, 5, 6],          // tolls[i] = 踩上第 i 级要付的钱
    best: [0, 1, 8, 2, 3, 7, 9],           // best[i] = 到第 i 级最少花多少
    from: [null, 0, 0, 1, 3, 3, 4],        // from[i] = 最省时是从第几级来的（第 2 级是从地面一步跨 2 级上来的）
    bestPath: [0, 1, 3, 4, 6],             // 唯一的最省路线，共 9 元
    bestCost: 9,
    greedy: { path: [0, 1, 3, 4, 5, 6], cost: 14,
      trap: '在第 4 级时，第 5 级要 5 元、第 6 级要 6 元，挑了眼前便宜的 5 元，结果还得再付 6 元，一共 11 元；直接跳到第 6 级只要 6 元。' },
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

  /* ---- the counterexample: when one number per cell is not enough ---- */
  broken: {
    tolls: [0, 9, 1, 9, 1], penalty: 10, n: 4,
    rule: '连着走两次 2 级要罚 10 元',
    naiveTable: [0, 9, 1, 10, 2],          // 只记「我在第几级」算出来的表
    naiveClaim: 2,
    realBest: 11, realPath: [1, 1, 2],
    allRoutes: [                            // 到第 4 级的全部 5 条走法，含罚款
      { steps: [1, 1, 2], toll: 11, penalty: 0, total: 11 },
      { steps: [2, 1, 1], toll: 11, penalty: 0, total: 11 },
      { steps: [2, 2], toll: 2, penalty: 10, total: 12 },
      { steps: [1, 2, 1], toll: 19, penalty: 0, total: 19 },
      { steps: [1, 1, 1, 1], toll: 20, penalty: 0, total: 20 },
    ],
  },
};
