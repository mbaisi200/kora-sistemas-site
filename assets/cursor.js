/* ==========================================================================
   KORA — Cursor customizado
   Ativa somente em dispositivos com ponteiro fino e sem redução de movimento.
   Campos de texto mantêm o cursor nativo (I-beam).
   ========================================================================== */
(() => {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || motionQuery.matches) return;

  const TYPING = [
    'textarea',
    '[contenteditable="true"]',
    'input:not([type])',
    'input[type="text"]',
    'input[type="email"]',
    'input[type="search"]',
    'input[type="tel"]',
    'input[type="url"]',
    'input[type="password"]',
    'input[type="number"]'
  ].join(',');

  const INTERACTIVE = [
    'a',
    'button',
    'label',
    'select',
    'summary',
    '[data-cursor="hover"]',
    '.hub-node',
    '.faq-q'
  ].join(',');

  const dot = document.createElement('div');
  dot.className = 'kora-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'kora-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.append(dot, ring);
  document.documentElement.classList.add('kora-cursor-on');

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx;
  let ry = my;
  let lastX = mx;
  let lastY = my;
  let vx = 0;
  let vy = 0;
  let tiltX = 0;
  let tiltY = 0;
  let seen = false;
  let rafId = null;
  let typing = false;
  let hovering = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function paintDot() {
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
  }

  function animate() {
    rafId = null;

    rx += (mx - rx) * 0.22;
    ry += (my - ry) * 0.22;

    const dx = mx - lastX;
    const dy = my - lastY;
    lastX = mx;
    lastY = my;

    vx += (dx - vx) * 0.2;
    vy += (dy - vy) * 0.2;

    // inclinação em perspectiva: o disco "viaja" com o movimento
    const factor = hovering ? 0.45 : 1;
    const targetX = clamp(-vy * 0.95 * factor, -20, 20);
    const targetY = clamp(vx * 0.95 * factor, -20, 20);
    tiltX += (targetX - tiltX) * 0.1;
    tiltY += (targetY - tiltY) * 0.1;

    ring.style.transform =
      `perspective(700px) translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0) ` +
      `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

    const moving = Math.abs(mx - rx) > 0.15 ||
      Math.abs(my - ry) > 0.15 ||
      Math.abs(tiltX) > 0.06 ||
      Math.abs(tiltY) > 0.06 ||
      Math.abs(vx) > 0.04 ||
      Math.abs(vy) > 0.04;

    if (moving) rafId = requestAnimationFrame(animate);
  }

  function wake() {
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function show() {
    if (seen) return;
    seen = true;
    if (!typing) {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
  }

  function setTyping(value) {
    typing = value;
    ring.classList.toggle('is-hidden', value);
    dot.classList.toggle('is-hidden', value);
    if (!value && seen) {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    mx = event.clientX;
    my = event.clientY;
    if (!seen) {
      lastX = mx;
      lastY = my;
      vx = 0;
      vy = 0;
    }
    paintDot();
    show();
    wake();
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType !== 'mouse') return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    setTyping(Boolean(target.closest(TYPING)));

    const interactive = Boolean(target.closest(INTERACTIVE));
    if (interactive !== hovering) {
      hovering = interactive;
      ring.classList.toggle('is-hover', interactive);
      dot.classList.toggle('is-hover', interactive);
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || typing) return;
    ring.classList.add('is-down');
    dot.classList.add('is-down');

    const ripple = document.createElement('span');
    ripple.className = 'kora-cursor-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  document.addEventListener('pointerup', () => {
    ring.classList.remove('is-down');
    dot.classList.remove('is-down');
  });

  document.documentElement.addEventListener('mouseleave', () => {
    ring.classList.add('is-hidden');
    dot.classList.add('is-hidden');
    seen = false;
    vx = 0;
    vy = 0;
  });

  document.documentElement.addEventListener('mouseenter', () => {
    if (!typing) {
      seen = true;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
  });

  window.addEventListener('blur', () => {
    ring.classList.add('is-hidden');
    dot.classList.add('is-hidden');
    seen = false;
  });

  motionQuery.addEventListener?.('change', (event) => {
    if (!event.matches) return;
    document.documentElement.classList.remove('kora-cursor-on');
    ring.remove();
    dot.remove();
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
