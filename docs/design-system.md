# Mini Dify 设计系统

> 本文档是 Mini Dify 前端的视觉设计单一事实来源。所有新 UI 工作必须从这里派生颜色、排版和模式。

## 1. 产品锚点

- **产品**：可视化 LLM 工作流构建器 — 在画布上编排 AI 管道
- **用户**：构建 AI 应用的开发者与技术创作者，在编辑器内长时间停留
- **核心交互**：读取节点图 → 理解数据流 → 配置参数 → 运行验证
- **视觉方向**：围绕模块化合成器的概念展开 — 白紫工作台、柔和信号高光、语义颜色区分节点角色

## 2. 色彩系统

品牌主色从登录页提取并统一。

### 2.1 基础色

| 令牌          | 色值                     | CSS 变量                | 用途                     |
| ------------- | ------------------------ | ----------------------- | ------------------------ |
| Base          | `#f6f3ff`                | `--color-base`          | 根背景色，偏紫白的工作台 |
| Surface       | `rgba(255,255,255,0.78)` | `--color-surface`       | 卡片、面板、抽屉背景     |
| Elevated      | `rgba(255,255,255,0.92)` | `--color-elevated`      | 悬浮态、hover 表层       |
| Border        | `rgba(124,58,237,0.14)`  | `--color-border`        | 默认描边                 |
| Border-strong | `rgba(124,58,237,0.24)`  | `--color-border-strong` | 高对比描边               |
| Input-bg      | `rgba(255,255,255,0.92)` | `--color-input-bg`      | 输入框填充               |

### 2.2 品牌强调色

| 令牌           | 色值                                        | CSS 变量                   | 用途                       |
| -------------- | ------------------------------------------- | -------------------------- | -------------------------- |
| Accent-purple  | `#a068ff`                                   | `--color-accent`           | 焦点态、主按钮、激活指示器 |
| Accent-cyan    | `#42dcdb`                                   | `--color-accent-secondary` | 辅助强调、链接、状态指示   |
| Gradient-brand | `linear-gradient(135deg, #a068ff, #42dcdb)` | `--gradient-brand`         | 品牌渐变，签名元素         |

### 2.3 语义节点色

仅用于工作流画布节点的类型区分：

| 节点类型 | 色值      | 物理类比                 |
| -------- | --------- | ------------------------ |
| LLM      | `#e8a838` | 暖琥珀 — 推理 = 热量     |
| 知识检索 | `#38b2cc` | 青色 — 数据查找 = 冷精度 |
| 代码执行 | `#48bb78` | 绿色 — 执行 = 通行       |
| 条件分支 | `#a855f7` | 紫色 — 分支路径          |
| 终止     | `#fc8181` | 柔红 — 结束信号          |
| 开始     | `#42dcdb` | 品牌青 — 入口            |

### 2.4 文字层级

| 层级        | 色值                    | CSS 变量             | 用途             |
| ----------- | ----------------------- | -------------------- | ---------------- |
| Primary     | `#2f2147`               | `--text-primary`     | 标题、正文       |
| Secondary   | `rgba(47,33,71,0.8)`    | `--text-secondary`   | 导航项、卡片描述 |
| Label       | `rgba(70,53,102,0.72)`  | `--text-label`       | 表单标签、小标题 |
| Muted       | `rgba(88,72,119,0.64)`  | `--text-muted`       | 时间戳、元信息   |
| Disabled    | `rgba(106,92,136,0.4)`  | `--text-disabled`    | 禁用态文字       |
| Placeholder | `rgba(106,92,136,0.42)` | `--text-placeholder` | 输入占位符       |

### 2.5 背景渐变氛围层

页面底色使用白紫渐变与柔和高光，避免深色背景带来的压迫感：

```css
/* 全局氛围背景 — 白紫工作台，紫色为主，辅以青色高光 */
background:
  radial-gradient(
    ellipse at 12% 18%,
    rgba(196, 181, 253, 0.72) 0%,
    transparent 50%
  ),
  radial-gradient(
    ellipse at 85% 22%,
    rgba(103, 232, 249, 0.28) 0%,
    transparent 42%
  ),
  radial-gradient(
    ellipse at 50% 88%,
    rgba(233, 213, 255, 0.88) 0%,
    transparent 40%
  ),
  radial-gradient(
    ellipse at 78% 70%,
    rgba(167, 139, 250, 0.18) 0%,
    transparent 40%
  ),
  linear-gradient(180deg, #fdfcff 0%, #f6f2ff 26%, #f3efff 60%, #eef6ff 100%);
```

## 3. 排版

### 3.1 字体选型

| 角色    | 字体               | CDN                                                        | 用途                                                 |
| ------- | ------------------ | ---------------------------------------------------------- | ---------------------------------------------------- |
| Display | **Urbanist**       | `@import url(...Urbanist:wght@600;700&display=swap)`       | 品牌名、页面主标题。仅在 20px 以上字号使用，保持克制 |
| Body    | **Inter**          | `@import url(...Inter:wght@400;500;600;700&display=swap)`  | 正文、按钮、标签、输入框。几乎所有 UI 文字           |
| Mono    | **JetBrains Mono** | `@import url(...JetBrains+Mono:wght@400;500&display=swap)` | 节点 ID、代码块、技术参数值、API key 展示            |

### 3.2 排印尺度（Tailwind v4 映射）

| 尺寸                  | 用法                               | 字重    |
| --------------------- | ---------------------------------- | ------- |
| `text-xs` (12px)      | 节点内标签、时间戳、徽章、表单标签 | 500/600 |
| `text-sm` (14px)      | 正文、卡片描述、输入框值           | 400/500 |
| `text-base` (15-16px) | 导航标签、面板标题、按钮           | 500/600 |
| `text-lg` (18px)      | 卡片标题、区块标题                 | 600     |
| `text-2xl` (24-28px)  | 页面主标题（使用 Urbanist）        | 700     |

### 3.3 特殊处理

- Display 字体（Urbanist）统一使用 `letter-spacing: -0.5px`
- 表单标签使用 `text-xs` + `uppercase` + `letter-spacing: 0.8px` + `font-weight: 600`
- Mono 字体场景使用 `font-size: 0.8125rem`（13px）以获得最佳可读性

## 4. 布局

### 4.1 核心 Shell

整个应用是全高度工作台：48px 顶部导航条 + 剩余空间内容区。

```
┌──────────────────────────────────────────────────┐
│ 顶部导航 (48px)                                   │
├──────────────────────────────────────────────────┤
│                                                  │
│  内容区（flex-1，overflow-auto）                   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.2 首页（AppListPage）

```
┌──────────────────────────────────────────────────┐
│ ◆ AgentForge                      [使用说明 →]    │ ← 48px
├──────────────────────────────────────────────────┤
│                                                  │
│   新建应用                                        │
│   ┌────────────────────────────────┬───────────┐ │
│   │ 应用名称...                     │  + 创建   │ │
│   └────────────────────────────────┴───────────┘ │
│                                                  │
│   应用列表                                       │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│   │ 客服助手  │ │ 问答验证  │ │ 内容审核  │        │
│   └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.3 编辑器页（AppEditorPage + WorkflowCanvas）

```
┌────────────────────────────────────────────────────┐
│ ← 返回  App名称          [检索调试] [数据集 3]      │ ← 48px
├────────────────────────────────────────────────────┤
│                                                     │
│   ┌───┐      ┌──────┐      [ 画布区域 ]            │
│   │ S │═════→│ LLM  │═══→                           │
│   └───┘      └──────┘                               │
│                                                     │
│                          ┌──────────────────┐       │
│                          │ 节点配置面板      │       │
│                          └──────────────────┘       │
└────────────────────────────────────────────────────┘
```

### 4.4 通用规则

- **卡片**：`bg-surface` + `border border-border` + `rounded-2xl`（24px）+ `backdrop-blur-2xl`
- **输入框**：`bg-black/30` + `border border-white/10` + `rounded-xl`（12px）+ focus 时 `border-accent` + `ring-4 ring-accent/10`
- **主按钮**：`bg-gradient-brand` + `text-white` + `rounded-xl`（12px）
- **次按钮**：`bg-surface` + `border border-white/10` + `text-secondary` + `rounded-xl`（12px）
- **不使用投影（box-shadow）表达深度**——用边框层级和 `backdrop-blur` 替代。投影对技术工具来说偏"软"

## 5. 组件约定

### 5.1 交互态

| 状态               | 处理方式                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Hover**          | 文字变亮（`text-primary`），背景升 1 级（`bg-elevated`），描边加强（`border-border-strong`） |
| **Focus**          | 紫色描边（`border-accent`）+ 4px 紫色弱光环（`ring-4 ring-accent/10`）                       |
| **Active / Press** | 缩小至 97%（`scale-[0.97]`）                                                                 |
| **Disabled**       | 整体 50% 透明度（`opacity-50`）+ 移除 Hover/Active 效果                                      |

### 5.2 状态展示

| 状态        | 模式                                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| **Loading** | 品牌渐变旋转环（`border-accent border-t-accent-secondary`），不使用纯色 spinner |
| **Empty**   | 居中一行文字引导操作，不使用感叹号或感叹语气的文案                              |
| **Error**   | toast 形式：右上角深色底 + 红色左边框，3 秒后消失。不在页面中心阻断用户         |

### 5.3 动效约定

- **页面进入**：`fadeDown`（header）+ `fadeUp`（内容），各 0.6-1s，`cubic-bezier(0.22, 1, 0.36, 1)`
- **Hover 过渡**：`0.3s ease` 用于颜色/背景切换；`0.4s cubic-bezier(0.22, 1, 0.36, 1)` 用于形变（scale/translate）
- **画布运行时**：连接线（edge）上出现流动光点——`stroke-dasharray` + `stroke-dashoffset` 动画沿 edge 路径移动。这是页面上唯一的持续动画，仅在 workflow run 期间出现
- **所有动画**必须包裹在 `@media (prefers-reduced-motion: no-preference)` 内，对 `prefers-reduced-motion: reduce` 用户直接展示最终态

### 5.4 Toast 通知

```css
/* 右上角浮层，深色底 + 语义色左边线 + 3px 圆角 */
.logo-toast-error {
  border-left-color: #fc8181;
}
.logo-toast-success {
  border-left-color: #48bb78;
}
```

## 6. Tailwind v4 集成

### 6.1 CSS 变量注入（index.css）

在 `@import "tailwindcss"` 之后的 `:root` 中定义所有 CSS 变量，使 Tailwind v4 可识别的自定义值可以直接在 utility class 中使用。

### 6.2 必须的 CDN 引用

```html
<!-- 已在 LoginPage.css 中使用，需提升至 index.html 全局可用 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Urbanist:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

## 7. 与现有代码的差异 & 迁移策略

当前 `index.css` 设置了亮模式默认值（`background: #f8fafc; color: #1e293b`），与登录页的暗色设计不一致。迁移步骤：

1. **更新 `index.css`**：将 `:root` 替换为暗色基础 + CSS 变量，字体系列改为 Inter
2. **更新 `index.html`**：添加字体 CDN 引用
3. **逐页迁移**：从 AppListPage 开始，逐步替换硬编码的 Tailwind 颜色为设计系统变量
4. **画布运行时动画**：作为最后一步的可选增强，不阻塞基础 UI 迁移

## 8. 签名元素

**品牌区域以下两点锁定**：

- **紫→青渐变色**（`#a068ff` → `#42dcdb`）出现在 logo、主按钮、焦点态、链接中
- **流动光点动画**沿工作流边（edge）追踪数据流路径——让不可见的信号变得可见
