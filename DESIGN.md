# 我的生活助手 · 视觉系统 v3「深空 / Deep Space」

> 版本 v3.0 ｜ 适用文件：`index.html`（单文件应用）
> 取代 v2「纸与墨」与更早的「液态玻璃」。**深色是唯一主题。**

---

## 1. 设计定位

v2「纸与墨」走极简编辑风：一 ground、一墨、一朱，用色调而非特效表达层级。
它解决了"每处都用默认手法"的问题，但留下三个可量化的弱点——标题最大 30px（无视觉焦点）、
全站只有 6 个动效元素、以及最要命的：**页面上不存在任何"被决定过"的交互手感**。

v3 把取向换成**深色科技**，补上两件事：

1. **首屏有主角**：问候语 `clamp(38px, 6.4vw, 92px)`，1440px 下 80–92px（5.6–6.4vw）。
2. **鼠标是界面的一部分**：跟手光斑、卡片 3D 倾斜、按钮磁吸、滚动进度、滚动入场编排。

一句话：**层级仍只由色调表达，但空间里多了光、深度，以及对指针的响应。**

---

## 2. 设计原则（实现时不可违反）

1. **四档色调定层级**：`base → surface → raised → sunken`。
   容器不用 1px 描边造卡（真实控件、表格、图表基线除外）。
2. **唯一强调色**：`--accent`（electric indigo）独占全部交互语义。
   `--atmos-cyan` / `--atmos-violet` **只做大气层，永不承载文字**。
3. **动效只动 `transform` 与 `opacity`**。颜色/布局级变化属于构图，不算动效。
4. **渐进增强，绝不隐藏内容**：入场动效靠 JS 加 `data-reveal`；
   无 JS、`prefers-reduced-motion: reduce`、`hover: none` 三种情况下内容都必须完整可见。
5. **视觉层不改 DOM 文本**。增强脚本只读状态，不解释应用逻辑。
   > 曾把 emoji 换成内联 SVG，因改写 `textContent` 而与测试断言（`/🍽 午餐/`）冲突，已移除。
6. **零回归**：不改 DOM 结构、元素 ID、类名、`data-*` 属性，不改功能逻辑。

---

## 3. 色彩令牌（`:root`，唯一定义处）

| 令牌 | 值 | 用途 |
|---|---|---|
| `--base` | `#08090c` | 页面底色 |
| `--surface` | `#13161e` | 抬升面：卡片、侧栏、弹窗底 |
| `--raised` | `#1b1f29` | 再抬升：hover、浮层、输入聚焦 |
| `--sunken` | `#0b0d12` | 凹陷：输入框、井、进度轨道 |
| `--ink` | `#f2f4f8` | 正文 |
| `--ink-strong` | `#ffffff` | 展示数字、主标题 |
| `--ink-mute` | `#a3abb9` | 次信息 |
| `--ink-faint` | `#7b8494` | 三级标注（仅小字） |
| `--accent` | `#7c95ff` | 唯一强调色 |
| `--on-accent` | `#07080b` | 强调底上的文字 |
| `--good` / `--note` / `--action` | `#43d69b` / `#f0b45e` / `#ff7a7a` | 仅语义状态 |
| `--atmos-cyan` | `#22d3ee` | 大气层专用 |
| `--r` / `--r-sm` | `12px` / `8px` | 全站仅两个圆角 |
| `--t` / `--t-out` | `cubic-bezier(.2,.8,.2,1)` / `(.16,1,.3,1)` | 全站缓动 |

**兼容别名必须保留**（JS 内联样式仍引用旧名）：
`--paper/--bg → base`、`--text → ink`、`--muted/--ink-soft → ink-mute`、
`--primary → accent`、`--primary-text → accent-ink`、`--primary-soft → accent-wash`、
`--ok/--danger/--warn → good/action/note`、`--ink-line/--hairline/--hairline-soft → rule`、`--well → sunken`。

> **深色优先的实现要点**：`:root` 是令牌的唯一来源。
> 旧版的 `html[data-theme="dark"]` 覆盖块已删除——它会在 `data-theme="dark"` 时
> 反向压过 `:root`，让配色回到上一版。
> `applyTheme()` 恒定输出 `'dark'`；设置页只保留一个"深空（深色）"选项。

---

## 4. 排版

- 字体栈：`SF Pro Display → Segoe UI Variable Display → PingFang SC → Microsoft YaHei UI → system-ui`。
  中文不引 webfont（体积不可接受），靠字号与字重建立层级。
- 阶梯收敛为 5 档：**display**（`clamp(38px,6.4vw,92px)`）、**title**（19px）、
  **body**（16px）、**small**（13px）、**micro**（11.5px）。
- 展示级字距 `-.044em`，正文行高 1.6，数字统一 `tabular-nums`。
- 正文不使用浅灰；`--ink-faint` 只用于小字标注。

---

## 5. 布局

- 栅格：12 列，间距 14px；桌面内容区最大 1100px，左右留白 52px。
- 侧栏 238px；≤860px 变为顶部横向导航条，**随页面滚走，不做粘性**。
- 首屏四张卡片 `7/5 + 5/7` 错位，不是等分四宫格。
- **关键坑（已修复）**：`body{overflow-x:hidden}` 会把 body 变成滚动容器、抢走 `html` 的滚动权，
  导致 `window.scrollTo` 只移动十几像素、粘性顶栏下移压住标题。
  现用 `overflow-x:clip`——只裁切，不建立滚动容器。
- 窄屏（≤640px）取消所有粘性元素：首屏高度本就紧张。

---

## 6. 动效层

`index.html` 末尾的「视觉增强层」脚本是纯增量：

| 手法 | 实现 |
|---|---|
| 大气层极光 | `.atmos::before/::after` 两团 `blur(70px)` 径向光，34s/44s 漂移 |
| 点阵网格 | `.grid-veil` 26px 径向点点阵 + 顶部活动光带 |
| 跟手光斑 | `#cursorGlow`，rAF 插值跟随（lerp 0.14） |
| 滚动进度 | `#scrollBar`，rAF 节流 |
| 卡片 3D 倾斜 | 写入 `--rx/--ry`，`perspective(900px)`，上限 5.5° |
| 卡片跟随高光 | 写入 `--mx/--my`，径向光随指针移动 |
| 按钮磁吸 | 90px 范围内按距离衰减位移（拉力 0.28） |
| 滚动入场 | `IntersectionObserver` + `data-reveal`，同组错开 70ms |

**降级**：`prefers-reduced-motion: reduce` 时不加 `data-reveal`、不建光斑与进度条；
`hover: none` 时关闭倾斜与磁吸。三种降级均在真实浏览器验证过。

---

## 7. 验证基线

| 指标 | 改造前（线上） | 改造后 |
|---|---|---|
| 门禁 FAIL | 11 | 3（刻意保留的美学选择，见下） |
| 首屏最大字号 | 30px（2.1vw） | 80–92px（5.6–6.4vw） |
| 动效元素 | 6 | 28 |
| 字号种数 | 10（11–30px） | 5 |
| emoji | 10 处 | 0（仅作氛围符号，不承担信息） |
| 横向溢出 | 0 | 0（1440 / 768 / 390 全通过） |
| 自带测试 | — | **110 / 110 通过** |

**刻意保留的 3 条（非遗漏）**：
`gradient` = 跟手光斑；`gradient-text` = 首屏标题的金属渐变；
`few-pictures` = 这是本地工具型应用，没有也无需要真实照片与视频。

> 门禁中的 `covered-text @768` 经实测为**误报**：页面比视口高 120px，
> 滚动到底时标题正好落在导航条下方那条区间里，属于正常滚动，非裁切或遮挡。

---

## 8. 修改入口

改动集中在 `index.html` 的 **`<style>` 块**与末尾的**视觉增强层 `<script>`**。

1. **改令牌**：只动 `:root`，其余全部引用变量。
2. **改圆角/缓动**：只动 `--r` / `--r-sm` / `--t` / `--t-out`。
3. **改动效强度**：增强层里 `MAX`（倾斜上限）、`PULL`（磁吸拉力）、`lerp 0.14`（光斑跟随）。
4. **验收**：`node <skill>/scripts/inspect.mjs index.html` 跑 1440/768/390；
   浏览器打开 `tests/runner.html` 必须 **110/110**。
