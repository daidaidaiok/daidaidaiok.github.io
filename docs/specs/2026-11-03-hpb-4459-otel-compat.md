# HPB-4459：旧版 OpenTelemetry 兼容性

## 意图与验收目标

为 Contentlayer2 / @effect-ts/otel 旧链路保持一个干净安装且 peer 范围一致的 OpenTelemetry 依赖树，并避免将 @opentelemetry/api 单独提升到 1.10。

## 当前状态与约束

- 应用显式依赖 @opentelemetry/api 1.9.0 与 @opentelemetry/sdk-trace-base 1.30.1。
- @effect-ts/otel 0.15.1 的 peer 范围依赖 OpenTelemetry core / SDK 1.x；Core 1.30.1 虽由 Contentlayer2 间接安装，却未直接声明，基线 yarn install 报告该 peer 缺失。Contentlayer2 0.5.8 的相关 exporter、SDK 依赖也仍在 1.x。
- OpenTelemetry SDK 1.30.1 的 API peer 范围为 >=1.0.0 <1.10.0。Propagator Jaeger 2.x 仍要求 API 小于 1.10；因此当前保留 API 1.9。
- 现有安全解析将 Jaeger propagator 固定在 2.9.0；注册表已有兼容 API 1.9 的 2.12.0，更新后其 core 依赖对齐到 2.12.0。旧 Effect-TS peer 所需 core 1.x 保持独立解析。
- Jaeger propagator 已在当前 OTel SDK 3.x 中弃用/移除；本次仍保留最后的 2.x 版本，因为 legacy sdk-trace-node 依赖它。Yarn 对 resolution 与精确依赖版本不一致的提示是有意的 override，不是 peer 警告。
- 本次不迁移 Contentlayer2 / Effect-TS，不升级 API 到 1.10，也不把 1.x peer 包强制覆盖成 2.x。

## 方案

1. **保持 OTel API 1.9，升级 Jaeger 2.x 补丁线到 2.12.0（采用）**：保留既有安全修复，更新两份 manifest override/resolution 与锁文件；旧 SDK 1.x 仍由 API 1.9 满足。
2. **把 Jaeger 回退到 1.30.1**：可与 SDK 1.30.1 的精确依赖一致，但会撤销当前 OTel Core 2.9 安全更新，不采用。
3. **将 API 与整套 SDK 提升到 1.10 / 3.x**：与仍声明 1.x peer 的 @effect-ts/otel / Contentlayer2 冲突，不在本 PR 范围。

## 选定设计

将 @opentelemetry/core 1.30.1 显式加入运行时依赖以满足 @effect-ts/otel peer；将 resolutions["**/@opentelemetry/propagator-jaeger"] 与 npm overrides["@opentelemetry/propagator-jaeger"] 同步到 2.12.0，让 Jaeger 自己嵌套使用 Core 2.12.0。API 保持 1.9.0，SDK trace base 保持 1.30.1。新增依赖门禁断言锁定该兼容组合，更新 Yarn 与 npm 两份锁文件。移除已弃用 Jaeger 依赖须随 legacy Contentlayer / Effect-TS 栈整体迁移处理。

## 非目标

- 不升级 React、Next.js、TypeScript、Vite 或 ESLint。
- 不替换 Contentlayer2 或其 Effect-TS 集成。
- 不在本 PR 中移除 deprecated Jaeger propagator；这需要替换其 legacy SDK 消费方。
- 不解除 API 1.9 pin，不以 npm audit 的中低危结果扩展本工单范围。

## 验收标准

- [ ] 显式 Core 1.30.1 满足 legacy Effect-TS peer；API 1.9、SDK 1.30.1 与 Jaeger/Core 2.12 的 API peer 范围兼容。
- [ ] Yarn frozen install 无相关 peer 警告；npm / Yarn 锁文件均解析 Jaeger 2.12.0。
- [ ] 单测、覆盖率、lint、类型检查、静态构建通过。
- [ ] Yarn 与 npm 高危审计均为 0 High / 0 Critical；相关 CI 门禁通过。
