/* ═══════════════════════════════════════════════
   SportEx — script.js
   Vanilla ES6+, no frameworks
═══════════════════════════════════════════════ */

'use strict';

/* ─── STATE ─────────────────────────────────── */
const State = {
  lang: localStorage.getItem('sx_lang') || null,
  dict: {},
  products: [],
  currentProduct: null,
};

/* ─── DOM HELPERS ────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════
   BOOT — load JSON files, then init
═══════════════════════════════════════════════ */
async function boot() {
  try {
    const [langData, products] = await Promise.all([
      fetch('lang.json').then(r => r.json()),
      fetch('products.json').then(r => r.json()),
    ]);
    State.products = products;
    State.allLang = langData;

    if (!State.lang) {
      showSplash(langData);
    } else {
      applyLang(langData[State.lang]);
      initApp();
    }
  } catch (e) {
    console.error('Boot error:', e);
    // Fallback: run app without translations
    initApp();
  }
}

/* ═══════════════════════════════════════════════
   SPLASH SCREEN — language selector
═══════════════════════════════════════════════ */
function showSplash(langData) {
  const splash = $('#splash');
  splash.classList.remove('hidden');

  $$('.splash-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = btn.dataset.lang;
      State.lang = chosen;
      localStorage.setItem('sx_lang', chosen);
      applyLang(langData[chosen]);

      // animate out
      splash.style.opacity = '0';
      splash.style.transform = 'scale(1.04)';
      setTimeout(() => {
        splash.classList.add('hidden');
        initApp();
      }, 500);
    });
  });
}

/* ═══════════════════════════════════════════════
   I18N — apply translations via data-i18n
═══════════════════════════════════════════════ */
function applyLang(dict) {
  if (!dict) return;
  State.dict = dict;

  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = dict[key];
      } else if (el.dataset.i18nHtml) {
        el.innerHTML = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // swap lang button highlight
  $$('.lang-switch-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === State.lang);
  });

  document.documentElement.lang = State.lang === 'ua' ? 'uk' : State.lang;
}

function t(key) {
  return State.dict[key] || key;
}

/* ═══════════════════════════════════════════════
   INIT APP — runs after lang selected
═══════════════════════════════════════════════ */
function initApp() {
  initCursor();
  initHeader();
  initMobileNav();
  initReveal();
  renderProducts();
  initLangSwitch();
  handleUrlProduct(); // handle ?product= on load
  window.addEventListener('popstate', handleUrlProduct);
}

/* ═══════════════════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════════════════ */
function initCursor() {
  const cursor = $('#cursor');
  const ring = $('#cursor-ring');
  if (!cursor || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';
  });

  const animRing = () => {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  };
  animRing();

  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, [role="button"], .product-card, .cat-card')) {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      ring.style.width = '52px';
      ring.style.height = '52px';
      ring.style.opacity = '0.9';
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a, button, [role="button"], .product-card, .cat-card')) {
      cursor.style.width = '12px';
      cursor.style.height = '12px';
      ring.style.width = '36px';
      ring.style.height = '36px';
      ring.style.opacity = '0.6';
    }
  });
}

/* ═══════════════════════════════════════════════
   HEADER — scroll effect
═══════════════════════════════════════════════ */
function initHeader() {
  const header = $('#header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', scrollY > 50);
  }, { passive: true });
}

/* ═══════════════════════════════════════════════
   MOBILE NAV
═══════════════════════════════════════════════ */
function initMobileNav() {
  const burger = $('#burgerBtn');
  const nav = $('#mobileNav');
  const close = $('#closeNav');
  if (!burger || !nav) return;

  burger.addEventListener('click', () => nav.classList.add('open'));
  close?.addEventListener('click', () => nav.classList.remove('open'));
  $$('.mobile-nav a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open'))
  );
}

/* ═══════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════ */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  $$('.reveal').forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════════════════
   LANG SWITCH (header buttons)
═══════════════════════════════════════════════ */
function initLangSwitch() {
  $$('.lang-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.lang = btn.dataset.lang;
      localStorage.setItem('sx_lang', State.lang);
      applyLang(State.allLang[State.lang]);
      // re-render products with new names
      renderProducts();
      // re-render product page if open
      if (State.currentProduct) {
        renderProductPage(State.currentProduct);
      }
    });
  });
}

/* ═══════════════════════════════════════════════
   RENDER PRODUCTS GRID
═══════════════════════════════════════════════ */
function renderProducts() {
  const grid = $('#productsGrid');
  if (!grid) return;

  const dict = State.dict;
  grid.innerHTML = '';

  State.products.forEach((p, i) => {
    const name = State.lang === 'ua' ? p.name_ua
                : State.lang === 'en' ? p.name_en
                : p.name;

    const badgeLabel = p.badge === 'new' ? (dict.badge_new || 'NEW')
                     : p.badge === 'hit' ? (dict.badge_hit || 'HIT')
                     : '';

    const card = document.createElement('div');
    card.className = `product-card reveal reveal-delay-${(i % 4) + 1}`;
    card.dataset.productId = p.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${name}" class="product-img" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/161616/444?text=SportEx'"/>
        ${badgeLabel ? `<span class="product-badge">${badgeLabel}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${name}</div>
        <div class="product-footer">
          <div class="product-price">${p.price.toLocaleString('uk-UA')}<span> ₴</span></div>
          <button class="btn-buy" data-product-id="${p.id}" aria-label="${dict.btn_buy || 'Купить'}">→</button>
        </div>
      </div>`;

    card.addEventListener('click', e => {
      if (!e.target.closest('.btn-buy')) openProductPage(p.id);
    });
    card.querySelector('.btn-buy').addEventListener('click', e => {
      e.stopPropagation();
      openCheckout(p);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openProductPage(p.id);
    });

    grid.appendChild(card);
  });

  // re-observe new cards
  initReveal();
}

/* ═══════════════════════════════════════════════
   PRODUCT PAGE (History API modal)
═══════════════════════════════════════════════ */
function openProductPage(id) {
  const product = State.products.find(p => p.id === id);
  if (!product) return;
  State.currentProduct = product;
  history.pushState({ productId: id }, '', `?product=${id}`);
  renderProductPage(product);
}

function closeProductPage() {
  State.currentProduct = null;
  history.pushState({}, '', window.location.pathname);
  const overlay = $('#productOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 400);
  }
  document.body.style.overflow = '';
}

function handleUrlProduct() {
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('product'));
  if (id) {
    const product = State.products.find(p => p.id === id);
    if (product) {
      State.currentProduct = product;
      renderProductPage(product);
      return;
    }
  }
  // no product param — close if overlay exists
  const overlay = $('#productOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 400);
    document.body.style.overflow = '';
  }
}

function renderProductPage(product) {
  const existing = $('#productOverlay');
  if (existing) existing.remove();

  const dict = State.dict;
  const name = State.lang === 'ua' ? product.name_ua
              : State.lang === 'en' ? product.name_en
              : product.name;

  const overlay = document.createElement('div');
  overlay.id = 'productOverlay';
  overlay.className = 'product-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="product-overlay-inner">
      <button class="product-back-btn" id="productBackBtn">
        <span data-i18n="product_back">${dict.product_back || '← Назад'}</span>
      </button>
      <div class="product-page-grid">
        <div class="product-page-img-wrap">
          <img src="${product.image}" alt="${name}" class="product-page-img"
            onerror="this.src='https://placehold.co/600x600/161616/444?text=SportEx'"/>
        </div>
        <div class="product-page-info">
          <div class="product-page-label">
            ${product.category.toUpperCase()}
            ${product.brand ? `· ${product.brand}` : ''}
          </div>
          <h1 class="product-page-name">${name}</h1>
          <div class="product-page-price">${product.price.toLocaleString('uk-UA')} <span>₴</span></div>
          <div class="product-page-meta">
            ${product.brand ? `<div class="meta-row"><span>${dict.product_brand || 'Бренд'}:</span> <strong>${product.brand}</strong></div>` : ''}
            ${product.sku ? `<div class="meta-row"><span>${dict.product_sku || 'Артикул'}:</span> <strong>${product.sku}</strong></div>` : ''}
            <div class="meta-row meta-available">
              <span class="available-dot"></span>
              <span>${dict.product_available || 'В наличии'}</span>
            </div>
          </div>
          <button class="btn-primary product-buy-btn" id="productBuyBtn">
            ${dict.product_btn_buy || 'Оформить заказ'}
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('open'));

  $('#productBackBtn').addEventListener('click', closeProductPage);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeProductPage();
  });
  $('#productBuyBtn').addEventListener('click', () => openCheckout(product));

  // ESC key
  const onEsc = e => {
    if (e.key === 'Escape') { closeProductPage(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}

/* ═══════════════════════════════════════════════
   CHECKOUT MODAL
═══════════════════════════════════════════════ */
let currentCheckoutProduct = null;

function openCheckout(product) {
  currentCheckoutProduct = product;
  const dict = State.dict;
  const name = State.lang === 'ua' ? product.name_ua
              : State.lang === 'en' ? product.name_en
              : product.name;

  // Remove existing
  const existing = $('#checkoutModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'checkoutModal';
  modal.className = 'checkout-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="checkout-inner">
      <button class="checkout-close-btn" id="checkoutCloseBtn" aria-label="Close">✕</button>
      <h2 class="checkout-title" data-i18n="checkout_title">${dict.checkout_title || 'Оформление заказа'}</h2>
      <div class="checkout-product-info">
        <img src="${product.image}" alt="${name}" class="checkout-product-img"
          onerror="this.src='https://placehold.co/80x80/161616/444?text=SX'"/>
        <div>
          <div class="checkout-product-name">${name}</div>
          <div class="checkout-product-price">${product.price.toLocaleString('uk-UA')} ₴</div>
        </div>
      </div>

      <form id="checkoutForm" novalidate autocomplete="on">
        <div class="form-group">
          <label for="cf-name" data-i18n="checkout_name">${dict.checkout_name || 'Имя *'}</label>
          <input type="text" id="cf-name" name="name" required autocomplete="given-name"
            placeholder="${dict.checkout_name_ph || 'Ваше имя'}"/>
          <span class="field-error" id="err-name"></span>
        </div>

        <div class="form-group">
          <label for="cf-phone" data-i18n="checkout_phone">${dict.checkout_phone || 'Телефон *'}</label>
          <input type="tel" id="cf-phone" name="phone" required autocomplete="tel"
            placeholder="+380 (__) ___-__-__" maxlength="18"/>
          <span class="field-error" id="err-phone"></span>
        </div>

        <div class="form-group">
          <label for="cf-city" data-i18n="checkout_city">${dict.checkout_city || 'Город *'}</label>
          <input type="text" id="cf-city" name="city" required autocomplete="address-level2"
            placeholder="${dict.checkout_city_ph || 'Введите город'}"
            list="ukraine-cities"/>
          <datalist id="ukraine-cities">
            <option value="Одеса"/><option value="Київ"/><option value="Харків"/>
            <option value="Дніпро"/><option value="Запоріжжя"/><option value="Львів"/>
            <option value="Миколаїв"/><option value="Херсон"/><option value="Полтава"/>
            <option value="Черкаси"/><option value="Вінниця"/><option value="Житомир"/>
            <option value="Суми"/><option value="Хмельницький"/><option value="Рівне"/>
            <option value="Тернопіль"/><option value="Луцьк"/><option value="Ужгород"/>
            <option value="Chernivtsi"/><option value="Черкаси"/>
          </datalist>
          <span class="field-error" id="err-city"></span>
        </div>

        <div class="form-group">
          <label data-i18n="checkout_delivery">${dict.checkout_delivery || 'Служба доставки *'}</label>
          <div class="delivery-options">
            <label class="radio-label">
              <input type="radio" name="delivery" value="nova" checked/>
              <span class="radio-custom"></span>
              <span data-i18n="checkout_nova">${dict.checkout_nova || 'Нова Пошта'}</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="delivery" value="ukr"/>
              <span class="radio-custom"></span>
              <span data-i18n="checkout_ukr">${dict.checkout_ukr || 'Укрпошта'}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="cf-branch" data-i18n="checkout_branch">${dict.checkout_branch || 'Номер отделения'}</label>
          <input type="text" id="cf-branch" name="branch" autocomplete="off"
            placeholder="${dict.checkout_branch_ph || '№ отделения'}"/>
        </div>

        <button type="submit" class="btn-primary checkout-submit-btn" data-i18n="checkout_btn">
          ${dict.checkout_btn || 'Подтвердить заказ'}
        </button>
      </form>

      <div class="checkout-success hidden" id="checkoutSuccess">
        <div class="success-icon">✓</div>
        <p data-i18n="checkout_success">${dict.checkout_success || 'Спасибо за заказ!'}</p>
        <button class="btn-outline success-close-btn" id="successCloseBtn" data-i18n="checkout_close">
          ${dict.checkout_close || 'Закрыть'}
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('open'));

  // Phone mask
  const phoneInput = $('#cf-phone', modal);
  phoneInput.addEventListener('input', () => applyPhoneMask(phoneInput));

  // Close
  $('#checkoutCloseBtn').addEventListener('click', closeCheckout);
  modal.addEventListener('click', e => { if (e.target === modal) closeCheckout(); });
  const onEsc = e => {
    if (e.key === 'Escape') { closeCheckout(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);

  // Submit
  $('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    if (validateCheckoutForm(modal)) {
      const data = collectFormData(modal, product);
      submitOrder(data);
    }
  });

  $('#successCloseBtn')?.addEventListener('click', closeCheckout);
}

function closeCheckout() {
  const modal = $('#checkoutModal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => {
    modal.remove();
    if (!$('#productOverlay')) document.body.style.overflow = '';
  }, 400);
}

/* ─── Phone mask ─── */
function applyPhoneMask(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.startsWith('380')) v = v.slice(3);
  else if (v.startsWith('0')) v = v.slice(1);
  v = v.slice(0, 9);
  let formatted = '+380 ';
  if (v.length > 0) formatted += '(' + v.slice(0, 2);
  if (v.length >= 2) formatted += ') ' + v.slice(2, 5);
  if (v.length >= 5) formatted += '-' + v.slice(5, 7);
  if (v.length >= 7) formatted += '-' + v.slice(7, 9);
  input.value = formatted;
}

/* ─── Validation ─── */
function validateCheckoutForm(modal) {
  let valid = true;
  const setErr = (id, msg) => {
    const el = $(`#${id}`, modal);
    if (el) el.textContent = msg;
    if (msg) valid = false;
  };

  setErr('err-name', '');
  setErr('err-phone', '');
  setErr('err-city', '');

  const name = $('#cf-name', modal).value.trim();
  const phone = $('#cf-phone', modal).value.replace(/\D/g, '');
  const city = $('#cf-city', modal).value.trim();

  if (!name) setErr('err-name', '⚠ Обязательное поле');
  if (phone.length < 12) setErr('err-phone', '⚠ Введите корректный номер');
  if (!city) setErr('err-city', '⚠ Обязательное поле');

  return valid;
}

/* ─── Collect form data ─── */
function collectFormData(modal, product) {
  const name = State.lang === 'ua' ? product.name_ua
              : State.lang === 'en' ? product.name_en
              : product.name;
  return {
    product_id: product.id,
    product_name: name,
    product_price: product.price,
    customer_name: $('#cf-name', modal).value.trim(),
    phone: $('#cf-phone', modal).value.trim(),
    city: $('#cf-city', modal).value.trim(),
    delivery: $('input[name="delivery"]:checked', modal)?.value || 'nova',
    branch: $('#cf-branch', modal).value.trim(),
    timestamp: new Date().toISOString(),
    lang: State.lang,
  };
}

/* ═══════════════════════════════════════════════
   submitOrder — Telegram Bot integration
   ─────────────────────────────────────────────
   Чтобы подключить своего Telegram-бота:
   1. Создай бота через @BotFather, скопируй TOKEN
   2. Напиши боту любое сообщение, затем зайди на:
      https://api.telegram.org/bot<TOKEN>/getUpdates
      и найди "chat":{"id": CHAT_ID}
   3. Вставь TOKEN и CHAT_ID ниже и раскомментируй fetch

   Пример отправки:
   ─────────────────────────────────────────────
   const BOT_TOKEN = '8667869989:AAF5GKSaQZQY5o5-nSp7icEE4K8XBCUG8eI';
   const CHAT_ID   = '8667869989';

   const text = [
     '🛒 <b>Новый заказ SportEx</b>',
     `📦 <b>Товар:</b> ${data.product_name}`,
     `💰 <b>Цена:</b> ${data.product_price} ₴`,
     `👤 <b>Имя:</b> ${data.customer_name}`,
     `📞 <b>Телефон:</b> ${data.phone}`,
     `🏙 <b>Город:</b> ${data.city}`,
     `🚚 <b>Доставка:</b> ${data.delivery === 'nova' ? 'Нова Пошта' : 'Укрпошта'}`,
     `🏪 <b>Отделение:</b> ${data.branch || '—'}`,
     `🌐 <b>Язык:</b> ${data.lang.toUpperCase()}`,
     `🕐 ${new Date(data.timestamp).toLocaleString('ru-UA')}`,
   ].join('\n');

   await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
   });
═══════════════════════════════════════════════ */
async function submitOrder(data) {
  console.log('📦 Order data:', data);

  // ── Раскомментируй блок ниже и вставь токен ──
  
  const BOT_TOKEN = '8667869989:AAF5GKSaQZQY5o5-nSp7icEE4K8XBCUG8eI';
  const CHAT_ID   = '8667869989E';
  const text = [
    '🛒 <b>Новый заказ SportEx</b>',
    `📦 <b>Товар:</b> ${data.product_name}`,
    `💰 <b>Цена:</b> ${data.product_price} ₴`,
    `👤 <b>Имя:</b> ${data.customer_name}`,
    `📞 <b>Телефон:</b> ${data.phone}`,
    `🏙 <b>Город:</b> ${data.city}`,
    `🚚 <b>Доставка:</b> ${data.delivery === 'nova' ? 'Нова Пошта' : 'Укрпошта'}`,
    `🏪 <b>Отделення:</b> ${data.branch || '—'}`,
    `🌐 <b>Мова:</b> ${data.lang.toUpperCase()}`,
    `🕐 ${new Date(data.timestamp).toLocaleString('ru-UA')}`,
  ].join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch(err) {
    console.error('Telegram error:', err);
  }
  

  // Show success
  const form = $('#checkoutForm');
  const success = $('#checkoutSuccess');
  if (form && success) {
    form.style.opacity = '0';
    form.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      form.style.display = 'none';
      success.classList.remove('hidden');
      success.style.animation = 'fadeSlideUp 0.5s ease forwards';
    }, 300);
  }
}

/* ─── Start ─── */
document.addEventListener('DOMContentLoaded', boot);
