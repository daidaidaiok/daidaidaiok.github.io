# HPB-4458 Batch 2：React 19 与类型

## 意图与范围

在已合并的 Next.js 16.4.4 / Contentlayer 基线上，把 React、React DOM 与对应类型升级到 React 19，移除 Next 16 的 React 18 弃用警告。保持 Vite 7/Vitest 5、TypeScript 5.9、ESLint 9、Contentlayer2 0.5.8 不变，作为 HPB-4458 的独立 PR。

## 版本与兼容性

- 当前分支基线：Next 16.4.4、React/react-dom 18.3.1、@types/react `^18.3.12`、@types/react-dom `^18.3.1`。
- 当前 npm registry 验证：React/react-dom 最新稳定版为 19.3.1，类型包为 19.3.0。
- Next 16.4.4、next-contentlayer2 0.5.8、@headlessui/react 2.2.10 与 next-themes 0.4.6 的 peer ranges 均接受 React 19。
- Next 16 peer 同时保留 React 18，但其 build 已实际发出 React 18 将在 Next 17 移除的弃用警告；本批按计划升级 runtime 与 types。

## 方案

1. **React 与类型一组升级（采用）**：将 react/react-dom 锁定到 19.3.1、@types/react/@types/react-dom 锁定到 19.3.0；通过 peer/build 契约与全量 TypeScript、测试、静态构建验证，不升级其他主版本。
2. **保持 React 18**：虽满足当前 Next peer，但继续保留已观察到的 Next16 弃用警告，不采用。
3. **连同 Vite、TypeScript 一次升级**：跨越多个独立问题域且违反拆分要求，不采用。

## React 19 源码兼容审查

已搜索本仓源代码：未发现 `ReactDOM.render`/`hydrate`、`findDOMNode`、无参数 `useRef()`、隐式返回的 ref callback、函数组件 `propTypes`/`defaultProps` 等常见迁移点。升级后仍以 TypeScript 与完整测试为准；如出现真实类型/运行问题，用最小回归测试再修复。

## 验收标准

- [x] React 与 React DOM 同步为 19.3.1，@types 包同步为 19.3.0；官方 Next/Headless UI/Contentlayer/root next-themes peer ranges 接受 React19。
- [x] TDD 契约 RED/GREEN；TypeScript、coverage（28 files / 99 tests）、Next16 静态构建（64 pages）、内容校验与手动搜索交互通过。
- [x] 以 Next16+React18 staging 为 bundle 基线：shared gzip 173,053→173,053 bytes（0.0%），所有路由通过 10%；本 PR 恢复临时阈值 10%。
- [ ] a11y、bundle/image、依赖审计、CodeQL 等远端 CI 全绿；独立 PR 合并后再开始 Batch 3。

## 本地验收记录（2026-11-04）

- Full suite：28 个 test files / 99 tests passed；`yarn tsc --noEmit`、`yarn lint`、frozen Yarn install、frontmatter/built content、a11y（6 routes，9 moderate/0 serious/critical）、image budget、Yarn audit high gate、npm audit high threshold、diff coverage 均通过。
- React19 browser smoke：主页 HTTP 200、标题正常；点击“搜索”后输入框可见，0 pageerror。
- 锁文件：修复 Yarn add 造成的 `picomatch@2.3.2` / `4.0.7` selector 合并，并用契约测试覆盖；将无关 TanStack/NAPI 更新恢复到 staging 锁定版本。frozen install 后 picomatch 2.3.2 与 4.0.7 分离，TanStack/NAPI 版本匹配 staging。
- Residual：`pliny@0.4.1` 自身 peer 接受 React19，但其嵌套 `kbar@0.1.0-beta.45` 与 `next-themes@0.3.0` peer 声明仅到 React18；此次没有 API 变更，直接 next-themes 是 0.4.6，且真实搜索交互通过。继续关注 CI 与交互回归。

## 官方参考

- [React 19 升级指南](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)：更新 React/React DOM 与 types；React19 类型调整包括 ref callback 返回值、useRef 初始参数和 ReactElement props。
- [React 19.3 发布说明](https://react.dev/blog/2026/09/09/react-19-3)：React 19.3 已发布。
- [Next.js 16 升级指南](https://nextjs.org/docs/app/guides/upgrading/version-16)：升级 Next16 时同步 React 与 `@types/react`。
