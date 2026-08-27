# LLM 能力天梯榜 — 设计文档

**日期**: 2026-08-26
**类型**: 静态单页网站
**目标**: 直观对比主流大语言模型的能力等级（开源 + 闭源），按能力等价分组

## 1. 目标用户与场景

- 开发者/研究者快速判断"我应该选哪个模型"
- 不关注价格，只看能力
- 开源模型需注意量化精度（fp16 / int8 / int4 / AWQ / GPTQ）

## 2. 核心特性

1. 单页响应式：桌面端天梯图布局，移动端堆叠
2. 按能力分梯队：SOTA / 第一梯队 / 第二梯队 / 第三梯队 / 入门级
3. 同一梯队内模型横向并排（"等价"含义）
4. 开源模型显示量化精度标签
5. 闭源模型显示上下文窗口
6. 极简白底风
7. 数据来源：GitHub Actions 后台抓 HuggingFace Open LLM Leaderboard + OpenRouter 公开数据
8. 每日自动刷新

## 3. 视觉布局

```
┌────────────────────────────────────────────────────┐
│  LLM 能力天梯                                       │
│  按能力等价分组 · 数据更新于 2026-08-26              │
│  [全部] [开源] [闭源] [搜索...]                     │
├────────────────────────────────────────────────────┤
│  SOTA (State of the Art)                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ GPT-5  │ │ Claude │ │ Gemini │ │ o3     │      │
│  │ OpenAI │ │ 4 Opus │ │ 2.5 Pro│ │ OpenAI │      │
│  │ 200K   │ │ Anthr. │ │ Google │ │ 200K   │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                    │
│  第一梯队                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ Llama  │ │ DeepS. │ │ Qwen3  │ │ Grok 3 │      │
│  │ 4 405B │ │ V3     │ │ 235B   │ │ xAI    │      │
│  │ [AWQ]  │ │ [fp16] │ │ [int4] │ │ 1M ctx │      │
│  └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                    │
│  ... 等等                                          │
└────────────────────────────────────────────────────┘
```

- 卡片：白底、细边框、轻微阴影、圆角 8px
- 梯队标题：左侧色条标识（SOTA 金色 / 一级紫 / 二级蓝 / 三级灰 / 入门浅灰）
- 卡片显示：模型名 / 提供商 / 关键参数（上下文或量化）/ 能力分数（小型 badge）
- 悬停：卡片上浮，阴影加深，显示详细分数

## 4. 数据模型

`data/models.json`：

```json
{
  "updated_at": "2026-08-26T00:00:00Z",
  "source": "HuggingFace Open LLM Leaderboard + OpenRouter",
  "tiers": {
    "SOTA": {
      "label": "SOTA (State of the Art)",
      "color": "#d4a017",
      "models": ["gpt-5", "claude-4-opus", "gemini-2.5-pro", "o3"]
    },
    "tier1": { ... },
    "tier2": { ... },
    "tier3": { ... },
    "entry": { ... }
  },
  "models": {
    "gpt-5": {
      "name": "GPT-5",
      "provider": "OpenAI",
      "type": "closed",
      "tier": "SOTA",
      "context_window": "400K",
      "scores": {"mmlu": 92, "humaneval": 95, "gpqa": 78}
    },
    "llama-4-405b": {
      "name": "Llama 4 405B",
      "provider": "Meta",
      "type": "open",
      "tier": "tier1",
      "quantization": "AWQ-INT4",
      "context_window": "128K",
      "scores": {"mmlu": 88, "humaneval": 89}
    }
  }
}
```

**关键决策**：

- 梯队归属由脚本按综合分位（SOTA=前 5%、tier1=前 15%、tier2=前 35%、tier3=前 65%、entry=其余）自动分桶
- 手动覆盖字段 `manual_tier` 允许对个别模型调整（用于纠正脚本误判）

## 5. 目录结构

```
.
├── index.html              # 主页（单页）
├── css/
│   └── style.css          # 极简白底样式
├── js/
│   ├── app.js             # 渲染 + 过滤 + 搜索
│   └── tiers.js           # 梯队定义（颜色/标签）
├── data/
│   └── models.json        # 自动生成
├── scripts/
│   └── fetch_models.py    # 抓数据 + 分桶 → models.json
├── .github/
│   └── workflows/
│       └── refresh.yml    # 每日 UTC 0:00 触发
├── README.md
├── LICENSE
└── .gitignore
```

## 6. 数据刷新流程

```
GitHub Actions (cron: 0 0 * * *)
   ↓
fetch_models.py
   1. 拉 HF Open LLM Leaderboard 公开 CSV
   2. 拉 OpenRouter 公开 /models API（CORS 友好、无 key）
   3. 合并去重、按综合分排序
   4. 按分位分桶
   5. 写 data/models.json
   6. git commit & push
   ↓
GitHub Pages 重新发布
```

## 7. 筛选与搜索

- 顶部 tab：`全部` / `开源` / `闭源`
- 搜索框：按模型名/提供商模糊匹配
- 实时过滤，无需刷新

## 8. 范围（YAGNI）

- ❌ 用户登录/收藏
- ❌ 价格信息
- ❌ 多语言（先中文）
- ❌ 详细模型对比页
- ❌ API 文档/SDK
- ❌ 评分历史趋势图

## 9. 部署

- GitHub Pages，从 `main` 分支根目录发布
- 启用 Pages：在 repo Settings → Pages → Source: `main` / root
- 自定义域名（可选）：`llm-tiers.dev` 通过 CNAME

## 10. 验收标准

- [ ] 在 GitHub Pages 看到静态页面，布局正常
- [ ] 至少 20 个模型、5 个梯队
- [ ] 至少 10 个开源模型带量化标签
- [ ] 顶部 tab 切换流畅
- [ ] 搜索框可用
- [ ] 移动端布局不破
- [ ] GitHub Actions 每日成功运行（首次手动触发测试）
- [ ] README 有截图和更新日志说明
