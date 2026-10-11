/*!
 * 3D Tilt Card v1.3.0 — 通用 3D 交互卡片（网页嵌入式插件）
 *
 * 定位：任意小内容卡片的悬停倾斜跟随 + 翻面 + 镜面高光 + 卡面效果；
 * 成就徽章是它的默认预设场景（程序化奖章 SVG + 稀有度配色，v1.0.0 时期曾名
 * 3dachievementbadge / achievement-badge-3d，v1.1.0 起更名一般化）。
 *
 * 交互（用户定夺 D1=b / D2=d / D3=a / D4=c / D5=a，D6 命名后更名 tiltcard）：
 *   · 朝向跟随（D3=a）：hover 进入卡片才激活——enter 缓存 rect、move 缓存坐标、
 *     rAF 合帧写 rotateX/Y；move 期间免 transition 1:1 即时跟手，进出才有 80ms 过渡；
 *     离开回正并解除监听负载。局部交互，空闲零开销
 *   · 翻面（D2=d）：flip 属性 = click(默认) / hover / drag / off；
 *     rotateY 180° + 双面 backface-visibility:hidden；drag 模式用指针捕获+阈值触发
 *   · 卡面本体（D1=b）：img 属性自定义图片；无图时程序化 SVG 默认奖章
 *     （成就场景预设）；v1.2.0 art="none" 可关闭奖章得到纯卡面
 *   · 背面（D4=c）：title/desc/date 属性注入默认排版；slot="back" 完全自定义
 *   · 主题预设（D5=a）：rarity = common / rare / epic / legendary 四档配色；
 *     v1.2.0 全卡配色经 CSS 变量 --tc-glow/--tc-hi/--tc-lo/--tc-tag 暴露，
 *     宿主在元素上覆盖即整卡换色（奖章 SVG 一并生效，回退稀有度原色）
 *   · 宽高比（v1.2.0）：ratio = card(1.1 默认) / tarot(1.72，塔罗牌) / photo(1.4) /
 *     square(1) 或直接写数字（0.5–3），适配任意卡型
 *   · 多层卡面（v1.3.0，学 Atropos Showcase data-atropos-offset）：
 *     slot="front" 内带 data-tc-offset="N" 的子元素按 N(px) 随倾斜平移——
 *     负值后退（背景）、正值浮起（名称字/图标）、阶梯值表达层级；
 *     素材需与背景同构图坐标（absolute 铺满），transform-only 零布局读取
 *   · 卡面效果（v1.1.0）：surface = holo(普通全息) / rainbow(彩虹稀有) / cosmos(宇宙
 *     全息)，按 pokemon-cards-css（PrQKgo Pen）的卡牌形态复刻——
 *     4 倍超大彩虹背景随指针压缩扫动 + color-dodge 打在卡面上，正反面同享；
 *     零 filter、零图片素材（原版滤镜与 PNG 纹理按 GPU 红线排除），
 *     热路径只写 transform/opacity，效果层随挂载创建
 *
 * 工程约束（与 grokbot 同源）：
 *   · Shadow DOM(closed)；唯一全局入口 window.__Widgets.tiltCard3d
 *   · 只动 transform/opacity；will-change 仅 hover 期间；无滤镜、无常驻动画
 *   · 空闲零 rAF、零定时器；卸载清理全部监听；Safari 隐藏面切换 pointer/visibility
 *   · reduced-motion：倾斜与扫光关闭，翻面瞬时切换
 *
 * 嵌入：<script src="dist/tiltcard.js"></script>
 *       <tilt-card-3d rarity="epic" title="首次胜利"></tilt-card-3d>
 * 注：自定义元素名不允许以数字开头，标签名为 tilt-card-3d。
 */
(() => {
  'use strict';

  /* ---------- 可调常量 ---------- */
  const TILT_DEFAULT = 12;      // 默认最大倾斜角（度）
  const PERSPECTIVE = 900;      // 透视距离（px），决定 3D 深度感
  const FLIP_MS = 600;          // 翻面过渡时长
  const TILT_EASE = 80;         // 跟随平滑时长（ms）——短=实时手感
  const LEAVE_EASE = 320;       // 回正时长（ms）——学 pokemon-cards 弹簧：跟手快、回正慢弹
  const GLARE_MAX = 0.55;       // 高光最大不透明度
  const DRAG_THRESHOLD = 40;    // drag 模式翻面的水平触发距离（px）
  const TAG_TEXT = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };

  /* 宽高比预设（v1.2.0 ratio 属性）：数值 = 高/宽；也可直接写数字 */
  const RATIO_PRESET = { card: 1.1, tarot: 1.72, photo: 1.4, square: 1 };

  /* 稀有度四档固定配色（D5=a）：glow=发光/缎带主色，hi/lo=金属环明暗，tag=角标色。
     v1.2.0 起全部经 CSS 变量 --tc-glow/--tc-hi/--tc-lo/--tc-tag 暴露，
     宿主可在元素上覆盖（var 回退到稀有度原色） */
  const RARITY = {
    common:    { glow: '#9aa4b2', hi: '#e8edf4', lo: '#8a93a3', tag: '#aab3c0' },
    rare:      { glow: '#3b82f6', hi: '#bfdcff', lo: '#2563eb', tag: '#60a5fa' },
    epic:      { glow: '#a855f7', hi: '#e9d5ff', lo: '#9333ea', tag: '#c084fc' },
    legendary: { glow: '#f59e0b', hi: '#fde68a', lo: '#d97706', tag: '#fbbf24' },
  };

  /* 卡面效果配方（surface，v1.1.0，按 pokemon-cards-css / PrQKgo Pen 的卡牌形态复刻）：
     层全部盖在图案上（箔在画上，原版同款）；超大层 + 平移复刻其 background-position
     压缩滑动——原版 400% 背景随指针扫过约 2 个卡宽，此处 4 倍层（inset:-150%）配
     mx 25 / my 32（×4 = 100%/128% 卡宽）同效；blend 分层还原各形态。
     零 filter、零图片素材（原版的 brightness/contrast/saturate 滤镜与 PNG 纹理
     按本工作区 GPU 红线排除），热路径只写 transform/opacity。 */
  const FX = {
    /* 普通全息（regular holo）：110° 彩虹 ×3 循环扫动（color-dodge）+ 扫描线质感（overlay） */
    holo: [
      { inset: '-150%', blend: 'color-dodge', base: .4, lift: .2, mx: 25, my: 32,
        bg: 'repeating-linear-gradient(110deg,hsl(258,85%,66%),hsl(215,90%,64%),hsl(150,75%,58%),hsl(55,95%,62%),hsl(18,90%,62%),hsl(258,85%,66%),hsl(215,90%,64%),hsl(150,75%,58%),hsl(55,95%,62%),hsl(18,90%,62%),hsl(258,85%,66%),hsl(215,90%,64%),hsl(150,75%,58%),hsl(55,95%,62%),hsl(18,90%,62%))' },
      { inset: '0', blend: 'overlay', base: .2, lift: .1,
        bg: 'repeating-linear-gradient(90deg,rgba(0,0,0,.5) 0 1px,rgba(120,120,120,.5) 1px 2px)' },
    ],
    /* 彩虹稀有（rainbow / secret rare）：-30° 七色渐变 ×3 循环扫动（color-dodge） */
    rainbow: [
      { inset: '-150%', blend: 'color-dodge', base: .8, lift: .2, mx: 25, my: 32,
        bg: 'linear-gradient(-30deg,hsl(0,57%,42%),hsl(40,53%,44%),hsl(90,60%,40%),hsl(180,60%,40%),hsl(210,57%,44%),hsl(280,55%,38%),hsl(330,60%,42%),hsl(0,57%,42%),hsl(40,53%,44%),hsl(90,60%,40%),hsl(180,60%,40%),hsl(210,57%,44%),hsl(280,55%,38%),hsl(330,60%,42%),hsl(0,57%,42%))' },
    ],
    /* 宇宙全息（cosmos）：82° 窄带彩虹扫动（soft-light）+ 深蓝夜幕罩（multiply） */
    cosmos: [
      { inset: '-150%', blend: 'soft-light', base: .6, lift: .3, mx: 25, my: 32,
        bg: 'repeating-linear-gradient(82deg,hsl(53,65%,60%),hsl(93,56%,50%),hsl(176,54%,49%),hsl(228,59%,55%),hsl(283,60%,55%),hsl(326,59%,51%),hsl(283,60%,55%),hsl(228,59%,55%),hsl(176,54%,49%),hsl(93,56%,50%),hsl(53,65%,60%))' },
      { inset: '0', blend: 'multiply', base: .3, lift: .1,
        bg: 'linear-gradient(160deg,rgba(16,20,40,.85),rgba(40,20,70,.75))' },
    ],
  };

  /* 程序化默认奖章（D1=b，成就场景预设）：金属环 + 星章 + 缎带，纯渐变无滤镜。
     v1.2.0：颜色经 style 属性走 --tc-* 变量（回退稀有度原色），宿主覆盖变量即整卡换色 */
  function medalSVG(r) {
    const c = RARITY[r] || RARITY.common;
    const uid = 'b' + r;
    /* sv(css 属性, 变量名, 稀有度回退色)：颜色走 --tc-* 变量，宿主可整体覆盖 */
    const sv = (css, vn, v) => 'style="' + css + ':var(--tc-' + vn + ',' + v + ')"';
    return '<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + uid + 'm" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" ' + sv('stop-color', 'hi', c.hi) + '/><stop offset=".5" ' + sv('stop-color', 'lo', c.lo) + '/>' +
      '<stop offset="1" ' + sv('stop-color', 'hi', c.hi) + '/></linearGradient>' +
      '<radialGradient id="' + uid + 'g" cx=".5" cy=".42" r=".6">' +
      '<stop offset="0" ' + sv('stop-color', 'glow', c.glow) + ' stop-opacity=".9"/>' +
      '<stop offset="1" ' + sv('stop-color', 'glow', c.glow) + ' stop-opacity=".12"/></radialGradient>' +
      '<linearGradient id="' + uid + 'r" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" ' + sv('stop-color', 'glow', c.glow) + '/><stop offset="1" ' + sv('stop-color', 'lo', c.lo) + '/>' +
      '</linearGradient></defs>' +
      '<circle cx="100" cy="96" r="82" fill="url(#' + uid + 'g)"/>' +
      '<circle cx="100" cy="96" r="64" fill="#1d2129" stroke="url(#' + uid + 'm)" stroke-width="10"/>' +
      '<circle cx="100" cy="96" r="50" fill="none" ' + sv('stroke', 'glow', c.glow) + ' stroke-opacity=".35" stroke-width="2"/>' +
      '<polygon fill="url(#' + uid + 'm)" points="100,52 113.2,82.4 146.4,85.6 121.8,107.8 129.1,140.4 100,123.4 70.9,140.4 78.2,107.8 53.6,85.6 86.8,82.4"/>' +
      '<polygon points="66,150 134,150 146,206 100,186 54,206" fill="url(#' + uid + 'r)" ' + sv('stroke', 'lo', c.lo) + ' stroke-width="3"/>' +
      '<text x="100" y="172" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="700" fill="#fff" fill-opacity=".92">' + TAG_TEXT[r] + '</text>' +
      '</svg>';
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const flipModeOk = (v) => (v === 'hover' || v === 'drag' || v === 'off' ? v : 'click');

  class TiltCard3D extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'img', 'title', 'desc', 'date', 'rarity', 'tilt', 'flip', 'surface', 'ratio', 'art'];
    }

    connectedCallback() {
      if (this.#ready) return;
      this.#init();
    }

    disconnectedCallback() { this.#destroy(); }

    attributeChangedCallback(name, oldV, newV) {
      if (!this.#ready || oldV === newV) return;
      if (name === 'size') this.#applySize();
      else if (name === 'img') this.#applyFront();
      else if (name === 'title' || name === 'desc' || name === 'date' || name === 'rarity-label') this.#applyInfo();
      else if (name === 'rarity') this.#applyRarity();
      else if (name === 'tilt') this.#tiltMax = Math.max(0, parseFloat(newV) || TILT_DEFAULT);
      else if (name === 'flip') {
        this.#flipMode = flipModeOk(newV);
        this.#applyFlipMode();
      }
      else if (name === 'surface') this.#applySurface(newV);
      else if (name === 'ratio') this.#applyRatio();
      else if (name === 'art') {
        this.#art = newV === 'none' ? 'none' : 'medal';
        this.#applyFront();
      }
    }

    /** 翻面开关（flip=off 时宿主代码仍可调用） */
    toggleFlip(force) {
      this.#flipped = force === undefined ? !this.#flipped : !!force;
      this.#flipEl.classList.toggle('flipped', this.#flipped);
      this.#syncFaces();
    }

    /* ----- 内部状态 ----- */
    #ready = false; #destroyed = false;
    #shadow = null;
    #tiltEl; #flipEl; #glareEl; #faceF; #faceB; #frontSlot;
    #imgEl; #defBadge; #tEl; #dEl; #dtEl; #tagEl;
    #tiltMax = TILT_DEFAULT;
    #flipMode = 'click';
    #flipped = false;
    #raf = 0; #px = 0; #py = 0;
    #rect = null;   // 激活期缓存的几何（T1：move/rAF 路径零布局读取），leave 失效
    #easeTimer = 0; // T3：进出过渡的清除定时器（80ms 后移除 inline transition）
    #surface = 'none';
    #fxF = null; #fxB = null; // 正/反面效果层（surface 惰性创建，首次 hover 时）
    #ratio = 1.1;              // v1.2.0：高/宽比（ratio 属性，预设见 RATIO_PRESET）
    #art = 'medal';            // v1.2.0：默认奖章 art=medal / art=none 纯卡面
    #layers = null;            // v1.3.0：slot="front" 内 data-tc-offset 多层（enter 时采集）
    #dragStartX = null; #dragFired = false;
    #reduced = false;
    #offEnter; #offMove; #offLeave; #offClick; #offDown; #offUp; #offKey;
    #offEnter2; #offLeave2;

    #init() {
      this.#shadow = this.attachShadow({ mode: 'closed' });
      this.#reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.hasAttribute('role')) {
        this.setAttribute('role', 'button');
        this.setAttribute('tabindex', '0');
      }

      this.#flipMode = flipModeOk(this.getAttribute('flip'));
      this.#tiltMax = Math.max(0, parseFloat(this.getAttribute('tilt')) || TILT_DEFAULT);
      this.#art = this.getAttribute('art') === 'none' ? 'none' : 'medal';
      const surfaceAttr = this.getAttribute('surface');
      if (surfaceAttr && FX[surfaceAttr]) this.#surface = surfaceAttr;

      const rarity = this.#rarity();
      const st = document.createElement('style');
      st.textContent = this.#styleText(rarity);
      /* 结构：stage(perspective) → tilt(跟随) → flip(翻面) → 双面 */
      const stage = document.createElement('div');
      stage.className = 'stage';
      this.#tiltEl = document.createElement('div');
      this.#tiltEl.className = 'tilt';
      this.#flipEl = document.createElement('div');
      this.#flipEl.className = 'flip';

      /* 正面：img 属性 > slot="front" > 程序化默认徽章 */
      this.#faceF = document.createElement('div');
      this.#faceF.className = 'face front';
      this.#defBadge = document.createElement('div');
      this.#defBadge.className = 'badge';
      this.#defBadge.innerHTML = medalSVG(rarity); // 静态自产模板，无外部输入
      const frontSlot = document.createElement('slot');
      frontSlot.name = 'front';
      this.#frontSlot = frontSlot; // v1.3.0：采集 slot 内 data-tc-offset 多层
      this.#imgEl = document.createElement('img');
      this.#imgEl.className = 'badge-img';
      this.#imgEl.alt = '';
      this.#imgEl.draggable = false;
      this.#faceF.append(this.#defBadge, frontSlot, this.#imgEl);

      /* 背面：属性注入默认排版，slot="back" 完全自定义（D4=c） */
      this.#faceB = document.createElement('div');
      this.#faceB.className = 'face back';
      const info = document.createElement('div');
      info.className = 'info';
      this.#tagEl = document.createElement('span');
      this.#tagEl.className = 'tag';
      this.#tEl = document.createElement('h3');
      this.#tEl.className = 'title';
      this.#dEl = document.createElement('p');
      this.#dEl.className = 'desc';
      this.#dtEl = document.createElement('span');
      this.#dtEl.className = 'date';
      info.append(this.#tagEl, this.#tEl, this.#dEl, this.#dtEl);
      const backSlot = document.createElement('slot');
      backSlot.name = 'back';
      this.#faceB.append(info, backSlot);

      this.#glareEl = document.createElement('div');
      this.#glareEl.className = 'glare';

      this.#flipEl.append(this.#faceF, this.#faceB);
      this.#tiltEl.append(this.#flipEl);
      stage.append(this.#tiltEl);
      /* 高光层放在 3D 上下文之外（stage 直接子级、DOM 序最后 = 恒在最上）：
         它是屏幕空间效果，一旦进入 preserve-3d 就会与旋转的面片共面/穿插，
         表现为倾斜/翻面过程中高光被交割线切开再"扩展"。 */
      stage.append(this.#glareEl);
      this.#shadow.append(st, stage);

      this.#applyRatio();
      this.#applyFront();
      this.#applyInfo();
      this.#applyRarity();
      this.#ensureFx(); // 材质即卡面：效果层随挂载创建（静态渐变一次绘制）

      /* 事件：跟随为 hover 局部（D3=a），move 仅在指针位于徽章上时到来 */
      this.#offEnter = on(this, 'pointerenter', () => {
        if (this.#destroyed) return;
        this.#rect = this.getBoundingClientRect(); // 激活期缓存一次，离开失效
        this.#collectLayers(); // v1.3.0：采集 slot 内 data-tc-offset 多层
        this.#flipEl.classList.add('live'); // will-change 仅交互期间
        this.#easeTilt(); // 首次倾斜缓入；此后 move 期间免过渡即时跟手
      });
      this.#offMove = on(this, 'pointermove', (e) => this.#onMove(e), { passive: true });
      this.#offLeave = on(this, 'pointerleave', () => this.#onLeave());
      this.#offClick = on(this, 'click', () => { if (this.#flipMode === 'click') this.toggleFlip(); });
      this.#offDown = on(this, 'pointerdown', (e) => {
        this.#dragStartX = e.clientX; this.#dragFired = false;
        if (this.#flipMode === 'drag' && this.setPointerCapture) {
          try { this.setPointerCapture(e.pointerId); } catch (_) { /* 已释放时忽略 */ }
        }
      });
      this.#offUp = on(this, 'pointerup', () => { this.#dragStartX = null; });
      this.#offKey = on(this, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggleFlip(); }
      });

      this.#ready = true;
      this.#applyFlipMode(); // 按 flip 模式接上 hover 翻面
    }

    #destroy() {
      if (this.#destroyed) return;
      this.#destroyed = true;
      if (this.#raf) { cancelAnimationFrame(this.#raf); this.#raf = 0; }
      clearTimeout(this.#easeTimer);
      this.#rect = null;
      if (this.#offEnter) this.#offEnter(); if (this.#offMove) this.#offMove();
      if (this.#offLeave) this.#offLeave(); if (this.#offClick) this.#offClick();
      if (this.#offDown) this.#offDown(); if (this.#offUp) this.#offUp();
      if (this.#offKey) this.#offKey();
      if (this.#offEnter2) this.#offEnter2(); if (this.#offLeave2) this.#offLeave2();
      this.#resetLayers(); // 宿主 slot 元素复位（卸载时不残留位移）
      this.#layers = null; // 释放多层引用
      this.#fxF = this.#fxB = null; // 释放效果层引用
      this.#shadow = null;
    }

    /* v1.2.0 ratio：高/宽比，预设（card/tarot/photo/square）或数字，钳制 0.5–3 */
    #applyRatio() {
      const v = this.getAttribute('ratio');
      const n = (v && RATIO_PRESET[v]) ? RATIO_PRESET[v] : parseFloat(v);
      this.#ratio = n > 0 ? Math.min(3, Math.max(.5, n)) : 1.1;
      this.#applySize();
    }

    #applySize() {
      const s = Math.max(48, parseFloat(this.getAttribute('size')) || 160);
      this.style.width = s + 'px';
      this.style.height = Math.round(s * this.#ratio) + 'px';
    }

    #applyFront() {
      const src = this.getAttribute('img');
      const hasImg = !!src;
      const showMedal = this.#art === 'medal' && !hasImg; // art=none 时纯卡面
      this.#imgEl.style.display = hasImg ? 'block' : 'none';
      this.#defBadge.style.display = showMedal ? 'block' : 'none';
      if (hasImg) {
        this.#imgEl.onerror = () => { // 图片失效回退默认奖章（art=none 时回退纯卡面）
          this.#imgEl.style.display = 'none';
          this.#defBadge.style.display = this.#art === 'medal' ? 'block' : 'none';
        };
        this.#imgEl.src = src;
      } else {
        this.#imgEl.removeAttribute('src');
      }
    }

    #applyInfo() {
      const title = this.getAttribute('title') || '卡片';
      this.#tEl.textContent = title;
      this.setAttribute('aria-label', title + '（3D 卡片）');
      const desc = this.getAttribute('desc');
      const date = this.getAttribute('date');
      this.#dEl.textContent = desc || '';
      this.#dEl.style.display = desc ? '' : 'none';
      this.#dtEl.textContent = date || '';
      this.#dtEl.style.display = date ? '' : 'none';
      const label = this.getAttribute('rarity-label');
      this.#tagEl.textContent = label || TAG_TEXT[this.#rarity()];
    }

    #rarity() {
      const r = this.getAttribute('rarity');
      return RARITY[r] ? r : 'common';
    }

    #applyRarity() {
      const r = this.#rarity();
      this.#defBadge.innerHTML = medalSVG(r);
      this.#tagEl.textContent = this.getAttribute('rarity-label') || TAG_TEXT[r];
      const st = this.#shadow && this.#shadow.querySelector('style');
      if (st) st.textContent = this.#styleText(r);
    }

    #applyFlipMode() {
      if (!this.#ready) return;
      this.style.touchAction = this.#flipMode === 'drag' ? 'none' : '';
      if (this.#offEnter2) { this.#offEnter2(); this.#offEnter2 = null; }
      if (this.#offLeave2) { this.#offLeave2(); this.#offLeave2 = null; }
      if (this.#flipMode === 'hover') {
        this.#offEnter2 = on(this, 'pointerenter', () => this.toggleFlip(true));
        this.#offLeave2 = on(this, 'pointerleave', () => this.toggleFlip(false));
      } else if (this.#flipped && this.#flipMode === 'off') {
        this.toggleFlip(false);
      }
    }

    /* hover 局部跟随（D3=a）：rAF 合帧，transition 负责平滑 */
    #onMove(e) {
      if (!this.#ready || this.#destroyed) return;
      this.#px = e.clientX; this.#py = e.clientY;
      if (this.#flipMode === 'drag') this.#onDrag(e);
      if (this.#raf || this.#reduced) return;
      this.#raf = requestAnimationFrame(() => { this.#raf = 0; this.#applyTilt(); });
    }

    #onDrag(e) {
      if (this.#flipMode !== 'drag' || this.#dragStartX === null || this.#dragFired) return;
      if (Math.abs(e.clientX - this.#dragStartX) > DRAG_THRESHOLD) {
        this.#dragFired = true;
        this.toggleFlip();
      }
    }

    /* T3（学 tilt.js）：transition 只在进入/离开瞬间存在——move 期间免过渡即时跟手；
       回正弹性（学 pokemon-cards 弹簧手感）：进入短过渡缓入，离开用更长且轻微
       过冲的曲线慢弹回正；reduced-motion 直接跳过（等价 transition 0） */
    #easeTilt(ms = TILT_EASE, easing = 'ease-out') {
      if (this.#reduced) return;
      const el = this.#tiltEl;
      el.style.transition = 'transform ' + ms + 'ms ' + easing;
      clearTimeout(this.#easeTimer);
      this.#easeTimer = setTimeout(() => { el.style.transition = ''; }, ms);
    }

    #applyTilt() {
      const r = this.#rect;
      if (!r) return; // leave 失效后 rAF 残帧的防御
      const dx = clamp((this.#px - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      const dy = clamp((this.#py - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
      this.#tiltEl.style.transform =
        'rotateX(' + (-dy * this.#tiltMax).toFixed(2) + 'deg) rotateY(' + (dx * this.#tiltMax).toFixed(2) + 'deg)';
      if (this.getAttribute('glare') !== 'off') { // 高光跟随光标（镜面反射位置感）
        const gx = 50 + dx * 42, gy = 50 + dy * 42;
        this.#glareEl.style.background =
          'radial-gradient(circle at ' + gx.toFixed(1) + '% ' + gy.toFixed(1) + '%, rgba(255,255,255,1), rgba(255,255,255,0) 60%)';
        /* T4（学 Atropos）：亮度∝倾斜角，居中→0、倾满→GLARE_MAX；
           GLARE_MAX 从渐变色标移到元素 opacity，峰值亮度不变 */
        this.#glareEl.style.opacity = Math.max(Math.abs(dx), Math.abs(dy)) * GLARE_MAX;
      }
      if (this.#fxF) this.#applyFx(dx, dy); // 卡面效果随倾斜滑动/增亮
      if (this.#layers && this.#layers.length) this.#applyLayers(dx, dy); // v1.3.0 多层视差
    }

    /* v1.3.0 多层卡面（学 Atropos Showcase data-atropos-offset）：
       slot="front" 内带 data-tc-offset="N" 的子元素按 N(px) 随倾斜平移——
       负值后退（背景）、正值浮起（名称字/图标）、阶梯值表达层级；
       transform-only 合成器路径，元素几何由宿主布局负责（见 README 多层卡面节） */
    #collectLayers() {
      const els = this.#frontSlot.assignedElements({ flatten: true })
        .flatMap((n) => [n, ...n.querySelectorAll('[data-tc-offset]')])
        .filter((n) => n.hasAttribute('data-tc-offset'));
      this.#layers = els.map((n) => ({
        el: n,
        n: Math.max(-10, Math.min(10, parseFloat(n.getAttribute('data-tc-offset')) || 0)),
      }));
    }

    #applyLayers(dx, dy) {
      for (const l of this.#layers)
        l.el.style.transform =
          'translate3d(' + (dx * l.n).toFixed(1) + 'px,' + (dy * l.n).toFixed(1) + 'px,0)';
    }

    #resetLayers() {
      if (this.#layers) for (const l of this.#layers) l.el.style.transform = '';
    }

    /* 卡面效果热路径（v1.1.0）：只写 transform/opacity（合成器路径，无 filter），
       只处理当前可见面；纯静态层（无旋转/平移/增亮）创建时已定妆，跳过；
       离开时由 #resetFx 复位为静态材质 */
    #applyFx(dx, dy) {
      const t = Math.max(Math.abs(dx), Math.abs(dy));
      const layers = this.#flipped ? this.#fxB : this.#fxF;
      for (const l of layers) {
        if (!l.rot && !l.mx && !l.my && !l.lift) continue;
        let tf = '';
        if (l.mx || l.my)
          tf = 'translate3d(' + (dx * l.mx).toFixed(1) + '%,' + (dy * l.my).toFixed(1) + '%,0)';
        if (l.rot)
          tf += 'rotate(' + ((dx + dy * .5) * l.rot).toFixed(2) + 'deg)';
        l.el.style.transform = tf;
        l.el.style.opacity = Math.min(1, l.base + t * l.lift).toFixed(3);
      }
    }

    #resetFx() {
      for (const set of [this.#fxF, this.#fxB]) {
        if (!set) continue;
        for (const l of set) { l.el.style.transform = ''; l.el.style.opacity = l.base; }
      }
    }

    /* 效果层惰性创建：首次 hover 才建 DOM；surface 变更时重建。
       under 层插到面片内容（图案/文字）之下——材质即卡面底材；其余盖在内容上 */
    #ensureFx() {
      if (this.#fxF || this.#surface === 'none') return;
      const spec = FX[this.#surface];
      this.#fxF = spec.map((s) => this.#makeFxLayer(s));
      this.#fxB = spec.map((s) => this.#makeFxLayer(s));
      for (const [set, face] of [[this.#fxF, this.#faceF], [this.#fxB, this.#faceB]]) {
        const under = document.createDocumentFragment();
        set.forEach((l, i) => { if (spec[i].under) under.appendChild(l.el); });
        if (under.childNodes.length) face.insertBefore(under, face.firstChild);
        set.forEach((l, i) => { if (!spec[i].under) face.appendChild(l.el); });
      }
      if (spec.some((s) => s.under)) this.#flipEl.classList.add('surfaced'); // 仅不透明底材需要深色排版
    }

    #makeFxLayer(s) {
      const el = document.createElement('div');
      el.className = 'fx';
      el.style.inset = s.inset;
      el.style.background = s.bg;
      if (s.blend) el.style.mixBlendMode = s.blend;
      if (s.size) el.style.backgroundSize = s.size;
      if (s.pos) el.style.backgroundPosition = s.pos;
      el.style.opacity = s.base; // 静止材质定妆（reduced-motion 下保持此态不动）
      return { el, mx: s.mx || 0, my: s.my || 0, rot: s.rot || 0, base: s.base, lift: s.lift || 0 };
    }

    #applySurface(v) {
      const next = v && FX[v] ? v : 'none';
      if (next === this.#surface) return;
      this.#surface = next;
      if (this.#fxF) { // 旧效果层移除
        for (const set of [this.#fxF, this.#fxB])
          for (const l of set) l.el.remove();
        this.#fxF = this.#fxB = null;
      }
      this.#flipEl.classList.remove('surfaced');
      if (next !== 'none') this.#ensureFx(); // 按新 surface 重建
    }

    #onLeave() {
      this.#rect = null; // 缓存失效，重新进入时刷新
      this.#glareEl.style.opacity = '0';
      if (this.#fxF) this.#resetFx(); // 效果层复位为静态材质
      this.#resetLayers(); // 多层复位
      this.#flipEl.classList.remove('live'); // 解除合成层提升
      if (this.#raf) { cancelAnimationFrame(this.#raf); this.#raf = 0; }
      this.#easeTilt(LEAVE_EASE, 'cubic-bezier(.2,.65,.3,1.12)'); // 慢弹回正（轻过冲）
      this.#tiltEl.style.transform = 'rotateX(0deg) rotateY(0deg)';
      if (this.#flipMode === 'hover') this.toggleFlip(false);
      this.#dragStartX = null;
    }

    /* 翻面时按可见面切换命中与可见性（规避 Safari 隐藏面仍可点击） */
    #syncFaces() {
      const back = this.#flipped;
      this.#faceF.style.pointerEvents = back ? 'none' : '';
      this.#faceF.style.visibility = back ? 'hidden' : '';
      this.#faceB.style.pointerEvents = back ? '' : 'none';
      this.#faceB.style.visibility = back ? '' : 'hidden';
    }

    #styleText(rarity) {
      const c = RARITY[rarity] || RARITY.common;
      const reduced = this.#reduced;
      /* v1.2.0：卡框/发光/角标色全部走 --tc-* 变量（回退稀有度原色），宿主可覆盖 */
      const pulse = (rarity === 'legendary' && !reduced)
        ? '@keyframes pulse{0%,100%{box-shadow:0 10px 26px rgba(0,0,0,.45),0 0 16px var(--tc-glow,' + c.glow + '66)}50%{box-shadow:0 10px 26px rgba(0,0,0,.45),0 0 34px var(--tc-glow,' + c.glow + 'aa)}}'
          + ':host(:hover) .face.front{animation:pulse 1.6s ease-in-out infinite;}'
        : '';
      return `
:host{display:inline-block;width:160px;height:176px;contain:content;outline:none;}
:host(:focus-visible){box-shadow:0 0 0 3px var(--tc-glow,${c.glow}66);border-radius:14px;}
.stage{width:100%;height:100%;perspective:${PERSPECTIVE}px;}
.tilt{width:100%;height:100%;transform-style:preserve-3d;}
/* .tilt 无常驻 transition（T3）：进出各一次的过渡由 JS 写 inline，move 期间即时跟手 */
.flip{position:relative;width:100%;height:100%;transform-style:preserve-3d;
  transition:transform ${reduced ? 0 : FLIP_MS}ms cubic-bezier(.2,.7,.25,1);}
.flip.flipped{transform:rotateY(180deg);}
.flip.live{will-change:transform;}
.face{position:absolute;inset:0;border-radius:14px;overflow:hidden;
  backface-visibility:hidden;-webkit-backface-visibility:hidden;
  display:flex;flex-direction:column;align-items:center;
  background:linear-gradient(160deg,#232833,#12151c);
  box-shadow:0 10px 26px rgba(0,0,0,.45), inset 0 0 0 1px var(--tc-glow,${c.glow}44);}
.face.back{transform:rotateY(180deg);justify-content:center;padding:14px;}
.badge,.badge-img{position:relative;width:82%;height:auto;margin-top:6%;user-select:none;}
.badge-img{object-fit:contain;}
.info{position:relative;width:100%;text-align:center;color:#e8eaf0;font-family:system-ui,sans-serif;}
.tag{display:inline-block;font:700 10px/1.9 system-ui,sans-serif;letter-spacing:.14em;
  color:var(--tc-tag,${c.tag});border:1px solid var(--tc-tag,${c.tag}66);border-radius:99px;padding:1px 10px;}
.title{margin:8px 0 4px;font-size:15px;font-weight:700;}
.desc{margin:0 4px;font-size:11px;line-height:1.5;color:#aeb4c2;}
.date{display:block;margin-top:8px;font-size:10px;color:#7a8194;}
/* surfaced：亮色卡面材质（metal/holo 底材）下背面排版换深色，保证可读 */
.surfaced .info{color:#1d2129;}
.surfaced .title{color:#10141c;}
.surfaced .desc{color:#3d4553;}
.surfaced .date{color:#565e6d;}
.surfaced .tag{color:#10141c;border-color:rgba(16,20,28,.45);}
.glare{position:absolute;inset:0;border-radius:14px;pointer-events:none;opacity:0;
  /* 位于 3D 上下文之外的平面覆盖层（stage 最后一个子级）：不参与 preserve-3d，
     与旋转面片零交割，任何角度下都是完整的高光 */
  transition:opacity ${reduced ? 0 : 120}ms;}
slot[name="back"]::slotted(*){position:absolute;inset:0;}
slot[name="front"]::slotted(*){position:relative;} /* 纳入定位绘制序列：材质层下、箔光层上 */
.fx{position:absolute;pointer-events:none;} /* 卡面效果层：面片已有 overflow:hidden 负责裁切 */
${pulse}`;
    }
  }

  function on(t, type, fn, opts) {
    t.addEventListener(type, fn, opts);
    return () => t.removeEventListener(type, fn, opts);
  }

  /* ---------- 注册与命名空间 ---------- */
  if (!customElements.get('tilt-card-3d')) {
    customElements.define('tilt-card-3d', TiltCard3D);
  }
  const NS = (window.__Widgets = window.__Widgets || {});
  if (!NS.tiltCard3d) {
    NS.tiltCard3d = { version: '1.3.0' };
  }
})();
