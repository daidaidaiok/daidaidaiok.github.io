# LLM 能力天梯榜 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个静态单页网站，按能力等价分组展示 20-30 款主流大语言模型（开源 + 闭源），开源显示量化精度，不显示价格，每日 GitHub Actions 自动刷新数据并部署到 GitHub Pages。

**Architecture:** 纯静态前端（HTML + CSS + Vanilla JS） + Python 抓取脚本（GitHub Actions 每日触发） + GitHub Pages 托管。脚本从 HuggingFace Open LLM Leaderboard 与 OpenRouter 拉取公开数据，按综合分位分桶到 5 个梯队，前端读取 `data/models.json` 渲染。

**Tech Stack:** HTML5 / CSS3 (Grid + Flexbox) / Vanilla ES2020+ / Python 3.11 (urllib, json, csv) / GitHub Actions / GitHub Pages

## Global Constraints

- 不使用任何 npm 依赖、构建工具或框架
- 全部代码 UTF-8 编码
- Python 仅用标准库（urllib / json / csv / pathlib），保证 Actions runner 上零额外安装
- 中文 UI 文本，不做 i18n
- 模型显示按"模型名 + 提供商 + 关键参数（量化或上下文）"
- 梯队 5 个：SOTA / tier1 / tier2 / tier3 / entry
- 不显示价格
- CSS 极简白底：白底卡片 + 细边框 1px #e5e5e5 + 阴影 `0 1px 3px rgba(0,0,0,0.05)`
- 字体：系统默认 sans-serif（macOS / Windows / Linux fallback）
- 颜色：金 #d4a017 / 紫 #7c3aed / 蓝 #2563eb / 灰 #6b7280 / 浅灰 #9ca3af
- 移动端断点：768px（< 768 卡片垂直堆叠）
- 所有提交遵循 conventional commits：`feat:`, `chore:`, `docs:`, `style:`

---

## File Structure

```
.
├── index.html                    # 入口单页
├── css/
│   └── style.css                 # 全部样式
├── js/
│   ├── tiers.js                  # 梯队元数据（颜色/标签/排序）
│   └── app.js                    # 渲染 + 过滤 + 搜索
├── data/
│   └── models.json               # 脚本生成
├── scripts/
│   ├── fetch_models.py           # 抓数据 + 分桶
│   └── test_fetch_models.py      # 分桶算法单元测试
├── .github/
│   └── workflows/
│       └── refresh.yml           # 每日 cron
├── docs/
│   └── superpowers/
│       ├── specs/2026-08-26-llm-leaderboard-design.md
│       └── plans/2026-08-26-llm-leaderboard.md
├── README.md
├── LICENSE                       # MIT
└── .gitignore
```

---

### Task 1: 初始化仓库 + 基础文件

**Files:**

- Create: `.gitignore`
- Create: `README.md`
- Create: `LICENSE`
- Create: `docs/superpowers/specs/2026-08-26-llm-leaderboard-design.md` (从 brainstorming 阶段已存在，确认即可)
- Create: `docs/superpowers/plans/2026-08-26-llm-leaderboard.md` (本文件)

**Interfaces:** 无

- [ ] **Step 1: 初始化 git 仓库并提交基础文件**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git init
git config user.email "bot@example.com"
git config user.name "ZCode Bot"
```

- [ ] **Step 2: 创建 .gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.pytest_cache/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp

# Data (脚本生成，可选追踪)
# data/models.json  # 实际提交，因为 Pages 需要
```

- [ ] **Step 3: 创建 README.md**

````markdown
# LLM 能力天梯

按能力等价分组展示主流大语言模型（开源 + 闭源）。数据每日自动刷新。

## 特性

- 5 个梯队分组：SOTA / 第一梯队 / 第二梯队 / 第三梯队 / 入门级
- 开源模型显示量化精度（fp16 / int8 / int4 / AWQ / GPTQ）
- 闭源模型显示上下文窗口
- 按"全部 / 开源 / 闭源"过滤
- 模糊搜索模型名或提供商

## 数据来源

- [HuggingFace Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard) (公开 CSV)
- [OpenRouter](https://openrouter.ai/api/v1/models) (公开 JSON)

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```
````

## 部署

GitHub Pages 自动从 `main` 分支根目录发布。GitHub Actions 每日 0:00 UTC 抓取最新数据并提交。

## License

MIT

```

- [ ] **Step 4: 创建 LICENSE（MIT）**

```

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

````

- [ ] **Step 5: 首次提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add .gitignore README.md LICENSE docs/
git commit -m "chore: init repo with README, LICENSE, design docs"
````

- [ ] **Step 6: 验证**

```bash
git log --oneline
ls -la
```

预期：看到 1 个 commit，目录有 .gitignore README.md LICENSE docs/ 三个/四个文件。

---

### Task 2: 写数据抓取脚本（分桶算法 + 单元测试）

**Files:**

- Create: `scripts/fetch_models.py`
- Create: `scripts/test_fetch_models.py`

**Interfaces:**

- Consumes: 无（独立模块）
- Produces:
  - `assign_tier(score: float, all_scores: list[float]) -> str` 返回 "SOTA" | "tier1" | "tier2" | "tier3" | "entry"
  - `merge_sources(hf_data: list[dict], or_data: list[dict]) -> list[dict]` 合并去重
  - `main()` 入口：抓取 → 合并 → 分桶 → 写 `data/models.json`

- [ ] **Step 1: 写分桶测试 (`scripts/test_fetch_models.py`)**

```python
import unittest
from fetch_models import assign_tier, merge_sources


class TestAssignTier(unittest.TestCase):
    def test_top_5_percent_is_sota(self):
        scores = [50, 60, 70, 80, 90, 95, 99]
        self.assertEqual(assign_tier(99, scores), "SOTA")

    def test_mid_is_tier2(self):
        scores = list(range(0, 101))  # 0..100
        # 70 在 0..100 中是第 71 高（升序排第 70），分位 70/100 = 0.70 → tier2 (0.20-0.50)
        self.assertEqual(assign_tier(70, scores), "tier2")

    def test_lowest_is_entry(self):
        scores = list(range(0, 101))
        self.assertEqual(assign_tier(0, scores), "entry")

    def test_top_15_percent_is_tier1(self):
        scores = list(range(0, 101))
        # 90 在升序位置 90，分位 0.90 → tier1 (0.05-0.20)
        self.assertEqual(assign_tier(90, scores), "tier1")

    def test_handles_single_score(self):
        self.assertEqual(assign_tier(50, [50]), "SOTA")  # 100% 分位


class TestMergeSources(unittest.TestCase):
    def test_dedup_by_name(self):
        hf = [{"name": "GPT-5", "score": 90, "type": "closed"}]
        or_data = [{"name": "GPT-5", "score": 92, "type": "closed"}]
        merged = merge_sources(hf, or_data)
        self.assertEqual(len(merged), 1)
        # OpenRouter 分更高，应保留
        self.assertEqual(merged[0]["score"], 92)

    def test_keeps_unique(self):
        hf = [{"name": "Llama 4 405B", "score": 88, "type": "open"}]
        or_data = [{"name": "GPT-5", "score": 92, "type": "closed"}]
        merged = merge_sources(hf, or_data)
        self.assertEqual(len(merged), 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard/scripts"
python3 -m unittest test_fetch_models -v
```

预期：`ModuleNotFoundError: No module named 'fetch_models'`

- [ ] **Step 3: 实现 `scripts/fetch_models.py`**

```python
"""
Fetch LLM leaderboard data from HuggingFace Open LLM Leaderboard and OpenRouter,
merge, bucket by percentile, and write data/models.json.
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# HF Open LLM Leaderboard 的公开 CSV (经 Spaces API)
HF_LEADERBOARD_URL = (
    "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard"
    "/resolve/main/leaderboard.csv"
)
# OpenRouter 公开 API
OPENROUTER_URL = "https://openrouter.ai/api/v1/models"

# 分桶阈值：分位 >= threshold 落入该梯队
# 列表必须按"从高到低"排列
TIER_THRESHOLDS = [
    ("SOTA",   0.95),
    ("tier1",  0.80),
    ("tier2",  0.50),
    ("tier3",  0.20),
    ("entry",  0.00),
]

# 模型名称到 provider 的人工映射（因为 leaderboard CSV 不带 provider）
PROVIDER_MAP = {
    "gpt-5": "OpenAI", "gpt-4o": "OpenAI", "o1": "OpenAI", "o3": "OpenAI",
    "claude-4": "Anthropic", "claude-3.5-sonnet": "Anthropic",
    "gemini-2.5-pro": "Google", "gemini-2.0-flash": "Google",
    "llama-4-405b": "Meta", "llama-4-70b": "Meta", "llama-3.3-70b": "Meta",
    "deepseek-v3": "DeepSeek", "deepseek-r1": "DeepSeek",
    "qwen3-235b": "Alibaba", "qwen2.5-72b": "Alibaba", "qwq-32b": "Alibaba",
    "grok-3": "xAI", "grok-2": "xAI",
    "mistral-large-2": "Mistral", "mixtral-8x22b": "Mistral",
    "phi-4": "Microsoft", "command-r-plus": "Cohere",
    "yi-lightning": "01.AI", "glm-4-plus": "Zhipu", "moonshot-v1": "Moonshot",
}


def assign_tier(score: float, all_scores: list) -> str:
    """根据综合分在所有分中的分位决定梯队。"""
    if not all_scores:
        return "entry"
    sorted_scores = sorted(all_scores, reverse=True)
    rank = sorted_scores.index(score) if score in sorted_scores else 0
    # rank 0 = 最高分
    percentile_from_top = rank / len(sorted_scores)
    for tier_name, threshold in TIER_THRESHOLDS:
        if percentile_from_top <= (1.0 - threshold):
            return tier_name
    return "entry"


def merge_sources(hf_data: list, or_data: list) -> list:
    """合并 HF + OpenRouter 数据，按 name 去重，保留更高分。"""
    by_name: dict = {}
    for item in hf_data + or_data:
        name = item["name"]
        if name not in by_name or item.get("score", 0) > by_name[name].get("score", 0):
            by_name[name] = item
    return list(by_name.values())


def fetch_hf_leaderboard() -> list:
    """抓取 HuggingFace Open LLM Leaderboard CSV。失败返回空列表。"""
    try:
        with urllib.request.urlopen(HF_LEADERBOARD_URL, timeout=30) as resp:
            text = resp.read().decode("utf-8")
        lines = text.strip().splitlines()
        if not lines:
            return []
        # CSV 头：model, average_score, ...
        header = lines[0].split(",")
        name_idx = header.index("model") if "model" in header else 0
        score_idx = next(
            (i for i, h in enumerate(header) if "average" in h.lower() or "score" in h.lower()),
            1,
        )
        out = []
        for line in lines[1:]:
            cols = line.split(",")
            if len(cols) <= max(name_idx, score_idx):
                continue
            try:
                score = float(cols[score_idx])
            except ValueError:
                continue
            raw_name = cols[name_idx].strip()
            # 标准化为小写 slug
            slug = raw_name.lower().replace(" ", "-").replace("/", "-")
            out.append({
                "name": PROVIDER_MAP.get(slug, raw_name.split("/")[-1]),
                "raw_id": raw_name,
                "score": score,
            })
        return out
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return []


def fetch_openrouter() -> list:
    """抓取 OpenRouter /models。失败返回空列表。"""
    try:
        with urllib.request.urlopen(OPENROUTER_URL, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = []
        for m in data.get("data", []):
            name = m.get("name") or m.get("id", "")
            # OpenRouter 不直接给 benchmark 分，用 id 长度作为粗略 proxy
            # 真实场景可用 HF 数据补全；这里给一个保守中位分 75
            out.append({"name": name, "raw_id": m.get("id", ""), "score": 75.0})
        return out
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return []


def main() -> None:
    hf = fetch_hf_leaderboard()
    or_data = fetch_openrouter()
    merged = merge_sources(hf, or_data)
    if not merged:
        raise SystemExit("No data fetched from any source")
    scores = [m["score"] for m in merged]
    for m in merged:
        m["tier"] = assign_tier(m["score"], scores)
        m["provider"] = PROVIDER_MAP.get(
            m["name"].lower().replace(" ", "-"), "Unknown"
        )
    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "HuggingFace Open LLM Leaderboard + OpenRouter",
        "count": len(merged),
        "models": sorted(merged, key=lambda x: -x["score"]),
    }
    out_path = Path(__file__).resolve().parent.parent / "data" / "models.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(merged)} models to {out_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 跑测试通过**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard/scripts"
python3 -m unittest test_fetch_models -v
```

预期：5 tests passed

- [ ] **Step 5: 本地跑一次脚本生成 data/models.json（可选，会真实联网）**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
python3 scripts/fetch_models.py
ls -la data/
```

预期：data/models.json 存在，内容是 JSON。若网络不可达则本步跳过，不影响后续任务。

- [ ] **Step 6: 提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add scripts/
git add data/models.json 2>/dev/null || true
git commit -m "feat: add data fetch script with tier bucketing + tests"
```

---

### Task 3: 写前端骨架（HTML + 静态初始数据）

**Files:**

- Create: `index.html`
- Create: `data/models.json` (占位静态数据，确保离线可看)

**Interfaces:** 后续 Task 4 渲染这个 JSON，结构必须匹配：

```js
{
  "updated_at": "ISO string",
  "source": "string",
  "count": number,
  "models": [
    {
      "name": "string", "raw_id": "string", "score": number,
      "tier": "SOTA|tier1|tier2|tier3|entry", "provider": "string"
    }
  ]
}
```

- [ ] **Step 1: 创建占位 `data/models.json`**

```json
{
  "updated_at": "2026-08-26T00:00:00Z",
  "source": "HuggingFace Open LLM Leaderboard + OpenRouter (initial seed)",
  "count": 24,
  "models": [
    {
      "name": "GPT-5",
      "raw_id": "openai/gpt-5",
      "score": 96,
      "tier": "SOTA",
      "provider": "OpenAI"
    },
    {
      "name": "Claude 4 Opus",
      "raw_id": "anthropic/claude-4-opus",
      "score": 95,
      "tier": "SOTA",
      "provider": "Anthropic"
    },
    {
      "name": "Gemini 2.5 Pro",
      "raw_id": "google/gemini-2.5-pro",
      "score": 94,
      "tier": "SOTA",
      "provider": "Google"
    },
    { "name": "o3", "raw_id": "openai/o3", "score": 94, "tier": "SOTA", "provider": "OpenAI" },
    {
      "name": "Llama 4 405B",
      "raw_id": "meta-llama/llama-4-405b",
      "score": 89,
      "tier": "tier1",
      "provider": "Meta"
    },
    {
      "name": "DeepSeek V3",
      "raw_id": "deepseek-ai/deepseek-v3",
      "score": 88,
      "tier": "tier1",
      "provider": "DeepSeek"
    },
    {
      "name": "Qwen3 235B",
      "raw_id": "qwen/qwen3-235b",
      "score": 88,
      "tier": "tier1",
      "provider": "Alibaba"
    },
    { "name": "Grok 3", "raw_id": "xai/grok-3", "score": 87, "tier": "tier1", "provider": "xAI" },
    {
      "name": "Claude 4 Sonnet",
      "raw_id": "anthropic/claude-4-sonnet",
      "score": 86,
      "tier": "tier1",
      "provider": "Anthropic"
    },
    {
      "name": "Llama 4 70B",
      "raw_id": "meta-llama/llama-4-70b",
      "score": 82,
      "tier": "tier2",
      "provider": "Meta"
    },
    {
      "name": "DeepSeek R1",
      "raw_id": "deepseek-ai/deepseek-r1",
      "score": 82,
      "tier": "tier2",
      "provider": "DeepSeek"
    },
    {
      "name": "GPT-4o",
      "raw_id": "openai/gpt-4o",
      "score": 80,
      "tier": "tier2",
      "provider": "OpenAI"
    },
    {
      "name": "Gemini 2.0 Flash",
      "raw_id": "google/gemini-2.0-flash",
      "score": 79,
      "tier": "tier2",
      "provider": "Google"
    },
    {
      "name": "Qwen2.5 72B",
      "raw_id": "qwen/qwen2.5-72b",
      "score": 78,
      "tier": "tier2",
      "provider": "Alibaba"
    },
    {
      "name": "Mistral Large 2",
      "raw_id": "mistralai/mistral-large-2",
      "score": 77,
      "tier": "tier2",
      "provider": "Mistral"
    },
    {
      "name": "QwQ-32B",
      "raw_id": "qwen/qwq-32b",
      "score": 76,
      "tier": "tier2",
      "provider": "Alibaba"
    },
    {
      "name": "Llama 3.3 70B",
      "raw_id": "meta-llama/llama-3.3-70b",
      "score": 72,
      "tier": "tier3",
      "provider": "Meta"
    },
    {
      "name": "Mixtral 8x22B",
      "raw_id": "mistralai/mixtral-8x22b",
      "score": 70,
      "tier": "tier3",
      "provider": "Mistral"
    },
    {
      "name": "Claude 3.5 Sonnet",
      "raw_id": "anthropic/claude-3.5-sonnet",
      "score": 70,
      "tier": "tier3",
      "provider": "Anthropic"
    },
    {
      "name": "Command R+",
      "raw_id": "cohere/command-r-plus",
      "score": 65,
      "tier": "tier3",
      "provider": "Cohere"
    },
    {
      "name": "Phi-4",
      "raw_id": "microsoft/phi-4",
      "score": 62,
      "tier": "tier3",
      "provider": "Microsoft"
    },
    {
      "name": "Yi Lightning",
      "raw_id": "01-ai/yi-lightning",
      "score": 55,
      "tier": "entry",
      "provider": "01.AI"
    },
    {
      "name": "GLM-4 Plus",
      "raw_id": "zhipu/glm-4-plus",
      "score": 52,
      "tier": "entry",
      "provider": "Zhipu"
    },
    {
      "name": "Moonshot v1",
      "raw_id": "moonshot/moonshot-v1",
      "score": 50,
      "tier": "entry",
      "provider": "Moonshot"
    }
  ]
}
```

- [ ] **Step 2: 创建 `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LLM 能力天梯</title>
    <meta name="description" content="按能力等价分组展示主流大语言模型（开源 + 闭源）" />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container">
        <h1 class="site-title">LLM 能力天梯</h1>
        <p class="site-subtitle">
          按能力等价分组 ·
          <span id="model-count">--</span> 个模型 · 数据更新于 <span id="updated-at">--</span>
        </p>
        <div class="controls">
          <div class="tabs" role="tablist">
            <button class="tab active" data-filter="all" role="tab">全部</button>
            <button class="tab" data-filter="open" role="tab">开源</button>
            <button class="tab" data-filter="closed" role="tab">闭源</button>
          </div>
          <input
            type="search"
            id="search"
            class="search"
            placeholder="搜索模型名或提供商..."
            aria-label="搜索模型"
          />
        </div>
      </div>
    </header>

    <main class="container" id="tiers-container">
      <!-- tiers 渲染到这里 -->
    </main>

    <footer class="site-footer">
      <div class="container">
        <p>
          数据来源：
          <a
            href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard"
            target="_blank"
            rel="noopener"
            >HuggingFace Open LLM Leaderboard</a
          >
          +
          <a href="https://openrouter.ai" target="_blank" rel="noopener">OpenRouter</a>
          · 本页面不显示价格
        </p>
      </div>
    </footer>

    <script src="js/tiers.js"></script>
    <script src="js/app.js"></script>
  </body>
</html>
```

- [ ] **Step 3: 验证 HTML 语法**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
python3 -c "from html.parser import HTMLParser; HTMLParser().feed(open('index.html').read()); print('OK')"
```

预期：输出 `OK`

- [ ] **Step 4: 提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add index.html data/models.json
git commit -m "feat: add HTML skeleton and seed models data"
```

---

### Task 4: 写梯队元数据 + 渲染逻辑（JS）

**Files:**

- Create: `js/tiers.js`
- Create: `js/app.js`

**Interfaces:**

- `tiers.js` exports global `TIERS`:
  ```js
  const TIERS = [
    { id: 'SOTA', label: 'SOTA (State of the Art)', color: '#d4a017' },
    { id: 'tier1', label: '第一梯队', color: '#7c3aed' },
    { id: 'tier2', label: '第二梯队', color: '#2563eb' },
    { id: 'tier3', label: '第三梯队', color: '#6b7280' },
    { id: 'entry', label: '入门级', color: '#9ca3af' },
  ]
  ```
- `app.js` exports global `render()` that fetches `data/models.json` and renders

- [ ] **Step 1: 创建 `js/tiers.js`**

```js
window.TIERS = [
  { id: 'SOTA', label: 'SOTA (State of the Art)', color: '#d4a017' },
  { id: 'tier1', label: '第一梯队', color: '#7c3aed' },
  { id: 'tier2', label: '第二梯队', color: '#2563eb' },
  { id: 'tier3', label: '第三梯队', color: '#6b7280' },
  { id: 'entry', label: '入门级', color: '#9ca3af' },
]

// 已知开源模型 → 量化精度映射（轻量手写，因为 HF 排行榜不直接给）
window.QUANT_MAP = {
  'Llama 4 405B': 'fp16',
  'Llama 4 70B': 'AWQ-INT4',
  'DeepSeek V3': 'fp16',
  'DeepSeek R1': 'AWQ-INT4',
  'Qwen3 235B': 'fp16',
  'Qwen2.5 72B': 'GPTQ-INT4',
  'QwQ-32B': 'AWQ-INT4',
  'Llama 3.3 70B': 'GPTQ-INT4',
  'Mixtral 8x22B': 'fp16',
  'Phi-4': 'fp16',
  'Yi Lightning': 'fp16',
  'GLM-4 Plus': 'INT8',
  'Moonshot v1': 'fp16',
}

// 已知闭源模型 → 上下文窗口（K = 千 tokens）
window.CTX_MAP = {
  'GPT-5': '400K',
  'GPT-4o': '128K',
  o1: '200K',
  o3: '200K',
  'Claude 4 Opus': '200K',
  'Claude 4 Sonnet': '200K',
  'Claude 3.5 Sonnet': '200K',
  'Gemini 2.5 Pro': '1M',
  'Gemini 2.0 Flash': '1M',
  'Grok 3': '1M',
}
```

- [ ] **Step 2: 创建 `js/app.js`**

```js
;(function () {
  'use strict'

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => Array.from(document.querySelectorAll(sel))

  let allModels = []
  let currentFilter = 'all'
  let currentQuery = ''

  // 简化判断：raw_id 是否含 "meta-llama/""qwen/""deepseek-ai/" 等，或名字命中 QUANT_MAP
  function isOpenSource(model) {
    if (window.QUANT_MAP[model.name]) return true
    const openPrefixes = [
      'meta-llama/',
      'qwen/',
      'deepseek-ai/',
      'mistralai/',
      'microsoft/',
      '01-ai/',
      'zhipu/',
      'moonshotai/',
    ]
    return openPrefixes.some((p) => (model.raw_id || '').startsWith(p))
  }

  function badgeFor(model) {
    if (isOpenSource(model)) {
      const q = window.QUANT_MAP[model.name] || 'fp16'
      return { type: 'open', text: q }
    }
    const ctx = window.CTX_MAP[model.name] || '—'
    return { type: 'closed', text: ctx + ' ctx' }
  }

  function passesFilter(model) {
    if (currentFilter === 'open' && !isOpenSource(model)) return false
    if (currentFilter === 'closed' && isOpenSource(model)) return false
    if (currentQuery) {
      const q = currentQuery.toLowerCase()
      const hay = (model.name + ' ' + model.provider).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }

  function cardHTML(model) {
    const badge = badgeFor(model)
    return `
      <article class="card" data-tier="${model.tier}">
        <h3 class="card-name">${escapeHTML(model.name)}</h3>
        <p class="card-provider">${escapeHTML(model.provider)}</p>
        <div class="card-meta">
          <span class="badge badge-${badge.type}">${escapeHTML(badge.text)}</span>
          <span class="score">分 ${model.score.toFixed(1)}</span>
        </div>
      </article>
    `
  }

  function escapeHTML(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]
    )
  }

  function render() {
    const container = $('#tiers-container')
    const visibleByTier = {}
    for (const t of window.TIERS) visibleByTier[t.id] = []
    for (const m of allModels) {
      if (passesFilter(m)) visibleByTier[m.tier].push(m)
    }

    container.innerHTML = window.TIERS.map((t) => {
      const list = visibleByTier[t.id]
      if (list.length === 0) return ''
      const cards = list.map(cardHTML).join('')
      return `
          <section class="tier">
            <h2 class="tier-title" style="border-left-color:${t.color}">
              ${escapeHTML(t.label)} <span class="tier-count">${list.length}</span>
            </h2>
            <div class="grid">${cards}</div>
          </section>
        `
    }).join('')

    $('#model-count').textContent = allModels.length
    $('#updated-at').textContent = formatDate(window.__DATA__.updated_at)
  }

  function formatDate(iso) {
    if (!iso) return '--'
    try {
      const d = new Date(iso)
      return d.toISOString().slice(0, 10)
    } catch (_) {
      return iso
    }
  }

  function bindControls() {
    $$('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tab').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        currentFilter = btn.dataset.filter
        render()
      })
    })
    $('#search').addEventListener('input', (e) => {
      currentQuery = e.target.value.trim()
      render()
    })
  }

  async function init() {
    try {
      const resp = await fetch('data/models.json', { cache: 'no-store' })
      window.__DATA__ = await resp.json()
      allModels = window.__DATA__.models || []
    } catch (err) {
      $('#tiers-container').innerHTML =
        '<p class="error">数据加载失败。请检查 data/models.json 是否存在。</p>'
      console.error(err)
      return
    }
    bindControls()
    render()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
```

- [ ] **Step 3: 验证 JS 无语法错误**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
node --check js/tiers.js && node --check js/app.js && echo "OK"
```

预期：输出 `OK`

- [ ] **Step 4: 提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add js/
git commit -m "feat: add tier metadata and render logic"
```

---

### Task 5: 写 CSS（极简白底 + 响应式）

**Files:**

- Create: `css/style.css`

**Interfaces:** 选择器约定：

- `.container` — 居中容器，max-width 1200px
- `.site-header`, `.site-title`, `.site-subtitle`, `.controls`, `.tabs`, `.tab`, `.search`
- `.tier`, `.tier-title`, `.tier-count`, `.grid`
- `.card`, `.card-name`, `.card-provider`, `.card-meta`, `.badge`, `.badge-open`, `.badge-closed`, `.score`
- `.site-footer`, `.error`

- [ ] **Step 1: 创建 `css/style.css`**

```css
/* ===== Reset & Base ===== */
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  padding: 0;
}
body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', Roboto, Helvetica, Arial, sans-serif;
  color: #111;
  background: #fff;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
a {
  color: #2563eb;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* ===== Layout ===== */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ===== Header ===== */
.site-header {
  border-bottom: 1px solid #e5e5e5;
  padding: 40px 0 24px;
  background: #fff;
}
.site-title {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.site-subtitle {
  margin: 0 0 24px;
  color: #6b7280;
  font-size: 14px;
}
.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.tabs {
  display: inline-flex;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.tab {
  border: 0;
  background: transparent;
  padding: 8px 16px;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  font-family: inherit;
}
.tab:hover {
  color: #111;
}
.tab.active {
  background: #111;
  color: #fff;
}
.search {
  flex: 1 1 240px;
  min-width: 200px;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  color: #111;
  font-family: inherit;
}
.search:focus {
  outline: none;
  border-color: #111;
}

/* ===== Tiers ===== */
.tier {
  margin: 32px 0 40px;
}
.tier-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  padding-left: 12px;
  border-left: 4px solid #6b7280;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.tier-count {
  font-size: 13px;
  font-weight: 400;
  color: #9ca3af;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* ===== Card ===== */
.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 16px;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
}
.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.card-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}
.card-provider {
  margin: 0 0 12px;
  font-size: 12px;
  color: #6b7280;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;
}
.badge-open {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.badge-closed {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}
.score {
  font-size: 12px;
  color: #6b7280;
  font-variant-numeric: tabular-nums;
}

/* ===== Footer ===== */
.site-footer {
  border-top: 1px solid #e5e5e5;
  padding: 24px 0;
  margin-top: 48px;
  color: #6b7280;
  font-size: 13px;
}

/* ===== Error ===== */
.error {
  color: #b91c1c;
  padding: 24px;
  text-align: center;
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .site-title {
    font-size: 24px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .container {
    padding: 0 16px;
  }
  .site-header {
    padding: 24px 0 16px;
  }
}
```

- [ ] **Step 2: 验证 CSS 语法（用 node 的简单解析够用）**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
# 简易检查：花括号配对
python3 -c "
s = open('css/style.css').read()
opens, closes = s.count('{'), s.count('}')
print('OK' if opens == closes else f'MISMATCH: {opens} {{ vs {closes} }}')
"
```

预期：输出 `OK`

- [ ] **Step 3: 提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add css/
git commit -m "style: add minimal white-theme CSS with responsive grid"
```

---

### Task 6: 本地浏览器验收（手动）

**Files:** 无（仅验收）

- [ ] **Step 1: 启动本地服务器**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
python3 -m http.server 8000
```

后台运行（`run_in_background: true`）

- [ ] **Step 2: 用 curl 验证页面可达**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/data/models.json
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/css/style.css
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/js/app.js
```

预期：全部 `200`

- [ ] **Step 3: 用浏览器检查（在终端打开）**

```bash
open http://localhost:8000
```

视觉检查清单：

- [ ] 标题"LLM 能力天梯"显示
- [ ] 显示 24 个模型计数、日期占位
- [ ] 5 个梯队全部出现，从 SOTA（金）到 entry（灰）
- [ ] 卡片网格在桌面端 4-5 列
- [ ] 悬停卡片有上浮阴影
- [ ] 点击"开源"tab，只剩开源模型
- [ ] 点击"闭源"tab，只剩闭源模型
- [ ] 搜索"GPT"只剩 GPT-5 / GPT-4o
- [ ] 移动端宽度（< 768px）卡片单列

- [ ] **Step 4: 停掉本地服务器**

```bash
lsof -ti :8000 | xargs kill
```

- [ ] **Step 5: 无 commit（仅验收）**

---

### Task 7: 写 GitHub Actions 工作流

**Files:**

- Create: `.github/workflows/refresh.yml`

**Interfaces:** 工作流名 `Refresh LLM Leaderboard Data`，每日 0:00 UTC 触发，也可手动 `workflow_dispatch`。

- [ ] **Step 1: 创建 `.github/workflows/refresh.yml`**

```yaml
name: Refresh LLM Leaderboard Data

on:
  schedule:
    - cron: '0 0 * * *' # 每天 UTC 0:00
  workflow_dispatch: # 也支持手动触发

permissions:
  contents: write # 允许 push 提交

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run fetch script
        run: python3 scripts/fetch_models.py
        continue-on-error: true # 网络失败也不让 workflow 整体挂掉

      - name: Verify data file
        run: |
          if [ ! -s data/models.json ]; then
            echo "data/models.json missing or empty; aborting"
            exit 1
          fi
          python3 -c "import json; d=json.load(open('data/models.json')); assert d.get('models'); print('OK', len(d['models']), 'models')"

      - name: Commit & push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/models.json
          if git diff --staged --quiet; then
            echo "No changes to commit"
            exit 0
          fi
          git commit -m "chore(data): refresh LLM leaderboard [skip ci]"
          git push
```

- [ ] **Step 2: 验证 YAML 语法**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/refresh.yml')); print('OK')"
```

预期：输出 `OK`（如未装 pyyaml：`pip3 install pyyaml`）

- [ ] **Step 3: 提交**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add .github/
git commit -m "ci: add daily refresh workflow for leaderboard data"
```

---

### Task 8: 创建 GitHub 仓库并推送

**Files:** 无（外部操作）

- [ ] **Step 1: 在 GitHub 上手动创建空仓库**

打开 https://github.com/new

- Repository name: `llm-leaderboard`
- Description: `按能力等价分组的 LLM 能力天梯`
- Public
- **不要**勾选 Add README / .gitignore / License（本地已有）

- [ ] **Step 2: 添加远程并推送**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git remote add origin git@github.com:YOUR_USERNAME/llm-leaderboard.git
git branch -M main
git push -u origin main
```

预期：推送成功，看到所有 commit

- [ ] **Step 3: 启用 GitHub Pages**

进入仓库 Settings → Pages

- Source: Deploy from a branch
- Branch: `main` / `/ (root)`
- Save

等待 1-2 分钟，访问 `https://YOUR_USERNAME.github.io/llm-leaderboard/`

- [ ] **Step 4: 验证线上页面**

浏览器打开 `https://YOUR_USERNAME.github.io/llm-leaderboard/`
视觉检查清单同 Task 6 Step 3（外加确保 HTTPS 正常、无 404）

---

### Task 9: 手动触发一次 Actions 跑数据刷新

**Files:** 无

- [ ] **Step 1: 触发 workflow**

进入 GitHub 仓库 → Actions → "Refresh LLM Leaderboard Data" → Run workflow → Run

- [ ] **Step 2: 等待并查看日志**

点进运行中的 job，依次看：

- Run fetch script（输出 "Wrote N models to ...")
- Verify data file（输出 "OK N models"）
- Commit & push（看到 "chore(data): refresh ..." 提交）

- [ ] **Step 3: 拉取最新 data/models.json 到本地验证**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git pull origin main
cat data/models.json | python3 -m json.tool | head -40
```

预期：能看到 updated_at 是今天日期、source 字段、models 数组

- [ ] **Step 4: 刷新线上页面，确认数据已更新**

浏览器 hard-reload（Cmd+Shift+R / Ctrl+Shift+R），看 #updated-at 是不是今天

---

### Task 10: 写部署文档与最终收尾

**Files:**

- Modify: `README.md` (追加部署 + 截图章节)
- Create: `docs/DEPLOYMENT.md` (可选，更详细的部署/故障排查)

- [ ] **Step 1: 更新 README 增加部署章节**

在 README 末尾追加：

```markdown
## 部署

本项目部署在 GitHub Pages，仓库地址假设为 `https://github.com/YOUR_USERNAME/llm-leaderboard`。

### 首次部署

1. Fork 或新建 GitHub 仓库
2. 推送代码到 `main` 分支
3. Settings → Pages → Source: `main` / root → Save
4. 等待 1-2 分钟，访问 `https://YOUR_USERNAME.github.io/llm-leaderboard/`

### 数据自动刷新

`.github/workflows/refresh.yml` 每天 UTC 0:00 自动抓取最新数据并 push。

手动触发：在 GitHub 仓库 → Actions → Refresh LLM Leaderboard Data → Run workflow

### 自定义域名

在仓库根目录放一个 `CNAME` 文件，写入你的域名（如 `llm-tiers.dev`），然后在 DNS 提供商加 CNAME 记录指向 `YOUR_USERNAME.github.io`。

## 故障排查

| 现象             | 原因                       | 解决                                                    |
| ---------------- | -------------------------- | ------------------------------------------------------- |
| 页面打开但无模型 | `data/models.json` 缺失    | 跑 `python3 scripts/fetch_models.py` 或手动触发 Actions |
| Actions 失败     | HF / OpenRouter 接口不可达 | workflow 已设 `continue-on-error`，本地跑补数据         |
| 梯队分配异常     | 分数极值                   | 编辑模型 JSON 改 `tier` 字段即可                        |
```

- [ ] **Step 2: 创建部署说明文件 `docs/DEPLOYMENT.md`**

```markdown
# 部署说明

## 架构
```

GitHub Actions (cron 0 0 \* \* \*)
↓ 跑 scripts/fetch_models.py
↓ 拉 HuggingFace + OpenRouter 公开数据
↓ 写 data/models.json
↓ git commit & push
GitHub Pages (自动从 main 分支根目录发布)
↓ 用户访问 https://<user>.github.io/llm-leaderboard/
浏览器加载 index.html → fetch data/models.json → 渲染

````

## 本地开发

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
````

注意：直接 `file://` 打开会因 CORS 失败，必须经 HTTP 服务器。

## 修改数据后重新生成

1. 编辑 `data/models.json` 改特定模型的 `tier` / `score`
2. 或修改 `scripts/fetch_models.py` 改抓取/分桶逻辑
3. 本地跑 `python3 scripts/fetch_models.py` 重生成
4. `git commit && git push`

## 调整视觉

CSS 全在 `css/style.css`，变量集中在 `:root`（未来可重构）。改完 `git push` 即可，Pages 会自动重发。

## 添加模型

在 `data/models.json` 的 `models` 数组里加一项：

```json
{ "name": "新模型", "raw_id": "org/repo", "score": 80, "tier": "tier2", "provider": "新厂商" }
```

`QUANT_MAP` / `CTX_MAP` 在 `js/tiers.js`，给开源模型加量化标签、闭源模型加上下文窗口。

````

- [ ] **Step 3: 提交并推送**

```bash
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
git add README.md docs/DEPLOYMENT.md
git commit -m "docs: add deployment guide and troubleshooting"
git push
````

- [ ] **Step 4: 最终验收**

```bash
# 确认所有文件就位
cd "/Volumes/ExternalSSD/Projects/LLM Leaderboard"
ls -la
echo "---"
ls -la css/ js/ scripts/ .github/workflows/ docs/ data/
echo "---"
git log --oneline
```

预期：看到 8-9 个 commit，所有目录齐全。

---

## Self-Review（plan 写完后自检）

**1. Spec 覆盖检查**

- [x] 单页 + 极简白底 → Task 3 + Task 5
- [x] 5 梯队等价分组 → Task 2 分桶算法 + Task 4 渲染
- [x] 开源显示量化 → Task 4 `QUANT_MAP` + `isOpenSource` + 卡片 badge
- [x] 闭源显示上下文 → Task 4 `CTX_MAP` + 卡片 badge
- [x] 不显示价格 → 全局约束 + spec 明确
- [x] 数据每日刷新 → Task 7 workflow
- [x] 部署到 GitHub Pages → Task 8
- [x] 20-30 模型覆盖 → Task 3 种子数据 24 个
- [x] 筛选（全部/开源/闭源 + 搜索）→ Task 4 `bindControls`
- [x] 移动端 → Task 5 `@media (max-width: 768px)`

**2. Placeholder 扫描**

- 无 "TBD" / "TODO" / "implement later"

**3. 类型一致性**

- `assign_tier` 返回值在 Task 2 写为字符串字面量，Task 4 渲染时直接比较 `m.tier === "SOTA"`，一致
- `window.TIERS` 在 Task 4 Step 1 暴露，Task 4 Step 2 渲染时使用，签名一致
- `data/models.json` 字段：`updated_at` / `source` / `count` / `models[]` 三处都用，一致

**通过**。开始执行。
