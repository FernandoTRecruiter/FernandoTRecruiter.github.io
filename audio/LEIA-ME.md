# Gravar as falas com a minha voz

O bonequinho só fala com a SUA voz. Sem gravação, o balão mostra o texto e o botão 🔈 nem aparece; ele aparece sozinho quando existir pelo menos uma gravação no idioma da página.

## Passo a passo

1. Abra o `audio/ROTEIRO.md`: ele lista cada fala, em português e em inglês, com o nome de arquivo esperado.
2. Grave a fala (o gravador do celular serve). Uma fala por arquivo, sem silêncio longo no começo e no fim.
3. Salve aqui em `audio/` com o nome exato do roteiro, por exemplo `painel-2-pt.mp3` (segunda fala da janela do painel, em português). Aceita `.mp3`, `.m4a`, `.ogg`, `.wav` e `.webm`.
4. Rode `python ferramentas/lista_audios.py`. Ele liga as gravações (escreve `js/audios.js`) e atualiza o roteiro dizendo o que falta.

## Bom saber

- Pode gravar só algumas: fala sem gravação aparece só em texto. São 14 falas por idioma (lista no `ROTEIRO.md`).
- Mudou o texto de uma fala no `js/conteudo.js`? A gravação antiga continua tocando: grave de novo.
- Arquivos leves carregam rápido: mp3 a 64 kbps em mono basta para voz.
- O áudio só toca quando o visitante liga o botão 🔈 no balão (navegador não deixa tocar som sozinho).
