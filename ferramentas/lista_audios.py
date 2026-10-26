# -*- coding: utf-8 -*-
"""
lista_audios.py: liga as gravações da SUA voz ao bonequinho.

O que faz:
  1. procura em audio/ arquivos com nome  <secao>-<numero>-<idioma>.<mp3|m4a|ogg|wav|webm>
     (ex.: painel-2-pt.mp3 = segunda fala da janela do painel, em português);
  2. escreve js/audios.js com essa lista (o site não consegue listar uma pasta sozinho);
  3. escreve audio/ROTEIRO.md: TODAS as falas com o nome de arquivo esperado e se
     já tem gravação. É o roteiro para gravar.

Rodar na pasta do site:  python ferramentas/lista_audios.py
(precisa do Node instalado só para ler as falas do js/conteudo.js)
"""
import json, pathlib, re, subprocess, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
AUDIO = RAIZ / "audio"
EXTS = {".mp3", ".m4a", ".ogg", ".wav", ".webm"}
PADRAO = re.compile(r"^([a-z0-9_]+)-(\d+)-(pt|en)$", re.I)


def ler_falas():
    js = "global.window = {}; require(process.argv[1]); console.log(JSON.stringify(window.CONTEUDO.falas));"
    saida = subprocess.run(["node", "-e", js, str(RAIZ / "js" / "conteudo.js")], capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(saida.stdout)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    AUDIO.mkdir(exist_ok=True)
    achados, ignorados = {}, []
    for arq in sorted(AUDIO.iterdir()):
        if arq.suffix.lower() not in EXTS:
            continue
        m = PADRAO.match(arq.stem)
        if not m:
            ignorados.append(arq.name)
            continue
        achados[f"{m.group(1).lower()}-{int(m.group(2))}-{m.group(3).lower()}"] = "audio/" + arq.name
    (RAIZ / "js" / "audios.js").write_text(
        "/* audios.js: GERADO por ferramentas/lista_audios.py. Não edite à mão.\n"
        "   Lista das falas gravadas com a sua voz: chave \"secao-numero-idioma\" -> arquivo. */\n"
        "window.AUDIOS = " + json.dumps(achados, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")

    falas = ler_falas()
    linhas = ["# Roteiro de gravação", "",
              "Gerado por `ferramentas/lista_audios.py`. Grave cada fala, salve com o nome da coluna **Arquivo** dentro de `audio/` e rode o script de novo.", "",
              "| Arquivo | Gravado? | Fala |", "|---|---|---|"]
    total = feitos = 0
    for secao, por_lingua in falas.items():
        for lingua in ("pt", "en"):
            for i, item in enumerate(por_lingua.get(lingua, []), 1):
                texto = item if isinstance(item, str) else item.get("t", "")
                chave = f"{secao}-{i}-{lingua}"
                tem = chave in achados
                total += 1
                feitos += tem
                linhas.append(f"| `{chave}.mp3` | {'sim' if tem else 'falta'} | {texto.replace('|', '/')} |")
    (AUDIO / "ROTEIRO.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"gravações ligadas: {len(achados)} | falas no roteiro: {total} | já gravadas: {feitos}")
    for n in ignorados:
        print("ignorado (nome fora do padrão secao-numero-idioma):", n)


if __name__ == "__main__":
    main()
