/* ==========================================================================
   KORA — Chuva de dados global (Matrix)
   Canvas fixo, 3 profundidades, glitch, paralaxe e respeito a reduced motion.
   Uso: <canvas class="matrix-field" id="matrixField" aria-hidden="true"></canvas>
   ========================================================================== */
(() => {
  'use strict';

  const canvas = document.getElementById('matrixField');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const theme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const COLORS = {
    dark: { cyan: '43,232,255' },
    light: { cyan: '11,143,190' }
  };

  const KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const SYM = '01<>[]{}()/|=+*#$%&@:;';
  const HEX = '0123456789ABCDEF';
  const CONFIG = [
    { size: 11, gap: 21, alpha: .13, speed: .55, depth: .35, glow: 0, chars: KATA + SYM },
    { size: 15, gap: 25, alpha: .20, speed: .85, depth: .70, glow: 3, chars: KATA + SYM + HEX },
    { size: 19, gap: 34, alpha: .24, speed: 1.25, depth: 1, glow: 3, chars: HEX + SYM }
  ];
  const FPS = 30;
  const REDUCED_FPS = 20;

  let width = 0;
  let height = 0;
  let layers = [];
  let loop = null;
  let last = 0;
  let running = false;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let glitch = 0;

  const pick = (set) => set[(Math.random() * set.length) | 0];

  function build() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = width;
    canvas.height = height;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    layers = CONFIG.map((cfg) => {
      const mobile = width < 700;
      const layerCfg = mobile ? { ...cfg, size: Math.round(cfg.size * 1.15) } : cfg;
      const gap = Math.max(14, Math.round(cfg.gap * (mobile ? 0.8 : 1)));
      const count = Math.ceil(width / gap) + 1;
      const columns = new Array(count);
      for (let i = 0; i < count; i++) {
        columns[i] = {
          x: i * gap + gap / 2 + (Math.random() - 0.5) * 5,
          y: Math.random() * height * 1.7 - height,
          speed: cfg.speed * (0.7 + Math.random() * 0.65),
          glyph: pick(cfg.chars),
          bright: Math.random() < 0.05,
          swap: 2 + ((Math.random() * 9) | 0)
        };
      }
      return { cfg: layerCfg, columns };
    });
  }

  function stroke() {
    const isLight = theme() === 'light';
    const color = COLORS[isLight ? 'light' : 'dark'].cyan;
    const boost = isLight ? 1.9 : 1;
    const rate = reduced ? 0.45 : 1;

    // rastro: apaga a camada anterior sem perder a transparência do canvas
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,.085)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    currentX += (pointerX - currentX) * 0.055;
    currentY += (pointerY - currentY) * 0.055;

    for (let l = 0; l < layers.length; l++) {
      const { cfg, columns } = layers[l];
      const offsetX = currentX * cfg.depth * 20;
      const offsetY = currentY * cfg.depth * 12;
      ctx.font = `${cfg.size}px "JetBrains Mono", monospace`;

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const x = col.x + offsetX;
        const y = col.y + offsetY;

        if (y > -cfg.size * 2 && y < height + cfg.size * 2) {
          if (col.bright && !isLight) {
            ctx.fillStyle = `rgba(214,252,255,${Math.min(0.62, cfg.alpha + 0.2).toFixed(3)})`;
            if (cfg.glow) {
              ctx.shadowColor = `rgba(${color},.85)`;
              ctx.shadowBlur = cfg.glow;
            }
          } else if (col.bright) {
            ctx.fillStyle = `rgba(${color},.55)`;
          } else {
            ctx.fillStyle = `rgba(${color},${(cfg.alpha * boost * (0.8 + Math.random() * 0.3)).toFixed(3)})`;
          }
          ctx.fillText(col.glyph, x, y);
          ctx.shadowBlur = 0;
        }

        col.y += cfg.size * col.speed * rate;

        if (--col.swap <= 0) {
          col.glyph = pick(cfg.chars);
          col.swap = 2 + ((Math.random() * 9) | 0);
        }

        if (col.y > height + cfg.size * 2) {
          col.y = -cfg.size * (2 + Math.random() * 22);
          col.speed = cfg.speed * (0.7 + Math.random() * 0.65);
          col.bright = Math.random() < 0.05;
          col.glyph = pick(cfg.chars);
        }
      }
    }

    // glitch horizontal ocasional
    if (!reduced && Math.random() < 0.012) glitch = 1;
    if (glitch > 0.03) {
      const gy = Math.random() * height;
      const gw = width * (0.18 + Math.random() * 0.55);
      const gx = Math.random() * Math.max(1, width - gw);
      const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `rgba(${color},${(0.18 * glitch).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx, gy, gw, 1.4);
      glitch -= 0.07;
    }
  }

  function frame(now) {
    loop = null;
    if (!running) return;
    if (now - last >= 1000 / (reduced ? REDUCED_FPS : FPS)) {
      last = now;
      stroke();
    }
    loop = requestAnimationFrame(frame);
  }

  function start() {
    running = true;
    if (!loop) loop = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (loop) { cancelAnimationFrame(loop); loop = null; }
  }

  build();
  start();

  window.addEventListener('resize', () => {
    window.clearTimeout(canvas._rz);
    canvas._rz = window.setTimeout(build, 180);
  });

  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / Math.max(1, width) - 0.5) * 2;
    pointerY = (event.clientY / Math.max(1, height) - 0.5) * 2;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  motionQuery.addEventListener?.('change', (event) => {
    reduced = event.matches;
  });
})();
