# -*- coding: utf-8 -*-
"""
prints_readme.py: refaz as imagens do README (docs/img/) e a prévia de link (img/og.png).

Por que existe: print feito à mão envelhece calado. Mudou o bonequinho, o gato ou uma janela,
o README continua mostrando o antigo. Com este script basta rodar de novo.

Passo a passo: abre o index.html num Edge ou Chrome escondido com ?foto=1 (congela as
animações para a foto sair igual toda vez), rola até cada ponto e fotografa.

Rodar:  pip install websocket-client pillow
        python ferramentas/prints_readme.py
"""
import base64, io, pathlib, sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "tests"))
from cdp_util import Edge

URL = (RAIZ / "index.html").as_uri()
SEM_SUAVE = "document.documentElement.style.scrollBehavior='auto';"
# arquivo -> (tema, idioma, largura, altura, JS para posicionar a tela)
PRINTS = {
    "docs/img/portfolio-claro.png": ("claro", "pt", 1440, 900, "window.scrollTo(0, 0)"),
    "docs/img/portfolio-janelas-escuro.png": ("escuro", "pt", 1440, 900,
                                               "document.getElementById('j-pipeline').scrollIntoView({block: 'start'}); window.scrollBy(0, -70)"),
    # Prévia de link (LinkedIn, WhatsApp): sem bonequinho e sem gato, que cobririam o texto de abertura.
    "img/og.png": ("escuro", "en", 1200, 630,
                   "window.scrollTo(0, 0); document.querySelectorAll('.narrador, .gb').forEach(e => e.style.display = 'none')"),
}


def tirar(ed, destino, tema, idioma, w, h, posicionar):
    ed.tamanho(w, h)
    ed.ir(URL + f"?foto=1&tema={tema}&lang={idioma}", espera=4)
    ed.js(SEM_SUAVE + posicionar, espera=2)
    r = ed.cmd("Page.captureScreenshot", format="png")
    Image.open(io.BytesIO(base64.b64decode(r["data"]))).save(RAIZ / destino, optimize=True)
    print("OK", destino, "| erros JS:", len(ed.erros()))


if __name__ == "__main__":
    with Edge(1440, 900) as ed:
        for destino, (tema, idioma, w, h, js) in PRINTS.items():
            tirar(ed, destino, tema, idioma, w, h, js)
