/* HCG Consultoria — scripts do site (compartilhado por todas as páginas) */
(function () {
  'use strict';

  /* ===== Configuração ===== */
  var WHATSAPP = '5531993938133';
  var EMAIL = 'contato@hcgconsultoria.com.br';
  /* Formulários: enviados por e-mail pelo Web3Forms (chave colada no painel,
     em "Formulários"). Sem chave, abre o e-mail do visitante com o pedido pronto.
     No computador (localhost) nada é enviado: o pedido só é validado. */
  var FORM_KEY = window.HCG_FORM_KEY || '';
  var LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  /* ===== Análise de uso (Microsoft Clarity + LinkedIn Insight) com consentimento (LGPD) =====
     Os IDs vêm do painel (Configurações de análise). Sem IDs, nada é carregado e o aviso não aparece. */
  var AN = window.HCG_ANALYTICS || {};
  var HAS_AN = !!(AN.ga4 || AN.clarity || AN.linkedin);
  var CONSENT_KEY = 'hcg-consentimento'; // mesma chave da versão anterior: quem já escolheu não é perguntado de novo
  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  var analyticsLoaded = false;
  function loadScript(src) {
    var s = document.createElement('script'); s.async = true; s.src = src;
    document.head.appendChild(s);
  }
  function loadAnalytics() {
    if (analyticsLoaded) return;
    analyticsLoaded = true;
    if (AN.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', AN.ga4, { anonymize_ip: true });
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + AN.ga4);
    }
    if (AN.clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      loadScript('https://www.clarity.ms/tag/' + AN.clarity);
      window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    }
    if (AN.linkedin) {
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(AN.linkedin);
      if (!window.lintrk) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
      loadScript('https://snap.licdn.com/li.lms-analytics/insight.min.js');
    }
  }
  /* registra uma ação (GA4 + Clarity), só com consentimento */
  function track(name, params) {
    if (!analyticsLoaded) return;
    if (AN.ga4 && window.gtag) window.gtag('event', name, params || {});
    if (AN.clarity && window.clarity) { try { window.clarity('event', name); } catch (e) {} }
  }
  window.hcgTrack = track;

  var banner = null;
  function closeBanner() { if (banner) { banner.parentNode.removeChild(banner); banner = null; } }
  function openBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'cookie';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML = '<p><b>Sua privacidade</b>Usamos cookies de análise (Google Analytics, Microsoft Clarity e LinkedIn) para medir as visitas e melhorar o site. Eles só são ativados com a sua autorização. <a href="/privacidade/">Política de privacidade</a></p>' +
      '<div class="cookie-act"><button type="button" class="btn btn-line" data-c="nao">Recusar</button><button type="button" class="btn btn-gold" data-c="sim">Aceitar</button></div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var v = b.getAttribute('data-c');
      var had = getConsent();
      setConsent(v);
      closeBanner();
      if (v === 'sim') loadAnalytics();
      else if (had === 'sim' && analyticsLoaded) location.reload(); // retira os scripts já carregados
    });
    document.body.appendChild(banner);
  }
  if (HAS_AN) {
    var consent = getConsent();
    if (consent === 'sim') loadAnalytics();
    else if (!consent) openBanner();
    $$('[data-cookie-prefs]').forEach(function (b) { b.hidden = false; b.addEventListener('click', openBanner); });
    $$('[data-cookie-alt]').forEach(function (el) { el.hidden = true; });
  }

  /* ===== Ações registradas automaticamente (só valem com consentimento) ===== */
  if (HAS_AN) (function () {
    var once = {};
    function first(name, params) { if (once[name]) return; once[name] = 1; track(name, params); }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a,button');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var txt = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (href.indexOf('wa.me') > -1) track('contato_whatsapp', { local: location.pathname, texto: txt });
      else if (href.indexOf('linkedin.com') > -1) track('clique_linkedin', { local: location.pathname });
      else if (href.indexOf('mailto:') === 0) track('contato_email', { local: location.pathname });
      else if (href.indexOf('tel:') === 0) track('contato_telefone', { local: location.pathname });
      else if (a.classList.contains('btn')) track('clique_botao', { texto: txt, local: location.pathname });
      if (a.classList.contains('tab')) track('ver_servico', { servico: txt });
    }, true);
    document.addEventListener('change', function (e) {
      if (e.target.closest && e.target.closest('#quiz')) {
        first('autodiagnostico_inicio', {});
        track('autodiagnostico_resposta', { indicios: document.querySelectorAll('#quiz input:checked').length });
      }
    }, true);
    document.addEventListener('input', function (e) {
      var id = e.target.id || '';
      if (id === 'simRange') first('simulador_creditos', {});
      if (['folha', 'rat', 'fapAtual', 'fapNovo', 'fapAtualR', 'fapNovoR'].indexOf(id) > -1) first('simulador_fap', {});
    }, true);
  })();

  /* ===== Menu mobile ===== */
  var nav = $('#nav'), menuBtn = $('#menuBtn');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* ===== Cabeçalho: sombra ao rolar + barra de progresso de leitura ===== */
  var top = $('.top');
  if (top) (function () {
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset, max = document.documentElement.scrollHeight - window.innerHeight;
      top.classList.toggle('scrolled', y > 8);
      top.style.setProperty('--sp', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ===== Revelação ao rolar + contadores ===== */
  if ('IntersectionObserver' in window) (function () {
    var SKIP = '.panel, .step-panel, .hero, .pagehead';
    var groups = [
      ['.sec-head', 'rv', false],
      ['.svc3 > *, .diff6 > div, .grid3 > *, .grid2 > *, .who > *, .steps-mini li, .creds .wrap > div, .deadline > div, .facts > div', 'rv', true],
      ['.tl li', 'rv rv-s', true],
      ['.quiz-intro, .sim-intro, .lead-intro, .about-text, .ah-text, .contact-info', 'rv rv-l', false],
      ['.quiz, .sim-bars, .hero-form, .founder, .ah-card, .calc, #form', 'rv rv-r', false],
      ['.faq details', 'rv', true],
      ['.cta, .tbl-wrap, .stepper, .fap-grid > .block, .nf, .foot-brand, .foot-col', 'rv', true]
    ];
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.hasAttribute('data-count')) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    groups.forEach(function (g) {
      $$(g[0]).forEach(function (el) {
        if (el.closest(SKIP) || el.classList.contains('rv')) return;
        // o que já está na tela ao abrir a página não some e reaparece (evita "piscar")
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        el.style.transition = 'none';
        g[1].split(' ').forEach(function (c) { el.classList.add(c); });
        el.offsetWidth; // aplica o estado inicial sem animar
        el.style.transition = '';
        if (g[2]) {
          var sib = [].slice.call(el.parentNode.children).filter(function (x) { return x.classList.contains('rv'); });
          el.style.setProperty('--d', (Math.min(sib.indexOf(el), 6) * 0.08) + 's');
        }
        io.observe(el);
      });
    });
    $$('.tl').forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add('rv-line'); io.observe(el);
    });

    /* números que contam até o valor (ex.: R$ 500 mi+, 3 dias úteis) */
    var fmt = function (n, dec) { return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    function countUp(el) {
      var node = null, w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) if (/\d/.test(w.currentNode.nodeValue)) { node = w.currentNode; break; }
      if (!node) return;
      var src = node.nodeValue, m = src.match(/\d+(?:,\d+)?/);
      var dec = m[0].indexOf(',') > -1 ? m[0].split(',')[1].length : 0;
      var end = parseFloat(m[0].replace(',', '.')), t0 = null, dur = 1400;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        node.nodeValue = src.slice(0, m.index) + fmt(end * e, dec) + src.slice(m.index + m[0].length);
        if (p < 1) requestAnimationFrame(frame); else node.nodeValue = src;
      }
      requestAnimationFrame(frame);
    }
    $$('.creds b, .mock-kpis b').forEach(function (el) { el.setAttribute('data-count', ''); io.observe(el); });
  })();

  /* ===== Avisos com prazo (somem sozinhos depois da data) ===== */
  var d = new Date();
  var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  $$('[data-until]').forEach(function (el) { if (today > el.getAttribute('data-until')) el.hidden = true; });

  /* ===== Abas de serviços (página /servicos/) ===== */
  var tabs = $$('#svcTabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      selectTab(t, false);
      var url = t.getAttribute('data-url');
      if (url) { try { history.replaceState(null, '', url); } catch (e) {} }
    });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
      if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') n = 0;
      if (k === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); tabs[n].click(); tabs[n].focus(); }
    });
  });

  /* Páginas de serviço: no celular, rola o índice até o serviço atual */
  var svcNav = $('#svcNav'), svcCur = svcNav && $('[aria-current="page"]', svcNav);
  if (svcCur && svcNav.scrollWidth > svcNav.clientWidth) {
    svcNav.scrollLeft += svcCur.getBoundingClientRect().left - svcNav.getBoundingClientRect().left - 16;
  }

  /* ===== Etapas (Como trabalhamos) ===== */
  var steps = $$('#stepTabs .step');
  function selectStep(n, focus) {
    steps.forEach(function (s, i) {
      var on = i === n - 1;
      s.setAttribute('aria-selected', on);
      s.tabIndex = on ? 0 : -1;
      document.getElementById('sp' + (i + 1)).hidden = !on;
      if (on) {
        if (focus) s.focus();
        if (s.scrollIntoView) s.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }
  steps.forEach(function (s, i) {
    s.addEventListener('click', function () { selectStep(i + 1, false); });
    s.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % steps.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + steps.length) % steps.length;
      if (n !== null) { e.preventDefault(); selectStep(n + 1, true); }
    });
  });
  $$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { selectStep(+b.getAttribute('data-go'), true); });
  });

  /* ===== Calculadora FAP ===== */
  var folha = $('#folha');
  if (folha) (function () {
    var pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var rat = $('#rat'), fa = $('#fapAtual'), fn = $('#fapNovo'), faR = $('#fapAtualR'), fnR = $('#fapNovoR'), msg = $('#calcMsg');
    function num(v) {
      v = String(v).replace(/[^\d,.-]/g, '');
      if (v.indexOf(',') > -1) v = v.replace(/\./g, '').replace(',', '.');
      else if ((v.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(v)) v = v.replace(/\./g, '');
      var n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }
    function clampFap(f) { return Math.min(2, Math.max(0.5, f || 1)); }
    function pos(f) { return ((clampFap(f) - 0.5) / 1.5 * 100) + '%'; }
    function fmtFap(v) { return clampFap(v).toFixed(4).replace('.', ','); }
    function calc() {
      var F = num(folha.value), R = num(rat.value) / 100, A = clampFap(num(fa.value)), N = clampFap(num(fn.value));
      var cA = F * R * A, eco = cA - F * R * N;
      $('#rAtual').textContent = pct.format(R * A * 100) + '%';
      $('#cAtual').textContent = brl.format(cA);
      $('#eco').textContent = eco > 0 ? brl.format(eco) : 'R$ 0';
      $('#pinCur').style.left = pos(A);
      $('#pinNew').style.left = pos(N);
      faR.setAttribute('aria-valuetext', fmtFap(A));
      fnR.setAttribute('aria-valuetext', fmtFap(N));
      if (!F) { msg.textContent = 'Informe a folha anual para ver o resultado.'; msg.className = 'calc-msg warn'; }
      else if (N >= A) { msg.textContent = 'O FAP após a contestação precisa ser menor que o divulgado para gerar economia.'; msg.className = 'calc-msg warn'; }
      else { msg.textContent = 'Reduzir o FAP de ' + fmtFap(A) + ' para ' + fmtFap(N) + ' economiza ' + brl.format(eco) + ' em 2027.'; msg.className = 'calc-msg'; }
    }
    folha.addEventListener('input', calc);
    rat.addEventListener('change', calc);
    fa.addEventListener('input', function () { var v = num(fa.value); if (v) faR.value = clampFap(v); calc(); });
    fn.addEventListener('input', function () { var v = num(fn.value); if (v) fnR.value = clampFap(v); calc(); });
    faR.addEventListener('input', function () { fa.value = fmtFap(+faR.value); calc(); });
    fnR.addEventListener('input', function () { fn.value = fmtFap(+fnR.value); calc(); });
    folha.addEventListener('blur', function () { var n = num(folha.value); folha.value = n ? new Intl.NumberFormat('pt-BR').format(n) : ''; });
    [fa, fn].forEach(function (el) { el.addEventListener('blur', function () { el.value = fmtFap(num(el.value)); calc(); }); });
    calc();
  })();

  /* ===== Simulador (home) ===== */
  var sr = $('#simRange');
  if (sr) (function () {
    function sim() {
      var m = +sr.value;
      $('#simOut').textContent = brl.format(m);
      sr.setAttribute('aria-valuetext', brl.format(m) + ' por mês');
      $('#sim12').textContent = brl.format(m * 12);
      $('#sim36').textContent = brl.format(m * 36);
      $('#sim60').textContent = brl.format(m * 60);
    }
    sr.addEventListener('input', sim);
    sim();
  })();

  /* ===== Autodiagnóstico (home) ===== */
  var boxes = $$('#quiz input');
  if (boxes.length) (function () {
    var total = boxes.length;
    function quiz() {
      var on = boxes.filter(function (b) { return b.checked; }), n = on.length, t, x;
      $('#qrCount').textContent = n;
      if (n === 0) { t = 'Marque os itens que se aplicam'; x = 'O resultado aparece aqui e pode ser enviado junto com o pedido de análise inicial.'; }
      else if (n <= 2) { t = 'Há indícios a verificar'; x = 'Esses pontos costumam gerar crédito ou custo a maior. A análise inicial confirma em 3 dias úteis.'; }
      else if (n <= 5) { t = 'Indícios relevantes de crédito'; x = 'Vários pontos da sua folha merecem revisão. Vale pedir a análise inicial para ver o potencial com os seus dados.'; }
      else { t = 'Muitos indícios de crédito'; x = 'O perfil da sua folha tem alta chance de pagamento a maior. Recomendamos a análise inicial o quanto antes, porque o prazo de 5 anos corre todo mês.'; }
      $('#qrTitle').textContent = t;
      $('#qrText').textContent = x;
      $('#ringFg').style.strokeDashoffset = (213.6 * (1 - n / total)).toFixed(1);
      var hm = $('#h-msg');
      if (hm) hm.value = n ? ('Autodiagnóstico (' + n + ' de ' + total + ' indícios):\n' + on.map(function (b) { return '- ' + b.value; }).join('\n')) : '';
    }
    boxes.forEach(function (b) { b.addEventListener('change', quiz); });
    quiz();
  })();

  /* ===== Assunto pré-selecionado via ?assunto= (página de contato) ===== */
  var tema = $('#tema');
  if (tema) {
    var q = null;
    try { q = new URLSearchParams(location.search).get('assunto'); } catch (e) {}
    if (q) for (var i = 0; i < tema.options.length; i++) if (tema.options[i].text === q) tema.selectedIndex = i;
  }

  /* ===== Formulários ===== */
  $$('.lead-form').forEach(function (form) {
    var sent = $('.sent', form), submit = $('button[type="submit"]', form);
    sent.setAttribute('role', 'status');
    sent.tabIndex = -1;
    function field(n) { return form.elements[n]; }
    function val(n) { var f = field(n); return f && f.value ? f.value.trim() : ''; }
    function setErr(el, text) {
      if (!el) return;
      var id = el.id + '-err', e = document.getElementById(id);
      if (text) {
        if (!e) { e = document.createElement('p'); e.className = 'field-err'; e.id = id; el.insertAdjacentElement('afterend', e); }
        e.textContent = text;
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', id);
      } else {
        if (e) e.parentNode.removeChild(e);
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      }
    }
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') setErr(e.target, '');
    });
    function show(cls, html) {
      sent.className = 'sent ' + cls;
      sent.innerHTML = html;
      sent.hidden = false;
      sent.focus({ preventScroll: true });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [], fone = field('fone');
      var checks = [
        ['nome', !val('nome'), 'Informe o seu nome.'],
        ['empresa', !val('empresa'), 'Informe a empresa.'],
        ['email', !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(val('email')), 'Informe um e-mail válido.']
      ];
      if (fone && fone.required) checks.push(['fone', val('fone').replace(/\D/g, '').length < 10, 'Informe o WhatsApp com DDD.']);
      checks.forEach(function (c) { var el = field(c[0]); setErr(el, c[1] ? c[2] : ''); if (c[1]) bad.push(el); });
      if (bad.length) {
        show('warn', '<b>Faltam alguns dados</b><p>Confira os campos destacados.</p>');
        bad[0].focus();
        return;
      }
      var txt = 'Olá, sou ' + val('nome') + ' (' + val('empresa') + ').' +
        '\nAssunto: ' + (val('tema') || 'Contato pelo site') +
        '\nE-mail: ' + val('email') +
        (val('fone') ? '\nTelefone: ' + val('fone') : '') +
        (val('func') ? '\nFuncionários: ' + val('func') : '') +
        (val('msg') ? '\n\n' + val('msg') : '');
      var wa = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(txt);
      var mail = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Site HCG: ' + (val('tema') || 'Contato')) + '&body=' + encodeURIComponent(txt);
      var links = '<a href="' + mail + '">enviar por e-mail</a> ou <a href="' + wa + '" target="_blank" rel="noopener">falar pelo WhatsApp</a>';

      // No computador (teste) nada é enviado: o pedido só é validado.
      if (LOCAL) {
        show('ok', '<b>Teste no computador: pedido validado</b><p>No site publicado, este pedido é enviado automaticamente para ' + EMAIL + '. Aqui no computador nada é enviado.</p>');
        return;
      }
      // Sem chave do Web3Forms (ou navegador muito antigo): abre o e-mail do visitante com o pedido pronto.
      if (!FORM_KEY || !window.fetch) {
        location.href = mail;
        show('ok', '<b>Pedido pronto no seu e-mail</b><p>Abrimos o seu programa de e-mail com o pedido para ' + EMAIL + ': é só enviar. Se não abriu, ' + links + '.</p>');
        return;
      }
      if (field('botcheck') && field('botcheck').checked) return; // robô de spam

      var payload = {
        access_key: FORM_KEY,
        subject: val('subject') || 'Novo contato | Site HCG',
        from_name: 'Site HCG Consultoria',
        replyto: val('email'),
        Formulário: form.getAttribute('name') === 'contato' ? 'Página de contato' : 'Análise inicial (página inicial)',
        Nome: val('nome'),
        Empresa: val('empresa'),
        'E-mail': val('email'),
        'Telefone/WhatsApp': val('fone') || '-',
        Funcionários: val('func') || '-',
        Assunto: val('tema') || '-',
        Mensagem: val('msg') || '-',
        Página: location.href
      };
      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = 'Enviando…';
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (!data || data.success !== true) throw new Error((data && data.message) || 'falha');
          form.reset();
          track('generate_lead', { formulario: form.getAttribute('name'), assunto: val('tema'), funcionarios: val('func') });
          show('ok', '<b>Pedido enviado</b><p>Obrigado! Seu pedido chegou à equipe da HCG e retornaremos pelo e-mail informado em breve.</p>');
        })
        .catch(function () {
          show('warn', '<b>Não foi possível enviar agora</b><p>Tente novamente em instantes ou ' + links + '.</p>');
        })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });
  });
})();
