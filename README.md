# FunAl · 动态规划，从一段楼梯开始

一个**循循善诱**的互动教程，教任何人理解动态规划（Dynamic Programming, DP）。
零基础可学：不背公式，先亲手做、亲手数、亲手算，再给你做过的事起名字。

- 单文件网页：下载 `index.html`，双击即可在浏览器打开，无需安装任何东西。
- 每一屏像一次面对面辅导：导师问一句，你动手答一句；答错有针对你那个错法的解释，卡住有三级提示。
- 可选的 AI 导师（Kimi）：用你自己的话提问，它只反问、只提示，不代替你思考。**没有它，课程也完整可用。**

<!-- COURSE_OUTLINE -->

## 直接学

1. 下载仓库里的 [`index.html`](index.html)（或整个仓库）。
2. 双击打开。进度会保存在浏览器里，下次打开接着学。

## 开启 AI 导师（可选）

AI 导师通过一个本机小服务调用 Kimi（Moonshot）API。**API 密钥只存在你的电脑上，不会进入网页，也不会进入这个仓库。**

```bash
cp .env.example .env        # 然后把 KIMI_API_KEY 换成你自己的密钥（.env 已被 .gitignore 忽略）
python3 mentor_server.py    # 打开 http://127.0.0.1:8765
```

- 只需要 Python 3.8+，不依赖第三方库。
- 也可以用环境变量 `KIMI_API_KEY`、`KIMI_BASE_URL`、`KIMI_MODEL`，或 `--env-file` 指定别处的配置文件。
- `python3 mentor_server.py --no-ai` 只提供网页、不接 AI。
- 导师的教学规则写在 [`mentor_prompt.md`](mentor_prompt.md)，可以自己改。

## 修改与打包

源码在 `src/`：`engine.js` 是对话式辅导引擎，`levels/` 里每个文件是一屏，`styles.css` 是样式。

```bash
python3 build.py            # 把 src/ 打包成单文件 index.html
```

`design/lesson_spec.md` 是逐屏教学脚本（学习目标、每句文案、每个错误答案的反馈、分级提示）。改课程先改脚本，再改对应的 level 文件。

## 许可

MIT。见 [LICENSE](LICENSE)。
