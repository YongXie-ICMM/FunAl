#!/usr/bin/env python3
"""Ground truth for every number the tutorial shows the learner.

    python3 tools/verify_answers.py

Recomputes each example from scratch and checks it against src/data.js, so a
typo in the course data fails loudly instead of teaching something wrong.
"""
import json
import re
import sys
from functools import lru_cache
from itertools import product
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "src" / "data.js"
INF = float("inf")
ok, bad = [], []


def check(name, got, want):
    (ok if got == want else bad).append(name)
    mark = "ok  " if got == want else "FAIL"
    print(f"  [{mark}] {name}")
    if got != want:
        print(f"         data.js: {got}\n         recomputed: {want}")


def load_data():
    """Read the JS object literal in src/data.js as JSON (comments and trailing commas stripped)."""
    src = DATA_JS.read_text(encoding="utf-8")
    body = src[src.index("FunAl.data = {") + len("FunAl.data = "):]
    body = body[: body.rindex("};") + 1]
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    body = re.sub(r"//.*?$", "", body, flags=re.M)
    body = re.sub(r"'([^'\\]*)'", lambda m: json.dumps(m.group(1), ensure_ascii=False), body)
    body = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:", r'\1"\2":', body)
    body = re.sub(r'(?<!")\b(\d+)"?\s*:', lambda m: f'"{m.group(1)}":', body)
    body = re.sub(r",(\s*[}\]])", r"\1", body)
    return json.loads(body)


# ---------- recomputation ----------
def ways_table(n):
    w = [1, 1]
    for i in range(2, n + 1):
        w.append(w[-1] + w[-2])
    return w[: n + 1]


def routes(n, steps=(1, 2)):
    if n == 0:
        return [[]]
    out = []
    for s in steps:
        if s <= n:
            out += [[s] + r for r in routes(n - s, steps)]
    return out


@lru_cache(None)
def naive_cards(n):
    return 1 if n <= 1 else 1 + naive_cards(n - 1) + naive_cards(n - 2)


@lru_cache(None)
def naive_clicks(n):
    return 0 if n <= 1 else 1 + naive_clicks(n - 1) + naive_clicks(n - 2)


def toll_dp(tolls):
    n = len(tolls) - 1
    dp, src = [0] * (n + 1), [None] * (n + 1)
    dp[1], src[1] = tolls[1], 0
    for i in range(2, n + 1):
        if dp[i - 1] <= dp[i - 2]:
            dp[i], src[i] = tolls[i] + dp[i - 1], i - 1
        else:
            dp[i], src[i] = tolls[i] + dp[i - 2], i - 2
    path, i = [n], n
    while src[i] is not None:
        i = src[i]
        path.append(i)
    return dp, src, list(reversed(path))


def toll_brute(tolls):
    n = len(tolls) - 1
    best, bp = INF, None
    for r in routes(n):
        pos, c, p = 0, 0, [0]
        for s in r:
            pos += s
            c += tolls[pos]
            p.append(pos)
        if c < best:
            best, bp = c, p
    return best, bp


def greedy_walk(tolls):
    n = len(tolls) - 1
    i, c, p = 0, 0, [0]
    while i < n:
        i = i + 1 if (i + 2 > n or tolls[i + 1] < tolls[i + 2]) else i + 2
        c += tolls[i]
        p.append(i)
    return c, p


def coin_dp(values, target):
    dp = [0] + [INF] * target
    src = [None] * (target + 1)
    for a in range(1, target + 1):
        for c in values:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a], src[a] = dp[a - c] + 1, a - c
    return dp, src


def broken_routes(tolls, penalty, n):
    out = []
    for r in routes(n):
        pos, base, pen, last = 0, 0, 0, None
        for s in r:
            pos += s
            base += tolls[pos]
            if s == 2 and last == 2:
                pen += penalty
            last = s
        out.append({"steps": r, "toll": base, "penalty": pen, "total": base + pen})
    return sorted(out, key=lambda d: (d["total"], d["steps"]))


def main():
    d = load_data()
    print("检查 src/data.js\n")

    print("1. 爬楼梯计数")
    w = d["ways"]
    check("走法表 ways.table", w["table"], ways_table(len(w["table"]) - 1))
    for k, n in (("routes4", 4), ("routes3", 3), ("routes2", 2)):
        got = sorted(map(tuple, w[k]))
        want = sorted(map(tuple, routes(n)))
        check(f"到第 {n} 级的全部走法 ways.{k}", got, want)
        check(f"  条数与走法表一致（{n}）", len(w[k]), w["table"][n])
    for n_s, v in w["naive"].items():
        n = int(n_s)
        check(f"没记性地拆到第 {n} 级：卡片数", v["cards"], naive_cards(n))
        check(f"没记性地拆到第 {n} 级：点开次数", v["clicks"], naive_clicks(n))
    for n_s, v in w["memoComputes"].items():
        check(f"有账本时真正算过的次数（第 {n_s} 级）", v, int(n_s) - 1)
    # the identity the slider relies on, checked across the whole table
    check("卡片张数 = 2 × 走法数 − 1（整张表）",
          [naive_cards(i) for i in range(len(w["table"]))],
          [2 * v - 1 for v in w["table"]])
    check("点开次数 = 走法数 − 1（整张表）",
          [naive_clicks(i) for i in range(len(w["table"]))],
          [v - 1 for v in w["table"]])

    print("\n2. 过路费楼梯")
    t = d["toll"]
    dp, src, path = toll_dp(t["tolls"])
    brute, brute_path = toll_brute(t["tolls"])
    check("每格最省 toll.best", t["best"], dp)
    check("来路 toll.from", t["from"], src)
    check("最省路线 toll.bestPath", t["bestPath"], path)
    check("最省花费 toll.bestCost", t["bestCost"], dp[-1])
    check("  填表结果 = 穷举结果", dp[-1], brute)
    g, gp = greedy_walk(t["tolls"])
    check("贪心花费 toll.greedy.cost", t["greedy"]["cost"], g)
    check("贪心路线 toll.greedy.path", t["greedy"]["path"], gp)
    check("  贪心必须比最省贵（否则陷阱不成立）", g > dp[-1], True)
    n = len(t["tolls"]) - 1
    all_best = [r for r in routes(n) if sum(t["tolls"][p] for p in
                [sum(r[: i + 1]) for i in range(len(r))]) == dp[-1]]
    check("  最省路线唯一（倒推时不会有两个答案）", len(all_best), 1)

    print("\n3. 硬币（迁移题）")
    c = d["coins"]
    cdp, csrc = coin_dp(c["values"], c["target"])
    check("每格最少枚数 coins.table", c["table"], cdp)
    check("来路 coins.from", c["from"], csrc)
    check("答案 coins.best", c["best"], cdp[c["target"]])
    check("  用的硬币加起来等于目标", sum(c["bestCoins"]), c["target"])
    check("  用的硬币枚数 = 答案", len(c["bestCoins"]), c["best"])
    greedy_n, a = 0, c["target"]
    for v in sorted(c["values"], reverse=True):
        while a >= v:
            a -= v
            greedy_n += 1
    check("先拿最大面值的枚数 coins.greedyBig.count", c["greedyBig"]["count"], greedy_n)
    check("  先拿最大面值必须更差（否则陷阱不成立）", greedy_n > c["best"], True)
    u = c["unreachable"]
    udp, _ = coin_dp(u["values"], u["target"] if u["target"] > 8 else 8)
    check("凑不出来的例子 coins.unreachable.table",
          u["table"], [None if x == INF else x for x in udp[: len(u["table"])]])
    check(f"  凑 {u['target']} 元确实凑不出", udp[u["target"]], INF)

    print("\n4. 反例：格子里只记一个数不够")
    b = d["broken"]
    rs = broken_routes(b["tolls"], b["penalty"], b["n"])
    naive = [0] * (b["n"] + 1)
    naive[1] = b["tolls"][1]
    for i in range(2, b["n"] + 1):
        naive[i] = b["tolls"][i] + min(naive[i - 1], naive[i - 2])
    check("只记级数算出的表 broken.naiveTable", b["naiveTable"], naive)
    check("表宣称的最省 broken.naiveClaim", b["naiveClaim"], naive[b["n"]])
    check("真实最省 broken.realBest", b["realBest"], rs[0]["total"])
    check("真实最省走法 broken.realPath", b["realPath"], rs[0]["steps"])
    check("全部走法 broken.allRoutes", b["allRoutes"], rs)
    check("  表算出的价钱必须低于任何真实走法（这才叫算错）", naive[b["n"]] < rs[0]["total"], True)
    check("  没有任何一条走法花得起表说的那个价", [r for r in rs if r["total"] == naive[b["n"]]], [])

    print(f"\n{len(ok)} 项通过，{len(bad)} 项失败。")
    if bad:
        print("失败项：" + "，".join(bad))
        sys.exit(1)
    print("src/data.js 与重新计算的结果完全一致。")


if __name__ == "__main__":
    main()
