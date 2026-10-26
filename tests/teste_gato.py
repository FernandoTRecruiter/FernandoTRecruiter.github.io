# -*- coding: utf-8 -*-
"""
teste_gato.py: bateria do gato branco (js/gato.js) contra tests/gato_harness.html.

Tudo com eventos REAIS pelo CDP (mouse, teclado, rodinha e toque) e medido no que
está desenhado (retângulos do SVG), não no que o código diz de si mesmo.
Cada item imprime OK ou FALHA com o número que decidiu:
  1. abre sem erro de JS (claro/PT, escuro/EN) e nasce em casa: à direita do boneco, pés na linha dele
  2. parado em casa o laço desliga (contador global de requestAnimationFrame parado)
  3. não bloqueia clique: a caixa do botão deixa o clique passar; só o círculo do gato pega
  4. clique sem arrasto chama falar() com a piada seguinte; Enter também; idioma certo
  5. arrastar 300 px para cima e para a direita: a cabeça vai junto e o corpo estica
  6. soltar: chega ao chão e volta andando para casa (posição final = posição inicial)
  7. ?foto=1: nenhum requestAnimationFrame e gato em casa
  8. sorteio armado entre 25 e 50 s
  9. janela: sobe numa barra visível e acompanha a rolagem
 10. movimento reduzido: sem sorteio, arrasto funciona, sem quique, volta para casa
 11. celular 390 px: menor, dentro da tela, não cobre o balão; arrasto com o dedo
 12. nenhum travessão nos arquivos do gato
 13. parar() desliga e tira o gato; iniciar() de novo cria um só
 14-16. (site real) topo do balão, cabeça do boneco e brincar com o cursor
 17. brincar: cursor na faixa (mouse real), recarga, clique liga 4 a 6 s, arrasto não liga
 18. (site real) fala nova -> vai ao balão (sorteio pelo gancho) com recarga; variações a, b, c, d
     sem cobrir texto nem botões e com o balão de volta ao normal
 19. (site real) soneca com zzz, acordar (cursor, clique, fala) e miau/meow fora do balão
Rodar: python tests/teste_gato.py   (precisa do Edge; sai com código 1 se algo falhar)
Fotos: pasta _fotos ao lado do repositório (se existir), senão a pasta temporária.
"""
import json, math, os, pathlib, random, shutil, socket, subprocess, sys, tempfile, time, urllib.request
sys.stdout.reconfigure(encoding="utf-8")

AQUI = pathlib.Path(__file__).resolve().parent            # .../FernandoTRecruiter.github.io/tests
REPO = AQUI.parent
for p in (REPO.parent / "_ferramentas", AQUI):             # cdp_util.py: o desta pasta primeiro; senão o das ferramentas
    sys.path.insert(0, str(p))
import cdp_util
from cdp_util import Edge

URL = (AQUI / "gato_harness.html").as_uri()
FOTOS = REPO.parent / "_fotos" if (REPO.parent / "_fotos").is_dir() else pathlib.Path(tempfile.gettempdir())
falhas = []

# Conta TODA chamada de requestAnimationFrame da página (instalado antes de qualquer script).
CONTA_RAF = """window.__rafN = 0;
(function () { const o = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) { window.__rafN++; return o(cb); }; })();"""

# Medida do que está desenhado: corpo, cabeça, círculo de toque, boneco e balão.
MEDE = """(() => { const g = document.querySelector('.gb'); if (!g || !g.isConnected) return null;
  const R = el => { const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2}; };
  return { corpo: R(g.querySelector('.gb-corpo')), cab: R(g.querySelector('.gb-cabeca-forma')), alvo: R(g.querySelector('.gb-alvo')),
           tudo: R(g.querySelector('svg > g')), caixa: R(g), boneco: R(document.querySelector('.boneco')), balao: R(document.querySelector('.balao')),
           est: Gato.estado(), iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth, sy: scrollY }; })()"""


class EdgeGato(Edge):
    # O mesmo Edge do cdp_util, com porta e perfil PRÓPRIOS. Por quê: o cdp_util sempre começa
    # na porta 9300 com o perfil "edgepaoli<porta>". Duas baterias rodando juntas (esta e a do
    # portfólio) pegavam a mesma porta e o mesmo perfil, e uma media a aba da outra (medido:
    # innerWidth 1440 numa janela pedida com 390). Aqui: porta sorteada entre 9600 e 9899,
    # perfil "edgegato<porta>", e no fim fecha só o que tem esse perfil.
    def __enter__(self):
        import websocket

        def livre(p):                                        # porta que NÃO responde = ninguém usando
            with socket.socket() as s:
                return s.connect_ex(("127.0.0.1", p)) != 0
        self.porta = next(p for p in random.sample(range(9600, 9900), 300) if livre(p))
        self.perfil = os.path.join(tempfile.gettempdir(), f"edgegato{self.porta}")
        extra = {"creationflags": 0x00000008 | 0x00000200} if sys.platform == "win32" else {"start_new_session": True}
        subprocess.Popen([cdp_util.EDGE, "--headless=new", f"--remote-debugging-port={self.porta}", f"--user-data-dir={self.perfil}",
                          "--no-first-run", "--no-default-browser-check", "--disable-sync", "--hide-scrollbars",
                          "--allow-file-access-from-files", "--disable-background-timer-throttling",
                          "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
                          "--enable-unsafe-swiftshader", "about:blank"],
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **extra)
        alvo = None
        for _ in range(80):
            try:
                abas = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{self.porta}/json", timeout=1).read())
                alvo = next((x for x in abas if x.get("type") == "page" and x.get("url") == "about:blank"), None)
                if alvo:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not alvo:
            raise SystemExit("o Edge não abriu a porta " + str(self.porta))
        self.ws = websocket.create_connection(alvo["webSocketDebuggerUrl"], suppress_origin=True, timeout=60)
        self.n, self.eventos = 0, []
        for m in ("Runtime.enable", "Page.enable", "Log.enable"):
            self.cmd(m)
        self.tamanho(self.w, self.h)
        return self

    def __exit__(self, *erro):
        try:
            self.cmd("Browser.close")
        except Exception:
            pass
        time.sleep(0.6)
        marca = f"edgegato{self.porta}"
        if sys.platform == "win32":
            subprocess.run(["powershell", "-NoProfile", "-Command",
                            f"Get-CimInstance Win32_Process -Filter \"Name='msedge.exe' OR Name='chrome.exe'\" | Where-Object {{ $_.CommandLine -like '*{marca}*' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}"],
                           capture_output=True)
        else:
            subprocess.run(["pkill", "-f", marca], capture_output=True)
        shutil.rmtree(self.perfil, ignore_errors=True)


def checa(nome, cond, detalhe=""):
    print(("OK    " if cond else "FALHA ") + nome + (f"  [{detalhe}]" if detalhe else ""))
    if not cond:
        falhas.append(nome)


def abre(ed, query, espera=1.6):
    # Navega e espera o GATO existir (não um tempo fixo: a 2a instância do Edge às vezes demora).
    ed.ir(URL + ("?" + query if query else ""), espera=espera)
    t0 = time.time()
    while time.time() - t0 < 10:
        m = ed.js(f"location.search === {json.dumps('?' + query if query else '')} && document.readyState === 'complete' ? {MEDE} : null")
        if m:
            ed.esperar(0.3)                                  # primeiro desenho assentado
            return ed.js(MEDE)
        ed.esperar(0.2)
    raise SystemExit("o gato não apareceu na bancada: " + query)


def mouse(ed, tipo, x, y, apertado=False):
    p = {"type": tipo, "x": x, "y": y}
    if tipo in ("mousePressed", "mouseReleased"):
        p.update(button="left", clickCount=1, buttons=1 if tipo == "mousePressed" else 0)
    elif apertado:
        p.update(button="left", buttons=1)
    ed.cmd("Input.dispatchMouseEvent", **p)


def espera(ed, cond_js, maximo=15.0):
    # Espera a CONDIÇÃO (não um tempo chutado); devolve os segundos ou None.
    t0 = time.time()
    while time.time() - t0 < maximo:
        if ed.js(cond_js):
            return round(time.time() - t0, 2)
        ed.esperar(0.08)
    return None


def zoom(ed, nome, m=60):
    t = ed.js(MEDE)["tudo"]
    sy = ed.js("scrollY")                                   # clip é coordenada de PÁGINA
    clip = {"x": max(0, t["x"] - m), "y": max(0, t["y"] - m) + sy, "width": t["w"] + 2 * m, "height": t["h"] + 2 * m, "scale": 3}
    import base64
    caminho = FOTOS / nome
    caminho.write_bytes(base64.b64decode(ed.cmd("Page.captureScreenshot", format="png", clip=clip)["data"]))
    return str(caminho)


dist = lambda a, b: math.hypot(a["cx"] - b["cx"], a["cy"] - b["cy"])
CASA_PRONTA = "(() => { const e = Gato.estado(); return e.acao === null && !e.raf && e.pose === 'sentado' && e.modo === 'pose'; })()"

with EdgeGato(1440, 900) as ed:
    ed.cmd("Page.addScriptToEvaluateOnNewDocument", source=CONTA_RAF)

    # ---- 1. abre e nasce em casa (claro/PT e escuro/EN) ----
    m_esc = abre(ed, "sem_passeio=1&limpo=1&tema=escuro&lang=en")
    ed.foto(str(FOTOS / "gato_casa_escuro_tela.png")); zoom(ed, "gato_casa_escuro.png")
    ed.js("document.querySelector('.gb-alvo')")             # existe
    a = m_esc["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"]); mouse(ed, "mouseReleased", a["cx"], a["cy"])
    ed.esperar(0.4)
    falou_en = ed.js("[window.__falou, window.CONTEUDO.gatos[0].en]")
    erros_escuro = ed.erros()
    m0 = abre(ed, "sem_passeio=1&limpo=1")
    ed.foto(str(FOTOS / "gato_casa_claro_tela.png")); zoom(ed, "gato_casa_claro.png")
    ao_lado = m0["corpo"]["x"] - m0["boneco"]["right"]
    pes = m0["corpo"]["bottom"] - m0["boneco"]["bottom"]
    checa("1. sem erro de JS ao abrir (claro/PT e escuro/EN)", not erros_escuro and not ed.erros(), "; ".join((erros_escuro + ed.erros())[:3]))
    checa("1. nasce em casa: à direita do boneco e com os pés na linha dele", 0 <= ao_lado <= 24 and abs(pes) <= 3,
          f"corpo começa {ao_lado:.1f} px depois do boneco; pés {pes:+.1f} px da base dele")

    # ---- 2. parado em casa o laço desliga ----
    r1 = ed.js("window.__rafN"); ed.esperar(1.5); r2 = ed.js("window.__rafN")
    checa("2. parado em casa: nenhum requestAnimationFrame novo em 1,5 s", r2 == r1 and not m0["est"]["raf"], f"rAF {r1} -> {r2}; estado.raf={m0['est']['raf']}")

    # ---- 3. não bloqueia clique ----
    cx, cy = m0["caixa"]["x"] + 2, m0["caixa"]["y"] + 2          # canto da caixa (fora do círculo)
    quem_canto = ed.js(f"(() => {{ const e = document.elementFromPoint({cx}, {cy}); return e ? (e.closest('.gb') ? 'GATO' : e.tagName + '.' + e.className) : null; }})()")
    quem_centro = ed.js(f"(() => {{ const e = document.elementFromPoint({m0['alvo']['cx']}, {m0['alvo']['cy']}); return e && e.closest('.gb') ? e.getAttribute('class') : 'outro'; }})()")
    pe = ed.js("getComputedStyle(document.querySelector('.gb')).pointerEvents")
    checa("3. a caixa do gato deixa o clique passar; só o círculo dele pega", pe == "none" and quem_canto not in (None, "GATO") and quem_centro == "gb-alvo",
          f"pointer-events={pe}; canto -> {quem_canto}; centro -> {quem_centro}")

    # ---- 4. clique e Enter chamam falar() ----
    a = m0["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"]); mouse(ed, "mouseReleased", a["cx"], a["cy"])
    ed.esperar(0.4)
    ed.js("document.querySelector('.gb').focus()")
    for tipo in ("keyDown", "keyUp"):
        ed.cmd("Input.dispatchKeyEvent", type=tipo, key="Enter", code="Enter", windowsVirtualKeyCode=13, text="\r" if tipo == "keyDown" else "")
    ed.esperar(0.4)
    falou, piadas = ed.js("[window.__falou, window.CONTEUDO.gatos.map(g => g.pt)]")
    checa("4. clique sem arrasto chama falar() com a 1a piada e Enter com a 2a (PT)", falou == piadas[:2], f"falou {len(falou)}x: {[f[:22] for f in falou]}")
    checa("4. na página em inglês o clique fala em inglês", falou_en[0] == [falou_en[1]], f"{falou_en[0]}")
    espera(ed, CASA_PRONTA, 15)                              # o clique liga a brincadeira: espera ela acabar

    # ---- 17. brincar: cursor na faixa do gato (mouse de verdade), recarga, clique e arrasto ----
    mb = abre(ed, "sem_passeio=1&limpo=1")                  # página nova: recarga zerada
    BRINCA = "Gato.estado().brincando"
    mouse(ed, "mouseMoved", 700, 200); ed.esperar(0.5)
    fora = ed.js(BRINCA)
    mouse(ed, "mouseMoved", 1000, mb["corpo"]["cy"])         # longe no x, mas na altura do gato
    t_faixa = espera(ed, BRINCA, 1.5)
    recarga = ed.js("Gato.estado().recargaBrincar")
    checa("17. cursor na faixa de altura do gato (qualquer x) faz ele brincar, sem sorteio", not fora and t_faixa is not None and recarga > 15000,
          f"fora da faixa brincando={fora}; na faixa em {t_faixa} s; recarga {recarga} ms")
    espera(ed, CASA_PRONTA, 15)
    mouse(ed, "mouseMoved", 700, 200); ed.esperar(0.3)
    mouse(ed, "mouseMoved", 1100, mb["corpo"]["cy"]); ed.esperar(1.2)
    de_novo = ed.js(BRINCA)
    checa("17. na recarga, o cursor voltando à faixa não faz nada", de_novo is False, f"brincando={de_novo}; recarga {ed.js('Gato.estado().recargaBrincar')} ms")
    a = ed.js(MEDE)["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"]); mouse(ed, "mouseReleased", a["cx"], a["cy"])
    t0 = time.time()
    ligou = espera(ed, BRINCA, 1.0)
    while ed.js(BRINCA) and time.time() - t0 < 9:
        ed.esperar(0.05)
    dur = round(time.time() - t0, 2)
    checa("17. clique liga a brincadeira mesmo na recarga e ela dura de 4 a 6 s", ligou is not None and 3.9 <= dur <= 6.3, f"ligou em {ligou} s; durou {dur} s")
    espera(ed, CASA_PRONTA, 15)
    a = ed.js(MEDE)["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"])
    for i in range(1, 11):
        mouse(ed, "mouseMoved", a["cx"] + 10 * i, a["cy"] - 25 * i, apertado=True)
        time.sleep(0.016)
    mouse(ed, "mouseReleased", a["cx"] + 100, a["cy"] - 250)
    brincou, t0 = False, time.time()
    while time.time() - t0 < 3:
        e = ed.js("Gato.estado()")
        brincou = brincou or e["brincando"] or e["acao"] == "brincar"
        ed.esperar(0.05)
    checa("17. arrastar e soltar não liga a brincadeira", not brincou, f"acao no fim: {ed.js('Gato.estado().acao')}")
    espera(ed, CASA_PRONTA, 15)
    abre(ed, "sem_passeio=1&limpo=1")
    m0 = ed.js(MEDE)

    # ---- 5. arrasto: 300 px para cima e para a direita ----
    m0 = ed.js(MEDE)
    a = m0["alvo"]; x0, y0 = a["cx"], a["cy"]
    mouse(ed, "mouseMoved", x0, y0); mouse(ed, "mousePressed", x0, y0)
    for i in range(1, 16):
        mouse(ed, "mouseMoved", x0 + 20 * i, y0 - 20 * i, apertado=True)
        time.sleep(0.016)
    m_mov = ed.js(MEDE)
    raf_a = ed.js("window.__rafN"); ed.esperar(0.9); raf_b = ed.js("window.__rafN")
    m1 = ed.js(MEDE)
    zoom(ed, "gato_arrasto.png", m=80); ed.foto(str(FOTOS / "gato_arrasto_tela.png"))
    dx, dy = m1["cab"]["cx"] - m0["cab"]["cx"], m1["cab"]["cy"] - m0["cab"]["cy"]
    checa("5. a cabeça (parte pega) vai junto com o ponteiro", dx >= 250 and dy <= -250 and m1["est"]["modo"] == "arrasto", f"cabeça andou {dx:+.0f}, {dy:+.0f} px")
    alt, larg = m1["corpo"]["h"] / m0["corpo"]["h"], m1["corpo"]["w"] / m0["corpo"]["w"]
    d0, d1 = dist(m0["cab"], m0["corpo"]), dist(m1["cab"], m1["corpo"])
    checa("5. o corpo estica: mais comprido e mais fino, e se afasta da cabeça", alt >= 1.25 and larg <= 0.85 and d1 >= 1.2 * d0,
          f"corpo {m0['corpo']['w']:.1f}x{m0['corpo']['h']:.1f} -> {m1['corpo']['w']:.1f}x{m1['corpo']['h']:.1f} (altura x{alt:.2f}, largura x{larg:.2f}); "
          f"cabeça-corpo {d0:.1f} -> {d1:.1f} px; em movimento {m_mov['corpo']['w']:.1f}x{m_mov['corpo']['h']:.1f}")
    checa("5. durante o arrasto o laço roda (o contador de rAF mede de verdade)", raf_b - raf_a >= 30, f"{raf_b - raf_a} quadros em 0,9 s")

    # ---- 6. soltar: cai até o chão e volta para casa ----
    ultimo = (x0 + 300, y0 - 300)
    mouse(ed, "mouseReleased", *ultimo)
    t0, fundo, chegou_chao = time.time(), 0, None
    while time.time() - t0 < 3:
        mm = ed.js(MEDE)
        fundo = max(fundo, mm["corpo"]["bottom"])
        if chegou_chao is None and mm["corpo"]["bottom"] >= m0["corpo"]["bottom"] - 3:
            chegou_chao = round(time.time() - t0, 2)
        ed.esperar(0.03)
    t_casa = espera(ed, CASA_PRONTA, 15)
    m2 = ed.js(MEDE)
    checa("6. soltou: o corpo chega ao chão", chegou_chao is not None, f"fundo máximo {fundo:.0f} px (chão {m0['corpo']['bottom']:.0f}) em {chegou_chao} s")
    desvio = (m2["corpo"]["cx"] - m0["corpo"]["cx"], m2["corpo"]["bottom"] - m0["corpo"]["bottom"])
    checa("6. depois volta andando para casa (perto do boneco, onde estava)", t_casa is not None and abs(desvio[0]) <= 2 and abs(desvio[1]) <= 2,
          f"em casa após mais {t_casa} s; desvio final {desvio[0]:+.1f}, {desvio[1]:+.1f} px")
    r1 = ed.js("window.__rafN"); ed.esperar(1.0); r2 = ed.js("window.__rafN")
    checa("6. de volta em casa o laço desliga de novo", r1 == r2, f"rAF {r1} -> {r2}")

    # ---- 7. ?foto=1 ----
    mf = abre(ed, "foto=1", espera=2.5)
    rf1 = ed.js("window.__rafN"); ed.esperar(2.0); rf2 = ed.js("window.__rafN")
    checa("7. ?foto=1: nenhum requestAnimationFrame e gato sentado em casa", rf1 == 0 and rf2 == 0 and mf["est"]["foto"] and mf["est"]["pose"] == "sentado"
          and abs(mf["corpo"]["cx"] - m0["corpo"]["cx"]) <= 1, f"rAF {rf1} -> {rf2}; pose {mf['est']['pose']}; x {mf['corpo']['cx']:.1f} (casa {m0['corpo']['cx']:.1f})")

    # ---- 8. sorteio armado ----
    ms = abre(ed, "limpo=1")
    prox = ms["est"]["proximaAcaoEm"]
    checa("8. sem ?sem_passeio a próxima ação está marcada para daqui a 25 a 50 s", prox is not None and 24 <= prox <= 50, f"{prox} s")

    # ---- 9. janela ----
    abre(ed, "sem_passeio=1&limpo=1")
    disparou = ed.js("Gato.acao('janela')")
    t_j = espera(ed, "(() => { const e = Gato.estado(); return e.janela && !e.raf && e.modo === 'pose'; })()", 15)
    BARRA = """(() => { const c = document.querySelector('.gb-corpo').getBoundingClientRect();
        const bs = [...document.querySelectorAll('.j-barra')].map(b => b.getBoundingClientRect().top);
        const perto = bs.reduce((m, t) => Math.abs(t - c.bottom) < Math.abs(m - c.bottom) ? t : m, 1e9);
        return [c.bottom, perto, bs.length]; })()"""
    pes_j, barra_j, nb = ed.js(BARRA) if t_j is not None else (0, 1e9, 0)
    ed.foto(str(FOTOS / "gato_janela_tela.png")); zoom(ed, "gato_janela.png", m=90)
    checa("9. a ação 'janela' sobe numa barra visível (pés no topo da barra)", disparou and t_j is not None and abs(pes_j - barra_j) <= 2,
          f"em {t_j} s; pés {pes_j:.0f} x barra {barra_j:.0f} ({nb} barras olhadas)")
    ed.cmd("Input.dispatchMouseEvent", type="mouseWheel", x=700, y=450, deltaX=0, deltaY=150)
    ed.esperar(0.7)
    pes_r, barra_r, _ = ed.js(BARRA)
    rolou = ed.js("scrollY")
    checa("9. rolou a página (rodinha de verdade): o gato vai junto com a barra", rolou >= 100 and abs(pes_r - barra_r) <= 2 and abs((barra_j - barra_r) - rolou) <= 2,
          f"rolou {rolou:.0f} px; pés {pes_r:.0f} x barra {barra_r:.0f}")
    erros_1440 = ed.erros()

    # ---- 14 a 16. no SITE de verdade: topo do balão, cabeça do boneco e brincar com o cursor ----
    SITE = (REPO / "index.html").as_uri() + "?lang=pt"
    ed.ir(SITE, espera=3.5)
    ed.js("try { localStorage.removeItem('paoli-calado') } catch (e) {}")
    POSE = """(() => { const R = s => { const r = document.querySelector(s).getBoundingClientRect(); return {x: r.left, y: r.top, right: r.right, bottom: r.bottom, h: r.height}; };
      return { corpo: R('.gb-corpo'), tudo: R('.gb svg > g'), balao: R('.balao'), fala: R('.fala'), ctrl: R('.balao-ctrl'), boneco: R('.boneco'), est: Gato.estado() }; })()"""
    cruza = lambda a, b: max(0, min(a["right"], b["right"]) - max(a["x"], b["x"])) * max(0, min(a["bottom"], b["bottom"]) - max(a["y"], b["y"]))
    ok_b = ed.js("Gato.acao('noBalao')")
    t_b = espera(ed, "(() => { const e = Gato.estado(); return e.poleiro === 'balao' && !e.raf && e.pose === 'sentado'; })()", 15)
    pb = ed.js(POSE)
    zoom(ed, "gato_no_balao.png", m=90)
    checa("14. pula no topo do balão e senta em cima, sem cobrir o texto nem os botões",
          ok_b and t_b is not None and abs(pb["corpo"]["bottom"] - pb["balao"]["y"]) <= 3 and cruza(pb["tudo"], pb["fala"]) == 0 and cruza(pb["tudo"], pb["ctrl"]) == 0,
          f"em {t_b} s; pés {pb['corpo']['bottom']:.0f} x topo do balão {pb['balao']['y']:.0f}; área sobre texto {cruza(pb['tudo'], pb['fala']):.0f}, sobre botões {cruza(pb['tudo'], pb['ctrl']):.0f}")
    t_bc = espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf && e.poleiro === null; })()", 15)
    checa("14. depois desce sozinho e volta para casa", t_bc is not None, f"em {t_bc} s")
    # Pré-condição: balão ABERTO de verdade (com falas curtas ele se esconde sozinho). Abre e confere.
    espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf; })()", 15)
    ed.js("document.querySelector('.balao').classList.contains('escondido') && document.querySelector('.boneco').click()")
    aberto = espera(ed, "!document.querySelector('.balao').classList.contains('escondido')", 3)
    nao_pode = ed.js("Gato.acao('cabeca')")                  # balão visível: a cabeça está proibida
    nao_pode = nao_pode if aberto is not None else "balão não abriu"
    espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf; })()", 15)
    ed.js("document.querySelector('[data-calar]').click()"); ed.esperar(0.5)
    ok_c = ed.js("Gato.acao('cabeca')")
    t_c = espera(ed, "(() => { const e = Gato.estado(); return e.poleiro === 'cabeca' && !e.raf; })()", 15)
    pc = ed.js(POSE)
    zoom(ed, "gato_na_cabeca.png", m=90)
    topo_cabelo = pc["boneco"]["y"] + 0.05 * pc["boneco"]["h"]
    checa("15. com o balão escondido sobe e senta na cabeça (com o balão aberto, não sobe)",
          nao_pode is False and ok_c and t_c is not None and abs(pc["corpo"]["bottom"] - topo_cabelo) <= 3,
          f"balão aberto -> {nao_pode}; em {t_c} s; pés {pc['corpo']['bottom']:.0f} x topo do cabelo {topo_cabelo:.0f}")
    t_cd = espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf && e.poleiro === null; })()", 15)
    checa("15. fica alguns segundos e desce sozinho", t_cd is not None and t_cd >= 2.5, f"desceu e voltou em {t_cd} s")
    ed.js("Gato.acao('cabeca')")
    espera(ed, "Gato.estado().poleiro === 'cabeca' && !Gato.estado().raf", 15)
    ed.js("document.querySelector('.boneco').click()")       # o boneco volta a falar: o balão abre em cima do gato
    t_sai = espera(ed, "Gato.estado().poleiro === null", 3)
    checa("15. se o balão abre com o gato na cabeça, ele sai na hora", t_sai is not None, f"saiu em {t_sai} s")
    espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf; })()", 15)
    pg = ed.js(POSE)["corpo"]
    alvo_x, alvo_y = pg["right"] + 60, pg["bottom"] - 40
    mouse(ed, "mouseMoved", alvo_x, alvo_y)
    ed.js("Gato.acao('cursor')")
    viu = espera(ed, "Gato.estado().pose === 'empe'", 5)
    checa("16. brincar com o cursor: corre até ele e fica em pé dando patadas", viu is not None, f"em pé em {viu} s")
    espera(ed, "(() => { const e = Gato.estado(); return e.acao === null && !e.raf; })()", 15)

    # ---- 18. balão: a fala muda -> 50% de ir brincar (sorteio forçado pelo gancho) + recarga; variações a, b, c, d ----
    PARADO = "(() => { const e = Gato.estado(); return e.acao === null && !e.raf; })()"
    ed.ir(SITE, espera=3.5)
    ed.js("Gato.testar({ passeios: false })")
    # Troca de fala DE VERDADE, contada pela mesma marca que o observador do gato usa (trocasFala).
    # Com 1 ou 2 falas por seção, "‹" na primeira não muda nada; então clica "›" ou "‹" conforme
    # o contador "n/total", e reabre o balão (clique no boneco) se o narrador o fechou.
    def trocar_falas(n):
        t0 = ed.js("Gato.estado().trocasFala")
        for _ in range(4 * n):
            if ed.js("Gato.estado().trocasFala") - t0 >= n:
                break
            ed.js("""(() => { const b = document.querySelector('.balao');
              if (b.classList.contains('escondido')) { document.querySelector('.boneco').click(); return; }
              const m = (document.querySelector('.contador').textContent || '').match(/([0-9]+)[/]([0-9]+)/);
              const ultima = m && +m[1] >= +m[2];
              document.querySelector(ultima ? '[data-fala-ant]' : '[data-fala-prox]').click(); })()""")
            ed.esperar(0.7)
        return ed.js("Gato.estado().trocasFala") - t0
    # A abertura do balão no carregamento já sorteia de verdade (antes do gancho): mede só a DIFERENÇA.
    ed.js("Gato.testar({ acaso: 0.99 })")
    ida0 = ed.js("Gato.estado().idasBalao"); trocas_a = trocar_falas(10)
    nunca = ed.js("Gato.estado().idasBalao") - ida0
    espera(ed, PARADO, 15)
    ed.js("Gato.testar({ acaso: 0 })")
    ida1 = ed.js("Gato.estado().idasBalao"); trocas_b = trocar_falas(10)
    e18 = ed.js("Gato.estado()")
    idas_b = e18["idasBalao"] - ida1
    checa("18. a fala mudando leva o gato ao balão (sorteio < 50%) e respeita a recarga", trocas_a >= 10 and trocas_b >= 10 and nunca == 0 and idas_b == 1 and e18["recargaBalao"] > 0,
          f"sorteio 0,99: {nunca} idas em {trocas_a} trocas reais; sorteio 0: {idas_b} ida em {trocas_b} trocas reais (o resto caiu na brincadeira em curso ou na recarga de {e18['recargaBalao']} ms)")
    ed.js("Gato.testar({ acaso: 0.99 })")
    MEDE_B = """(() => { const R = s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
      const cr = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
      const e = Gato.estado(), g = R('.gb svg > g'), frente = !e.atras;     // atrás do balão, o balão pinta por cima do gato
      return { e, texto: frente ? cr(g, R('.fala')) : 0, botoes: frente ? cr(g, R('.balao-ctrl')) : 0, z: +getComputedStyle(document.querySelector('.gb')).zIndex,
               zNarr: +getComputedStyle(document.querySelector('.narrador')).zIndex }; })()"""
    VIU = {"balaoA": lambda m: m["e"]["poleiro"] == "balao", "balaoB": lambda m: m["e"]["modo"] == "arrasto" and m["e"]["atras"] and m["z"] < m["zNarr"],
           "balaoC": lambda m: m["e"]["pose"] == "empe", "balaoD": lambda m: m["e"]["atras"] and m["z"] < m["zNarr"] and m["e"]["pose"] == "sentado" and m["e"]["modo"] == "pose"}
    for v in ("balaoA", "balaoB", "balaoC", "balaoD"):
        espera(ed, PARADO, 15)
        for _ in range(3):
            ed.js("document.querySelector('[data-fala-ant]').click()")     # volta à 1a fala: o balão fica aberto uns 15 s
        ed.esperar(0.8)
        foi = ed.js(f"Gato.acao('{v}')")
        pior, viu, t0 = [0, 0], False, time.time()
        while time.time() - t0 < 15:
            m = ed.js(MEDE_B)
            pior = [max(pior[0], m["texto"]), max(pior[1], m["botoes"])]
            viu = viu or VIU[v](m)
            if m["e"]["acao"] is None and time.time() - t0 > 1:
                break
            ed.esperar(0.05)
        dur = round(time.time() - t0, 1)
        ed.esperar(0.6)
        if ed.js("document.querySelector('.balao').classList.contains('escondido')"):
            ed.js("document.querySelector('[data-fala-ant]').click()"); ed.esperar(0.6)
        fim = ed.js("(() => { const b = document.querySelector('.balao'); return [getComputedStyle(b).transform, b.getAnimations().length]; })()")
        checa(f"18. variação {v[-1].lower()}: roda, não cobre texto nem botões e o balão volta ao normal",
              foi and viu and pior == [0, 0] and fim == ["none", 0],
              f"viu o estado da variação={viu}; durou {dur} s; área sobre texto/botões {pior}; balão no fim {fim}")

    # ---- 19. soneca, zzz, miau e acordar ----
    ed.ir(SITE, espera=3.5)
    ed.js("Gato.testar({ passeios: false, acaso: 0.99 })")
    ed.js("document.querySelector('[data-calar]').click()")   # balão fechado (a troca de fala acorda; testada depois)
    ZZZ = "getComputedStyle(document.querySelector('.gb-zzz')).display !== 'none'"
    zzz_acordado = ed.js(ZZZ)
    def dormir():
        espera(ed, PARADO, 15)
        mouse(ed, "mouseMoved", 900, 150)                       # cursor longe da faixa do gato
        ed.js("Gato.testar({ dormirEm: 800 })")
        return espera(ed, "Gato.estado().dormindo && !Gato.estado().raf", 12)
    t_d = dormir()
    zzz_dormindo = ed.js(ZZZ); pose_d = ed.js("Gato.estado().pose")
    zoom(ed, "gato_dormindo.png", m=60)
    checa("19. sem interação ele deita para dormir, e o zzz só aparece dormindo", t_d is not None and pose_d == "deitado" and zzz_dormindo and not zzz_acordado,
          f"dormiu em {t_d} s (gancho de 0,8 s); pose {pose_d}; zzz acordado={zzz_acordado}, dormindo={zzz_dormindo}")
    pg = ed.js(MEDE)["corpo"]
    mouse(ed, "mouseMoved", 900, pg["cy"])                      # cursor entra na faixa
    a_cursor = espera(ed, "!Gato.estado().dormindo", 2)
    dormir()
    a = ed.js(MEDE)["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"]); mouse(ed, "mouseReleased", a["cx"], a["cy"])
    a_clique = espera(ed, "!Gato.estado().dormindo", 2)
    dormir()
    ed.js("document.querySelector('.boneco').click()")          # o narrador volta a falar: fala nova no balão
    a_fala = espera(ed, "!Gato.estado().dormindo", 3)
    checa("19. cursor na faixa, clique e fala nova acordam", None not in (a_cursor, a_clique, a_fala),
          f"cursor {a_cursor} s; clique {a_clique} s; fala {a_fala} s")
    ed.js("Gato.testar({ dormirEm: 999999 })")
    espera(ed, PARADO, 15)
    MIAU = """(() => { const m = document.querySelector('.gb-miau'), b = document.querySelector('.balao');
      const R = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
      const cr = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
      const aberto = !b.classList.contains('escondido');
      return [m.textContent, aberto ? cr(R(m), R(b)) : 0, aberto ? cr(R(m), R(document.querySelector('.balao-ctrl'))) : 0, aberto]; })()"""
    ok_pt = ed.js("Gato.acao('miau')"); ed.esperar(0.3); mpt = ed.js(MIAU)
    zoom(ed, "gato_miau.png", m=80); ed.foto(str(FOTOS / "gato_miau_tela.png"))
    ed.esperar(1.6)
    ed.js("document.querySelector('[data-lang=en]').click()"); ed.esperar(0.5)
    ok_en = ed.js("Gato.acao('miau')"); ed.esperar(0.3); men = ed.js(MIAU)
    ed.js("document.querySelector('[data-lang=pt]').click()")
    checa("19. miau no idioma da página (miau / meow) e nunca em cima do balão nem dos botões",
          ok_pt and ok_en and mpt[0] == "miau" and men[0] == "meow" and mpt[1] == mpt[2] == men[1] == men[2] == 0,
          f"pt '{mpt[0]}' (balão aberto={mpt[3]}, área {mpt[1]:.0f}/{mpt[2]:.0f}); en '{men[0]}' (área {men[1]:.0f}/{men[2]:.0f})")
    erros_1440 += ed.erros()

    # ---- 10. movimento reduzido ----
    ed.cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
    mr = abre(ed, "limpo=1")
    checa("10. movimento reduzido: sem sorteio de passeios", mr["est"]["calmo"] and mr["est"]["proximaAcaoEm"] is None, f"calmo={mr['est']['calmo']} próxima={mr['est']['proximaAcaoEm']}")
    a = mr["alvo"]
    mouse(ed, "mouseMoved", a["cx"], a["cy"]); mouse(ed, "mousePressed", a["cx"], a["cy"])
    for i in range(1, 11):
        mouse(ed, "mouseMoved", a["cx"] + 25 * i, a["cy"] - 25 * i, apertado=True)
        time.sleep(0.016)
    ed.esperar(0.5)
    mr1 = ed.js(MEDE)
    mouse(ed, "mouseReleased", a["cx"] + 250, a["cy"] - 250)
    chao, tocou, subiu = mr["corpo"]["bottom"], False, 0.0
    t0 = time.time()
    while time.time() - t0 < 1.6:
        b = ed.js(MEDE)["corpo"]["bottom"]
        if b >= chao - 1:
            tocou = True
        elif tocou:
            subiu = max(subiu, chao - b)                   # depois de tocar o chão, quanto voltou a subir
        ed.esperar(0.02)
    t_rc = espera(ed, CASA_PRONTA, 6)
    mr2 = ed.js(MEDE)
    checa("10. movimento reduzido: arrasto funciona, cai sem quicar e volta para casa",
          mr1["est"]["modo"] == "arrasto" and mr1["corpo"]["h"] > mr["corpo"]["h"] * 1.2 and tocou and subiu <= 1 and t_rc is not None and abs(mr2["corpo"]["cx"] - mr["corpo"]["cx"]) <= 2,
          f"esticou x{mr1['corpo']['h'] / mr['corpo']['h']:.2f}; tocou o chão={tocou}; subiu depois {subiu:.1f} px; casa em {t_rc} s")
    ed.cmd("Emulation.setEmulatedMedia", features=[])
    erros_1440 += ed.erros()
    checa("1. sem erro de JS em nenhum passo no computador", not erros_1440, "; ".join(erros_1440[:3]))

# ---- 11. celular ----
with EdgeGato(390, 844) as ed:
    ed.cmd("Page.addScriptToEvaluateOnNewDocument", source=CONTA_RAF)
    ed.cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=1)
    mc = abre(ed, "sem_passeio=1&limpo=1", espera=2)
    ed.foto(str(FOTOS / "gato_celular_tela.png")); zoom(ed, "gato_celular.png")
    t, bal = mc["tudo"], mc["balao"]
    inter = max(0, min(t["right"], bal["right"]) - max(t["x"], bal["x"])) * max(0, min(t["bottom"], bal["bottom"]) - max(t["y"], bal["y"]))
    checa("11. celular: janela de 390 px de verdade e gato menor", mc["iw"] == 390 and mc["est"]["k"] < 1, f"innerWidth {mc['iw']}; escala {mc['est']['k']}")
    checa("11. celular: o gato cabe na tela, nada vaza e não cobre o balão", t["x"] >= 0 and t["right"] <= mc["iw"] and mc["sw"] <= mc["iw"] and inter == 0,
          f"gato de {t['x']:.0f} a {t['right']:.0f} px; scrollWidth {mc['sw']}; área em cima do balão {inter:.0f} px²")
    a = mc["alvo"]
    ed.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": a["cx"], "y": a["cy"]}])
    for i in range(1, 11):
        ed.cmd("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": a["cx"] + 8 * i, "y": a["cy"] - 18 * i}])
        time.sleep(0.016)
    ed.esperar(0.6)
    mt = ed.js(MEDE)
    ed.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    t_ct = espera(ed, CASA_PRONTA, 12)
    mt2 = ed.js(MEDE)
    checa("11. celular: arrastar com o dedo estica e ele volta para casa",
          mt["est"]["modo"] == "arrasto" and mt["corpo"]["h"] >= 1.25 * mc["corpo"]["h"] and t_ct is not None and abs(mt2["corpo"]["cx"] - mc["corpo"]["cx"]) <= 2,
          f"modo {mt['est']['modo']}; altura {mc['corpo']['h']:.1f} -> {mt['corpo']['h']:.1f}; casa em {t_ct} s")
    checa("11. sem erro de JS no celular", not ed.erros(), "; ".join(ed.erros()[:3]))

    # ---- 13. parar() e ligar de novo ----
    sumiu = ed.js("window.__gato.parar(); !document.querySelector('.gb')")
    p1 = ed.js("window.__rafN"); ed.esperar(1.0); p2 = ed.js("window.__rafN")
    voltou = ed.js("""(() => { window.__gato = Gato.iniciar({ ancora: document.querySelector('.narrador'), falar: t => window.__falou.push(t),
        textos: window.CONTEUDO.gatos, idioma: () => 'pt', passeios: false }); return document.querySelectorAll('.gb').length; })()""")
    checa("13. parar() tira o gato e o laço; iniciar() de novo cria um gato só", sumiu and isinstance(p1, int) and p1 == p2 and voltou == 1 and not ed.erros(),
          f"sumiu={sumiu}; rAF {p1} -> {p2}; gatos depois de religar={voltou}")

# ---- 12. travessão ----
# chr(0x2014) e não o caractere escrito: assim esta própria linha não conta como travessão.
TRAVESSAO = chr(0x2014)
com_travessao = [p.name for p in (REPO / "js" / "gato.js", REPO / "css" / "gato.css", AQUI / "gato_harness.html", pathlib.Path(__file__)) if TRAVESSAO in p.read_text(encoding="utf-8")]
checa("12. nenhum travessão nos arquivos do gato", not com_travessao, ", ".join(com_travessao))

print("\nfotos em:", FOTOS)
print("RESULTADO:", "TUDO OK" if not falhas else f"{len(falhas)} FALHA(S)")
sys.exit(1 if falhas else 0)
