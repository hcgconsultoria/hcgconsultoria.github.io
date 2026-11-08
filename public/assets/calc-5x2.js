/* HCG Consultoria — calculadora 6x1 → 5x2 (manter o quadro com hora extra x contratar) */
(function () {
  'use strict';
  var root = document.getElementById('c5');
  if (!root) return;

  /* ===== Ajustes ===== */
  var GATE = true;                 // false = confronto completo aberto, sem pedir contato
  var DATA_42H = '2026-12-16';     // início da etapa de 42h (contagem regressiva)
  var WHATSAPP = '5531993938133';  // trocado no build pelo número de content/contato.json
  var EMAIL = 'contato@hcgconsultoria.com.br';
  var FORM_KEY = window.HCG_FORM_KEY || '';
  var LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var STORE = 'hcg-calc5x2-liberado';
  var SEMANAS = 52 / 12;           // média de semanas por mês, para medir horas reais de trabalho

  function $(id) { return document.getElementById(id); }
  function track(n, p) { if (window.hcgTrack) window.hcgTrack(n, p || {}); }
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  var brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var n0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var n1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  function num(v) {
    v = String(v).replace(/[^\d,.]/g, '');
    if (v.indexOf(',') > -1) v = v.replace(/\./g, '').replace(',', '.');
    else if ((v.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(v)) v = v.replace(/\./g, '');
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function val(id) { return num($(id).value); }

  /* ===== Modelo ===== */
  function leitura() {
    var d = $('c5Dsr').value.split(',');
    var j = document.querySelector('input[name="c5J"]:checked');
    return {
      J: +j.value,
      n: Math.min(1000000, Math.round(val('c5N'))),
      S: val('c5Sal'),
      J0: val('c5J0') || 44,
      E: val('c5HE'),
      ad: val('c5Ad') / 100,
      enc: val('c5Enc') / 100,
      adic: val('c5Adic') / 100,
      ben: val('c5Ben'),
      adm: val('c5Adm'),
      vt: val('c5Vt'),
      r: Math.min(100, val('c5Reorg')) / 100,
      rep: +d[0],
      dU: +d[1],
      tipo: $('c5Tipo').value
    };
  }

  function fecha(x, enc) {
    x.rem = x.sal + x.salH + x.heAt + x.heCob + x.dsr;
    x.s13 = x.rem / 12;
    x.fer = x.rem / 12 * (4 / 3);
    x.encargos = (x.rem + x.s13 + x.fer) * enc;
    x.total = x.rem + x.s13 + x.fer + x.encargos + x.benef + x.vtc;
    x.ano = 12 * x.total + x.admissao;
    return x;
  }

  function modelo(p, J) {
    var base = p.S * (1 + p.adic);
    var Jn = Math.min(p.J0, J);
    var h0 = base / (p.J0 * 5), h1 = base / (Jn * 5);
    var perda = Math.max(0, p.J0 - Jn) * SEMANAS;
    var H = p.n * perda * (1 - p.r);
    var hE = p.n * p.E;
    var f0 = 4 / 26, f1 = p.rep / p.dU;
    function vt(dias, sal) { return Math.max(0, dias * p.vt - 0.06 * sal); }
    var fatorHE = (1 + 1 / 12 + 4 / 36) * (1 + p.enc);

    var hoje = fecha({ head: p.n, jor: p.J0, div: p.J0 * 5, hora: h0, he: h0 * (1 + p.ad), H: 0, hE: hE, heCol: p.n ? hE / p.n : 0,
      lim: 52, sal: p.n * base, salH: 0, heAt: hE * h0 * (1 + p.ad), heCob: 0, dsr: hE * h0 * (1 + p.ad) * f0, benef: 0, vtc: p.n * vt(26, p.S), admissao: 0 }, p.enc);

    var aCob = H * h1 * (1 + p.ad), aAt = hE * h1 * (1 + p.ad);
    var a = fecha({ head: p.n, jor: Jn, div: Jn * 5, hora: h1, he: h1 * (1 + p.ad), H: H, hE: hE + H, heCol: p.n ? (hE + H) / p.n : 0,
      lim: 2 * p.dU, sal: p.n * base, salH: 0, heAt: aAt, heCob: aCob, dsr: (aAt + aCob) * f1, benef: 0, vtc: p.n * vt(p.dU, p.S), admissao: 0 }, p.enc);

    var Jh = p.tipo === 'parcial' ? Math.min(30, Jn) : Jn;
    var cap = Jh * SEMANAS;
    var k = H > 0 ? Math.ceil(H / cap - 1e-9) : 0;
    var folga = k * cap - H;
    var hRes = Math.max(0, hE - folga);
    var bAt = hRes * h1 * (1 + p.ad);
    var b = fecha({ head: p.n + k, jor: Jn, div: Jn * 5, hora: h1, he: h1 * (1 + p.ad), H: H, hE: hRes, heCol: (p.n + k) ? hRes / (p.n + k) : 0,
      lim: 2 * p.dU, sal: p.n * base, salH: k * base * Jh / Jn, heAt: bAt, heCob: 0, dsr: bAt * f1, benef: k * p.ben, vtc: p.n * vt(p.dU, p.S) + k * vt(p.dU, p.S * Jh / Jn), admissao: k * p.adm }, p.enc);
    b.k = k; b.Jh = Jh;

    var semCob = a.total - aCob * (1 + f1) * fatorHE;
    a.porHora = H > 0 ? (a.total - semCob) / H : 0;
    b.porHora = H > 0 ? (b.total - semCob) / H : 0;
    return { hoje: hoje, a: a, b: b, H: H, k: k };
  }

  /* ===== Linhas do confronto ===== */
  var D = '—';
  function fb(v) { return brl.format(v); }
  function dif(fmt) { return function (a, b) { var d = b - a; if (Math.abs(d) < 0.005) return D; return (d > 0 ? '+' : '−') + fmt(Math.abs(d)); }; }
  function h(v) { return n0.format(v) + ' h'; }
  function h1f(v) { return n1.format(v) + ' h'; }
  var LINHAS = [
    { g: 'Operação' },
    { l: 'Colaboradores no grupo', k: 'head', f: n0.format, d: dif(n0.format) },
    { l: 'Jornada semanal', k: 'jor', f: function (v) { return v + 'h'; } },
    { l: 'Divisor mensal', k: 'div', f: n0.format },
    { l: 'Valor da hora normal', k: 'hora', f: brl2.format, d: dif(brl2.format) },
    { l: 'Valor da hora extra (com adicional)', k: 'he', f: brl2.format, d: dif(brl2.format) },
    { g: 'Cobertura das horas' },
    { l: 'Horas a cobrir por mês', k: 'H', f: h, hojeNA: 1, d: dif(h) },
    { l: 'Horas extras por mês', k: 'hE', f: h, d: dif(h) },
    { l: 'Horas extras por colaborador', k: 'heCol', f: h1f, d: dif(h1f) },
    { l: 'Uso do limite de 2h por dia', c: function (x) { return x.lim ? x.heCol / x.lim * 100 : 0; }, f: function (v) { return n0.format(v) + '%'; }, alerta: 1 },
    { l: 'Custo por hora coberta', k: 'porHora', f: brl2.format, hojeNA: 1, d: dif(brl2.format) },
    { g: 'Composição do custo mensal' },
    { l: 'Salários e adicionais do quadro', k: 'sal', f: fb, d: dif(fb), lock: 1 },
    { l: 'Salários dos novos contratados', k: 'salH', f: fb, d: dif(fb), lock: 1 },
    { l: 'Horas extras que já existem', k: 'heAt', f: fb, d: dif(fb), lock: 1 },
    { l: 'Horas extras de cobertura', k: 'heCob', f: fb, d: dif(fb), lock: 1 },
    { l: 'DSR sobre horas extras', k: 'dsr', f: fb, d: dif(fb), lock: 1 },
    { l: 'Provisão de 13º salário', k: 's13', f: fb, d: dif(fb), lock: 1 },
    { l: 'Provisão de férias + 1/3', k: 'fer', f: fb, d: dif(fb), lock: 1 },
    { l: 'Encargos e FGTS', k: 'encargos', f: fb, d: dif(fb), lock: 1 },
    { l: 'Benefícios dos contratados', k: 'benef', f: fb, d: dif(fb), lock: 1 },
    { l: 'Vale-transporte (parte da empresa)', k: 'vtc', f: fb, d: dif(fb), lock: 1 },
    { g: 'Resultado' },
    { l: 'Custo mensal dos itens simulados', k: 'total', f: fb, d: dif(fb), tot: 1 },
    { l: 'Aumento mensal sobre hoje', c: function (x, m) { return x.total - m.hoje.total; }, f: fb, hojeNA: 1, d: dif(fb) },
    { l: 'Admissão (custo único)', k: 'admissao', f: fb, hojeNA: 1, d: dif(fb), lock: 1 },
    { l: 'Aumento nos primeiros 12 meses', c: function (x, m) { return x.ano - m.hoje.ano; }, f: fb, hojeNA: 1, d: dif(fb), tot: 1 }
  ];

  var liberado = !GATE;
  try { if (localStorage.getItem(STORE) === '1') liberado = true; } catch (e) {}

  function celula(cls, rot, txt) { return '<td class="' + cls + '" data-l="' + rot + '">' + txt + '</td>'; }
  var ROT = { h: 'Hoje', a: 'Hora extra', b: 'Contratar', d: 'Contratar − hora extra' };

  function tabela(m) {
    var html = '', mask = '<span class="c5-mask" aria-label="Disponível após liberar">•••••</span>';
    LINHAS.forEach(function (r) {
      if (r.g) { html += '<tr class="c5-g"><th colspan="5" scope="colgroup">' + r.g + '</th></tr>'; return; }
      function v(x) { return r.c ? r.c(x, m) : x[r.k]; }
      var trava = r.lock && !liberado;
      var hj = (r.hojeNA) ? D : (trava ? mask : r.f(v(m.hoje)));
      var a = trava ? mask : r.f(v(m.a)), b = trava ? mask : r.f(v(m.b));
      var d = trava ? mask : (r.d ? r.d(v(m.a), v(m.b)) : D);
      if (r.alerta && v(m.a) > 100) a = '<span class="c5-over">' + a + '</span>';
      if (r.alerta && v(m.b) > 100) b = '<span class="c5-over">' + b + '</span>';
      html += '<tr' + (r.tot ? ' class="c5-tot"' : '') + '><th scope="row">' + r.l + '</th>' +
        celula('n', ROT.h, hj) + celula('n ca', ROT.a, a) + celula('n cb', ROT.b, b) + celula('n cd', ROT.d, d) + '</tr>';
    });
    $('c5Body').innerHTML = html;
  }

  /* ===== Tela ===== */
  var ultimo = null;
  function pessoas(k) { return k === 1 ? '1 pessoa' : n0.format(k) + ' pessoas'; }

  function premissas(p) {
    var dsrTxt = p.rep + ' repousos em ' + p.dU + ' dias úteis';
    return [
      ['Colaboradores na 6x1', n0.format(p.n)],
      ['Salário médio', brl2.format(p.S)],
      ['Adicionais habituais', n1.format(p.adic * 100) + '%'],
      ['Jornada atual', p.J0 + 'h'],
      ['Nova jornada', p.J + 'h'],
      ['Horas extras por colaborador/mês', n1.format(p.E) + ' h'],
      ['Adicional de hora extra', n1.format(p.ad * 100) + '%'],
      ['Encargos e FGTS', n1.format(p.enc * 100) + '%'],
      ['Absorvido pela reorganização', n0.format(p.r * 100) + '%'],
      ['Critério do DSR', dsrTxt],
      ['Tipo de contratação', p.tipo === 'parcial' ? 'Tempo parcial (30h)' : 'Tempo integral'],
      ['Benefícios por contratado', brl.format(p.ben)],
      ['Admissão por contratado', brl.format(p.adm)],
      ['Vale-transporte por dia', brl2.format(p.vt)]
    ];
  }

  function calc() {
    var p = leitura(), m = modelo(p, p.J), a = m.a, b = m.b;
    var dA = a.ano - m.hoje.ano, dB = b.ano - m.hoje.ano;
    var limA = a.lim ? a.heCol / a.lim : 0;
    var over = limA > 1, valido = p.n > 0 && p.S > 0, semPerda = m.H <= 0;
    var best = '', titulo, texto;

    $('c5ReorgV').textContent = n0.format(p.r * 100) + '%';
    $('c5Reorg').setAttribute('aria-valuetext', n0.format(p.r * 100) + '%');
    $('c5Bh').textContent = 'B · Contratar' + (m.k ? ' ' + pessoas(m.k) : '');

    if (!valido) {
      titulo = 'Informe o grupo e o salário médio';
      texto = 'O confronto aparece assim que os dois campos estiverem preenchidos.';
    } else if (semPerda) {
      titulo = 'Sem horas a cobrir neste cenário';
      texto = 'A jornada atual ou a reorganização já absorve a mudança. Ainda assim, o valor da hora e o DSR mudam o custo das horas extras existentes.';
    } else if (over) {
      best = 'b';
      titulo = 'Só hora extra não fecha a conta';
      texto = 'Cada colaborador chegaria a ' + n1.format(a.heCol) + ' h extras por mês, acima do limite de cerca de ' + a.lim + ' h (2 horas por dia). A saída passa por contratar ou reorganizar mais as escalas.';
    } else if (dB < dA) {
      best = 'b';
      titulo = 'Contratar sai ' + brl.format(dA - dB) + ' mais barato em 12 meses';
      texto = 'Contratando ' + pessoas(m.k) + ', cada hora coberta custa ' + brl2.format(b.porHora) + ', contra ' + brl2.format(a.porHora) + ' na hora extra.';
    } else {
      best = 'a';
      titulo = 'Hora extra sai ' + brl.format(dB - dA) + ' mais barato em 12 meses';
      texto = 'Mas cada colaborador passa a ' + n1.format(a.heCol) + ' h extras por mês. Hora extra habitual reflete em outras verbas e aumenta a exposição trabalhista.';
    }
    $('c5Vt1').textContent = titulo;
    $('c5Vt2').textContent = texto;
    $('c5TA').textContent = valido ? '+' + brl.format(Math.max(0, dA)) : D;
    $('c5TB').textContent = valido ? '+' + brl.format(Math.max(0, dB)) : D;
    $('c5TBl').textContent = 'Contratar' + (m.k ? ' ' + pessoas(m.k) : '') + ' · 12 meses';
    $('c5TH').textContent = valido ? h(m.H) : D;
    $('c5TAb').classList.toggle('best', best === 'a');
    $('c5TBb').classList.toggle('best', best === 'b');
    $('c5TAb').classList.toggle('over', over);
    $('c5Tbl').setAttribute('data-best', best);
    tabela(m);

    // Duas etapas
    var html = '';
    [42, 40].forEach(function (J) {
      var e = modelo(p, J);
      html += '<tr><th scope="row">' + J + 'h</th><td class="n" data-l="Horas a cobrir">' + h(e.H) + '</td><td class="n" data-l="Hora extra / ano">' + brl.format(e.a.total * 12) +
        '</td><td class="n" data-l="Contratar / ano">' + brl.format(e.b.total * 12) + '</td><td class="n" data-l="Pessoas">' + n0.format(e.k) + '</td></tr>';
    });
    $('c5Etapas').innerHTML = html;
    $('c5Prem').innerHTML = premissas(p).map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');

    ultimo = { p: p, m: m, titulo: titulo, dA: dA, dB: dB };
  }

  function aplicaLiberacao() {
    $('c5Lock').hidden = liberado;
    $('c5Open').hidden = !liberado;
  }

  /* ===== Entradas ===== */
  var iniciou = false;
  root.addEventListener('input', function (e) {
    if (!e.target.closest('.c5-in')) return;
    if (!iniciou) { iniciou = true; track('calc_5x2_inicio'); }
    calc();
  });
  $('c5Regime').addEventListener('change', function () {
    if (this.value) { $('c5Enc').value = this.value; calc(); }
  });
  ['c5Sal', 'c5Ben', 'c5Adm'].forEach(function (id) {
    var el = $(id);
    el.addEventListener('blur', function () { var x = num(el.value); el.value = x ? new Intl.NumberFormat('pt-BR').format(x) : ''; });
  });
  $('c5Print').addEventListener('click', function () { track('calc_5x2_pdf'); window.print(); });

  /* Origem da visita (ex.: ?utm_source=linkedin), enviada junto com o contato */
  var origem = '';
  try {
    var q = new URLSearchParams(location.search), u = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { if (q.get(k)) u.push(k.replace('utm_', '') + '=' + q.get(k)); });
    if (u.length) sessionStorage.setItem('hcg-origem', u.join(' · '));
    origem = sessionStorage.getItem('hcg-origem') || document.referrer || 'acesso direto';
  } catch (e) { origem = document.referrer || 'acesso direto'; }

  /* ===== Liberação do confronto (captura do contato) ===== */
  var form = $('c5Lead');
  function erro(id, msg) {
    var el = $(id), box = $(id + 'Err');
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    box.textContent = msg || '';
    box.hidden = !msg;
    return !msg;
  }
  function libera(msg) {
    liberado = true;
    try { localStorage.setItem(STORE, '1'); } catch (e) {}
    calc();
    aplicaLiberacao();
    if (msg) { $('c5OpenMsg').innerHTML = msg; $('c5OpenMsg').hidden = false; }
    $('c5Tbl').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function resumo() {
    var u = ultimo, a = u.m.a, b = u.m.b;
    return 'Conclusão: ' + u.titulo + '\n' +
      'Horas a cobrir/mês: ' + n0.format(u.m.H) + '\n' +
      'Hora extra: ' + brl.format(a.total) + '/mês; aumento em 12 meses ' + brl.format(u.dA) + '\n' +
      'Contratar ' + pessoas(u.m.k) + ': ' + brl.format(b.total) + '/mês; aumento em 12 meses ' + brl.format(u.dB);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = $('c5Nome').value.trim(), mail = $('c5Mail').value.trim(), emp = $('c5Emp').value.trim(), tel = $('c5Tel').value.trim();
    var ok = erro('c5Nome', nome ? '' : 'Informe seu nome.');
    ok = erro('c5Mail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) ? '' : 'Informe um e-mail válido.') && ok;
    ok = erro('c5Emp', emp ? '' : 'Informe a empresa.') && ok;
    ok = erro('c5Tel', tel.replace(/\D/g, '').length >= 10 ? '' : 'Informe o WhatsApp com DDD.') && ok;
    if (!ok) { var inv = form.querySelector('[aria-invalid="true"]'); if (inv) inv.focus(); return; }
    if ($('c5Bot').checked) return; // robô de spam

    var prem = premissas(ultimo.p).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n');
    if (LOCAL) { libera('<b>Teste no computador.</b> No site publicado, estes dados chegam a ' + EMAIL + '.'); return; }
    if (!FORM_KEY || !window.fetch) {
      var corpo = 'Nome: ' + nome + '\nEmpresa: ' + emp + '\nWhatsApp: ' + tel + '\nE-mail: ' + mail + '\n\n' + resumo() + '\n\n' + prem;
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Calculadora 5x2: ' + emp) + '&body=' + encodeURIComponent(corpo);
      libera('Abrimos o seu e-mail com o estudo para a HCG. É só enviar para falarmos sobre o resultado.');
      return;
    }
    var btn = $('c5Send'), rot = btn.textContent;
    btn.disabled = true; btn.textContent = 'Liberando…';
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: FORM_KEY,
        subject: 'Calculadora 5x2 · ' + emp + ' · ' + n0.format(ultimo.p.n) + ' colaboradores',
        from_name: 'Calculadora 5x2 | Site HCG',
        replyto: mail,
        Nome: nome, Empresa: emp, 'E-mail': mail, WhatsApp: tel,
        Resultado: resumo(), Premissas: prem,
        Origem: origem, Página: location.href
      })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (!d || d.success !== true) throw new Error('falha');
        track('generate_lead', { formulario: 'calculadora_5x2', colaboradores: ultimo.p.n });
        libera('');
      })
      .catch(function () {
        track('calc_5x2_erro_envio');
        libera('Liberamos o confronto, mas seu contato não chegou até nós. Fale com a HCG pelo WhatsApp ou por ' + EMAIL + '.');
      })
      .then(function () { btn.disabled = false; btn.textContent = rot; });
  });

  /* ===== Contagem até a etapa de 42h ===== */
  var alvo = new Date(DATA_42H + 'T00:00:00-03:00'), dias = Math.ceil((alvo - new Date()) / 864e5);
  if (dias > 0) {
    $('c5Dias').textContent = dias === 1 ? '1 dia' : dias + ' dias';
    $('c5Count').hidden = false;
  }

  calc();
  aplicaLiberacao();
})();
