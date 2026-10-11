# NOTICE — 第三方参考与许可义务说明

本仓库（3D Tilt Card）的**全部代码均为原创实现**。开发过程中参考了以下开源项目与
资料的**技法思路**（未复制任何代码、素材或文本）；按借鉴内容与许可逐项说明如下。

## 1. simeydotme/pokemon-cards-css — GPL-3.0

- 上游：<https://github.com/simeydotme/pokemon-cards-css>
- 借鉴（思路）：卡面全息箔配方体系——彩虹渐变 + `color-dodge`/`screen` 混合、
  400% 超大背景随指针压缩扫动（`background-position` 映射）、多层 shine/glare 组织。
- 本项目实现：以纯 CSS 渐变 + 超大层 `transform` 平移等价复刻（`surface` 三形态），
  弃用其 `filter` 滤镜与 PNG 纹理素材。
- **义务**：仅思路借鉴不产生 GPL 传染义务；本仓库为 MIT。如需使用其源码或 PNG
  纹理素材，须遵循 GPL-3.0。

## 2. nolimits4web/atropos — MIT

- 上游：<https://github.com/nolimits4web/atropos> · 官网 <https://atroposjs.com>
- 借鉴（思路）：`data-atropos-offset` 多层卡面深度模型（Showcase 盒装分层）、
  rect 激活期缓存、高光透明度∝倾斜角、分层视差形态。
- 本项目实现：`data-tc-offset` 多层卡面属性与 `#applyTilt` 热路径，命名与结构自拟。

## 3. gijsroge/tilt.js — MIT

- 上游：<https://github.com/gijsroge/tilt.js>
- 借鉴（思路）：`will-change` 仅交互期加/离开移除；move 期间免 transition 即时写、
  enter/leave 才加过渡。

## 4. CodePen「Pokemon Card Holo Effect」（simeydotme, PrQKgo） — 参考原型

- 链接：<https://codepen.io/simeydotme/pen/PrQKgo>
- 上述 pokemon-cards-css 的原型；仅作技法体系参照，未复制代码。

## 5. 塔罗牌素材（规划中，尚未随包分发）

计划使用的塔罗牌面为 1909 年 Rider–Waite–Smith 原版扫描（Pamela Colman Smith 绘），
已进入公有领域（美国与来源国英国）。**注意**：U.S. Games Systems 1971 年后的
重配色版本仍有版权，不得使用。

## 6. 本仓库原创部分

- `src/tiltcard.js` / `dist/tiltcard.js`：MIT License（见 LICENSE）。
- `demo.html` / `demo-parallax.html`：演示页，同 MIT。
