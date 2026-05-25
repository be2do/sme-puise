/* ═══════════════════════════════════════════════
   SME PULSE — FINANCIAL INTELLIGENCE DASHBOARD
   script.js
   ═══════════════════════════════════════════════ */

'use strict';

/* ── UTILITIES ─────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const fmtCurrency = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNumber   = (n) => Number(n).toLocaleString('en-US');
const timeNow = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

/* ── DOM REFS ──────────────────────────────── */
const sidebar        = $('#sidebar');
const hamburger      = $('#hamburger');
const mainContent    = $('#main');
const aiChat         = $('#aiChat');
const chatFab        = $('#chatFab');
const chatToggle     = $('#chatToggle');
const chatHeader     = $('#chatHeader');
const chatMessages   = $('#chatMessages');
const chatInput      = $('#chatInput');
const chatSendBtn    = $('#chatSendBtn');
const typingIndicator = $('#typingIndicator');
const sendBtn        = $('#sendBtn');
const sendInput      = $('#sendInput');
const sendToName     = $('#sendToName');
const activityList   = $('#activityList');

/* ══════════════════════════════════════════════
   MODULE 1 — SIDEBAR
   ══════════════════════════════════════════════ */
const SidebarModule = (() => {
  let open = false;

  const toggle = () => {
    open = !open;
    sidebar.classList.toggle('open', open);
    hamburger.classList.toggle('open', open);
    // overlay click to close
    if (open) {
      document.addEventListener('click', outsideClick, { once: false });
    }
  };

  const outsideClick = (e) => {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      open = false;
      sidebar.classList.remove('open');
      hamburger.classList.remove('open');
      document.removeEventListener('click', outsideClick);
    }
  };

  const init = () => {
    hamburger?.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

    // Nav active state
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        $$('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      });
    });
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 2 — ANIMATED COUNTERS
   ══════════════════════════════════════════════ */
const CounterModule = (() => {
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target   = parseFloat(el.dataset.count);
    const suffix   = el.dataset.suffix || '';
    const isMoney  = el.classList.contains('balance-amount') || el.classList.contains('crypto-price');
    const isCurrency = el.classList.contains('kpi-value') && !suffix;
    const duration = 1800;
    const start    = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const value    = target * easeOut(progress);

      if (isMoney || isCurrency) {
        el.textContent = fmtCurrency(value);
      } else if (suffix) {
        el.textContent = Math.round(value) + suffix;
      } else {
        el.textContent = '$' + fmtNumber(Math.round(value));
      }

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const init = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    $$('[data-count]').forEach(el => observer.observe(el));
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 3 — TILT EFFECT
   ══════════════════════════════════════════════ */
const TiltModule = (() => {
  const MAX_TILT = 8;

  const handleMove = (el, e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const mx = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
    const my = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;
    const dx = (mx - cx) / (rect.width  / 2);
    const dy = (my - cy) / (rect.height / 2);
    const rotY =  clamp(dx * MAX_TILT, -MAX_TILT, MAX_TILT);
    const rotX = -clamp(dy * MAX_TILT, -MAX_TILT, MAX_TILT);
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
  };

  const handleLeave = (el) => {
    el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
  };

  const init = () => {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('mousemove',  e => handleMove(el, e));
      el.addEventListener('mouseleave', () => handleLeave(el));
    });
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 4 — CHARTS
   ══════════════════════════════════════════════ */
const ChartModule = (() => {
  Chart.defaults.color = '#445a73';
  Chart.defaults.font.family = "'DM Sans', sans-serif";

  // ── Revenue Chart ──
  const revenueData = {
    '12m': {
      labels: ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'],
      income:   [8200,  9100, 7800,  10200, 11000, 9600, 12800, 10500, 11200, 13000, 11800, 12480],
      expense:  [3800,  4200, 3600,  4600,  5000,  4200, 5500,  4800,  4200,  5200,  4400, 4236],
    },
    '6m': {
      labels: ['Dec','Jan','Feb','Mar','Apr','May'],
      income:   [12800, 10500, 11200, 13000, 11800, 12480],
      expense:  [5500,  4800,  4200,  5200,  4400,  4236],
    },
    '3m': {
      labels: ['Mar','Apr','May'],
      income:   [13000, 11800, 12480],
      expense:  [5200,  4400,  4236],
    },
  };

  let revenueChart;

  const buildRevenueChart = (period = '12m') => {
    const ctx  = $('#revenueChart');
    if (!ctx) return;
    const data = revenueData[period];

    const gradient1 = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient1.addColorStop(0,   'rgba(0,229,200,0.35)');
    gradient1.addColorStop(1,   'rgba(0,229,200,0)');

    const gradient2 = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient2.addColorStop(0,   'rgba(255,77,109,0.25)');
    gradient2.addColorStop(1,   'rgba(255,77,109,0)');

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Income',
            data: data.income,
            borderColor: '#00e5c8',
            borderWidth: 2.5,
            pointBackgroundColor: '#00e5c8',
            pointBorderColor: '#050d18',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
            backgroundColor: gradient1,
          },
          {
            label: 'Expenses',
            data: data.expense,
            borderColor: '#ff4d6d',
            borderWidth: 2.5,
            pointBackgroundColor: '#ff4d6d',
            pointBorderColor: '#050d18',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
            backgroundColor: gradient2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 900, easing: 'easeInOutQuart' },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              borderRadius: 5,
              useBorderRadius: true,
              padding: 16,
              font: { size: 12, weight: '600' },
              color: '#8ba4c0',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(6,14,26,0.95)',
            borderColor: 'rgba(0,229,200,0.2)',
            borderWidth: 1,
            titleColor: '#e8f0fe',
            bodyColor: '#8ba4c0',
            padding: 14,
            cornerRadius: 12,
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}: ${fmtCurrency(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              font: { size: 11 },
              callback: (v) => '$' + (v/1000).toFixed(0) + 'k',
            },
          },
        },
      },
    });
  };

  // ── Mini Charts ──
  const buildMiniChart = (id, color, data) => {
    const ctx = $('#' + id);
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color,
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
  };

  // ── Burn Donut ──
  const buildBurnChart = () => {
    const ctx = $('#burnChart');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [66, 34],
          backgroundColor: ['#00e5c8', 'rgba(255,255,255,0.06)'],
          borderColor:     ['#00e5c8', 'rgba(255,255,255,0.08)'],
          borderWidth: 1,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { duration: 1400, easing: 'easeInOutQuart' },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
  };

  const initTabSwitcher = () => {
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buildRevenueChart(btn.dataset.period);
      });
    });
  };

  const init = () => {
    buildRevenueChart();
    buildMiniChart('btcMini', '#f7c84b', [62000, 63500, 61800, 64200, 63000, 64100, 65000, 64100]);
    buildMiniChart('ethMini', '#18c8f5', [3800, 3950, 3700, 4050, 3900, 4120, 4280, 4120.5]);
    buildBurnChart();
    initTabSwitcher();
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 5 — ACTIVITY LIST
   ══════════════════════════════════════════════ */
const ActivityModule = (() => {
  const init = () => {
    const items = $$('.activity-item');
    items.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add('visible');
      }, 300 + i * 100);
    });
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 6 — SEND MONEY
   ══════════════════════════════════════════════ */
const SendModule = (() => {
  // Recipient selection
  const initRecipients = () => {
    $$('.recipient-btn[data-name]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.recipient-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (sendToName) sendToName.textContent = btn.dataset.name;
      });
    });
  };

  // Send confirmation
  const showConfirm = (amount, name) => {
    const toast = document.createElement('div');
    toast.className = 'send-confirm';
    toast.textContent = `✓ $${amount} sent to ${name}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  };

  const initSend = () => {
    sendBtn?.addEventListener('click', () => {
      const amount = parseFloat(sendInput?.value) || 0;
      const name   = sendToName?.textContent || 'recipient';
      if (amount <= 0) {
        sendInput.style.color = 'var(--neon-red)';
        setTimeout(() => sendInput.style.color = '', 600);
        return;
      }
      // Ripple on button
      sendBtn.style.transform = 'scale(0.97)';
      setTimeout(() => sendBtn.style.transform = '', 200);
      showConfirm(amount.toFixed(2), name);
    });
  };

  // Magnetic button
  const initMagnetic = () => {
    const btn = $('.magnetic');
    if (!btn) return;
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width  / 2;
      const y = e.clientY - rect.top  - rect.height / 2;
      btn.style.transform = `translateY(-2px) translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  };

  const init = () => {
    initRecipients();
    initSend();
    initMagnetic();
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 7 — AI CHATBOT
   ══════════════════════════════════════════════ */
const ChatModule = (() => {
  let minimized = false;
  let chatVisible = false;

  const aiResponses = [
    'بناءً على تحليل سيولتك الحالية، لديك runway لمدة 14 شهراً بمعدل الإنفاق الحالي. 📊',
    'معدل حرق المال (Burn Rate) الشهري هو $4,236. أنصح بمراجعة اشتراكات البرامج لتقليص التكاليف.',
    'محفظتك الاستثمارية أظهرت نمواً بنسبة 6.6% هذا الشهر. BTC و ETH في اتجاه صاعد. 📈',
    'إيراداتك لشهر مايو بلغت $12,480 — أعلى بنسبة 8.2% عن الشهر الماضي. رائع! 🎉',
    'ينصح بتخصيص 20% من صافي الإيرادات الشهرية كاحتياطي طوارئ لتحسين الاستقرار المالي.',
    'سأقوم بتحليل نمط إنفاقك والعودة إليك بتوصيات مخصصة خلال لحظات… ⚙️',
  ];

  const appendMessage = (text, isUser = false, delay = 0) => {
    setTimeout(() => {
      const msg = document.createElement('div');
      msg.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
      msg.dataset.time = timeNow();
      msg.textContent = text;
      chatMessages.appendChild(msg);
      chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }, delay);
  };

  const showTyping = () => {
    typingIndicator.classList.add('visible');
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
  };

  const hideTyping = () => {
    typingIndicator.classList.remove('visible');
  };

  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage(text, true);

    showTyping();
    const response = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    const delay = 1200 + Math.random() * 800;

    setTimeout(() => {
      hideTyping();
      appendMessage(response, false);
    }, delay);
  };

  const toggleMinimize = () => {
    minimized = !minimized;
    aiChat.classList.toggle('minimized', minimized);
  };

  const showChat = () => {
    chatVisible = true;
    aiChat.classList.remove('hidden');
    chatFab.classList.add('hidden');
  };

  const hideChat = () => {
    chatVisible = false;
    aiChat.classList.add('hidden');
    chatFab.classList.remove('hidden');
  };

  const init = () => {
    // Initial message timestamp
    const firstMsg = $('.ai-msg');
    if (firstMsg) firstMsg.dataset.time = timeNow();

    // Chat FAB open
    chatFab?.addEventListener('click', showChat);

    // Toggle minimize
    chatToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMinimize();
    });
    chatHeader?.addEventListener('click', (e) => {
      if (e.target === chatToggle || chatToggle.contains(e.target)) return;
      if (minimized) toggleMinimize();
    });

    // Send
    chatSendBtn?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Start visible on desktop, hidden on mobile
    if (window.innerWidth >= 768) {
      showChat();
    }
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 8 — GSAP ANIMATIONS (optional layer)
   ══════════════════════════════════════════════ */
const AnimModule = (() => {
  const init = () => {
    if (typeof gsap === 'undefined') return;

    // Stagger topbar
    gsap.fromTo('.topbar', {
      opacity: 0, y: -20,
    }, {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: 'power3.out',
    });
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   MODULE 9 — LIVE CRYPTO TICKER (simulated)
   ══════════════════════════════════════════════ */
const CryptoModule = (() => {
  const btcEl  = $('.crypto-item .crypto-price[id]') || $$('.crypto-price')[0];
  const ethEl  = $$('.crypto-price')[1];

  let btcBase  = 64100;
  let ethBase  = 4120.50;

  const fluctuate = (base, variance) =>
    base + (Math.random() - 0.5) * 2 * variance;

  const update = () => {
    btcBase = fluctuate(btcBase, 80);
    ethBase = fluctuate(ethBase, 15);

    if (btcEl) btcEl.textContent = fmtCurrency(btcBase);
    if (ethEl) ethEl.textContent = fmtCurrency(ethBase);

    // Update change labels randomly
    const changes = $$('.crypto-change');
    const btcChange = ((btcBase - 64100) / 64100 * 100 + 2.1).toFixed(1);
    const ethChange = ((ethBase - 4120.5) / 4120.5 * 100 + 4.5).toFixed(1);
    if (changes[0]) {
      changes[0].textContent = `${btcChange > 0 ? '+' : ''}${btcChange}%`;
      changes[0].className = `crypto-change ${btcChange > 0 ? 'positive' : 'negative'}`;
    }
    if (changes[1]) {
      changes[1].textContent = `${ethChange > 0 ? '+' : ''}${ethChange}%`;
      changes[1].className = `crypto-change ${ethChange > 0 ? 'positive' : 'negative'}`;
    }
  };

  const init = () => {
    setInterval(update, 3000);
  };

  return { init };
})();

/* ══════════════════════════════════════════════
   BOOTSTRAP
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  SidebarModule.init();
  CounterModule.init();
  TiltModule.init();
  ChartModule.init();
  ActivityModule.init();
  SendModule.init();
  ChatModule.init();
  AnimModule.init();
  CryptoModule.init();
});