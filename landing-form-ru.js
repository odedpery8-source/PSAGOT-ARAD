(function () {
  'use strict';

  /* ── ENV detection — DEV vs PROD ── */
  var DEV = (location.hostname === '' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  var log = DEV ? console.log.bind(console, '[DEV]') : function () {};

  /* ── Global error logger ── */
  window.onerror = function (msg, src, line, col) {
    if (DEV) console.error('[Error]', msg, '@', src + ':' + line + ':' + col);
    return false;
  };
  window.addEventListener('unhandledrejection', function (e) {
    if (DEV) console.error('[Promise]', e.reason);
  });

  log('ENV: development — logs active');

  /* ── Scroll animations ── */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.14 });

  document.querySelectorAll('[data-animate]').forEach(function (el) { io.observe(el); });

  /* ── Form logic ── */
  var form    = document.getElementById('lead-form');
  var body    = document.getElementById('form-body');
  var success = document.getElementById('form-success');

  var PHONE_RE = /^0[5][0-9]{8}$/;
  var PRICE_RE = /\d/;
  var lastSubmitTime = 0;

  function sanitize(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  function fieldVal(id) { return document.getElementById(id).value.trim(); }

  function setError(groupId, hasError) {
    document.getElementById(groupId).classList.toggle('error', hasError);
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    var name    = fieldVal('f-name');
    var phone   = fieldVal('f-phone').replace(/[-\s]/g, '');
    var rooms   = fieldVal('f-rooms');
    var price   = fieldVal('f-price');
    var email   = fieldVal('f-email');
    var consent = document.getElementById('f-consent').checked;

    var ok = true;
    if (name.length < 2 || name.length > 60)          { setError('g-name',    true);  ok = false; } else { setError('g-name',    false); }
    if (!PHONE_RE.test(phone))                         { setError('g-phone',   true);  ok = false; } else { setError('g-phone',   false); }
    if (!rooms)                                        { setError('g-rooms',   true);  ok = false; } else { setError('g-rooms',   false); }
    if (!price || !PRICE_RE.test(price))               { setError('g-price',   true);  ok = false; } else { setError('g-price',   false); }
    if (email && !EMAIL_RE.test(email))                { setError('g-email',   true);  ok = false; } else { setError('g-email',   false); }
    if (!consent)                                      { setError('g-consent', true);  ok = false; } else { setError('g-consent', false); }
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var now = Date.now();
    if (now - lastSubmitTime < 30000) return;
    lastSubmitTime = now;

    var btn = form.querySelector('.submit-btn');
    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    var name    = sanitize(fieldVal('f-name')).slice(0, 60);
    var phone   = sanitize(fieldVal('f-phone')).slice(0, 15);
    var address = sanitize(fieldVal('f-address')).slice(0, 120);
    var rooms   = fieldVal('f-rooms');
    var roomsSafe = rooms ? sanitize(rooms).slice(0, 30) : '';
    var price   = sanitize(fieldVal('f-price')).slice(0, 20);
    var notes   = sanitize(fieldVal('f-notes')).slice(0, 500);
    var email   = sanitize(fieldVal('f-email')).slice(0, 100);

    /* ── שמירה ב-Supabase CRM (מופיע בפאנל האדמין) ── */
    fetch('https://zelsnjtiahstjvoohvpb.supabase.co/rest/v1/rpc/submit_lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbHNuanRpYWhzdGp2b29odnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Mzk4NzMsImV4cCI6MjA5NzIxNTg3M30.PCEuYuw5VwnVJ5ToT-OpdyZIpJtb5I8aHIkUwgwYOpk'
      },
      body: JSON.stringify({
        p_name: name, p_phone: phone, p_address: address || '',
        p_rooms: roomsSafe, p_price: price, p_notes: notes || '', p_language: 'ru'
      })
    }).catch(function () {});

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: 'df5af4da-36e8-4a77-9f72-fdddb186ae20',
        subject: 'Новая заявка — Pisagot Nechasim Арад',
        from_name: 'Страница захвата лидов Pisagot Nechasim (RU)',
        Имя: name,
        Телефон: phone,
        Email: email || '—',
        Адрес: address || '—',
        Комнаты: roomsSafe,
        Цена: price,
        Примечания: notes || '—',
        botcheck: ''
      })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        body.style.display    = 'none';
        success.style.display = 'block';
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'generate_lead',
          event_category: 'form',
          event_label: 'arad_property_lead_ru',
          rooms: roomsSafe,
          price: price
        });
      } else {
        btn.disabled = false;
        btn.textContent = 'Отправить заявку — перезвоним в ближайшее время';
      }
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = 'Отправить заявку — перезвоним в ближайшее время';
    });
  });

  ['f-name', 'f-phone'].forEach(function (id) {
    document.getElementById(id).addEventListener('blur', validate);
  });
  ['f-rooms', 'f-price'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', validate);
  });

})();
