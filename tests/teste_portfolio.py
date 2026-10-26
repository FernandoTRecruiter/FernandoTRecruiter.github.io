# -*- coding: utf-8 -*-
"""
teste_portfolio.py: bateria do portfólio (abre num Edge ou Chrome de verdade e clica).

Cada item imprime OK ou FALHA com o número que decidiu:
  1. abre sem erro (JavaScript e arquivo faltando) em PT e EN, claro e escuro
  2. toda chave data-i18n tem inglês e trocar o idioma troca o topo
  3. nenhum travessão e nenhum nome interno de empresa no texto visível
  4. o bonequinho fala, avança, muda de fala quando a seção muda e volta quando clicado
  5. janelas: recolher, tela cheia (Esc sai), fechar vai para a doca e volta
  6. a demo do dashboard carrega na janela
  7. caminho do dado: passo do "depois" mostra quem cuida; passo do "antes" mostra o problema
  8. a lista de projetos, o "o que já fiz" e o "fora do expediente" saem dos dados
  9. todo caso tem problema, solução e resultado, e nenhum print real voltou à página
 10. a esfera 3D leva até a janela do projeto clicado
 11. sem voz de robô: o botão de voz só aparece se houver gravação no idioma, e nada usa a voz do navegador
 12. celular (390 px): nada vaza para o lado e o balão cabe
 13. em inglês, nenhum texto em português na tela (fora nome de repositório)
 14. tela larga (1280, 1440, 1920): balão aberto e boneco não cruzam nenhuma janela, rolando a página toda
Rodar: pip install websocket-client  e depois  python tests/teste_portfolio.py
"""
import os, sys, pathlib
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__))
from cdp_util import Edge

RAIZ = pathlib.Path(__file__).resolve().parent.parent
URL = (RAIZ / "index.html").as_uri()
falhas = []
# Nomes internos que não podem aparecer na página. A lista mora num arquivo FORA do Git
# (tests/proibidos.txt, está no .gitignore), porque escrever os nomes aqui já seria publicá-los.
_LISTA = pathlib.Path(__file__).with_name("proibidos.txt")
PROIBIDOS = [l.strip() for l in _LISTA.read_text(encoding="utf-8").splitlines() if l.strip()] if _LISTA.exists() else []


def checa(nome, cond, detalhe=""):
    print(("OK    " if cond else "FALHA ") + nome + (f"  [{detalhe}]" if detalhe else ""))
    if not cond:
        falhas.append(nome)


SEM_SUAVE = "document.documentElement.style.scrollBehavior='auto';"

with Edge(1440, 900) as ed:
    erros = []
    for lang in ("pt", "en"):
        for tema in ("claro", "escuro"):
            ed.eventos.clear()
            ed.ir(URL + f"?lang={lang}&tema={tema}", espera=4)
            ed.js(SEM_SUAVE + "window.scrollTo(0, document.body.scrollHeight)", espera=2.5)
            ed.js("window.scrollTo(0, 0)", espera=0.5)
            erros += [f"{lang}/{tema}: {e}" for e in ed.erros()]
            texto = ed.js("document.body.innerText")
            if "—" in texto or any(p in texto for p in PROIBIDOS):
                checa(f"3. texto proibido em {lang}/{tema}", False, ", ".join(p for p in PROIBIDOS + ["—"] if p in texto))
    checa("1. sem erro de JS nem arquivo faltando (4 combinações)", not erros, "; ".join(erros[:3]))
    checa("3. sem travessão e sem nome interno de empresa", not [f for f in falhas if f.startswith("3.")])

    ed.ir(URL + "?lang=pt&tema=claro", espera=4)
    faltam = ed.js("[...new Set([...document.querySelectorAll('[data-i18n]')].map(e=>e.dataset.i18n))].filter(k=>!window.CONTEUDO.en[k])")
    ed.js("document.querySelector('[data-lang=en]').click()", espera=0.8)
    topo = ed.js("document.querySelector('.atalhos').innerText")
    lang_en = ed.js("document.documentElement.lang === 'en'")
    checa("2. toda chave tem inglês e o topo troca", not faltam and "Projects" in topo and lang_en, f"faltam={faltam} topo={topo.replace(chr(10), ' ')}")
    ed.js("document.querySelector('[data-lang=pt]').click()", espera=0.8)

    # 4. narrador
    ed.js(SEM_SUAVE + "window.scrollTo(0,0)", espera=3)
    fala = ed.js("document.querySelector('.fala').textContent")
    ed.js("document.querySelector('[data-fala-prox]').click()", espera=0.3)
    cont = ed.js("document.querySelector('.contador').textContent")
    ed.js(SEM_SUAVE + "document.getElementById('j-pipeline').scrollIntoView({block:'center'})", espera=4.5)
    fala2 = ed.js("document.querySelector('.fala').textContent")
    falas_pipe = ed.js("window.CONTEUDO.falas.pipeline.pt.join('|')")
    ed.js("document.querySelector('[data-calar]').click()", espera=0.3)
    escondido = ed.js("document.querySelector('.balao').classList.contains('escondido')")
    ed.js("document.querySelector('.boneco').click()", espera=0.6)
    voltou = ed.js("!document.querySelector('.balao').classList.contains('escondido')")
    ed.js("try{localStorage.removeItem('paoli-calado')}catch(e){}")
    checa("4. o bonequinho fala, avança, acompanha a seção e volta", len(fala) > 10 and cont[0] in "23" and fala2 in falas_pipe and escondido and voltou,
          f"contador={cont} fala_pipeline={fala2[:40]!r}")

    # 5. janelas
    ed.js("document.querySelector('#j-fluxos .j-min').click()", espera=0.3)
    rec = ed.js("document.getElementById('j-fluxos').classList.contains('recolhida')")
    ed.js("document.querySelector('#j-fluxos .j-min').click(); document.querySelector('#j-fluxos .j-max').click()", espera=0.4)
    maxi = ed.js("document.getElementById('j-fluxos').classList.contains('max') && !!document.querySelector('.veu')")
    ed.js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))", espera=0.3)
    saiu = ed.js("!document.querySelector('.janela.max')")
    ed.js("document.querySelector('#j-repos .j-fechar').click()", espera=0.3)
    doca = ed.js("document.querySelectorAll('.doca button').length === 1")
    ed.js("document.querySelector('.doca button').click()", espera=0.5)
    volta = ed.js("!document.getElementById('j-repos').classList.contains('na-doca')")
    checa("5. recolher, tela cheia + Esc, doca e volta", rec and maxi and saiu and doca and volta, f"{rec} {maxi} {saiu} {doca} {volta}")

    # 6. demo
    ed.js(SEM_SUAVE + "document.getElementById('j-painel').scrollIntoView()", espera=5)
    try:
        h1 = ed.js("document.querySelector('#j-painel iframe').contentDocument.querySelector('h1').textContent")
    except Exception as e:
        h1 = "sem acesso: " + str(e)[:60]
    checa("6. a demo do dashboard carrega na janela", "Dashboard" in (h1 or ""), h1)

    # 7. pipeline
    ed.js("document.querySelector('[data-bloco=\"depois:adf\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))", espera=0.3)
    painel = ed.js("document.querySelector('.pipe-detalhe').innerText")
    ed.js("document.querySelector('[data-bloco=\"antes:plan\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))", espera=0.3)
    painel2 = ed.js("document.querySelector('.pipe-detalhe').innerText")
    checa("7. pipeline mostra quem cuida (depois) e o problema (antes)", "TI + eu" in painel and "quem cuida" in painel.lower() and "problema" in painel2.lower(),
          painel.replace(chr(10), " ")[:80])

    # 8. listas que vêm de dados
    n = ed.js("[document.querySelectorAll('#lista-projetos .repo').length, window.PROJETOS.length, document.querySelectorAll('#lista-cases .case').length, window.CONTEUDO.cases.length, document.querySelectorAll('#sobre-mim .sobre-item').length, window.CONTEUDO.sobreMim.length]")
    checa("8. projetos, o que já fiz e fora do expediente saem dos dados", n[0] == n[1] and n[2] == n[3] and n[4] == n[5] and n[0] > 0 and n[2] > 0, str(n))

    # 9. cada caso tem as três linhas (problema, solução, resultado) e nenhum print real voltou à página
    casos = ed.js("[...document.querySelectorAll('#lista-cases .case')].map(c => [c.querySelectorAll('dt').length, c.querySelectorAll('dd').length, [...c.querySelectorAll('dd')].every(d => d.textContent.trim().length > 3)])")
    prints = ed.js("[...document.images].filter(i => /trabalho|graphify-mapa/.test(i.getAttribute('src') || '')).length")
    checa("9. todo caso tem problema, solução e resultado, e não há print real", casos and all(c == [3, 3, True] for c in casos) and prints == 0, f"casos={casos} prints={prints}")

    # 10. esfera 3D
    ed.js(SEM_SUAVE + "window.scrollTo(0,0)", espera=0.6)
    alvo = ed.js("""(function(){ const c=document.getElementById('constelacao').getBoundingClientRect();
        const ns=window.__portfolio.pecas.constelacao.nos().filter(n=>n.t==='p').sort((a,b)=>b.z-a.z);
        const n=ns[0]; return {id:n.id, x:c.left+n.x, y:c.top+n.y}; })()""")
    for t in ("mouseMoved", "mousePressed", "mouseReleased"):
        ed.cmd("Input.dispatchMouseEvent", type=t, x=alvo["x"], y=alvo["y"], button="left", clickCount=1)
    ed.esperar(1.5)
    checa("10. a esfera 3D leva até a janela do projeto", ed.js("window.scrollY") > 600, alvo["id"])

    # 11. voz
    tem = ed.js("Object.keys(window.AUDIOS||{}).some(k=>k.endsWith('-pt'))")
    escondido = ed.js("document.querySelector('[data-voz]').hidden")
    # clicar na voz (se visível) não pode acionar a voz do navegador
    robo = ed.js("(function(){var n=0; if(window.speechSynthesis){var o=speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak=function(u){n++;}} var b=document.querySelector('[data-voz]'); if(!b.hidden){b.click(); b.click();} return n;})()")
    checa("11. sem voz de robô: botão só com gravação; voz do navegador nunca", (escondido == (not tem)) and robo == 0,
          f"gravações={tem} botão escondido={escondido} chamadas à voz do navegador={robo}")

    # 13. em inglês não sobra português: acento típico ou palavra que só existe em português
    #     (nome de repositório, como gerenciamento-de-cargos, é nome próprio e fica de fora)
    ed.ir(URL + "?lang=en&foto=1", espera=4)
    sobra_pt = ed.js(r"""(function(){
      const PT = /[ãõçáéíóúâêô]|\b(de|da|das|dos|para|com|não|uma|que|em|na|ou|janela|clique|fluxos|repositórios|abertos|antes|depois|caminho|problema|solução|resultado|agentes)\b/i;
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), out = [];
      let n;
      while ((n = w.nextNode())) {
        const t = n.textContent.trim(), el = n.parentElement;
        if (!t || !el || el.closest('script, style, .r-nome')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (PT.test(t)) out.push(t.slice(0, 60));
      }
      return out;
    })()""")
    checa("13. em inglês, nenhum texto em português na tela", not sobra_pt, "; ".join(sobra_pt[:4]))

# 14. em tela larga a faixa da esquerda é do narrador: rola a página de janela em janela, com o
#     balão aberto, e mede se o retângulo do balão ou do boneco encosta no de alguma .janela visível.
CRUZA = r"""(function(){
  const r = s => document.querySelector(s).getBoundingClientRect();
  const b = r('.balao'), k = r('.boneco'), out = [];
  const corta = (a, j) => a.left < j.right && a.right > j.left && a.top < j.bottom && a.bottom > j.top;
  document.querySelectorAll('.janela').forEach(el => {
    const j = el.getBoundingClientRect();
    if (j.bottom < 0 || j.top > innerHeight || getComputedStyle(el).display === 'none') return;
    if (corta(b, j) || corta(k, j)) out.push(el.id || el.className);
  });
  return out;
})()"""
for largura in (1280, 1440, 1920):
    with Edge(largura, 900) as ed:
        ed.ir(URL + "?lang=en&foto=1", espera=4)
        ed.js("try{localStorage.removeItem('paoli-calado')}catch(e){}; document.querySelector('.balao').classList.remove('escondido')")
        cruzou, altura, y = set(), ed.js("document.body.scrollHeight"), 0
        while y < altura:
            ed.js(SEM_SUAVE + f"window.scrollTo(0,{y}); document.querySelector('.balao').classList.remove('escondido')", espera=0.15)
            cruzou.update(ed.js(CRUZA))
            y += 300
        checa(f"14. {largura} px: balão e boneco não cruzam janela", not cruzou, ", ".join(sorted(cruzou)))

with Edge(390, 844) as ed:
    ed.ir(URL + "?lang=pt", espera=4)
    sw, iw = ed.js("[document.documentElement.scrollWidth, innerWidth]")
    b = ed.js("(function(){const r=document.querySelector('.balao').getBoundingClientRect();return [r.left, r.right, innerWidth]})()")
    # innerWidth tem de ser 390: se algo vazar, o navegador do celular afasta o zoom e a janela "cresce" (530 em 22-out).
    checa("12. celular: nada vaza e o balão cabe", iw == 390 and sw <= iw and b[0] >= 0 and b[1] <= b[2], f"scroll {sw}/{iw}, balão {b}")

print("\nRESULTADO:", "TUDO OK" if not falhas else f"{len(falhas)} FALHA(S)")
sys.exit(1 if falhas else 0)
