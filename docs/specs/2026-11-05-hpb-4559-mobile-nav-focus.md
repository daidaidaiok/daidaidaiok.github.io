# HPB-4559：移动导航链接可见键盘焦点

## 意图与范围

修复 `components/MobileNav.tsx` 中两类导航链接（一级链接、子菜单链接）因 `outline outline-0` 清除焦点轮廓、又未提供 `focus-visible` 替代样式，导致键盘用户无法看到当前焦点的问题。

## 搜索结论（search-first）

- **本仓**：`css/tailwind.css` 已在 `@layer base` 为 `a:focus-visible` / `button:focus-visible` 提供 `outline: 2px solid` + `outline-color: primary-500`；`TextbooksExplorer` 另有组件级 `focus-visible:outline-*` 先例。
- **判定**：Adopt 现有全局焦点样式，不新增依赖、不新写工具类。

## 方案对比

1. **推荐 — 移除 `outline outline-0`**：让全局 `a:focus-visible` 生效；改动最小，深浅色均靠 primary-500 对比。
2. 组件级显式补 `focus-visible:outline-*`：与 TextbooksExplorer 对齐，但重复全局规则。
3. 改用 `focus-visible:ring-*`：视觉不一致，且绕开已有 outline 设计。

选定方案 1。

## 非目标

- 不改桌面导航、关闭按钮或分区折叠按钮样式（工单未点名；折叠按钮本身无 `outline-0`）。
- 不改导航结构或交互逻辑。

## 验收标准

- [x] 子菜单链接与一级链接 className 不再包含 `outline-0`（或等价清轮廓工具类）。
- [x] 键盘 `focus-visible` 时可见 primary 描边（复用全局样式）。
- [x] 针对上述行为有 Vitest 覆盖；`yarn test` 相关用例通过。
