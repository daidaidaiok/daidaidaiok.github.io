# HPB-4458 Batch 3：Vite 8 / Vitest

## 意图与范围

将 Vite 7 / Vitest 5 升级到 Vite 8 / Vitest 5.1，覆盖 PR #31 的 Rolldown TSX 测试解析问题。只迁移测试/构建工具配置，不改业务页面；React 19、Next16、TypeScript 5.9 保持不变，作为独立 PR。

## 版本与兼容性

- 当前 npm registry 验证：Vite 8.3.5；Vitest 5.1.0 的 peer range 接受 Vite `^8.0.0`；`@vitest/coverage-v8` 5.1.0 与 Vitest 同版。
- Vite 8.3.5 要求 Node `^20.19.0 || >=22.12.0`；本机 Node 22.23 与 CI Node 24 均满足。
- Vite 8 使用 Rolldown / Oxc；官方 migration guide 说明会把 `esbuild.jsx: 'automatic'` 兼容映射到 `oxc.jsx.runtime = 'automatic'`，但新配置应直接使用 Oxc。
- Vite 8 在 `vitest.config.ts` CommonJS 语境发现 ESM syntax 会发出 configLoader warning；`.mts` 扩展名明确配置文件为 ESM，不改 package 全局 `type`。

## 方案

1. **Vite8 + Vitest5.1 + Oxc automatic JSX（采用）**：将 Vite/Vitest/coverage-v8 对齐到兼容版本，把 `esbuild` JSX setting 迁为 `oxc.jsx.runtime: 'automatic'`，并将 config 改为 `.mts`。不新增 React 插件：Vite 8 Oxc 已原生处理 TSX，本仓此配置只供测试使用，不需要 React Fast Refresh。
2. **保持 Vite 7 / Vitest 5**：没有完成工单指定的 Vite 主版本迁移，不采用。
3. **升级 Vitest 6 或替换测试工具**：Vitest 5.1 peer 已支持 Vite 8，升级更大主版本无必要，不采用。

## 测试与发现

- 新增 TSX fixture 使用 `renderToStaticMarkup` 验证 JSX automatic runtime；配置契约先红后绿。
- 用 Vite 8.3.5 + 原配置实测时，兼容层已能转换 TSX fixture，但显示 `esbuild` / `oxc` 同时设置、Oxc 将忽略 esbuild 的警告；显式迁到 Oxc 后 focused tests 2/2 通过且无 Vite config warning。
- PR #31 曾在旧 Vite8/Rolldown 组合里报告 TSX 测试解析失败；当前 Vite 8.3.5 的最小 fixture 没有再复现该旧错误，因此使用官方 Oxc config 和 fixture 作为防回归契约，不引入额外 Babel/React 插件。

## 验收标准

- [x] Vite8.3.5、Vitest5.1.0、coverage-v8 5.1.0；peer / Node 条件满足。
- [x] Oxc JSX config 契约 RED/GREEN；TSX fixture 2/2 通过，`.mts` config warning 消失。
- [x] 完整本地 coverage（29 files / 101 tests）、lint、TypeScript、Next 静态构建64 pages、内容/RSS、a11y、image、依赖审计与 diff coverage 通过。
- [x] 以 React19 staging 为 bundle 基线：全路由增长约 0.0%，通过 10% 门槛。
- [ ] 远端 CI / CodeQL 全绿；独立 PR review 与合并后开始 Batch 4；不提前关闭 HPB-4458。

## 官方参考

- [Vite 8 migration guide](https://vite.dev/guide/migration)：Rolldown/Oxc 取代 esbuild/Rollup，含 automatic JSX 选项映射。
- [Vite JSX guide](https://vite.dev/guide/features#jsx)：Oxc 原生转换 JSX/TSX。
- [Vitest migration guide](https://vitest.dev/guide/migration/) 与 [Vite plugins guide](https://vite.dev/plugins/)：Vitest 5 peer 与 Vite8、React plugin 的职责说明。
