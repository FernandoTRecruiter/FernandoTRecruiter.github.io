# CLAUDE.md: como mexer neste portfólio

Site estático (GitHub Pages), sem build e sem framework. Abre direto no navegador (`index.html`). Este arquivo é para o Claude (e para mim) saber onde cada coisa mora e o que não pode ser feito.

## Regras que não mudam

1. **Nada da empresa onde eu trabalho**: nem nome da empresa, nem setor, nem nome interno de produto (os painéis se chamam "Dashboard executivo" e "Painel do gestor"), nem nome de colega, sistema por marca (use "ERP", "ATS", "Dashboard"), servidor, tabela ou e-mail. As demos usam a empresa fictícia **C. & Paoli corp.**
2. **Sem print de trabalho real.** O que eu fiz nas empresas entra como TEXTO em `cases` (problema, solução, resultado), sem número inventado: se não foi medido, conte o efeito em palavras.
3. **Simples e humilde.** Texto curto, sem detalhe interno (quantas checagens, qual sistema), destacando o que diferencia sem se gabar. Na dúvida, menos.
4. **Sem travessão** (o caractere "—") em texto. Use vírgula ou dois-pontos.
5. **Português primeiro, inglês junto**: texto novo na página (inclusive o título da barra de cada janela) precisa de `data-i18n` + a chave em inglês no `js/conteudo.js`. O teste 13 reprova português visível na página em inglês.
6. **Identidade pessoal**: violeta `#6D5AE6` (escuro `#9D8CFF`), grafite `#17151F`, papel `#F6F5F2`, DM Sans / DM Mono / Instrument Serif. Uma cor de destaque só. Não existe logo: a marca é o emoji 🦇.
7. Rodapé de commit: `Generated with 🤖 Claude Code & 😎 Fernandinho`.

## Onde mora cada coisa

| Quero mudar | Arquivo |
|---|---|
| Texto em português de qualquer seção | `index.html` (procure pelo `data-i18n`) |
| Texto em inglês | `js/conteudo.js` > `en` |
| O que o bonequinho fala em cada seção | `js/conteudo.js` > `falas` (chave = `data-fala` da seção) |
| O bonequinho (imagem) | `img/boneco.webp` + o caminho em `js/conteudo.js` > `aparencia.imagem` |
| Movimento do bonequinho | `js/boneco.js` + `css/boneco.css` |
| Balão, voz e falas gravadas | `js/narrador.js` + `audio/` (ver `audio/LEIA-ME.md`) |
| O gato | `js/gato.js` + `css/gato.css` |
| "O que já fiz" (problema, solução, resultado) | `js/conteudo.js` > `cases` |
| "Fora do expediente" | `js/conteudo.js` > `sobreMim` |
| Lista de projetos (janela "repositórios") | `js/projetos.js` + miniatura em `img/projetos/` |
| Esfera 3D da abertura | `js/constelacao.js` (`NOS` e `LIGA`) |
| Caminho do dado em 3D, antes e depois | `js/pipeline.js` (`ANTES` e `DEPOIS`) |
| Fluxogramas do Power Automate | `js/fluxos.js` (`FLUXOS`) |
| Time de agentes | `js/agentes.js` (`TIME`) |
| Tema, idioma, janelas, listas, ligação de tudo | `js/site.js` |
| Visual | `css/site.css` |

## Receitas

**Acrescentar um caso** ("o que já fiz"): copie um item de `cases` no `js/conteudo.js` e troque título, problema, solução, resultado (PT e EN) e `chips`. Uma frase por campo.

**Acrescentar um projeto** (repositório novo): copie um bloco em `js/projetos.js`, troque `pasta` (= nome do repositório), `pages` (tem página no ar?), títulos e descrição PT/EN e `chips`. A miniatura sai de qualquer print do projeto: `python ferramentas/miniatura.py caminho/do/print.png nome` grava `img/projetos/nome.jpg` já no tamanho certo (900 x 562). Nada mais muda. Se o projeto for importante, ponha também um ponto na esfera 3D (`js/constelacao.js`: um item em `NOS` com `janela: 'j-repos'` e as ligações em `LIGA`).

**Mudar um bloco do caminho do dado**: edite o item em `ANTES` ou `DEPOIS` no `js/pipeline.js`: `n` é o número do passo (blocos do mesmo passo repetem o número), `tx`/`ty` a posição na tela, `dono` é `ti`, `eu` ou `ambos`, e `comeca` diz qual bloco leva a etiqueta "comece aqui".

**Link num item do "fora do expediente"**: acrescente `link: { pasta: 'nome-do-repositorio', rotulo: { pt: 'Jogar ↗', en: 'Play ↗' } }` ao item em `js/conteudo.js` > `sobreMim`.

**Acrescentar uma janela** (projeto em destaque): copie um `<article class="janela">` do `index.html`, dê um `id` novo e um `data-fala` novo, escreva as falas em `js/conteudo.js` > `falas` com a mesma chave (PT e EN) e as chaves `data-i18n` no `en`.

**Mudar uma fala**: edite em `js/conteudo.js`. Se já existir gravação para ela, grave de novo e rode `python ferramentas/lista_audios.py`.

**Trocar o bonequinho**: uma imagem com fundo transparente, do peito para cima, em `img/` e o caminho em `aparencia.imagem`. Se a proporção for muito diferente de 344 x 533, ajuste `LARGURA`/`ALTURA` no `js/boneco.js` e o tamanho do `.boneco` no `css/boneco.css`.

**Gravar a minha voz**: siga `audio/LEIA-ME.md`. O roteiro com o nome de cada arquivo fica em `audio/ROTEIRO.md`.

**Refazer as imagens do README**: `python ferramentas/prints_readme.py`.

## Antes de commitar

```bash
pip install websocket-client pillow
python tests/teste_portfolio.py        # precisa de Edge ou Chrome; tem de dar TUDO OK
python tests/teste_gato.py
```
E abrir a página e OLHAR: claro e escuro, PT e EN, e a 390 px de largura. Teste verde não substitui olhar a tela.

## Coisas que já morderam

- O bloco que se esconde com `hidden` precisa de `[hidden] { display: none !important; }` se o CSS dele usa `display: flex`.
- Laço de animação contínuo deixa foto de teste em branco: use `?foto=1` (congela tudo).
- O iframe da demo usa caminho relativo no PC (`../people-analytics-dashboard/`) e absoluto no GitHub Pages (`/people-analytics-dashboard/`): renomear aquele repositório quebra a janela.
- Navegador não toca áudio sozinho: a voz só sai depois do clique no 🔈.
- A janela entra na tela com `rotateX` NEGATIVO: com o positivo, uma janela alta ficava mais larga que o celular e o navegador afastava o zoom (o teste 12 exige 390 px de verdade).
- Nome escrito em cima de outro desenho (a esfera 3D) precisa de contorno da cor do fundo, senão o ponto de trás aparece entre as letras.
