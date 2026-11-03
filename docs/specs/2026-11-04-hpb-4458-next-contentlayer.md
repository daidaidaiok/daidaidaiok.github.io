# HPB-4458 Batch 1：Next.js 16 / Contentlayer 兼容

## 意图与范围

把失败的 14 项主版本合并拆开，先单独验证 Next.js 16 与当前 Contentlayer2 静态构建。PR #31 的实际失败显示 Turbopack 无法解析 contentlayer/generated；本批通过 Next 16 支持的 Webpack 模式保留旧 Contentlayer 插件，React/types、Vite/Vitest、ESLint/TypeScript 大版本迁移留在后续独立 PR。

## 当前状态与约束

- 当前 Next / @next/bundle-analyzer / eslint-config-next 为 15.5.28；Contentlayer2 / next-contentlayer2 为 0.5.8。
- NPM metadata 显示 Next 16.4.4 peer 支持 React / React DOM 18.2+；next-contentlayer2 0.5.8 声明 Next >=12。当前 React 18.3.1 与 types 18 保留，避免合并 React/types 批次。
- Next 16 默认使用 Turbopack；本仓库有自定义 webpack 规则，且 PR #31 已在 Turbopack 下复现 contentlayer/generated 解析失败。因此 dev/start/build/analyze 明确使用官方 --webpack 选项。
- Next 16 移除 next lint；将脚本切到 ESLint CLI，但暂时保留 ESLint 9 与现有 flat config。
- eslint-config-next 16 导出 flat config，旧 FlatCompat 的 next/core-web-vitals 加载会失败；改为直接导入 Next flat config。其 React Hooks v7 新规则会命中既有 hydration mount-gates，本批仅对 MobileNav / ThemeSwitch 两个现存组件局部关闭该新规则，不改组件行为。
- Next 16 build 自动将 tsconfig 的 jsx 改为 react-jsx，并更新 next-env.d.ts 路由类型导入；这些生成的 TypeScript 配置变更纳入本批契约。
- Next 16.3+ 的 agentRules 默认在 next dev 检测到 AI coding agent 时向 AGENTS.md 写入版本匹配的托管区块；本批保留并提交这个 Next16 生成区块，不改已有项目指引。`.prettierignore` 排除此生成文档，避免提交时 lint-staged 重排其余项目说明。
- Vite 7 / Vitest 5 当前基线可解析 TSX；Vite 8 / Rolldown 的 JSX 转换作为独立后续批次，不在本 PR 改动。

## 方案

1. **Next 16 + Webpack 兼容批次（采用）**：升级 Next 及配套 analyzer/config 到 16.4.4，保持 Contentlayer2、React/types、Vite/Vitest、ESLint/TypeScript 版本不动；显式 Webpack，迁移 lint 命令。改动小，直接验证 ticket 首批要求。
2. **继续使用 Turbopack 并修 alias**：与 PR #31 同一失败路径重复，Contentlayer 生成时序问题仍可能存在，不采用。
3. **一次替换 Contentlayer2 并升级全部依赖**：耦合内容模型与四组依赖，超出先验证兼容再分别推进的拆分目标；仅当 Webpack 批次仍无法生成静态内容时再评估。

## 选定设计

Batch 1 单独将 next、@next/bundle-analyzer、eslint-config-next 对齐到 16.4.4；dev、start、build、analyze 显式使用 --webpack；lint 改为 eslint CLI 并直接使用 Next16 flat config；tsconfig 使用 Next 16 要求的 react-jsx。为保留既有 hydration gate 行为，仅对 MobileNav / ThemeSwitch 局部关闭新启用的 set-state-in-effect lint 规则。保留 Next16 托管生成的 AGENTS.md 版本提示区块；不改已有项目指引内容。保留 React 18/types 18、TypeScript 5.9、Vite 7/Vitest 5、ESLint 9 和 Contentlayer2 0.5.8。每个后续依赖组都从更新后的 staging 单独分支、开独立 PR，并按相同门禁验证。

## 非目标

- 本批不升级 React/React DOM 或 @types/react。
- 本批不升级 Vite/Vitest、ESLint 或 TypeScript。
- 不替换 Contentlayer2，不改业务页面或静态输出内容。
- 不关闭 Next16 默认的 agentRules；仅提交 next dev 生成的托管区块，保留 AGENTS.md 原有内容。
- 不修改 MobileNav / ThemeSwitch 行为；局部 lint 例外仅覆盖 Next16 引入的新规则，后续 React/types 批次复核。
- 不把 next.config.js 中的 Turbopack 配置误当成启用 Turbopack 的理由；CLI 显式选择 Webpack。

## 验收标准

- [x] Next 相关三个包对齐 16.4.4，React/types 保持 18.x；Yarn 与 npm lockfiles 一致。
- [x] webpack 兼容契约测试 RED/GREEN 通过；Contentlayer generated 模块、RSS、静态导出成功。
- [ ] lint、tsc、coverage、内容/a11y/bundle/image/dependency/CodeQL 门禁通过（bundle 使用已批准的 22% Next16 一次性基线阈值）。
- [ ] 本批一个独立 PR；后续三个批次仍明确拆分，不把它们混入本 PR。

## 官方兼容参考

- Next.js 16 upgrade guide 与 CLI 文档：Turbopack 默认、--webpack 选择及 next lint 移除。

## 本地验收记录（2026-11-04）

- 通过：lint、TypeScript、Next/Contentlayer 契约测试（6/6）、bundle 阈值契约测试（8/8，先红后绿）、完整 coverage（26 files / 96 tests）、Next 16 Webpack 静态导出（64 pages）、frontmatter/built 内容校验、a11y、image budget、Yarn High/Critical audit、npm audit high threshold、diff coverage、frozen Yarn install。
- a11y 结果与 `origin/staging` 构建完全一致：6 routes、9 moderate、0 serious/critical。
- bundle budget 红测后，用户批准将阈值临时调至 22% 记录 Next16 一次性基线；shared client JS gzip 142,717→173,053 bytes（+21.3%），`/` gzip 248,994→278,797 bytes（+12.0%），所有路由通过 22% 门槛。Analyzer 将主要增长定位在 Next 自身 runtime chunks（`next/dist` shared chunk 与 Next 编译的 React DOM client）；应用主 chunk 大小基本持平。后续批次以新 staging 为基线并重新评估恢复 10%。
- `yarn lint` 会格式化两份不相关脚本；本次已复原这两处仅由 lint 自动产生的工作区改动。
