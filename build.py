"""
Build do site HCG Consultoria.

Lê o conteúdo editável (pasta content/, alterada pelo painel /admin) e gera o
site final em dist/, a partir das páginas em public/.

Nas páginas, as áreas editáveis ficam entre comentários:
    <!--cms:nome--> ... <!--/cms:nome-->
O que está entre eles é substituído pelo conteúdo de content/*.json.

Uso:  python build.py        (o GitHub roda isso a cada alteração; ver .github/workflows)
Só usa a biblioteca padrão do Python.
"""
import datetime
import hashlib
import html
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PUBLIC = ROOT / 'public'
CONTENT = ROOT / 'content'
DIST = ROOT / 'dist'

# Valores originais gravados nas páginas; o build troca pelos de content/contato.json
DEFAULTS = {
    'whatsapp': '5531993938133',
    'telefone': '+55 (31) 99393-8133',
    'email': 'contato@hcgconsultoria.com.br',
    'linkedin_empresa': 'https://www.linkedin.com/company/146670800/',
    'linkedin_fundador': 'https://www.linkedin.com/in/pedro-couto-1702ab82',
}
ICONES = {'relogio': 'i-clock', 'documento': 'i-file', 'moedas': 'i-coins', 'premio': 'i-award',
          'grafico': 'i-trend', 'escudo': 'i-shield', 'lupa': 'i-search', 'pessoa': 'i-user',
          'camadas': 'i-layers', 'predio': 'i-building'}


def load(name):
    return json.loads((CONTENT / f'{name}.json').read_text(encoding='utf-8'))


def esc(text):
    """Texto simples -> HTML. Aceita **negrito**."""
    t = html.escape(str(text or '').strip(), quote=False)
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)


def attr(text):
    return html.escape(str(text or '').strip(), quote=True)


def ticks(items, indent='          ', cls='ticks'):
    lis = '\n'.join(f'{indent}  <li><span>{esc(i)}</span></li>' for i in items if str(i).strip())
    return f'<ul class="{cls}">\n{lis}\n{indent}</ul>'


# ------------------------------------------------------------------ renderizadores
def r_aviso(c):
    a = c['inicio']['aviso']
    if not a.get('ativo'):
        return ''
    until = f' data-until="{attr(a["expira"])}"' if a.get('expira') else ''
    url = str(a.get('link_url') or '').strip()
    # só links internos (/pagina/) ou https://: bloqueia javascript:, data: e afins
    if url and not re.match(r'(/(?!/)|#|https://)', url):
        raise SystemExit(f'Endereço do link do aviso inválido: {url!r} (use /pagina/ ou https://...)')
    link = f'<a href="{attr(url)}">{esc(a["link_texto"])}</a>' if url else ''
    return (f'<div class="fap-strip"{until}>\n    <div class="wrap"><span><svg aria-hidden="true"><use href="#i-alert"/></svg>'
            f'<b>{esc(a["destaque"])}</b> {esc(a["texto"])}</span>{link}</div>\n  </div>')


def r_hero_selo(c):
    return f'<p class="pill"><span></span>{esc(c["inicio"]["hero"]["selo"])}</p>'


def r_hero_titulo(c):
    h = c['inicio']['hero']
    dest = f' <span>{esc(h["destaque"])}</span>' if h.get('destaque') else ''
    return f'<h1>{esc(h["titulo"])}{dest}</h1>'


def r_hero_texto(c):
    return f'<p class="lede">{esc(c["inicio"]["hero"]["texto"])}</p>'


def r_hero_provas(c):
    lis = '\n'.join(f'          <li><svg aria-hidden="true"><use href="#i-check"/></svg>{esc(p)}</li>'
                    for p in c['inicio']['hero']['provas'] if str(p).strip())
    return f'<ul class="proof">\n{lis}\n        </ul>'


def r_numeros(c):
    out = []
    for n in c['inicio']['numeros']:
        ic = ICONES.get(n.get('icone'), 'i-check')
        out.append(f'      <div><svg aria-hidden="true"><use href="#{ic}"/></svg><b>{esc(n["valor"])}</b><span>{esc(n["legenda"])}</span></div>')
    return '\n' + '\n'.join(out) + '\n    '


def r_faq(c):
    items = c['inicio']['faq']
    out = []
    for i, f in enumerate(items):
        op = ' open' if i == 0 else ''
        out.append(f'        <details{op}><summary>{esc(f["pergunta"])}</summary><p>{esc(f["resposta"])}</p></details>')
    return '\n' + '\n'.join(out) + '\n      '


def r_faq_jsonld(c):
    data = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': f['pergunta'].strip(),
         'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'\*\*(.+?)\*\*', r'\1', f['resposta'].strip())}}
        for f in c['inicio']['faq']]}
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '\n</script>'


def r_lideranca(c):
    li, f = c['inicio']['lideranca'], c['quem-somos']['fundador']
    return (f'<div class="ah-text">\n        <p class="eyebrow">Liderança</p>\n        <h2>{esc(li["titulo"])}</h2>\n'
            f'        <p class="lede">{esc(li["texto"])}</p>\n        <a class="link" href="/quem-somos/">Conheça a HCG →</a>\n      </div>\n'
            f'      <div class="ah-card">\n        <div class="mono-mark" aria-hidden="true">{esc(f["iniciais"])}</div>\n'
            f'        <div><b>{esc(f["nome"])}</b><span>{esc(f["cargo"])}</span></div>\n        {ticks(li["destaques"], "        ")}\n      </div>')


def r_sobre(c):
    q = c['quem-somos']
    ps = '\n'.join(f'        <p>{esc(p)}</p>' for p in q['paragrafos'] if str(p).strip())
    return (f'<div class="about-text">\n        <h2>{esc(q["titulo"])}</h2>\n{ps}\n'
            f'        <h3 style="margin-top:12px">Áreas de atuação</h3>\n        {ticks(q["areas"], "        ")}\n      </div>')


def r_fundador(c):
    f = c['quem-somos']['fundador']
    return (f'<aside class="founder on-band">\n        <div class="mono-mark" aria-hidden="true">{esc(f["iniciais"])}</div>\n'
            f'        <div><h3 style="font-size:1.4rem">{esc(f["nome"])}</h3><p class="role">{esc(f["cargo"])}</p></div>\n'
            f'        {ticks(f["destaques"], "        ")}\n'
            f'        <a href="{DEFAULTS["linkedin_fundador"]}" target="_blank" rel="noopener">LinkedIn de {esc(f["nome"])} ↗</a>\n      </aside>')


def r_fap_chamada(c):
    return f'<p class="lede">{esc(c["fap"]["chamada"])}</p>'


def r_fap_prazos(c):
    out = [f'          <div><b>{esc(p["data"])}</b><span>{esc(p["descricao"])}</span></div>' for p in c['fap']['prazos']]
    return '\n' + '\n'.join(out) + '\n        '


def r_analytics(c):
    """IDs do Clarity/LinkedIn; os scripts só carregam depois que o visitante aceita os cookies."""
    a = c['analytics']
    ga4 = re.sub(r'[^A-Z0-9-]', '', str(a.get('ga4_id', '')).strip().upper())
    clarity = re.sub(r'[^a-z0-9]', '', str(a.get('clarity_id', '')).strip().lower())
    linkedin = re.sub(r'\D', '', str(a.get('linkedin_partner_id', '')))
    if ga4 and not re.fullmatch(r'G-[A-Z0-9]{4,}', ga4):
        raise SystemExit(f'ID do Google Analytics inválido: {ga4!r} (formato G-XXXXXXXXXX)')
    out = ''
    if ga4 or clarity or linkedin:
        out += '<script>window.HCG_ANALYTICS=' + json.dumps({'ga4': ga4, 'clarity': clarity, 'linkedin': linkedin}) + ';</script>'
    # chave pública do Web3Forms (envio dos formulários por e-mail)
    key = str(c['formularios'].get('web3forms_key', '')).strip()
    if key:
        if not re.fullmatch(r'[0-9a-fA-F-]{36}', key):
            raise SystemExit(f'Chave do Web3Forms inválida: {key!r}')
        out += '<script>window.HCG_FORM_KEY=' + json.dumps(key) + ';</script>'
    return out


RENDER = {
    'analytics': r_analytics,
    'aviso': r_aviso, 'hero-selo': r_hero_selo, 'hero-titulo': r_hero_titulo, 'hero-texto': r_hero_texto,
    'hero-provas': r_hero_provas, 'numeros': r_numeros, 'faq': r_faq, 'faq-jsonld': r_faq_jsonld,
    'lideranca': r_lideranca, 'sobre': r_sobre, 'fundador': r_fundador,
    'fap-chamada': r_fap_chamada, 'fap-prazos': r_fap_prazos,
}
MARK = re.compile(r'<!--cms:([a-z0-9-]+)-->(.*?)<!--/cms:\1-->', re.S)


def contact_swaps(contato):
    """Pares (valor original -> valor atual) de contato, aplicados em todo o site."""
    digits = re.sub(r'\D', '', contato['whatsapp'])
    if len(digits) < 12:
        raise SystemExit(f'WhatsApp inválido em content/contato.json: {contato["whatsapp"]!r} (use DDI+DDD+número, ex.: 5531993938133)')
    ld = f'+{digits[:2]}-{digits[2:4]}-{digits[4:-4]}-{digits[-4:]}'
    pairs = [
        ('+55-31-99393-8133', ld),
        (DEFAULTS['whatsapp'], digits),
        (DEFAULTS['telefone'], contato['telefone'].strip()),
        (DEFAULTS['email'], contato['email'].strip()),
        (DEFAULTS['linkedin_empresa'], contato['linkedin_empresa'].strip()),
        (DEFAULTS['linkedin_fundador'], contato['linkedin_fundador'].strip()),
    ]
    return [(a, b) for a, b in pairs if a != b]


def build():
    c = {n: load(n) for n in ('contato', 'inicio', 'quem-somos', 'fap', 'analytics', 'formularios')}
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST)

    swaps = contact_swaps(c['contato'])
    used = set()
    ver = {}
    # páginas por último: a versão dos arquivos de estilo/script é o hash do conteúdo final
    files = sorted(DIST.rglob('*'), key=lambda f: (f.suffix == '.html', str(f)))
    for p in files:
        if p.suffix == '.html' and not ver:
            for name in ('site.css', 'site.js', 'calc-5x2.js'):
                ver[name] = hashlib.md5((DIST / 'assets' / name).read_bytes()).hexdigest()[:10]
        if p.suffix not in ('.html', '.js', '.xml', '.txt') or p.parts[-2:] == ('admin', 'index.html'):
            continue
        s = p.read_text(encoding='utf-8')
        if p.suffix == '.html':
            def sub(m):
                key = m.group(1)
                if key not in RENDER:
                    raise SystemExit(f'{p.relative_to(DIST)}: área editável desconhecida "{key}"')
                used.add(key)
                return RENDER[key](c)
            s = MARK.sub(sub, s)
            s = re.sub(r'(/assets/(site\.(?:css|js)|calc-5x2\.js))\?v=[\w-]+', lambda m: f'{m.group(1)}?v={ver[m.group(2)]}', s)
        for a, b in swaps:
            s = s.replace(a, b)
        if p.name == 'sitemap.xml':
            s = re.sub(r'<lastmod>[^<]+</lastmod>', f'<lastmod>{datetime.date.today().isoformat()}</lastmod>', s)
        p.write_text(s, encoding='utf-8')

    missing = set(RENDER) - used
    if missing:
        raise SystemExit(f'áreas editáveis não encontradas nas páginas: {sorted(missing)}')
    print(f'Site gerado em {DIST} ({sum(1 for _ in DIST.rglob("*.html"))} páginas)')


if __name__ == '__main__':
    try:
        build()
    except KeyError as e:
        sys.exit(f'Campo obrigatório ausente no conteúdo: {e}')
