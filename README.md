# 3D Tilt Card — 通用 3D 交互卡片

通用 3D 交互卡片插件：**卡面朝向自动跟随鼠标**（hover 局部激活）、**可翻面**、
**镜面高光**、**卡面效果**（holo/rainbow/cosmos 全息箔）、零依赖单文件、空闲零渲染。
成就徽章是它的**默认预设场景**（程序化奖章 SVG + 稀有度四档配色即来源于此）——
产品卡、团队卡、证书卡、收藏卡等任何小内容卡片都可直接使用。

交互设计（调研定夺记录见工作区 `docs/RESEARCH-badge3d.md`）：
朝向跟随为 hover 局部激活（进入才挂监听、离开回正）；翻面支持 click/hover/drag/off
四种模式；卡面本体支持自定义图片，无图时用程序化 SVG 默认奖章；背面支持属性注入
默认排版或 slot 完全自定义。
沿革：v1.0.0–v1.1.0 早期名为 3dachievementbadge / `achievement-badge-3d`
（成就徽章专用），v1.1.0 起随卡面效果与通用化更名 **tiltcard / `tilt-card-3d`**。

## 嵌入方式

```html
<script src="tiltcard.js"></script>

<!-- 最简：程序化默认奖章（点击翻面） -->
<tilt-card-3d rarity="epic" title="百战不殆" desc="赢得 100 场对局" date="2026-10-11"></tilt-card-3d>

<!-- 自定义正面图片 + 加大倾斜 -->
<tilt-card-3d img="badge.png" rarity="legendary" title="传奇诞生" tilt="20"></tilt-card-3d>

<!-- slot 完全自定义背面 -->
<tilt-card-3d rarity="rare" title="连续七日">
  <div slot="back" style="display:flex;align-items:center;height:100%">任意 HTML</div>
</tilt-card-3d>
```

命名说明：自定义元素名不允许以数字开头，故标签为 `tilt-card-3d`；
JS 命名空间为 `window.__Widgets.tiltCard3d`（含 `version`）。

## 配置项（元素属性）

| 属性 | 默认 | 说明 |
|------|------|------|
| `rarity` | `common` | 稀有度四档：`common` / `rare` / `epic` / `legendary`（驱动发光、边框、缎带、背面角标配色） |
| `title` / `desc` / `date` | `卡片` / 无 | 背面默认排版内容（无 slot 时显示） |
| `rarity-label` | 按 rarity | 背面角标文字覆盖（如改为中文"史诗"） |
| `img` | 无 | 正面自定义图片 URL；加载失败自动回退默认奖章 |
| `size` | `160` | 宽度 px（高度 = size × ratio） |
| `ratio` | `card` | **宽高比（v1.2.0）**：预设 `card`(1.1) / `tarot`(1.72，塔罗牌) / `photo`(1.4) / `square`(1)，或直接写数字（钳制 0.5–3） |
| `art` | `medal` | **默认奖章开关（v1.2.0）**：`medal`（成就场景预设奖章）/ `none`（纯卡面，配 slot="front" 完全自绘） |
| `tilt` | `12` | 最大倾斜角（度），跟随灵敏度随此值 |
| `flip` | `click` | 翻面触发：`click` / `hover`（进出自动翻） / `drag`（左右拖 40px） / `off` |
| `glare` | `on` | 镜面高光开关（跟随光标位置的径向渐变；亮度∝倾斜角：居中→0、倾满→`GLARE_MAX`=0.55） |
| `surface` | `none` | 卡面效果（v1.1.0，按 [Pokemon Card Holo Effect](https://codepen.io/simeydotme/pen/PrQKgo) 卡牌形态复刻）：`holo`（普通全息：110° 彩虹扫动 + 扫描线质感）/ `rainbow`（彩虹稀有：-30° 七色渐变）/ `cosmos`（宇宙全息：窄带彩虹 + 深蓝夜幕）；4 倍超大背景随指针压缩扫动（约 2 个卡宽，原版同款手法），color-dodge 打在卡面上，正反面同享，可与任意稀有度/图片/翻面模式组合 |

### 主题换色（v1.2.0 CSS 变量）

全卡配色经四个 CSS 变量暴露（含奖章 SVG 渐变与描边），在元素上覆盖即整卡换色，
未覆盖时回退 `rarity` 预设色：

```css
tilt-card-3d {
  --tc-glow: #22d3ee;  /* 发光/缎带主色/卡框 */
  --tc-hi: #a5f3fc;    /* 金属环亮色 */
  --tc-lo: #0e7490;    /* 金属环暗色 */
  --tc-tag: #22d3ee;   /* 背面角标色 */
}
```

### slot

- `slot="front"`：完全自定义正面（设置 `img` 后正面的 slot 被图片替代）
- `slot="back"`：完全自定义背面（绝对定位铺满，自由排版）

### 多层卡面（v1.3.0 data-tc-offset）

学 [Atropos Showcase](https://atroposjs.com) 的盒装分层（设计分析见工作区
`references/tiltcard/atropos-showcase-design.md`）：`slot="front"` 内带
`data-tc-offset="N"` 的子元素随倾斜平移 N 像素——**负值后退（背景）、正值浮起
（标题/图标）、阶梯值表达层级**（如背景 -3 / 贴面文字 0 / 标题 2 / 图标 4.5）。

```html
<tilt-card-3d size="150" art="none" flip="hover">
  <div slot="front" style="position:absolute;inset:0;background:...">
    <div data-tc-offset="-3" style="position:absolute;inset:-9%;background:..."></div>  <!-- 背景层 -->
    <div data-tc-offset="2"  style="position:absolute;left:9%;top:36%;...">标题</div>   <!-- 浮起层 -->
    <div data-tc-offset="4.5" style="position:absolute;right:8%;bottom:8%;...">图标</div> <!-- 阶梯层 -->
  </div>
</tilt-card-3d>
```

约定：素材与背景**同构图坐标系**（absolute + inset 铺满对齐）；背景层外扩 5–10%
防扫动露边；N 钳制 ±10。与 `surface`/`theme`/`ratio` 正交组合。

### JS API

```js
const b = document.querySelector('tilt-card-3d');
b.toggleFlip();        // 翻面开关（可传 true/false 强制）；flip=off 时仍可调用
// window.__Widgets.tiltCard3d.version → '1.3.0'
```

键盘：元素可聚焦（`tabindex=0`），Enter/Space 翻面；`rarity="legendary"` 悬停时
有脉冲发光（唯一动画，仅 hover 期间运行）。

## 性能设计（四维）

- **体积**：29.4 KB 原始 / **10.44 KB gzip**（预算 50 KB）。
- **CPU**：空闲零 rAF、零常驻定时器（仅进入/离开瞬间各一个 80ms 的过渡清除定时器）；
  rect 在 `pointerenter` 激活期缓存一次、`pointerleave` 失效——**move/rAF 路径零布局
  读取**；跟随监听仅 hover 期间有实际负载，pointermove 被动监听 + rAF 合帧（实测
  交互期 61 帧/秒 ≈ 合帧上限，纯合成器写入）；**move 期间免 transition 即时跟手**
  （进出各一次 80ms 过渡，学 tilt.js）；后台页挂起（rAF 由浏览器节流）。
- **GPU**：只动 transform/opacity；`will-change` 仅 hover 期间存在；发光用渐变
  （无 `filter: blur`）； legendary 脉冲为 hover 期间唯一动画。卡面效果（`surface`）
  为**静态渐变 + mix-blend-mode**，零 filter、零图片素材，效果层随挂载创建（一次
  静态绘制，纯静态层热路径跳过），热路径仅向可见面的动态层写 transform/opacity。
- **内存**：每实例约 2 个合成层（hover 时提升、离开解除）；卸载清理全部监听。

## 已知限制

- 翻面/倾斜为 CSS 3D，非真 3D 模型（调研定夺：WebGL 超预算已排除）。
- 高光为**屏幕空间覆盖层**（stage 直接子级、3D 上下文之外）：一旦放进 preserve-3d
  内部，就会与旋转的面片共面/穿插——表现为倾斜与翻面过程中高光被交割线切开再
  "扩展"（v1.0.0 的竖缝 bug）。自行改造结构时保持高光层在 3D 上下文之外。
- Safari 需注意 3D 上下文：宿主勿在中间层加 `overflow:hidden`/`filter`
  （会压平 `preserve-3d`，导致背面隐藏失效）。
- `prefers-reduced-motion` 时倾斜/扫光关闭、翻面瞬时切换；卡面效果保持静态材质
  底色（不动、不增亮）。
- 卡面效果使用 `mix-blend-mode`（screen/color-dodge），层在面片内部（已脱离
  preserve-3d 链路的 2D 内容区），不影响 3D/翻面；Safari 上如遇混合模式渲染异常，
  优先排查宿主是否在面片内再叠 filter。
- 稀有度为四档固定配色；如需自定义色，用 `--tc-*` CSS 变量覆盖（见「主题换色」节），
  或改源码 `RARITY` 表。
- 拖拽模式在触屏上会阻断页面滚动（`touch-action: none`），仅在卡片上生效。

## 兼容性

目标为近两年主流浏览器的当前两个大版本：Chrome / Edge / Firefox / Safari（含桌面与
移动端）。用到的平台能力：Custom Elements + Shadow DOM v1（closed）、CSS 自定义属性、
`conic-gradient`/`mix-blend-mode`、Pointer Events、`backface-visibility`。无构建、无
 polyfill；`prefers-reduced-motion` 自动降级。

## 路线图

- [x] v1.0.0 — 基础：倾斜跟随、四模式翻面、稀有度预设、奖章 SVG 默认卡面
- [x] v1.1.0 — 卡面效果 surface（holo / rainbow / cosmos，PrQKgo 配方复刻）；更名
  tiltcard 通用化（原 3dachievementbadge）
- [x] v1.2.0 — theme（`--tc-*` 自定义配色）、ratio（card/tarot/photo/square）、
  art（奖章开关）
- [x] v1.3.0 — 多层卡面：`slot="front"` 子元素 `data-tc-offset` 阶梯视差
- [ ] 塔罗牌示例（等公版素材就位：`ratio="tarot"` + 牌背 slot）
- [ ] 触摸滚动角度判定、transformOrigin 跟随（次级借鉴项）
- [ ] 分层视差独立变体（`demo-parallax.html`）按需合并为 layers 深度模式

## 实验性：分层视差（Atropos 风格）

`demo-parallax.html` 是按 [Atropos](https://atroposjs.com/) Showcase 形态做的分层
视差页（2026-10-11 定夺：与卡片组件平行的**独立实现变体**，同一项目的多种实现，
不合入组件），**四个形态同屏展示**：

- **A · 纯视差**：图层在 z=0 上按 `data-depth` 像素做 2D 平移（经典 Atropos 手感，无倾斜）。
- **B · 视差 + 倾斜**：A 的 2D 平移 + 容器 rotateX/Y ±10°。
- **C · 厚度板**：卡面本体为带侧边的 3D 板（板厚 16px，倾斜时可见四侧边壁，
  如 PS5 游戏盒），板内内容按 `translateZ` 4–42px 悬浮产生**内部视差分层**；
  旋转跟随光标 ±12°。
- **D · 厚度板 · 强化**：C 的全部效果 + 内部层 2D 平移叠加（data-depth）+ ±18° 旋转。

全部跟随光标、rAF + 惯性 lerp、回正自动停帧、纯 transform 零依赖；
rect 激活期缓存（move 零布局读取）、will-change 仅交互期（Atropos/tilt.js 惯例）。
若后续要在其他项目里复用其交互（lerp 跟随 / 厚度板形态），以此文件为交互基线。

## 参考文献（References）

卡面效果与交互手感参考了以下开源作品——**只借鉴技法思路，未复制任何代码或素材**，
全部按本工作区 GPU 红线（零 `filter`、零图片素材、热路径仅 transform/opacity）
裁剪重构，实现均为原创：

| 来源 | 许可 | 借鉴了什么 | 我们的取舍 |
|---|---|---|---|
| [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) | **GPL-3.0** | 彩虹渐变 + `color-dodge`/`screen` 混合的箔面配方；多层不同速率的指针视差（`--background-x/y` 压缩映射）；rAF 合帧 + 指针变量驱动；「跟手快、回正慢弹」的弹簧手感；**surface 四形态（holo/rainbow/cosmos/glitter）即按其卡牌形态复刻** | 弃用其 `filter`（brightness/contrast/saturate）与 PNG 纹理素材；`background-position` 动画改为超大层 + `transform` 平移；弹簧简化为 CSS 过渡（跟手 80ms / 回正 320ms 轻过冲） |
| [Pokemon Card Holo Effect — CodePen PrQKgo](https://codepen.io/simeydotme/pen/PrQKgo) | 同上一仓库前身（同一作者） | 同上（本表此两项为同一技法体系） | 同上 |
| [nolimits4web/atropos](https://github.com/nolimits4web/atropos) | MIT | 交互惯例：rect 激活期缓存、`will-change` 仅交互期、高光透明度∝倾斜角 | 全部按惯例落实（T1–T4），实现自写 |
| 目标效果参考图（Figma 教程卡面截图，用户提供） | — | 锥形彩虹箔的观感基准；图案压在箔面上的层次关系 | 以 `conic-gradient` 复现，放射中心改为跟随指针 |

> 将来开源发布时，本表内容需同步进包内 `NOTICE.md`（见工作区 AGENTS.md 开源规范）。
> 注意 pokemon-cards-css 为 GPL-3.0：因仅借鉴思路、代码自写，本项目不受其传染约束，
> 但保留出处致谢。

## 目录

```
plugins/tiltcard/
├── src/tiltcard.js             # 源码 = 交付单文件（无构建）
├── dist/tiltcard.js            # 同 src（保持与 #1 相同的目录约定）
├── demo.html                   # 本地演示（双击即可打开）
└── demo-parallax.html          # 实验性分层视差验证页（未合入组件）
```

## 许可

MIT License（见 [LICENSE](LICENSE)）。第三方技法参考的来源与许可义务见
[NOTICE.md](NOTICE.md)（均为思路借鉴，未复制代码/素材）。
