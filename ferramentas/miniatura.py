# -*- coding: utf-8 -*-
"""
miniatura.py: transforma um print qualquer na miniatura de projeto do portfólio.

Por que existe: a janela "repositórios" mostra uma miniatura por projeto, todas no mesmo
tamanho (900 x 562, proporção 16:10). Print de tamanho diferente deixaria a grade torta.

Passo a passo: abre o print, corta no meio o que sobra para ficar 16:10 (se for alto demais,
guarda a parte de cima, onde costuma estar o título), reduz para 900 x 562 e grava em
img/projetos/<nome>.jpg.

Rodar:  pip install pillow
        python ferramentas/miniatura.py caminho/do/print.png nome
Depois aponte o projeto para 'img/projetos/<nome>.jpg' no js/projetos.js.
"""
import pathlib, sys
from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent


def corta_16x10(im):
    w, h = im.size
    if w / h > 1.6:                      # largo demais (ex.: 16:9): corta dos lados
        nw = round(h * 1.6)
        return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    return im.crop((0, 0, w, round(w / 1.6)))   # alto demais: fica a parte de cima


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("uso: python ferramentas/miniatura.py caminho/do/print.png nome")
    origem, nome = pathlib.Path(sys.argv[1]), sys.argv[2]
    saida = RAIZ / "img" / "projetos" / f"{nome}.jpg"
    corta_16x10(Image.open(origem).convert("RGB")).resize((900, 562), Image.LANCZOS).save(saida, "JPEG", quality=86, optimize=True)
    print("gravei", saida.relative_to(RAIZ).as_posix())
