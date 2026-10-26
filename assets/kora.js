/* ==========================================================================
   KORA — Interações: núcleo neural, dados, hub, tilt, reveals e contato
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = motionQuery.matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  const theme = () => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const COLORS = {
    dark:  { cyan: '43,232,255', blue: '47,123,255', violet: '139,92,255', line: '120,195,255' },
    light: { cyan: '11,143,190', blue: '23,95,224',   violet: '108,67,224', line: '20,92,180' }
  };

  const raf = (fn) => window.requestAnimationFrame(fn);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------------- Tema ---------------- */
  const THEME_KEY = 'kora-theme';
  const themeToggle = $('#themeToggle');
  const readStoredTheme = () => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  };
  const storeTheme = (value) => {
    try { localStorage.setItem(THEME_KEY, value); } catch { /* modo privado */ }
  };
  if (readStoredTheme() === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  function syncThemeButton() {
    if (!themeToggle) return;
    const light = theme() === 'light';
    const use = $('use', themeToggle);
    themeToggle.setAttribute('aria-pressed', String(light));
    themeToggle.setAttribute('aria-label', light ? 'Ativar tema escuro' : 'Ativar tema claro');
    if (use) use.setAttribute('href', light ? '#i-moon' : '#i-sun');
  }
  syncThemeButton();

  themeToggle?.addEventListener('click', () => {
    const next = theme() === 'light' ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    storeTheme(next);
    syncThemeButton();
    window.dispatchEvent(new CustomEvent('kora:theme', { detail: next }));
  });

  /* ---------------- Header, progresso e voltar ao topo ---------------- */
  const header = $('#header');
  const progressBar = $('#scrollProgress');
  const toTop = $('#toTop');
  let scrollQueued = false;

  function onScrollFrame() {
    scrollQueued = false;
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 24);
    toTop?.classList.toggle('is-visible', y > 700);
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    }
    updateSpy(y);
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; raf(onScrollFrame); }
  }, { passive: true });

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------------- Menu mobile ---------------- */
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');
  const navOverlay = $('#navOverlay');

  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    navLinks?.classList.toggle('is-open', open);
    navToggle?.setAttribute('aria-expanded', String(open));
    navToggle?.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    const use = navToggle ? $('use', navToggle) : null;
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  navToggle?.addEventListener('click', () => {
    setNav(!document.body.classList.contains('nav-open'));
  });
  navOverlay?.addEventListener('click', () => setNav(false));
  $$('a', navLinks || document.createElement('div')).forEach((a) => {
    a.addEventListener('click', () => setNav(false));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setNav(false);
      navToggle?.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 880) setNav(false);
  });

  /* ---------------- Revelação no scroll ---------------- */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      if (child.hasAttribute('data-reveal')) {
        child.style.setProperty('--delay', `${i * 70}ms`);
      }
    });
  });

  const revealEls = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObs.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revealObs.observe(el));
  }

  /* ---------------- Scrollspy ---------------- */
  const spyLinks = $$('.nav-links a[data-spy]');
  const spySections = spyLinks
    .map((link) => document.getElementById(link.dataset.spy))
    .filter(Boolean);

  function updateSpy(y) {
    if (!spySections.length) return;
    const probe = y + window.innerHeight * 0.32;
    let current = '';
    spySections.forEach((section) => {
      if (section.offsetTop <= probe) current = section.id;
    });
    if (y < 80) current = '';
    spyLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.spy === current);
    });
  }

  /* ---------------- Contadores ---------------- */
  const counters = $$('[data-count]');
  function formatCount(value, decimals) {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  function runCounter(el) {
    const target = parseFloat(el.dataset.count || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (reduce) {
      el.textContent = prefix + formatCount(target, decimals) + suffix;
      return;
    }
    const duration = 1500;
    const start = performance.now();
    function tick(now) {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + formatCount(target * eased, decimals) + suffix;
      if (p < 1) raf(tick);
    }
    raf(tick);
  }
  if (counters.length) {
    if (!('IntersectionObserver' in window)) counters.forEach(runCounter);
    else {
      const countObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          countObs.unobserve(entry.target);
        });
      }, { threshold: 0.6 });
      counters.forEach((el) => countObs.observe(el));
    }
  }

  /* ---------------- FAQ ---------------- */
  $$('.faq').forEach((item) => {
    const button = $('.faq-q', item);
    const panel = $('.faq-a', item);
    button?.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      $$('.faq').forEach((other) => {
        other.classList.remove('is-open');
        $('.faq-q', other)?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
      if (panel) panel.setAttribute('aria-hidden', String(!(!isOpen)));
    });
  });

  /* ---------------- Tilt 3D ---------------- */
  if (!isTouch && !reduce) {
    $$('[data-tilt]').forEach((el) => {
      const strength = parseFloat(el.dataset.tilt) || 6;
      let frame = null;
      let mx = 0;
      let my = 0;

      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const rect = el.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
        if (frame) return;
        frame = raf(() => {
          frame = null;
          const px = mx / rect.width;
          const py = my / rect.height;
          el.style.setProperty('--ry', `${(px - 0.5) * strength * 2}deg`);
          el.style.setProperty('--rx', `${(0.5 - py) * strength * 2}deg`);
          el.style.setProperty('--mx', `${px * 100}%`);
          el.style.setProperty('--my', `${py * 100}%`);
          el.classList.add('is-tilting');
        });
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Em telas de toque, o 3D acompanha a rolagem (sem hover) */
  if (isTouch && !reduce) {
    const tiltEls = $$('[data-tilt]');
    let frame = null;

    const updateScrollTilt = () => {
      const vh = window.innerHeight || 1;
      tiltEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -140 || rect.top > vh + 140) return;
        const progress = Math.max(-0.85, Math.min(0.85, (rect.top + rect.height / 2 - vh / 2) / vh));
        const strength = parseFloat(el.dataset.tilt) || 4;
        el.style.setProperty('--rx', `${(progress * strength * 1.6).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(-progress * strength * 1.0).toFixed(2)}deg`);
      });
    };

    const scheduleTilt = () => {
      if (frame) return;
      frame = raf(() => { frame = null; updateScrollTilt(); });
    };

    window.addEventListener('scroll', scheduleTilt, { passive: true });
    window.addEventListener('resize', scheduleTilt);
    updateScrollTilt();
  }

  /* ---------------- Botões magnéticos ---------------- */
  if (!isTouch && !reduce) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.translate = `${x * 5}px ${y * 4}px`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.translate = '0 0';
      });
    });
  }

  /* ---------------- Hub / ecossistema ---------------- */
  const hub = $('#hub');
  let hubLayout = null;

  if (hub) {
    const svg = $('.hub-lines', hub);
    const nodes = $$('.hub-node', hub);
    const panelTitle = $('#hubTitle');
    const panelText = $('#hubText');
    const panelList = $('#hubList');
    const panelTag = $('#hubTag');

    const HUB_DATA = {
      pdv: {
        tag: 'Frente de caixa',
        title: 'PDV & Vendas',
        text: 'Comandas, balcão, mesa e delivery na mesma operação. A venda alimenta estoque, financeiro e nota fiscal automaticamente.',
        items: ['Venda em segundos, com Pix, cartão e carteira digital', 'Emissão de NFC-e e NF-e sem retrabalho', 'Programa de fidelidade integrado ao caixa']
      },
      financeiro: {
        tag: 'Controle total',
        title: 'Financeiro & Fluxo de caixa',
        text: 'Contas a pagar e receber, conciliação bancária e DRE em um só lugar — com previsão de caixa para decidir antes do aperto.',
        items: ['Conciliação bancária automática', 'Previsão de fluxo de caixa com IA', 'Relatórios de DRE e lucratividade']
      },
      estoque: {
        tag: 'Sincronizado',
        title: 'Estoque inteligente',
        text: 'Cada venda, devolução ou pedido de marketplace movimenta o estoque na hora. Alertas de reposição evitam venda perdida.',
        items: ['Entradas, saídas e inventário', 'Alertas automáticos de reposição', 'Custo e margem por produto']
      },
      bi: {
        tag: 'Dados em decisão',
        title: 'Relatórios & BI',
        text: 'Dashboards personalizáveis com produtos campeões, horários de pico e desempenho por canal de venda.',
        items: ['Dashboards personalizáveis', 'Análise por canal e por período', 'Exportação em PDF e Excel']
      },
      integracoes: {
        tag: 'Sem digitação manual',
        title: 'Integrações',
        text: 'Pedidos de iFood, UberEats, 99Food, Mercado Livre, Shopee e WhatsApp chegam direto ao sistema.',
        items: ['Marketplaces e delivery conectados', 'Sincronização automática de pedidos', 'Menos erros, mais tempo para vender']
      },
      app: {
        tag: 'Em qualquer tela',
        title: 'Kora em qualquer lugar',
        text: 'Acompanhe vendas, finanças e estoque em tempo real pelo navegador ou pelo celular, 24 horas por dia.',
        items: ['100% online, sem instalação', 'Windows, macOS, Linux, Android e iOS', 'Dados sincronizados na nuvem']
      }
    };

    function setHubData(key) {
      const data = HUB_DATA[key];
      if (!data) return;
      nodes.forEach((node) => node.classList.toggle('is-active', node.dataset.hub === key));
      $$('.hub-lines path', hub).forEach((path) => {
        path.classList.toggle('is-active', path.dataset.hub === key);
      });
      if (panelTitle && panelTitle.textContent !== data.title) {
        panelTitle.textContent = data.title;
        if (panelText) panelText.textContent = data.text;
        if (panelTag) panelTag.textContent = data.tag;
        if (panelList) {
          panelList.innerHTML = data.items
            .map((item) => `<li><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>${item}</li>`)
            .join('');
        }
      }
    }

    function buildHubPaths() {
      if (!svg || !nodes.length) return;
      if (window.innerWidth <= 720) { svg.innerHTML = ''; return; }
      const box = hub.getBoundingClientRect();
      const core = $('.hub-core', hub);
      if (!core) return;
      const coreRect = core.getBoundingClientRect();
      const cx = coreRect.left + coreRect.width / 2 - box.left;
      const cy = coreRect.top + coreRect.height / 2 - box.top;
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      while (svg.firstChild) svg.firstChild.remove();
      const activeKey = nodes.find((node) => node.classList.contains('is-active'))?.dataset.hub;
      nodes.forEach((node) => {
        const r = node.getBoundingClientRect();
        const nx = r.left + r.width / 2 - box.left;
        const ny = r.top + r.height / 2 - box.top;
        const mx = cx + (nx - cx) * 0.55;
        const my = cy + (ny - cy) * 0.55;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${cx} ${cy} Q ${mx} ${my} ${nx} ${ny}`);
        path.setAttribute('data-hub', node.dataset.hub);
        if (node.dataset.hub === activeKey) path.classList.add('is-active');
        svg.appendChild(path);
      });
    }

    // No toque, o ecossistema se apresenta sozinho
    let cycleTimer = null;
    let resumeTimer = null;
    let cycleIndex = -1;
    let hubVisible = true;
    let hubPaused = false;
    const hubKeys = Object.keys(HUB_DATA);

    const stopCycle = () => {
      window.clearInterval(cycleTimer);
      cycleTimer = null;
    };
    const startCycle = () => {
      if (!isTouch || reduce || hubPaused || !hubVisible || cycleTimer) return;
      cycleTimer = window.setInterval(() => {
        cycleIndex = (cycleIndex + 1) % hubKeys.length;
        setHubData(hubKeys[cycleIndex]);
      }, 5200);
    };
    const pauseCycle = () => {
      if (!isTouch) return;
      stopCycle();
      hubPaused = true;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        hubPaused = false;
        startCycle();
      }, 14000);
    };

    nodes.forEach((node) => {
      const key = node.dataset.hub;
      const activate = () => {
        setHubData(key);
        pauseCycle();
      };
      node.addEventListener('pointerenter', activate);
      node.addEventListener('focus', activate);
      node.addEventListener('click', activate);
    });

    const layout = () => {
      buildHubPaths();
      if (window.innerWidth <= 720) {
        setHubData('pdv');
        cycleIndex = 0;
      }
    };
    hubLayout = layout;
    layout();

    if ('IntersectionObserver' in window) {
      const hubObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          hubVisible = entry.isIntersecting;
          if (hubVisible) startCycle();
          else stopCycle();
        });
      }, { threshold: 0.25 });
      hubObserver.observe(hub);
    }

    window.addEventListener('resize', () => {
      window.clearTimeout(hubLayout._t);
      hubLayout._t = window.setTimeout(layout, 140);
    });
    if (document.fonts?.ready) document.fonts.ready.then(layout);
  }

  /* ---------------- Contato ---------------- */
  const contactForm = $('#contactForm');
  const formStatus = $('#formStatus');
  const toast = $('#toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  $('#copyEmail')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = event.currentTarget.dataset.email || 'contato@korasistemas.com.br';
    try {
      await navigator.clipboard.writeText(email);
      showToast('E-mail copiado: ' + email);
    } catch {
      showToast(email);
    }
  });

  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      return;
    }
    const data = new FormData(contactForm);
    const email = contactForm.dataset.email || 'contato@korasistemas.com.br';
    const nome = String(data.get('nome') || '').trim();
    const empresa = String(data.get('empresa') || '').trim();
    const contato = String(data.get('email') || '').trim();
    const mensagem = String(data.get('mensagem') || '').trim();
    const subject = `Demonstração Kora — ${empresa || nome}`;
    const body = [
      `Nome: ${nome}`,
      `Empresa: ${empresa || '—'}`,
      `E-mail: ${contato}`,
      '',
      mensagem || 'Gostaria de agendar uma demonstração da Kora.'
    ].join('\n');
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (formStatus) formStatus.textContent = 'Abrindo seu aplicativo de e-mail…';
    showToast('Solicitação preparada no seu e-mail.');
  });

  $$('a[href="#contato"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = $('#contactForm');
      if (!target) return;
      event.preventDefault();
      setNav(false);
      const top = $('#contato')?.getBoundingClientRect().top ?? 0;
      window.scrollTo({
        top: window.scrollY + top - 90,
        behavior: reduce ? 'auto' : 'smooth'
      });
      window.setTimeout(() => $('input[name="nome"]', target)?.focus({ preventScroll: true }), reduce ? 0 : 650);
    });
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------------- Canvas: núcleo neural ---------------- */
  function initCore(canvas) {
    if (!canvas) return;
    const stage = canvas.closest('.core-stage') || canvas.parentElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let radius = 200;
    let points = [];
    let links = [];
    let visible = false;
    let loop = null;
    let angle = 0;
    let rotX = -0.18;
    let rotY = 0;
    let targetX = -0.18;
    let targetY = 0;

    const COUNT = () => (window.innerWidth < 560 ? 210 : 400);

    function build() {
      const total = COUNT();
      const golden = Math.PI * (3 - Math.sqrt(5));
      points = new Array(total);
      for (let i = 0; i < total; i++) {
        const y = 1 - (i / (total - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i;
        points[i] = {
          x: Math.cos(theta) * r,
          y,
          z: Math.sin(theta) * r,
          tw: Math.random() * Math.PI * 2,
          size: 0.75 + Math.random() * 1.5
        };
      }
      const neighbours = window.innerWidth < 560 ? 3 : 4;
      const maxD = 0.34;
      links = [];
      for (let i = 0; i < total; i++) {
        const a = points[i];
        for (let k = 1; k <= neighbours; k++) {
          const j = (i + k) % total;
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          if (dx * dx + dy * dy + dz * dz < maxD) links.push([i, j]);
        }
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) * 0.335;
      build();
    }

    function project(p, cosY, sinY, cosX, sinX, cx, cy) {
      const x1 = p.x * cosY - p.z * sinY;
      const z1 = p.x * sinY + p.z * cosY;
      const y1 = p.y * cosX - z1 * sinX;
      const z2 = p.y * sinX + z1 * cosX;
      const persp = 2.0 / (2.35 + z2);
      return {
        x: cx + x1 * radius * persp * 1.35,
        y: cy + y1 * radius * persp * 1.35,
        z: z2,
        s: persp
      };
    }

    function draw() {
      const c = COLORS[theme()];
      const cx = width / 2;
      const cy = height / 2;
      ctx.clearRect(0, 0, width, height);

      const ringPulse = reduce ? 0 : Math.sin(angle * 1.6) * 0.5 + 0.5;

      // halo central
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.95);
      glow.addColorStop(0, `rgba(${c.cyan},${0.16 + ringPulse * 0.08})`);
      glow.addColorStop(0.45, `rgba(${c.blue},0.08)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // anéis orbitais
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.32);
      for (let i = 0; i < 3; i++) {
        const rx = radius * (1.02 + i * 0.24);
        const ry = radius * (0.3 + i * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.line},${0.1 - i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      const cosY = Math.cos(angle + rotY);
      const sinY = Math.sin(angle + rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const projected = new Array(points.length);
      for (let i = 0; i < points.length; i++) {
        projected[i] = project(points[i], cosY, sinY, cosX, sinX, cx, cy);
      }

      // conexões em 3 profundidades
      const buckets = [[], [], []];
      for (let i = 0; i < links.length; i++) {
        const a = projected[links[i][0]];
        const b = projected[links[i][1]];
        const z = (a.z + b.z) / 2;
        const idx = z < -0.28 ? 2 : z < 0.28 ? 1 : 0;
        buckets[idx].push(a.x, a.y, b.x, b.y);
      }
      const alphas = [0.05, 0.1, 0.17];
      for (let i = 0; i < buckets.length; i++) {
        const arr = buckets[i];
        if (!arr.length) continue;
        ctx.beginPath();
        for (let k = 0; k < arr.length; k += 4) {
          ctx.moveTo(arr[k], arr[k + 1]);
          ctx.lineTo(arr[k + 2], arr[k + 3]);
        }
        ctx.strokeStyle = `rgba(${c.line},${alphas[i]})`;
        ctx.lineWidth = i === 2 ? 1.1 : 0.8;
        ctx.stroke();
      }

      // partículas
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const twinkle = reduce ? 0.8 : 0.62 + Math.sin(angle * 2 + points[i].tw) * 0.28;
        const depth = clamp(1 - (p.z + 1) / 2, 0, 1);
        const size = points[i].size * p.s * (1.7 + depth);
        ctx.fillStyle = `rgba(${depth > 0.55 ? c.cyan : c.blue},${(0.28 + depth * 0.6) * twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
      }

      // pacotes de dados percorrendo conexões
      if (links.length) {
        const packets = window.innerWidth < 560 ? 5 : 9;
        for (let k = 0; k < packets; k++) {
          const link = links[(k * 53 + 17) % links.length];
          const a = projected[link[0]];
          const b = projected[link[1]];
          const t = reduce ? 0.5 : (angle * 0.22 + k * 0.13) % 1;
          const x = a.x + (b.x - a.x) * t;
          const y = a.y + (b.y - a.y) * t;
          ctx.beginPath();
          ctx.arc(x, y, 1.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,252,255,.85)`;
          ctx.fill();
        }
      }

      // núcleo
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (0.1 + ringPulse * 0.012), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,253,255,.9)`;
      ctx.shadowColor = `rgba(${c.cyan},.9)`;
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function frame() {
      loop = null;
      if (!visible) return;
      if (!reduce) angle += 0.0042;
      rotX += (targetX - rotX) * 0.055;
      rotY += (targetY - rotY) * 0.055;
      draw();
      if (!reduce) loop = raf(frame);
    }

    resize();

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        if (visible) { if (!loop) loop = raf(frame); }
        else if (loop) { cancelAnimationFrame(loop); loop = null; }
      });
    }, { threshold: 0.05 });
    obs.observe(canvas);

    stage?.addEventListener('pointermove', (event) => {
      if (reduce) return;
      const rect = stage.getBoundingClientRect();
      if (event.pointerType === 'mouse') {
        targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 0.85;
        targetX = -0.18 + ((event.clientY - rect.top) / rect.height - 0.5) * 0.42;
      } else if (event.pointerType === 'touch') {
        targetY = ((event.clientX - rect.left) / rect.width - 0.5) * 1.15;
        targetX = -0.18 + ((event.clientY - rect.top) / rect.height - 0.5) * 0.5;
      }
    });
    stage?.addEventListener('pointerleave', () => {
      targetX = -0.18;
      targetY = 0;
    });

    window.addEventListener('resize', () => {
      window.clearTimeout(canvas._rz);
      canvas._rz = window.setTimeout(() => { resize(); if (reduce) draw(); }, 160);
    });

    window.addEventListener('kora:theme', () => { if (reduce) draw(); });
    if (reduce) draw();
  }

  initCore($('#coreCanvas'));

  motionQuery.addEventListener?.('change', (event) => {
    reduce = event.matches;
    if (reduce) $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    hubLayout?.();
  });
})();
