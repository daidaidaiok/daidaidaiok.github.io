# HPB-4458 Batch 4：ESLint 10 与 TypeScript 6

## 意图与范围

独立升级 ESLint 10 与 TypeScript 6，并验证现有 flat config、Next.js ESLint 配置、TypeScript 类型检查和测试构建。TypeScript 7 暂不进入本批：当前最新 typescript-eslint 8.72.1 的 peer 范围是 TypeScript `<6.1.0`，而 TypeScript 7 移除了其依赖的编译器 API；等上游发布正式支持后再单独推进。

## 兼容性依据

- npm registry 当前 `eslint` 为 10.14.0、`@eslint/js` 为 10.0.1，要求 Node `^20.19 || ^22.13 || >=24`；本地 Node 22.23.2 满足。
- `typescript-eslint`、`@typescript-eslint/parser` 与 `@typescript-eslint/eslint-plugin` 8.72.1 支持 ESLint 10，TypeScript peer 范围为 `>=4.8.4 <6.1.0`。
- TypeScript 7.0.2 已发布，但超出 parser/plugin peer 范围；不通过强制安装未支持组合来扩大风险。
- ESLint 10 的 ESLint config、Next16 flat config 和 FlatCompat 经本地实际 config 加载与 lint 验证。Yarn 会提示 Next16 配套的 `eslint-plugin-import`、`eslint-plugin-jsx-a11y`、`eslint-plugin-react` peer 范围目前仍止于 ESLint 9；这是已知上游 peer 声明差异，实际 lint 通过但需在 PR 中披露。

## 选定设计

将 `eslint`、`@eslint/js` 升级至 10.x，TypeScript 固定在 6.0.x；保留 Next 16.4.4 与 typescript-eslint 8.x。TypeScript 6 将 `baseUrl` 标记为弃用，因此从 tsconfig/jsconfig 移除该选项，改为带 `./` 的 paths 目标并显式保留项目当前使用的 `app/*`、`css/*` 导入解析。TS6 要求 ESLint 配置的导出类型显式标注；ESLint 10 的推荐规则要求异常包装保留 `cause`，并以最新 ECMAScript globals 识别 `Promise`。通过独立依赖契约测试固定 major/peer 兼容边界，再运行完整 lint、类型检查、测试、静态构建及仓库门禁。

TypeScript 7 推迟到独立后续工单：验证 typescript-eslint 官方支持后重新评估编译器 API 和 Next/Vitest 构建兼容性。HPB-4458 在该后续工作完成前保持 In Progress。

## 非目标

- 不强制 TypeScript 7，不使用不受支持的 parser/plugin 组合。
- 不改应用源码或 ESLint 规则行为；如 ESLint 10 暴露兼容问题，仅做必要的配置迁移并增加针对性测试。
- 不调整 bundle budget；以 staging 当前 10% 门槛为准。

## 验收标准

- [x] ESLint 10 + TypeScript 6.0.x 依赖与锁文件一致，typescript-eslint peer 范围覆盖二者。
- [x] tsconfig/jsconfig 不再使用 TypeScript 6 弃用的 `baseUrl`；path aliases 仍通过类型检查与构建解析。
- [x] ESLint 10 配置类型检查通过；推荐规则导致的 Promise 与 caught-error 报错按现代语法和 `cause` 语义修复。
- [x] 依赖兼容契约测试先 RED 后 GREEN；ESLint 实际加载配置并完成 lint。
- [x] `yarn lint`、`yarn tsc --noEmit`、完整 coverage（30 files / 105 tests）、Next 静态构建64 pages及内容/a11y/image/bundle/audit/diff coverage检查通过。
- [ ] 独立 PR 的本地 review、安全 review、远端 CI 均完成；合并后 HPB-4458 保持 In Progress，并跟踪 TypeScript 7 后续工单。

## 官方参考

- [typescript-eslint dependency versions](https://typescript-eslint.io/users/dependency-versions/)
- [typescript-eslint issue #12518: TypeScript 7 support](https://github.com/typescript-eslint/typescript-eslint/issues/12518)
- [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
