/* =============================================================================
   gato.js: o gato branco que mora sentado ao lado do narrador.

   O que ele faz:
   1. Fica sentado ao lado direito do boneco; pisca e mexe o rabo de vez em quando.
   2. Clique (ou Enter/Espaço): mia com um pulinho e conta a próxima piada dos
      gatos no balão do narrador.
   3. Clicar e arrastar: você segura pelo cangote. O corpo fica para trás preso
      numa mola e ESTICA (mais comprido e mais fino). Soltou: ele cai até a borda
      de baixo da tela, quica e volta andando para casa.
   4. A cada 25 a 50 s faz UMA coisa sozinho (só com a aba visível): passeia pela
      borda de baixo, cochila em cima da barra de uma janela, dá patadas no balão,
      persegue o cursor, se espreguiça ou dorme com "zzz". Depois volta para casa.

   Como ligar (no fim do <body>, depois do conteudo.js):
     <link rel="stylesheet" href="css/gato.css">
     <script src="js/gato.js"></script>
     window.Gato.iniciar({ ancora, falar, textos, idioma })   devolve { parar(), tema() }

   Como o desenho funciona (o "esqueleto"):
   - A cada quadro o código calcula onde fica cada peça, em pixels da TELA, e
     escreve isso no SVG. Não existe imagem pronta: existe uma receita.
   - O corpo são dois círculos (peito e quadril) ligados pelas retas que tocam
     os dois. Afastar os círculos e afinar os raios = esticar a pele.
   - Cada pose (sentado, andando, dormindo...) é uma função que devolve a
     posição das peças. Trocar de pose mistura a antiga com a nova em 0,2 s.
   - O laço de animação (requestAnimationFrame) só roda enquanto algo se mexe.
     Parado em casa, ele desliga; piscar e abanar o rabo usam um relógio leve.
   ============================================================================= */
window.Gato = (function () {
  'use strict';

  // ---------- 1. números que dão o jeito do gato ----------
  const NS = 'http://www.w3.org/2000/svg';
  const G = 2400;            // gravidade em px/s²: forte de propósito, desenho animado cai rápido
  const PASSO = 1 / 120;     // a física anda em passos fixos de 1/120 s: fica igual em monitor de 60 ou 144 Hz
  const L_SENTADO = 30;      // distância cabeça-quadril com o gato solto (multiplicada pela escala)
  const L_PENDURADO = 40;    // a mesma distância pendurado pelo cangote: gato segurado fica comprido
  const MOLA = 170;          // rigidez da mola que prende o corpo na cabeça durante o arrasto (1/s²)
  const AMORTECE = 7;        // quanto do balanço a mola perde por segundo
  const MOLA_QUEDA = 300, AMORTECE_QUEDA = 12, PESO_CABECA = 0.6; // na queda a mola recolhe o corpo
  const MAX_ESTICA = 2.6;    // o corpo estica no máximo 2,6 vezes o tamanho normal
  const MISTURA = 0.2;       // segundos para passar de uma pose para outra
  const VEL_ANDAR = 95, VEL_CORRER = 270; // px/s (multiplicadas pela escala)
  const RECARGA_BRINCAR = 20000; // ms: depois que o cursor na faixa do gato o faz brincar, ele espera isso para querer de novo
  const RECARGA_BALAO = 15000;   // ms: depois de ir brincar no balão porque a fala mudou, espera isso para ir de novo
  const DORMIR_APOS = 12000;     // ms sem ninguém interagir (cursor na faixa, clique, fala nova) até ele deitar e dormir
  const FOLGA_FAIXA = 40;       // px: a faixa de altura do gato (orelhas ao pé) vale com essa folga para cima e para baixo

  // ---------- 2. estado (recriado a cada iniciar) ----------
  let op = null;             // as opções recebidas em iniciar()
  let est = null;            // onde o gato está e o que está fazendo
  let botao, svg, mundo, esm, sombra, rabo, raboTraco, raboPelo, swish, enrola, atras, corpo, frente, topo, miauEl;
  let cabeca, rosto, olhosAbertos, olhosFechados, bocaAberta, zzz, alvo;
  let pernas = [], raboD = '', CAIXA = 58;
  let rafId = 0, ultimoT = 0, sobra = 0;               // laço de animação
  let mov = null, pendente = null, tokenAtual = null;  // movimento atual e quem espera por ele
  let relogioAcao = 0, relogioVida = 0, relogioBoca = 0, agendadoPara = 0;
  let foto = false, calmo = false, passeios = true;
  let toque = null, suprimirClique = false, piscando = false, bocaAte = 0, iTexto = 0;
  const mouse = { x: 0, y: 0, t: 0 };
  let desligar = [];         // funções que tiram os ouvintes em parar()

  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, u) => a + (b - a) * u;
  const n = v => Math.round(v * 10) / 10;            // 1 casa decimal: atributo curto no SVG
  const sorte = (a, b) => a + Math.random() * (b - a);
  const agora = () => performance.now();
  const suave = u => u * u * (3 - 2 * u);             // começa e termina devagar

  // Cria um elemento SVG com atributos (o SVG precisa do "namespace" próprio).
  function el(tag, attrs, pai) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }

  // ---------- 3. o desenho ----------
  // A cabeça é desenhada uma vez, em unidades próprias (centro em 0,0, uns 32 de largura);
  // depois só muda de lugar, de inclinação e de tamanho.
  const ORELHA = '<path class="gb-orelha" d="M-15.2,-2.5 C-15.6,-11 -14.2,-17.6 -12.2,-21 C-11.5,-22.2 -10.3,-22.2 -9.4,-21.2 C-7,-18.6 -4.6,-15.2 -2.8,-12 Z"/>' +
    '<path class="gb-orelha-dentro" d="M-12.6,-8.6 C-12.6,-13.4 -11.9,-16.6 -11,-18.4 C-9.2,-16.4 -7.6,-14.2 -6.4,-12 Z"/>';
  const CABECA = `<g>${ORELHA}</g><g transform="scale(-1 1)">${ORELHA}</g>
    <ellipse class="gb-cabeca-forma" cx="0" cy="0" rx="16" ry="14.2"/>
    <g class="gb-rosto">
      <ellipse class="gb-bochecha" cx="-10" cy="5.2" rx="2.7" ry="1.6"/><ellipse class="gb-bochecha" cx="10" cy="5.2" rx="2.7" ry="1.6"/>
      <g class="gb-olhos-abertos">
        <ellipse class="gb-olho" cx="-5.6" cy="0.4" rx="2.1" ry="2.7"/><ellipse class="gb-olho" cx="5.6" cy="0.4" rx="2.1" ry="2.7"/>
        <circle class="gb-brilho" cx="-4.8" cy="-0.6" r="0.75"/><circle class="gb-brilho" cx="6.4" cy="-0.6" r="0.75"/>
      </g>
      <path class="gb-olhos-fechados" d="M-8,0.4 Q-5.6,2.6 -3.2,0.4 M3.2,0.4 Q5.6,2.6 8,0.4"/>
      <path class="gb-nariz" d="M-1.8,3.9 Q0,3.3 1.8,3.9 Q1,5.6 0,5.9 Q-1,5.6 -1.8,3.9 Z"/>
      <path class="gb-boca" d="M0,5.9 Q-0.5,7.9 -2.7,7.6 M0,5.9 Q0.5,7.9 2.7,7.6"/>
      <ellipse class="gb-boca-aberta" cx="0" cy="8.6" rx="1.9" ry="2.1"/>
      <path class="gb-bigode" d="M-10.8,4.4 L-18,3 M-10.8,6.3 L-17.6,7.3 M10.8,4.4 L18,3 M10.8,6.3 L17.6,7.3"/>
    </g>`;

  // Monta o botão e o SVG. Ordem das camadas (de trás para a frente): sombra, rabo,
  // pernas de trás, corpo, pernas da frente, cabeça, "zzz" e o círculo invisível que pega o clique.
  function montarDesenho() {
    botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'gb';
    svg = el('svg', { 'aria-hidden': 'true', focusable: 'false' }, botao);
    mundo = el('g', {}, svg);                       // desfaz o deslocamento do botão: dentro dele, 1 unidade = 1 px da tela
    sombra = el('ellipse', { class: 'gb-sombra' }, mundo);
    esm = el('g', {}, mundo);                       // achatar/esticar no quique e girar no pulo
    const resp = el('g', { class: 'gb-respira' }, esm);   // dormindo, o CSS "respira" este grupo (sobe e desce devagar)
    rabo = el('g', {}, resp);
    const raboMexe = el('g', {}, rabo);             // o "abano" do rabo gira este grupo em volta da base
    swish = el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '0;10;-7;3;0', keyTimes: '0;.3;.6;.85;1', dur: '1.5s', begin: 'indefinite', fill: 'remove' }, raboMexe);
    const raboDorme = el('g', {}, raboMexe);        // dormindo: o rabo enrola e desenrola devagar (4 s por volta)
    enrola = el('animateTransform', { attributeName: 'transform', type: 'rotate', values: '0;9;0', dur: '4s', begin: 'indefinite', repeatCount: 'indefinite' }, raboDorme);
    raboTraco = el('path', { class: 'gb-rabo-traco' }, raboDorme);
    raboPelo = el('path', { class: 'gb-rabo-pelo' }, raboDorme);
    atras = el('g', {}, resp);
    corpo = el('path', { class: 'gb-corpo' }, resp);
    frente = el('g', {}, resp);
    // Cada perna é uma linha grossa de ponta redonda (pelo) sobre outra um pouco mais grossa (traço).
    pernas = [0, 1, 2, 3].map(() => {
      const g = el('g', {}, frente);
      el('line', { class: 'gb-perna-traco' }, g);
      el('line', { class: 'gb-perna-pelo' }, g);
      return g;
    });
    cabeca = el('g', {}, resp);
    cabeca.innerHTML = CABECA;
    rosto = cabeca.querySelector('.gb-rosto');
    olhosAbertos = cabeca.querySelector('.gb-olhos-abertos');
    olhosFechados = cabeca.querySelector('.gb-olhos-fechados');
    bocaAberta = cabeca.querySelector('.gb-boca-aberta');
    topo = el('g', {}, resp);                       // pata erguida (patada no balão) passa na frente da cabeça
    zzz = el('g', { class: 'gb-zzz' }, mundo);
    zzz.innerHTML = '<text x="0" y="0">z</text><text x="7" y="-9">z</text><text x="15" y="-19">Z</text>';
    alvo = el('circle', { class: 'gb-alvo' }, mundo);
    document.body.appendChild(botao);
  }

  // Tamanho: no celular o gato encolhe para não cobrir o balão nem vazar da tela.
  function ajustarEscala() {
    est.k = innerWidth < 640 ? 0.74 : 1;
    CAIXA = est.k < 1 ? 44 : 48;                    // círculo de toque: 44 px no celular (tamanho confortável para o dedo)
    botao.style.width = botao.style.height = CAIXA + 'px';
    alvo.setAttribute('r', CAIXA / 2);
    const grossa = 6.4 * est.k;                     // grossura da perna (o traço cinza soma 1,4 px de cada lado)
    for (const g of pernas) {
      g.children[0].setAttribute('stroke-width', n(grossa + 2.8));
      g.children[1].setAttribute('stroke-width', n(grossa));
    }
  }

  // O corpo: dois círculos (A = peito, B = quadril) ligados pelas duas retas tangentes.
  // Geometria: o ponto onde a reta toca cada círculo fica a um ângulo fi da linha entre
  // os centros, com cos(fi) = (raioA - raioB) / distância. Depois é contornar cada
  // círculo pelo lado de fora (arcos A do SVG) e fechar.
  function casco(ax, ay, ra, bx, by, rb) {
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    if (d <= Math.abs(ra - rb) + 0.01) {            // um círculo dentro do outro: desenha só o maior
      const x = ra > rb ? ax : bx, y = ra > rb ? ay : by, r = Math.max(ra, rb);
      return `M${n(x - r)},${n(y)}a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0Z`;
    }
    const al = Math.atan2(dy, dx), fi = Math.acos((ra - rb) / d);
    const p = (x, y, r, a) => `${n(x + r * Math.cos(a))},${n(y + r * Math.sin(a))}`;
    const grandeB = fi > Math.PI / 2 ? 1 : 0, grandeA = fi < Math.PI / 2 ? 1 : 0;
    return `M${p(ax, ay, ra, al + fi)}L${p(bx, by, rb, al + fi)}A${n(rb)},${n(rb)} 0 ${grandeB},0 ${p(bx, by, rb, al - fi)}` +
      `L${p(ax, ay, ra, al - fi)}A${n(ra)},${n(ra)} 0 ${grandeA},0 ${p(ax, ay, ra, al + fi)}Z`;
  }

  // O rabo é uma curva que sai da base (0,0) apontando para cima; "c" entorta a ponta
  // (negativo para um lado, positivo para o outro) e "L" é o comprimento.
  const caminhoRabo = (c, L) => `M0,0C0,${n(-L * 0.42)} ${n(c * L * 0.62)},${n(-L * 0.62)} ${n(c * L * 0.5)},${n(-L)}`;

  // Escreve no SVG a "receita" r (calculada pelas poses). Só atributos: nada de layout.
  function desenhar(r) {
    const k = est.k;
    // 1) a caixa do botão vai junto com o centro do gato (anel de foco do teclado e área de toque)
    const mx = (r.cx + r.qx) / 2, my = (r.cy + r.qy) / 2;
    const bx = Math.round(mx - CAIXA / 2), by = Math.round(my - CAIXA / 2);
    botao.style.transform = `translate(${bx}px,${by}px)`;
    mundo.setAttribute('transform', `translate(${-bx} ${-by})`);
    alvo.setAttribute('cx', n(mx)); alvo.setAttribute('cy', n(my));
    // 2) sombra no chão
    sombra.setAttribute('cx', n(r.sx)); sombra.setAttribute('cy', n(r.sy));
    sombra.setAttribute('rx', n(r.sw / 2)); sombra.setAttribute('ry', n(Math.max(1.5, r.sw * 0.1)));
    sombra.setAttribute('opacity', r.so.toFixed(2));
    // 3) achatar (quique) e girar (pulo) o desenho inteiro em volta do ponto e.x, e.y
    const e = r.esm;
    esm.setAttribute('transform', e ? `translate(${n(e.x)} ${n(e.y)}) rotate(${n(e.rot)}) scale(${e.sx.toFixed(3)} ${e.sy.toFixed(3)}) translate(${n(-e.x)} ${n(-e.y)})` : '');
    // 4) corpo
    corpo.setAttribute('d', casco(r.px, r.py, r.pr, r.qx, r.qy, r.qr));
    // 5) pernas: cada uma vai para a camada da frente ou de trás do corpo, conforme a pose
    r.pernas.forEach((p, i) => {
      const g = pernas[i];
      if (!p) { g.style.display = 'none'; return; }
      g.style.display = '';
      const camada = r.atras[i] === 'topo' ? topo : r.atras[i] ? atras : frente;
      if (g.parentNode !== camada) camada.appendChild(g);
      for (const l of g.children) {
        l.setAttribute('x1', n(p[0])); l.setAttribute('y1', n(p[1]));
        l.setAttribute('x2', n(p[2])); l.setAttribute('y2', n(p[3]));
      }
    });
    // 6) rabo
    rabo.setAttribute('transform', `translate(${n(r.rx)} ${n(r.ry)}) rotate(${n(r.ra)}) scale(${k})`);
    const d = caminhoRabo(r.rc, r.rl);
    if (d !== raboD) { raboD = d; raboTraco.setAttribute('d', d); raboPelo.setAttribute('d', d); }
    // 7) cabeça, rosto e olhos
    cabeca.setAttribute('transform', `translate(${n(r.cx)} ${n(r.cy)}) rotate(${n(r.ca)}) scale(${k})`);
    rosto.setAttribute('transform', `translate(${n(r.ox * 3.2)} ${n(r.oy * 2.4)})`);
    olhos(r);
    // 8) "zzz" acima da cabeça quando dorme
    zzz.style.display = r.zz > 0.5 ? '' : 'none';
    if (r.zz > 0.5) zzz.setAttribute('transform', `translate(${n(r.cx + 11 * k)} ${n(r.cy - 14 * k)}) scale(${k})`);
  }

  // Olhos e boca saem da receita, mas também mudam sozinhos (piscar, miar) sem o laço rodar.
  function olhos(r) {
    const fechado = r.pisca > 0.85;
    olhosAbertos.style.display = fechado ? 'none' : '';
    olhosFechados.style.display = fechado ? '' : 'none';
    const abre = piscando ? 0.12 : Math.max(0.12, 1 - r.pisca);
    olhosAbertos.setAttribute('transform', `translate(0 0.4) scale(1 ${abre.toFixed(2)}) translate(0 -0.4)`);
    bocaAberta.style.display = (r.boca > 0.3 || bocaAte > agora()) ? '' : 'none';
  }

  // ---------- 4. as poses ----------
  // Cada pose recebe x (centro), c (linha dos pés) e d (para onde olha: 1 direita, -1 esquerda)
  // e devolve a receita: cabeça (cx, cy, ca = inclinação, ox/oy = para onde o rosto olha,
  // pisca, boca), peito (px, py, pr), quadril (qx, qy, qr), 4 pernas [x1, y1, x2, y2]
  // (0/1 = de trás, 2/3 = da frente), quem fica atrás do corpo, rabo (base, ângulo,
  // curva, comprimento), largura da sombra (sw) e zz (dormindo).
  // As medidas são em pixels para k = 1 (computador); no celular tudo encolhe junto.
  function poseSentado(x, c, d) {           // de frente, sentado: a pose de casa
    const k = est.k;
    return {
      cx: x + d * 1.2 * k, cy: c - 47 * k, ca: d * 4, ox: d * 0.25, oy: 0.1, pisca: 0, boca: 0,
      px: x + d * 0.6 * k, py: c - 33 * k, pr: 11.5 * k,
      qx: x, qy: c - 17 * k, qr: 17 * k,
      pernas: [
        [x - 15 * k, c - 3.4 * k, x - 11.2 * k, c - 3.6 * k],   // pezinhos de trás aparecendo dos lados
        [x + 15 * k, c - 3.4 * k, x + 11.2 * k, c - 3.6 * k],
        [x - 5.2 * k, c - 20 * k, x - 5.6 * k, c - 3.4 * k],    // patas da frente, retas até o chão
        [x + 5.2 * k, c - 20 * k, x + 5.6 * k, c - 3.4 * k]
      ],
      atras: [false, false, false, false],
      rx: x - d * 12 * k, ry: c - 4.5 * k, ra: -d * 78, rc: d * 0.85, rl: 27, sw: 32 * k, zz: 0
    };
  }

  function poseAndando(x, c, d) {           // de lado; est.fase gira as pernas, est.amp diz se está andando
    const k = est.k, fase = est.fase, amp = est.amp;
    const bob = Math.sin(fase * 2) * 0.9 * k * amp;            // o corpo sobe e desce duas vezes por passada
    const px = x + d * 9 * k, py = c - 21 * k + bob, qx = x - d * 10 * k, qy = c - 19 * k + bob;
    // pé: vai para a frente e para trás (seno) e só levanta quando está voltando para a frente
    const perna = (ax, ay, ph) => [ax, ay, ax + d * Math.sin(ph) * 6.5 * k * amp, c - 3.6 * k - Math.max(0, Math.cos(ph)) * 3 * k * amp];
    return {
      cx: x + d * 21 * k, cy: c - 33 * k + bob * 1.3, ca: -d * 4, ox: d * 0.95, oy: 0, pisca: 0, boca: 0,
      px, py, pr: 11 * k, qx, qy, qr: 12.5 * k,
      pernas: [                               // trote: pernas em diagonal andam juntas
        perna(qx - d * 1 * k, qy + 5 * k, fase),
        perna(qx + d * 1.5 * k, qy + 5 * k, fase + Math.PI),
        perna(px + d * 0.5 * k, py + 5 * k, fase + Math.PI),
        perna(px + d * 2 * k, py + 5 * k, fase)
      ],
      atras: [true, false, true, false],      // as do lado de lá ficam atrás do corpo
      rx: qx - d * 10 * k, ry: qy - 5 * k, ra: -d * (28 + Math.sin(fase) * 6 * amp), rc: d * 0.55, rl: 27, sw: 44 * k, zz: 0
    };
  }

  function poseSalto(x, c, d) {             // no ar: patas da frente esticadas para a frente, as de trás para trás
    const k = est.k, r = poseAndando(x, c, d);
    r.pernas = [
      [r.qx - d * 1 * k, r.qy + 5 * k, r.qx - d * 14 * k, r.qy + 9 * k],
      [r.qx + d * 1.5 * k, r.qy + 5 * k, r.qx - d * 11 * k, r.qy + 11 * k],
      [r.px + d * 0.5 * k, r.py + 5 * k, r.px + d * 13 * k, r.py + 9 * k],
      [r.px + d * 2 * k, r.py + 5 * k, r.px + d * 15 * k, r.py + 7 * k]
    ];
    r.ra = -d * 60; r.rc = d * 0.2;
    return r;
  }

  function poseDeitado(x, c, d) {           // pãozinho dormindo, olhos fechados e "zzz"
    const k = est.k;
    return {
      cx: x + d * 11 * k, cy: c - 20 * k, ca: d * 12, ox: d * 0.35, oy: 0.3, pisca: 1, boca: 0,
      px: x + d * 5 * k, py: c - 12 * k, pr: 12 * k,
      qx: x - d * 7 * k, qy: c - 13 * k, qr: 13 * k,
      pernas: [null, null,                    // patas de trás escondidas embaixo do corpo
        [x + d * 8 * k, c - 3.4 * k, x + d * 12 * k, c - 3.4 * k],
        [x + d * 15 * k, c - 3.4 * k, x + d * 19 * k, c - 3.4 * k]],
      atras: [false, false, false, false],
      rx: x - d * 17 * k, ry: c - 6 * k, ra: -d * 70, rc: d * 0.9, rl: 26, sw: 46 * k, zz: 1
    };
  }

  function poseEspreguica(x, c, d) {        // peito no chão, patas da frente esticadas, bumbum para cima, bocejo
    const k = est.k, px = x + d * 10 * k, py = c - 11 * k, qx = x - d * 10 * k, qy = c - 24 * k;
    return {
      cx: x + d * 22 * k, cy: c - 20 * k, ca: d * 10, ox: d * 0.8, oy: 0.1, pisca: 0.9, boca: 1,
      px, py, pr: 10 * k, qx, qy, qr: 12 * k,
      pernas: [
        [qx - d * 1 * k, qy + 6 * k, qx - d * 3 * k, c - 3.6 * k],
        [qx + d * 1 * k, qy + 6 * k, qx + d * 1 * k, c - 3.6 * k],
        [px + d * 2 * k, py + 3 * k, px + d * 20 * k, c - 3.6 * k],
        [px + d * 3 * k, py + 4 * k, px + d * 15 * k, c - 3.6 * k]
      ],
      atras: [true, false, true, false],
      rx: qx - d * 9 * k, ry: qy - 6 * k, ra: -d * 20, rc: d * 0.25, rl: 28, sw: 50 * k, zz: 0
    };
  }

  function poseEmPe(x, c, d) {              // em pé nas patas de trás; est.braco (0 a 1) ergue a pata do lado d
    const k = est.k, py = c - 38 * k, b = est.braco;
    const parada = s => [x + s * 6 * k, py + 4 * k, x + s * 7 * k, py + 15 * k];
    const erguida = s => [x + s * 9 * k, py + 2 * k, x + s * (10 + 10 * b) * k, py + (14 - 42 * b) * k];
    return {
      cx: x - d * 1 * k, cy: c - 52 * k, ca: -d * 6, ox: d * 0.2, oy: -0.7, pisca: 0, boca: b > 0.6 ? 0.6 : 0,
      px: x, py, pr: 11 * k, qx: x, qy: c - 16 * k, qr: 14 * k,
      pernas: [
        [x - 7 * k, c - 9 * k, x - 8.5 * k, c - 3.6 * k],
        [x + 7 * k, c - 9 * k, x + 8.5 * k, c - 3.6 * k],
        d < 0 ? erguida(-1) : parada(-1),
        d > 0 ? erguida(1) : parada(1)
      ],
      atras: [false, false, d < 0 ? 'topo' : false, d > 0 ? 'topo' : false],   // a pata erguida passa na frente da cabeça
      rx: x - d * 11 * k, ry: c - 5 * k, ra: -d * 80, rc: d * 0.8, rl: 27, sw: 26 * k, zz: 0
    };
  }

  // Pendurado pelo cangote (arrasto e queda): a cabeça e o quadril vêm da física (est.H e est.B).
  // A pele estica entre os dois: o esticão s = distância atual / distância normal, e a
  // largura cai com 1 / raiz(s). Assim comprimento x largura² fica constante, como um
  // cilindro de massinha: esticou 2 vezes, fica com 0,71 da largura.
  function posePendurado() {
    const k = est.k, H = est.H, B = est.B;
    let ux = B.x - H.x, uy = B.y - H.y;
    const dist = Math.hypot(ux, uy) || 1;
    ux /= dist; uy /= dist;                    // direção cabeça -> quadril
    const s = lim(dist / (L_SENTADO * k), 0.6, MAX_ESTICA), f = 1 / Math.sqrt(s);
    const nx = -uy, ny = ux;                   // direção "de lado" (perpendicular ao corpo)
    const px = H.x + ux * 13 * k, py = H.y + uy * 13 * k, pr = 11.5 * k * f, qr = 15 * k * f;
    const bal = est.bal;                       // ângulo das patinhas (balançam penduradas)
    const pend = (ax, ay, comp, mult) => [ax, ay, ax + Math.sin(bal * mult) * comp, ay + Math.cos(bal * mult) * comp];
    const qbx = B.x + ux * qr * 0.55, qby = B.y + uy * qr * 0.55;   // embaixo do quadril
    const pbx = px + ux * 4 * k, pby = py + uy * 4 * k;              // embaixo do peito
    return {
      cx: H.x, cy: H.y, ca: lim(est.vH.x * 0.012, -14, 14), ox: 0, oy: 0.35, pisca: 0, boca: s > 1.9 ? 0.7 : 0,
      px, py, pr, qx: B.x, qy: B.y, qr,
      pernas: [
        pend(qbx - nx * 7 * k * f, qby - ny * 7 * k * f, 12 * k, 1.25),
        pend(qbx + nx * 7 * k * f, qby + ny * 7 * k * f, 12 * k, 1.35),
        pend(pbx - nx * 5 * k * f, pby - ny * 5 * k * f, 15 * k, 1.0),
        pend(pbx + nx * 5 * k * f, pby + ny * 5 * k * f, 15 * k, 1.1)
      ],
      atras: [true, true, false, false],
      rx: B.x + ux * qr * 0.7, ry: B.y + uy * qr * 0.7, ra: 180 - bal * 92, rc: 0.25, rl: 30, sw: 24 * k, zz: 0
    };
  }

  const POSES = { sentado: poseSentado, andando: poseAndando, salto: poseSalto, deitado: poseDeitado, espreguica: poseEspreguica, empe: poseEmPe };

  // ---------- 5. lugares: casa, chão e paredes ----------
  // Casa = sentado ao lado direito do boneco, com os pés na linha dos pés dele.
  // Lê a posição na hora (o narrador pode mudar de tamanho no celular).
  function casa() {
    const k = est.k, a = op.ancora;
    const ref = a && (a.querySelector('.boneco') || a);
    const r = ref && ref.getBoundingClientRect();
    if (!r || !r.width) return { x: 44 * k, chao: innerHeight - 8 };
    return { x: lim(r.right + Math.max(24 * k, CAIXA / 2), xMin(), xMax()), chao: Math.min(r.bottom - 2, innerHeight - 2) };
  }
  // Chão da tela: a linha dos pés do narrador (quando ele está colado embaixo) ou a borda de baixo.
  function chaoTela() {
    const c = casa().chao;
    return c > innerHeight - 40 ? c : innerHeight - 4;
  }
  const xMin = () => 36 * est.k, xMax = () => innerWidth - 40 * est.k;   // o rabo não sai da tela

  // ---------- 6. a receita do quadro ----------
  function montarRig() {
    const k = est.k, solto = est.modo === 'arrasto' || est.modo === 'queda';
    const r = solto ? posePendurado() : (POSES[est.pose] || poseSentado)(est.x, est.chao - est.alt - est.arco, est.dir);
    // perseguindo o cursor: o rosto vira para ele
    if (est.olharCursor && mouse.t) {
      const dx = mouse.x - r.cx, dy = mouse.y - r.cy, dd = Math.hypot(dx, dy) || 1, forca = Math.min(1, dd / 60);
      r.ox = dx / dd * forca; r.oy = dy / dd * forca * 0.8;
    }
    // sombra: no chão de verdade, menor e mais clara quanto mais alto o gato está
    const chao = solto ? est.chaoT : est.chao;
    const alto = Math.max(0, chao - Math.max(r.qy + r.qr, r.cy + 14 * k));
    r.sx = solto ? r.qx : est.x; r.sy = chao;
    r.sw *= lim(1 - alto / 300, 0.35, 1);
    r.so = lim(1 - alto / 250, 0.15, 1);
    // quique: achata em volta dos pés (q > 0 achata e alarga; q < 0 estica para cima). Pulo: gira.
    r.esm = (Math.abs(est.q) > 0.0005 || est.giro) ? { x: r.qx, y: r.qy + r.qr, rot: est.giro, sx: 1 + 0.6 * est.q, sy: 1 - est.q } : null;
    // troca de pose: mistura com a receita anterior
    // pendurado na borda do balão: as patas da frente apoiadas EM CIMA da borda (o resto fica atrás do balão)
    if (est.mao && est.modo === 'arrasto') {
      const b = est.mao.borda;
      r.pernas[2] = [r.cx - 9 * k, b + 5 * k, r.cx - 10 * k, b - 1.5 * k];
      r.pernas[3] = [r.cx + 9 * k, b + 5 * k, r.cx + 10 * k, b - 1.5 * k];
      r.atras = [true, true, 'topo', 'topo'];
    }
    return (est.misturaT < 1 && est.rigDe) ? misturar(est.rigDe, r, suave(est.misturaT)) : r;
  }

  // Mistura duas receitas (u = 0 é a antiga, 1 é a nova). Perna que some recolhe para o
  // ombro; perna que nasce sai do ombro.
  const CAMPOS = ['cx', 'cy', 'ca', 'ox', 'oy', 'pisca', 'boca', 'px', 'py', 'pr', 'qx', 'qy', 'qr', 'rx', 'ry', 'ra', 'rc', 'rl', 'sx', 'sy', 'sw', 'so'];
  function misturar(a, b, u) {
    const r = Object.assign({}, b);
    for (const c of CAMPOS) r[c] = mix(a[c], b[c], u);
    r.pernas = b.pernas.map((pb, i) => {
      const pa = a.pernas[i];
      if (!pb) return (!pa || u > 0.98) ? null : [pa[0], pa[1], mix(pa[2], pa[0], u), mix(pa[3], pa[1], u)];
      const de = pa || [pb[0], pb[1], pb[0], pb[1]];
      return pb.map((v, j) => mix(de[j], v, u));
    });
    return r;
  }

  // ---------- 7. física ----------
  // Um passo de 1/120 s. Regra usada em tudo (Euler semi-implícito): primeiro a
  // aceleração muda a velocidade, depois a velocidade muda a posição.
  function fisica(h) {
    if (est.modo === 'arrasto') fisicaArrasto(h);
    else if (est.modo === 'queda') fisicaQueda(h);
    else movimento(h);
    // mola do quique: q volta a 0 balançando (achata, estica um pouco, assenta)
    est.vq += (-900 * est.q - 18 * est.vq) * h;
    est.q += est.vq * h;
    if (est.misturaT < 1) est.misturaT = Math.min(1, est.misturaT + h / MISTURA);
    est.tempo += h;
  }
  // Pancada no chão vira achatamento: quanto mais rápido caiu, mais achata (com limite).
  function chutarQuique(impacto) {
    if (!calmo) est.vq += lim(impacto / 1000, 0, 1.3) * 7.5;
  }

  // Arrasto: a cabeça segue o ponteiro. O corpo é puxado por uma mola até o ponto onde
  // ficaria pendurado parado (embaixo da cabeça) e sofre gravidade:
  //   aceleração = mola x (alvo - posição) - amortecimento x velocidade + gravidade.
  // O corpo tem inércia, então fica para trás quando a mão acelera: é isso que estica a pele.
  function fisicaArrasto(h) {
    const k = est.k, H = est.H, B = est.B;
    // a mão pegou onde clicou e escorrega até o cangote (logo acima da cabeça)
    est.pega.x += (0 - est.pega.x) * Math.min(1, h * 10);
    est.pega.y += (9 * k - est.pega.y) * Math.min(1, h * 10);
    // quem segura: o dedo/mouse (arrasto) ou a "mão" presa na borda do balão (pendurado), que balança
    const ptr = toque || est.mao;
    if (!toque && est.mao) est.mao.x = est.mao.x0 + Math.sin(est.tempo * 2.4) * 9 * k;
    const nx = lim(ptr.x + est.pega.x, 12 * k, innerWidth - 12 * k);
    const ny = lim(ptr.y + est.pega.y, 12 * k, innerHeight - 30 * k);
    est.vH.x = mix(est.vH.x, (nx - H.x) / h, 0.08);          // velocidade da cabeça (suavizada): inclina a cabeça
    est.vH.y = mix(est.vH.y, (ny - H.y) / h, 0.08);
    H.x = nx; H.y = ny;
    const ax = MOLA * (H.x - B.x) - AMORTECE * est.vB.x;
    const ay = MOLA * (H.y + L_PENDURADO * k - B.y) - AMORTECE * est.vB.y + G;
    est.vB.x += ax * h; est.vB.y += ay * h;
    B.x += est.vB.x * h; B.y += est.vB.y * h;
    limitarEsticao();
    const qr = 15 * k / Math.sqrt(lim(Math.hypot(B.x - H.x, B.y - H.y) / (L_SENTADO * k), 0.6, MAX_ESTICA));
    if (B.y + qr > est.chaoT) { B.y = est.chaoT - qr; est.vB.y = Math.min(0, est.vB.y); }   // perto do chão, o bumbum apoia
    balancarPernas(h);
  }

  // A pele tem limite: passou de MAX_ESTICA, o corpo é trazido de volta e perde a
  // velocidade que o afastava da cabeça (senão ele "estoura" e volta com tudo).
  function limitarEsticao() {
    const H = est.H, B = est.B, dx = B.x - H.x, dy = B.y - H.y, d = Math.hypot(dx, dy);
    const max = MAX_ESTICA * L_SENTADO * est.k;
    if (d <= max) return;
    const ux = dx / d, uy = dy / d;
    B.x = H.x + ux * max; B.y = H.y + uy * max;
    const foge = (est.vB.x - est.vH.x) * ux + (est.vB.y - est.vH.y) * uy;
    if (foge > 0) { est.vB.x -= foge * ux; est.vB.y -= foge * uy; }
  }

  // Patinhas penduradas: um pêndulo com mola que fica para trás do movimento do corpo.
  function balancarPernas(h) {
    const alvoBal = lim(-est.vB.x * 0.0016, -0.9, 0.9);
    est.vBal += (60 * (alvoBal - est.bal) - 5 * est.vBal) * h;
    est.bal += est.vBal * h;
  }

  // Queda: cabeça e corpo caem com a mesma gravidade e uma mola recolhe o corpo para o
  // tamanho normal, embaixo da cabeça (gato cai de pé). A cabeça sente só 35% do puxão,
  // então quem volta é o corpo. Tocou o chão: vira pose sentada e quica.
  function fisicaQueda(h) {
    const k = est.k, H = est.H, B = est.B, RECUO = 0.35;
    const fx = MOLA_QUEDA * (H.x - B.x) - AMORTECE_QUEDA * (est.vB.x - est.vH.x);
    const fy = MOLA_QUEDA * (H.y + L_SENTADO * k - B.y) - AMORTECE_QUEDA * (est.vB.y - est.vH.y);
    est.vB.x += fx * h; est.vB.y += (fy + G) * h;
    est.vH.x -= fx * RECUO * h; est.vH.y += (G - fy * RECUO) * h;
    B.x += est.vB.x * h; B.y += est.vB.y * h;
    H.x += est.vH.x * h; H.y += est.vH.y * h;
    // paredes: bate e volta com menos força; teto: no máximo um pouco acima da tela
    for (const [P, V] of [[H, est.vH], [B, est.vB]]) {
      if (P.x < xMin()) { P.x = xMin(); V.x = Math.abs(V.x) * 0.4; }
      if (P.x > xMax()) { P.x = xMax(); V.x = -Math.abs(V.x) * 0.4; }
      if (P.y < -300) { P.y = -300; V.y = Math.max(0, V.y); }
    }
    balancarPernas(h);
    const qr = 15 * k / Math.sqrt(lim(Math.hypot(B.x - H.x, B.y - H.y) / (L_SENTADO * k), 0.6, MAX_ESTICA));
    if (B.y + qr >= est.chaoT && est.vB.y > 0) aoPousar(Math.max(est.vB.y, est.vH.y));
  }

  // Movimentos de roteiro (andar, pular, patada, seguir o cursor) e o pulinho do miado.
  function movimento(h) {
    const k = est.k, m = mov;
    est.vel = 0;
    if (m && m.tipo === 'andar') {
      const dx = m.x - est.x, passo = m.v * k * h;
      if (Math.abs(dx) <= passo) { est.x = m.x; terminar(true); }
      else { est.dir = Math.sign(dx); est.x += est.dir * passo; est.vel = m.v; est.fase += passo / (24 * k) * Math.PI * 2; }
    } else if (m && m.tipo === 'pulo') {
      // pulo de roteiro: x e chão vão do começo ao alvo; "arco" é a barriga da parábola.
      // O alvo é lido a cada quadro: se a página rolar, o pulo acompanha a janela.
      m.t += h;
      const u = Math.min(1, m.t / m.T), a = m.alvo();
      est.x = mix(m.x0, a.x, u);
      est.chao = mix(m.y0, a.y, u);
      est.arco = (Math.max(0, m.y0 - a.y) * 0.35 + 40 * k) * 4 * u * (1 - u);
      est.giro = -est.dir * 24 * (1 - 2 * u);              // nariz para cima subindo, para baixo descendo
      if (u >= 1) { est.arco = 0; est.giro = 0; est.chao = a.y; chutarQuique(650); trocarPose('sentado'); terminar(true); }
    } else if (m && m.tipo === 'patada') {
      m.t += h;
      // sobe, SEGURA lá em cima (o seno passa de 0,8 entre 30% e 70% do tempo) e desce
      const u = Math.min(1, m.t / m.T), s = Math.min(1, 1.25 * Math.sin(Math.PI * u));
      est.braco = s; est.arco = m.altura * s;              // a pata sobe junto com o pulinho
      if (!m.bateu && u >= 0.5) { m.bateu = true; empurrarBalao(m.balao); }
      if (u >= 1) { est.braco = 0; est.arco = 0; if (m.altura > 4) chutarQuique(320); terminar(true); }
    } else if (m && m.tipo === 'deslizar') {
      // sobe ou desce o "chão" devagar (espiar por trás do balão: aparece e some)
      m.t += h;
      const u = Math.min(1, m.t / m.T);
      est.chao = mix(m.de, m.ate, suave(u));
      if (u >= 1) terminar(true);
    } else if (m && m.tipo === 'seguir') {
      // Para AO LADO do cursor (34 px antes), nunca embaixo dele: assim o círculo do gato não
      // fica sob a ponta do mouse e não rouba o clique de um botão que esteja ali. E não passa
      // para a esquerda da casa (não corre por cima do boneco).
      const lado = mouse.x >= est.x ? 1 : -1;
      const dx = lim(mouse.x - lado * 34 * k, m.xmin, xMax()) - est.x;
      if (Math.abs(dx) > 16 * k) {
        if (est.pose !== 'andando') trocarPose('andando');
        est.dir = Math.sign(dx);
        const v = Math.min(VEL_CORRER, Math.abs(dx) * 3), passo = Math.min(Math.abs(dx), v * k * h);
        est.x += est.dir * passo; est.vel = v; est.fase += passo / (24 * k) * Math.PI * 2;
      } else {
        // perto do cursor: se ele está ao alcance, fica em pé e dá patadas nele; senão senta e olha
        const alcanca = mouse.y > est.chao - 100 * k && mouse.y < est.chao + 10;
        if (alcanca) {
          if (est.pose !== 'empe') trocarPose('empe');
          est.dir = mouse.x >= est.x ? 1 : -1;
          est.braco = 0.5 + 0.5 * Math.sin(est.tempo * 12);
        } else { est.braco = 0; if (est.pose !== 'sentado') trocarPose('sentado'); }
      }
      if (est.tempo >= m.fim) { est.braco = 0; trocarPose('sentado'); terminar(true); }
    }
    // amplitude do passo: vai a 1 andando e volta a 0 parado (pernas embaixo do corpo)
    est.amp += ((est.vel > 0 ? 1 : 0) - est.amp) * Math.min(1, h * 10);
    // pulinho (miado e quique depois da queda): sobe e a gravidade traz de volta
    if (est.alt > 0 || est.valt > 0) {
      est.valt -= G * h; est.alt += est.valt * h;
      if (est.alt <= 0) {
        const impacto = -est.valt;
        est.alt = 0; est.valt = 0;
        chutarQuique(impacto);
        if (!calmo && impacto > 200) est.valt = impacto * 0.3;   // quica de novo, menor
      }
    }
  }

  // Troca de pose com mistura (guarda a receita atual para misturar com a nova).
  function trocarPose(nome) {
    if (est.pose === nome && est.modo === 'pose') return;
    est.rigDe = est.rig; est.misturaT = est.rig ? 0 : 1;
    est.pose = nome; est.modo = 'pose';
    pedirQuadro();
  }

  // ---------- 8. o laço de animação ----------
  // Só roda quando algo se mexe. Cada quadro: física em passos fixos, receita, desenho.
  function pedirQuadro() {
    if (rafId || foto || !botao) return;
    ultimoT = 0;
    rafId = requestAnimationFrame(quadro);
  }
  function quadro(t) {
    rafId = 0;
    if (!botao) return;
    const dt = ultimoT ? Math.min(0.05, (t - ultimoT) / 1000) : PASSO;   // aba que volta do fundo não dá salto
    ultimoT = t;
    est.chaoT = chaoTela();
    sobra += dt;
    while (sobra >= PASSO) { fisica(PASSO); sobra -= PASSO; }
    est.rig = montarRig();
    desenhar(est.rig);
    if (continua()) { rafId = requestAnimationFrame(quadro); return; }
    // nada mais se mexe: zera o resto do quique, desenha a pose final e DESLIGA o laço
    est.q = est.vq = 0; sobra = 0;
    est.rig = montarRig(); desenhar(est.rig);
  }
  function continua() {
    return est.modo === 'arrasto' || est.modo === 'queda' || !!mov || est.misturaT < 1 || est.alt > 0 || est.valt > 0 ||
      Math.abs(est.q) > 0.004 || Math.abs(est.vq) > 0.05 || est.amp > 0.01 || est.olharCursor;
  }

  // ---------- 9. passos de roteiro ----------
  // Cada passo devolve uma promessa: true = completou; false = foi cancelado (o
  // usuário pegou o gato, por exemplo). As ações encadeiam passos com await.
  function terminar(ok) {
    mov = null;
    const r = pendente; pendente = null;
    if (r) r(ok);
  }
  function iniciarMov(m, tk) {
    return new Promise(res => {
      if (!tk.vivo) return res(false);
      if (pendente) terminar(false);
      mov = m; pendente = res;
      pedirQuadro();
    });
  }
  // Caminho longo vira trote: a velocidade cresce com a distância (no máximo o dobro),
  // para atravessar a tela em uns 5 s em vez de 10.
  function andarAte(x, tk, v) {
    const alvoX = lim(x, xMin(), xMax());
    trocarPose('andando');
    return iniciarMov({ tipo: 'andar', x: alvoX, v: v || lim(Math.abs(alvoX - est.x) / est.k / 2.5, VEL_ANDAR, VEL_ANDAR * 2) }, tk);
  }
  function pularPara(alvoFn, tk) {
    const a = alvoFn();
    est.dir = a.x >= est.x ? 1 : -1;
    trocarPose('salto');
    return iniciarMov({ tipo: 'pulo', t: 0, T: 0.38 + Math.sqrt(Math.abs(est.chao - a.y)) * 0.018, x0: est.x, y0: est.chao, alvo: alvoFn }, tk);
  }
  function esperar(ms, tk) {
    return new Promise(res => {
      if (!tk.vivo) return res(false);
      const id = setTimeout(() => { if (pendente === fim) pendente = null; res(tk.vivo); }, ms);
      const fim = ok => { clearTimeout(id); res(ok); };
      pendente = fim;
    });
  }
  function poseEsperar(nome, ms, tk) {
    if (!tk.vivo) return Promise.resolve(false);
    trocarPose(nome);
    return esperar(ms, tk);
  }

  // ---------- 10. ações: uma por vez, e arrastar cancela qualquer uma ----------
  async function rodar(nome, fn) {
    cancelar();
    clearTimeout(relogioAcao); agendadoPara = 0;
    const tk = { vivo: true, nome };
    tokenAtual = tk;
    try {
      await fn(tk);
      if (tk.vivo) await voltarParaCasa(tk);
    } catch (e) { /* uma ação que falha não pode derrubar o gato: ele só volta a esperar */ }
    if (tokenAtual === tk) { tokenAtual = null; est.olharCursor = false; agendar(); }
  }
  function cancelar() {
    if (tokenAtual) tokenAtual.vivo = false;
    tokenAtual = null;
    est.olharCursor = false; est.naJanela = null; est.poleiro = null; est.poleiroNome = null;
    clearInterval(relogioPoleiro); clearInterval(relogioTreme);
    dormindo(false);
    const atrasNoAlto = botao.classList.contains('gb-atras') && Math.abs(est.chao - est.chaoT) > 3;
    const noAr = (est.arco > 2 || atrasNoAlto) && est.rig && est.modo === 'pose';
    const pendurado = est.mao && est.modo === 'arrasto' && !toque;
    est.mao = null;
    if (pendente) { const r = pendente; pendente = null; r(false); }
    mov = null; est.braco = 0;
    if (!atrasNoAlto && !noAr) botao.classList.remove('gb-atras');   // no chão: volta para a frente
    if (noAr || pendurado) cairDaqui();             // estava no ar (pulo, pendurado, espiando): cai de onde está
    else { est.arco = 0; est.giro = 0; }
  }
  // Solta o gato no ar, a partir da pose desenhada agora (vira física de queda).
  function cairDaqui() {
    const r = est.rig;
    est.H = { x: r.cx, y: r.cy }; est.B = { x: r.qx, y: r.qy };
    est.vH = { x: 0, y: 0 }; est.vB = { x: 0, y: 0 };
    est.arco = 0; est.giro = 0; est.alt = 0; est.valt = 0;
    est.rigDe = r; est.misturaT = 0; est.modo = 'queda';
    botao.classList.add('gb-no-ar');
    pedirQuadro();
  }

  // Volta para casa andando e senta. Com movimento reduzido: sem caminhada, reaparece em casa.
  async function voltarParaCasa(tk) {
    est.naJanela = null;
    const c = casa();
    if (calmo) {
      if (!(await esperar(900, tk))) return false;
      est.x = c.x; est.chao = c.chao; est.alt = est.arco = 0; est.modo = 'pose'; est.pose = 'sentado'; est.misturaT = 1;
      est.rig = montarRig(); desenhar(est.rig);
      return true;
    }
    if (Math.abs(est.x - c.x) > 1.5 && !(await andarAte(c.x, tk))) return false;
    if (Math.abs(est.chao - c.chao) > 3 && !(await pularPara(() => { const cc = casa(); return { x: cc.x, y: cc.chao }; }, tk))) return false;
    trocarPose('sentado');
    return true;
  }

  // Depois de soltar: senta onde caiu, quica um pouco e volta para casa.
  function aoPousar(impacto) {
    est.x = lim(est.B.x, xMin(), xMax()); est.chao = est.chaoT; est.alt = 0;
    est.rigDe = est.rig; est.misturaT = 0; est.modo = 'pose'; est.pose = 'sentado';
    botao.classList.remove('gb-no-ar', 'gb-atras');
    if (!calmo) { chutarQuique(impacto); est.valt = lim(impacto * 0.22, 0, 300); }
    rodar('voltar', tk => esperar(calmo ? 300 : 700, tk));
  }

  // Passeio: anda até um ponto da borda de baixo, fica um pouco sentado e volta.
  async function acaoPasseio(tk) {
    let x = sorte(xMin(), xMax());
    if (Math.abs(x - est.x) < 160) x = est.x + (x < est.x ? -220 : 220);
    return (await andarAte(x, tk)) && poseEsperar('sentado', 2200, tk);
  }

  // Janela: escolhe uma barra de título visível, anda até perto dela, pula e cochila em cima.
  // Barra boa = visível na tela, com espaço acima para o gato, sem nada cobrindo e com a
  // janela já inteira na tela (as janelas do site entram com opacidade 0).
  function barraUsavel(r) { return r.width > 160 && r.top > 130 && r.top < innerHeight - 140; }
  function escolherBarra() {
    if (document.querySelector('.janela.max')) return null;
    const boas = [...document.querySelectorAll('.janela .j-barra')].filter(b => {
      const r = b.getBoundingClientRect(), jan = b.closest('.janela');
      if (!barraUsavel(r) || (jan && parseFloat(getComputedStyle(jan).opacity) < 0.9)) return false;
      const quem = document.elementFromPoint(r.right - 60, r.top + 3);   // quem está por cima de verdade
      return !!quem && b.contains(quem);
    });
    return boas.length ? boas[Math.floor(Math.random() * boas.length)] : null;
  }
  async function acaoJanela(tk) {
    const barra = escolherBarra();
    if (!barra) return false;
    const k = est.k, dx = sorte(48, 110) * k;       // distância da ponta direita da barra (longe do título)
    const lugar = () => { const r = barra.getBoundingClientRect(); return { x: lim(r.right - dx, xMin(), xMax()), y: r.top }; };
    const l0 = lugar();
    if (!(await andarAte(l0.x + (l0.x > est.x ? -70 : 70) * k, tk))) return false;
    if (!barraUsavel(barra.getBoundingClientRect())) return false;   // a página rolou enquanto ele andava
    if (!(await pularPara(lugar, tk))) return false;
    est.naJanela = barra; est.dxJanela = dx;        // a partir daqui a rolagem leva o gato junto (aoRolar)
    if (!(await poseEsperar('sentado', 1600, tk))) return false;
    if (!(await poseEsperar('deitado', sorte(9000, 14000), tk))) return false;
    if (!(await poseEsperar('sentado', 900, tk))) return false;
    est.naJanela = null;
    return pularPara(() => ({ x: lim(est.x + (est.x > casa().x ? -70 : 70) * k, xMin(), xMax()), y: est.chaoT }), tk);
  }
  // Rolou a página (ou a janela mudou de lugar): o gato cochilando acompanha a barra.
  // Se a barra sai da faixa visível, ele desce: cai se ela subiu, fica no chão se ela desceu.
  function aoRolar() {
    if (!botao || !est.naJanela || est.modo !== 'pose' || mov) return;
    const r = est.naJanela.getBoundingClientRect();
    if (!r.width || r.top < 70 || r.top > est.chaoT - 4) {
      est.naJanela = null;
      if (r.width && r.top > est.chaoT - 4) { est.chao = est.chaoT; rodar('voltar', tk => poseEsperar('sentado', 300, tk)); }
      else { cancelar(); cairDaqui(); }
      return;
    }
    est.chao = r.top; est.x = lim(r.right - est.dxJanela, xMin(), xMax());
    if (!rafId) { est.rig = montarRig(); desenhar(est.rig); }
  }

  // Balão: anda até embaixo do balão do narrador, fica em pé e dá três patadas
  // (com pulinho se o balão estiver acima do alcance da pata). O balão balança um pouco.
  function balaoVisivel() {
    const b = op.ancora && op.ancora.querySelector('.balao');
    if (!b || b.classList.contains('escondido')) return null;
    const cs = getComputedStyle(b), r = b.getBoundingClientRect();
    // a opacidade só decide em balão SEM a classe 'escondido' controlando; com a classe, vale a classe
    // (o balão abre com transição de 0,25 s e, nesse meio, a opacidade ainda está perto de 0)
    const temClasse = b.classList.contains('balao');
    return (cs.display !== 'none' && cs.visibility !== 'hidden' && (temClasse || parseFloat(cs.opacity) > 0.5) && r.width > 40) ? b : null;
  }
  async function acaoBalao(tk) {
    const b = balaoVisivel();
    if (!b) return false;
    const k = est.k, r0 = b.getBoundingClientRect();
    const x = lim(Math.max(casa().x, r0.left + Math.min(r0.width * 0.35, 120 * k)), xMin(), xMax());   // nunca em cima do boneco
    if (!(await andarAte(x, tk))) return false;
    est.dir = 1;                                    // ergue a pata da direita (o balão abre para a direita)
    if (!(await poseEsperar('empe', 350, tk))) return false;
    for (let i = 0; i < 3; i++) {
      const rb = b.getBoundingClientRect();
      const altura = lim(est.chao - 70 * k - rb.bottom + 3, 0, 130);  // 70 = alcance da pata erguida; +3 = só encosta na borda (os botões ficam acima)
      if (!(await iniciarMov({ tipo: 'patada', t: 0, T: altura > 4 ? 0.5 : 0.42, altura, bateu: false, balao: b }, tk))) return false;
      if (!(await esperar(140, tk))) return false;
    }
    return poseEsperar('sentado', 600, tk);
  }
  // O balão reage: "quicar" (patada de baixo: sobe 3 px e volta) ou "tremer" (gira 1,5 grau e volta).
  // Animação do navegador que termina sozinha: no fim o balão está exatamente como era.
  function empurrarBalao(b, tipo) {
    if (!b || !b.animate || calmo || foto) return;
    const quadros = tipo === 'tremer'
      ? [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1.5deg)' }, { transform: 'rotate(1.2deg)' }, { transform: 'rotate(0deg)' }]
      : [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }];
    try { b.animate(quadros, { duration: tipo === 'tremer' ? 420 : 260, easing: 'ease-out', composite: 'add' }); }  // "add": soma ao transform que o balão já tem
    catch (e) { /* navegador sem "composite": fica sem o balanço */ }
  }

  // b) Pendurado: pula na borda de cima, se agarra e balança uns 3 s, com o corpo ATRÁS do
  // balão (só cabeça e patas aparecem acima da borda: nada cobre o texto nem os botões).
  let relogioTreme = 0;
  async function acaoPendurar(tk) {
    const l0 = topoBalao();
    if (!l0) return false;
    const k = est.k, x = lim(l0.r.right - 60 * k, l0.r.left + 30 * k, l0.r.right - 30 * k);
    if (!(await andarAte(x + (x > est.x ? -60 : 60) * k, tk))) return false;
    const lugar = () => { const l = topoBalao(); return l ? { x, y: l.y } : null; };
    botao.classList.add('gb-atras');                // o pulo de subida passa atrás do balão
    if (!lugar() || !(await pularPara(() => lugar() || { x: est.x, y: est.chaoT }, tk)) || !lugar()) return false;
    botao.classList.add('gb-atras');                // escorrega para trás do balão e fica pendurado
    const borda = lugar().y, r = est.rig;
    est.H = { x: r.cx, y: r.cy }; est.B = { x: r.qx, y: r.qy }; est.vH = { x: 0, y: 0 }; est.vB = { x: 0, y: 0 };
    est.mao = { x0: x, x, y: borda - 15 * k, borda };
    est.pega = { x: 0, y: 9 * k }; est.rigDe = r; est.misturaT = 0; est.modo = 'arrasto';
    pedirQuadro();
    empurrarBalao(balaoVisivel(), 'tremer');
    relogioTreme = setInterval(() => empurrarBalao(balaoVisivel(), 'tremer'), 1300);
    for (let i = 0; i < 15; i++) {                  // 3 s, conferindo se o balão continua aberto
      if (!(await esperar(200, tk))) return false;
      if (!balaoVisivel()) break;
    }
    clearInterval(relogioTreme);
    est.mao = null;
    return soltarECair(tk);                         // solta: cai (atrás do balão) e volta para casa
  }

  // d) Espiar: pula para trás do balão e aparece pelo canto de cima, só orelhas e olhos; some.
  async function acaoEspiar(tk) {
    const l0 = topoBalao();
    if (!l0) return false;
    const k = est.k, x = l0.r.right - 22 * k;
    const escondido = () => { const l = topoBalao(); return l ? l.y + 72 * k : null; };   // cabeça inteira abaixo da borda
    const espiando = () => { const l = topoBalao(); return l ? l.y + 46 * k : null; };    // orelhas e olhos acima, boca abaixo
    if (!(await andarAte(x - 60 * k, tk))) return false;
    botao.classList.add('gb-atras');
    est.dir = 1;                                    // rabo para o lado de dentro do balão (não aparece na ponta)
    if (!escondido() || !(await pularPara(() => ({ x, y: escondido() || est.chaoT }), tk))) return false;
    if (!escondido() || !(await iniciarMov({ tipo: 'deslizar', t: 0, T: 0.5, de: est.chao, ate: espiando() }, tk))) return false;
    for (let i = 0; i < 8; i++) { if (!(await esperar(200, tk)) || !balaoVisivel()) break; }
    if (balaoVisivel() && !(await iniciarMov({ tipo: 'deslizar', t: 0, T: 0.45, de: est.chao, ate: escondido() }, tk))) return false;
    return soltarECair(tk);                         // desce por trás e volta para casa
  }

  // Cai e ESPERA: quem leva para casa é o pouso (aoPousar começa a volta e encerra esta ação).
  async function soltarECair(tk) { cairDaqui(); await esperar(36e5, tk); return false; }

  // Brincar no balão: sorteia uma das quatro (todas curtas, 3 a 6 s).
  const VARIACOES = { balaoA: () => acaoNoBalao, balaoB: () => acaoPendurar, balaoC: () => acaoBalao, balaoD: () => acaoEspiar };
  function acaoBalaoBrincar(tk) {
    const nomes = Object.keys(VARIACOES);
    est.variacao = nomes[Math.floor(Math.random() * nomes.length)];
    return VARIACOES[est.variacao]()(tk);
  }

  // A fala do narrador mudou (balão abriu, ‹ ›, seção nova): 50% de chance de ir brincar no
  // balão, com recarga própria. Sem mexer no narrador: um MutationObserver olha o balão.
  // Como a fala é digitada letra a letra (muitas mudanças por fala), a decisão usa uma CHAVE:
  // aberto/fechado + o contador "1/3" (sem contador, as 12 primeiras letras). Chave nova = fala nova.
  let balaoDepois = 0, idasBalao = 0, acasoFixo = null, relogioFala = 0, chaveFala = '', trocasFala = 0;   // trocasFala: quantas falas novas o observador viu (para os testes)
  function verFala(b) {
    const c = b.querySelector('.contador'), f = b.querySelector('.fala');
    if (!c && f && f.textContent.length < 12) return;          // ainda digitando o começo
    const chave = (b.classList.contains('escondido') ? '0' : '1') + '|' + (c ? c.textContent : (f ? f.textContent.slice(0, 12) : ''));
    if (chave === chaveFala) return;
    chaveFala = chave;
    if (chave[0] === '1') { trocasFala += 1; aoMudarFala(); }
  }
  const acaso = () => (acasoFixo === null ? Math.random() : acasoFixo);
  function aoMudarFala() {
    if (foto || calmo || !balaoVisivel() || toque) return;
    marcarInteracao();
    if (est.pose === 'deitado' && tokenAtual && dormindoAgora()) { acordar(null); return; }
    if (tokenAtual || est.modo !== 'pose' || agora() < balaoDepois) return;
    if (acaso() >= 0.5) return;
    balaoDepois = agora() + RECARGA_BALAO; idasBalao += 1;
    rodar('balao', acaoBalaoBrincar);
  }

  // ---------- soneca: sem ninguém por perto, deita em casa, respira e solta "zzz" ----------
  let ultimaInteracao = 0, dormirApos = DORMIR_APOS, relogioMiau = 0, sonecaLigada = true;
  function marcarInteracao() { ultimaInteracao = agora(); }
  function dormindo(sim) {
    if (!botao) return;
    botao.classList.toggle('gb-dormindo', sim);
    try { if (sim && !calmo && !foto) enrola.beginElement(); else enrola.endElement(); } catch (e) { /* sem SMIL */ }
  }
  async function acaoSoneca(tk) {
    virarParaOMeio();
    if (!(await poseEsperar('deitado', 400, tk))) return false;
    dormindo(true);
    await esperar(36e5, tk);                        // dorme até alguém acordar (cancela esta ação)
    return false;
  }
  // Acordar: espreguiçada curta (0,6 s) e depois "depois" (brincar, por exemplo) ou só sentar.
  function acordar(depois) {
    rodar('acordar', async tk => {
      if (!(await poseEsperar('espreguica', 600, tk)) || !(await poseEsperar('sentado', 250, tk))) return false;
      mostrarMiau();
      return depois ? depois(tk) : true;
    });
  }
  const dormindoAgora = () => !!(tokenAtual && (tokenAtual.nome === 'soneca' || tokenAtual.nome === 'dormir'));

  // Miau: balãozinho só visual perto da cabeça por 1,5 s ("meow" em inglês). Nunca em cima do
  // balão do narrador: tenta à direita da cabeça, depois à esquerda; se as duas cobrem, não aparece.
  function mostrarMiau() {
    if (!botao || foto || calmo || !est.rig || dormindoAgora()) return false;
    if (!miauEl) { miauEl = document.createElement('div'); miauEl.className = 'gb-miau'; miauEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(miauEl); }
    miauEl.textContent = idioma() === 'en' ? 'meow' : 'miau';
    miauEl.classList.remove('gb-miau-on');
    const w = miauEl.offsetWidth, h = miauEl.offsetHeight, k = est.k, r = est.rig;
    const b = balaoVisivel(), rb = b && b.getBoundingClientRect();
    const cruza = (x, y) => rb && x < rb.right && x + w > rb.left && y < rb.bottom && y + h > rb.top;
    const y = r.cy - 30 * k - h;
    const lados = [r.cx + 14 * k, r.cx - 14 * k - w].filter(x => x >= 4 && x + w <= innerWidth - 4 && y >= 4 && !cruza(x, y));
    if (!lados.length) return false;
    miauEl.style.left = lados[0] + 'px'; miauEl.style.top = y + 'px';
    void miauEl.offsetWidth;
    miauEl.classList.add('gb-miau-on');
    bocaAte = agora() + 420; olhos(r);
    clearTimeout(relogioBoca);
    relogioBoca = setTimeout(() => { if (miauEl) miauEl.classList.remove('gb-miau-on'); if (est.rig && !rafId) olhos(est.rig); }, 1500);
    return true;
  }
  // De 25 a 40 s, se está acordado e parado, mia.
  function agendarMiau() {
    clearTimeout(relogioMiau);
    if (foto || calmo || !botao) return;
    relogioMiau = setTimeout(() => {
      if (!dormindoAgora() && est.modo === 'pose' && !mov) mostrarMiau();
      agendarMiau();
    }, sorte(25000, 40000));
  }

  // Brincar: corre atrás do cursor pela borda de baixo e dá patadas nele por "segundos".
  // Se estava num poleiro (balão, cabeça, janela), primeiro pula para o chão: a brincadeira
  // nunca passa por cima do balão nem das janelas.
  async function acaoCursor(tk, segundos) {
    if (!mouse.t) return false;
    if (Math.abs(est.chao - est.chaoT) > 3) {
      est.poleiro = null; est.poleiroNome = null; est.naJanela = null; clearInterval(relogioPoleiro);
      if (!(await pularPara(() => ({ x: est.x, y: est.chaoT }), tk))) return false;
    }
    est.olharCursor = true;
    const ok = await iniciarMov({ tipo: 'seguir', fim: est.tempo + (segundos || 5), xmin: Math.max(xMin(), casa().x) }, tk);
    est.olharCursor = false;
    return ok;
  }
  // Liga (ou reinicia) a brincadeira por 4 a 6 s. Se já está brincando, só estica o fim.
  function brincar() {
    const s = sorte(4, 6);
    if (mov && mov.tipo === 'seguir') { mov.fim = est.tempo + s; return; }
    rodar('brincar', tk => acaoCursor(tk, s));
  }

  // ---------- poleiros: em cima do balão e na cabeça do boneco ----------
  // O lugar é lido de novo a cada 250 ms: se o balão some (ou aparece, no caso da cabeça),
  // a função devolve null e o gato desce sozinho (cai e volta para casa).
  function topoBalao() {
    const b = balaoVisivel();
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return r.top > 70 ? { x: lim(r.left + r.width * 0.62, xMin(), xMax()), y: r.top + 1, r } : null;
  }
  // Cabeça só com o balão ESCONDIDO: o balão mora logo acima dela e o gato cobriria o texto.
  function topoCabeca() {
    const a = op.ancora && op.ancora.querySelector('.boneco');
    if (!a || balaoVisivel()) return null;
    const r = a.getBoundingClientRect();
    return r.width ? { x: r.left + r.width * CABECA_X, y: r.top + r.height * CABECA_Y } : null;
  }
  const CABECA_X = 0.5, CABECA_Y = 0.05;            // topo do cabelo na imagem do boneco (fração da caixa)
  let relogioPoleiro = 0;
  function conferePoleiro() {
    if (!est.poleiro || est.modo !== 'pose' || mov) return;
    const l = est.poleiro();
    if (!l) { est.poleiro = null; clearInterval(relogioPoleiro); cancelar(); cairDaqui(); return; }
    est.chao = l.y;
    if (!rafId) { est.rig = montarRig(); desenhar(est.rig); }
  }
  // Anda até perto, pula no lugar e passa a "morar" nele (est.poleiro) até descer.
  async function subirEm(lugar, nome, tk) {
    const l0 = lugar();
    if (!l0) return false;
    const k = est.k, seguro = () => lugar() || { x: est.x, y: est.chaoT };   // sumiu no meio do pulo: cai no chão
    if (!(await andarAte(l0.x + (l0.x > est.x ? -60 : 60) * k, tk)) || !lugar()) return false;
    if (!(await pularPara(seguro, tk)) || !lugar()) return false;
    est.poleiro = lugar; est.poleiroNome = nome;
    clearInterval(relogioPoleiro); relogioPoleiro = setInterval(conferePoleiro, 250);
    return true;
  }
  async function descer(tk) {
    est.poleiro = null; est.poleiroNome = null; clearInterval(relogioPoleiro);
    const k = est.k;
    const ok = await pularPara(() => ({ x: lim(est.x + (est.x > casa().x ? -50 : 50) * k, xMin(), xMax()), y: est.chaoT }), tk);
    if (ok) botao.classList.remove('gb-atras');     // no chão volta para a frente de tudo
    return ok;
  }
  // Balão: sobe no topo, senta, anda até a outra ponta, senta de novo e desce.
  async function acaoNoBalao(tk) {
    botao.classList.add('gb-atras');                // pulos de subida e descida passam ATRÁS do balão (não cobrem o texto)
    if (!(await subirEm(topoBalao, 'balao', tk))) return false;
    if (!(await poseEsperar('sentado', 1500, tk))) return false;
    const l = topoBalao();
    if (l && !(await andarAte(l.r.left + l.r.width * 0.3, tk))) return false;
    if (!(await poseEsperar('sentado', 2500, tk))) return false;
    return descer(tk);
  }
  // Cabeça: sobe, fica alguns segundos sentado e desce sozinho (não cobre o rosto para sempre).
  async function acaoNaCabeca(tk) {
    if (!(await subirEm(topoCabeca, 'cabeca', tk))) return false;
    if (!(await poseEsperar('sentado', sorte(3500, 5500), tk))) return false;
    return descer(tk);
  }

  // Espreguiçar e dormir esticam o gato para um lado: ele vira para o meio da tela,
  // para não enfiar a cabeça no boneco (que mora à esquerda da casa).
  const virarParaOMeio = () => { est.dir = est.x < innerWidth / 2 ? 1 : -1; };
  async function acaoEspreguicar(tk) {
    virarParaOMeio();
    return (await poseEsperar('andando', 350, tk)) && (await poseEsperar('espreguica', 1800, tk)) && poseEsperar('sentado', 500, tk);
  }
  async function acaoDormir(tk) {
    virarParaOMeio();
    return (await poseEsperar('deitado', sorte(12000, 18000), tk)) && acaoEspreguicar(tk);
  }

  // ---------- 11. o sorteio: a cada 25 a 50 s, UMA ação, só com a aba visível ----------
  const ACOES = {
    passeio: { peso: 3, fn: acaoPasseio, pode: () => true },
    janela: { peso: 3, fn: acaoJanela, pode: () => !!escolherBarra() },
    balao: { peso: 8, fn: acaoBalaoBrincar, pode: () => !!topoBalao() },   // balão aberto: a brincadeira preferida
    cursor: { peso: 2, fn: acaoCursor, pode: () => !!mouse.t && agora() - mouse.t < 15000 },
    espreguicar: { peso: 2, fn: acaoEspreguicar, pode: () => true },
    dormir: { peso: 2, fn: acaoSoneca, pode: () => true },
    cabeca: { peso: 3, fn: acaoNaCabeca, pode: () => !!topoCabeca() }
  };
  function agendar() {
    clearTimeout(relogioAcao); agendadoPara = 0;
    if (foto || calmo || !passeios || !botao) return;
    const ms = sorte(25000, 50000);
    agendadoPara = Date.now() + ms;
    relogioAcao = setTimeout(sortear, ms);
  }
  function sortear() {
    if (document.hidden || tokenAtual || est.modo === 'arrasto' || est.modo === 'queda') return agendar();
    const lista = Object.keys(ACOES).filter(nome => ACOES[nome].pode());
    let resto = Math.random() * lista.reduce((s, nome) => s + ACOES[nome].peso, 0);
    const nome = lista.find(x => (resto -= ACOES[x].peso) < 0) || 'passeio';
    rodar(nome, ACOES[nome].fn);
  }

  // ---------- 12. a mão do usuário: clique, arrasto e teclado ----------
  // pointerdown no círculo do gato marca o toque; se andar mais de 5 px vira arrasto.
  // Sem arrasto, o próprio navegador dispara "click" (mouse, toque, Enter e Espaço).
  let ultimoArrasto = 0;
  function aoApertar(e) {
    if (foto || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();                             // não seleciona texto nem arrasta imagem
    if (e.pointerType !== 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = agora(); }  // no toque, o "cursor" é o dedo
    toque = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, arrastando: false, hist: [{ x: e.clientX, y: e.clientY, t: agora() }] };
    try { alvo.setPointerCapture(e.pointerId); } catch (err) { /* sem captura: os ouvintes da janela seguram */ }
  }
  function aoMover(e) {
    if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = agora(); brincarSePerto(); }
    if (!toque || e.pointerId !== toque.id) return;
    toque.x = e.clientX; toque.y = e.clientY;
    toque.hist.push({ x: e.clientX, y: e.clientY, t: agora() });
    if (toque.hist.length > 8) toque.hist.shift();
    if (!toque.arrastando && Math.hypot(e.clientX - toque.x0, e.clientY - toque.y0) > 5) comecarArrasto();
  }
  // Cursor na FAIXA DE ALTURA do gato (do topo das orelhas ao pé, com folga), em qualquer x:
  // ele sai brincando, sempre (sem sorteio). Depois entra em recarga e, até ela acabar, o
  // cursor na faixa não faz nada. Só com o gato parado no chão; nunca na foto nem no
  // movimento reduzido.
  let brincarDepois = 0;
  function brincarSePerto() {
    if (toque || foto || !est.rig || est.modo !== 'pose') return;
    if (Math.abs(est.chao - est.chaoT) > 3) return;            // num poleiro: não desce por causa do cursor
    const topoGato = est.rig.cy - 22 * est.k;                   // ponta das orelhas
    if (mouse.y < topoGato - FOLGA_FAIXA || mouse.y > est.chao + FOLGA_FAIXA) return;
    marcarInteracao();                                          // cursor por perto: não é hora de dormir
    const podeBrincar = !calmo && agora() >= brincarDepois;
    if (dormindoAgora()) {                                      // dormindo: acorda (e brinca, se não está na recarga)
      if (podeBrincar) brincarDepois = agora() + RECARGA_BRINCAR;
      acordar(podeBrincar ? tk => acaoCursor(tk, sorte(4, 6)) : null);
      return;
    }
    if (!podeBrincar || tokenAtual) return;
    brincarDepois = agora() + RECARGA_BRINCAR;
    brincar();
  }
  function comecarArrasto() {
    cancelar();
    toque.arrastando = true;
    const r = est.rig;
    est.H = { x: r.cx, y: r.cy }; est.B = { x: r.qx, y: r.qy };
    est.vH = { x: 0, y: 0 }; est.vB = { x: 0, y: 0 }; est.bal = 0; est.vBal = 0;
    est.pega = { x: r.cx - toque.x0, y: r.cy - toque.y0 };   // segura onde pegou; escorrega para o cangote
    est.alt = est.valt = est.arco = est.giro = 0;
    est.rigDe = r; est.misturaT = 0; est.modo = 'arrasto';
    botao.classList.add('gb-segurando', 'gb-no-ar');
    botao.classList.remove('gb-atras');             // pego pela mão volta para a frente de tudo
    marcarInteracao();
    pedirQuadro();
  }
  function aoSoltar(e) {
    if (!toque || (e && e.pointerId !== undefined && e.pointerId !== toque.id)) return;
    const t = toque;
    toque = null;
    botao.classList.remove('gb-segurando');
    if (!t.arrastando) return;                      // foi clique: quem cuida é o evento "click"
    ultimoArrasto = agora();
    // velocidade do arremesso: o caminho do ponteiro nos últimos ~80 ms
    const fim = t.hist[t.hist.length - 1], ini = t.hist.find(p => fim.t - p.t <= 80) || fim;
    const dtA = Math.max(0.016, (fim.t - ini.t) / 1000), parado = agora() - fim.t > 120;
    est.vH = parado ? { x: 0, y: 0 } : { x: lim((fim.x - ini.x) / dtA, -1800, 1800), y: lim((fim.y - ini.y) / dtA, -1800, 1800) };
    est.modo = 'queda';
    pedirQuadro();
  }
  function aoClicar() {
    if (agora() - ultimoArrasto < 350) return;      // o "click" que vem logo depois de soltar um arrasto
    miar();
  }

  // Miar (o clique): conta a próxima piada no idioma atual, abre a boca e começa a brincar.
  function miar() {
    rotular();
    const lista = Array.isArray(op.textos) ? op.textos : [];
    if (lista.length && typeof op.falar === 'function') {
      const t = lista[iTexto % lista.length];
      iTexto += 1;
      const texto = t && (t[idioma()] || t.pt);
      if (texto) op.falar(texto);
    }
    bocaAte = agora() + 420;
    if (est.rig) olhos(est.rig);
    clearTimeout(relogioBoca);
    relogioBoca = setTimeout(() => { if (est.rig && !rafId) olhos(est.rig); }, 450);
    // Clique SEMPRE liga a brincadeira (4 a 6 s), mesmo na recarga do cursor; clicar de novo
    // reinicia o tempo. Foto e movimento reduzido: só a piada, sem correr.
    marcarInteracao();
    if (dormindoAgora()) acordar(calmo || foto ? null : tk => acaoCursor(tk, sorte(4, 6)));
    else if (!calmo && !foto && est.modo === 'pose') brincar();
  }
  const idioma = () => (typeof op.idioma === 'function' && op.idioma() === 'en') ? 'en' : 'pt';
  const ROTULO = { pt: 'Gato branco: clique para uma piada, arraste para carregar', en: 'White cat: click for a joke, drag to carry it' };
  function rotular() { if (botao) botao.setAttribute('aria-label', ROTULO[idioma()]); }

  // ---------- 13. vida parada: piscar e abanar o rabo sem ligar o laço ----------
  // Um relógio leve a cada 2,6 a 6,2 s. O abano do rabo é uma animação do próprio SVG
  // (animateTransform), que roda 1,5 s e para; parado em casa, nada mais trabalha.
  function vida() {
    clearTimeout(relogioVida);
    if (foto || !botao) return;
    if (est.rig && est.rig.pisca < 0.5) {
      piscando = true; olhos(est.rig);
      setTimeout(() => { piscando = false; if (est.rig) olhos(est.rig); }, 130);
    }
    if (!calmo && Math.random() < 0.5 && swish.beginElement) { try { swish.beginElement(); } catch (e) { /* sem SMIL */ } }
    aoRolar();                                      // a janela do cochilo pode ter mudado de lugar sem rolagem
    // ninguém interagiu por um tempo e ele está em casa, parado: deita para dormir
    const c = casa();
    if (sonecaLigada && !tokenAtual && est.modo === 'pose' && !mov && est.pose === 'sentado' && Math.abs(est.x - c.x) < 3 &&
        Math.abs(est.chao - c.chao) < 3 && agora() - ultimaInteracao > dormirApos) rodar('soneca', acaoSoneca);
    relogioVida = setTimeout(vida, sorte(2600, 6200));
  }

  function aoRedimensionar() {
    ajustarEscala();
    est.chaoT = chaoTela();
    if (!tokenAtual && est.modo === 'pose' && !mov) { const c = casa(); est.x = c.x; est.chao = c.chao; }
    else est.x = lim(est.x, xMin(), xMax());
    aoRolar();
    if (!rafId && est.modo === 'pose') { est.rig = montarRig(); desenhar(est.rig); }
  }

  // ---------- 14. ligar e desligar ----------
  function ouvir(quem, tipo, fn, opc) {
    quem.addEventListener(tipo, fn, opc);
    desligar.push(() => quem.removeEventListener(tipo, fn, opc));
  }

  function iniciar(opcoes) {
    if (botao) parar();
    op = Object.assign({ textos: [], falar() {}, idioma: () => 'pt' }, opcoes || {});
    foto = /[?&]foto=1(&|$)/.test(location.search);
    calmo = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    passeios = op.passeios !== false;               // opcional: a página de testes desliga o sorteio
    est = {
      k: 1, modo: 'pose', pose: 'sentado', x: 0, chao: 0, chaoT: 0, dir: -1, fase: 0, amp: 0, vel: 0, braco: 0,
      alt: 0, valt: 0, arco: 0, giro: 0, q: 0, vq: 0, tempo: 0, misturaT: 1, rig: null, rigDe: null,
      H: { x: 0, y: 0 }, B: { x: 0, y: 0 }, vH: { x: 0, y: 0 }, vB: { x: 0, y: 0 }, bal: 0, vBal: 0, pega: { x: 0, y: 0 },
      naJanela: null, dxJanela: 0, olharCursor: false
    };
    montarDesenho();
    if (foto) botao.classList.add('gb-foto');
    if (calmo) botao.classList.add('gb-calmo');
    ajustarEscala();
    rotular();
    const c = casa();
    est.x = c.x; est.chao = c.chao; est.chaoT = chaoTela();
    est.rig = montarRig(); desenhar(est.rig);       // primeiro desenho direto, sem laço
    if (foto && svg.pauseAnimations) svg.pauseAnimations();
    ouvir(alvo, 'pointerdown', aoApertar);
    ouvir(alvo, 'lostpointercapture', aoSoltar);
    ouvir(window, 'pointermove', aoMover, { passive: true });
    ouvir(window, 'pointerup', aoSoltar);
    ouvir(window, 'pointercancel', aoSoltar);
    ouvir(botao, 'click', aoClicar);
    ouvir(botao, 'focus', rotular);
    ouvir(window, 'resize', aoRedimensionar);
    ouvir(window, 'scroll', aoRolar, { passive: true });
    // fala nova no balão do narrador: o observador olha o balão e decide uma vez por fala (verFala)
    const bal = op.ancora && op.ancora.querySelector('.balao');
    if (bal && window.MutationObserver) {
      const obs = new MutationObserver(() => verFala(bal));
      obs.observe(bal, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true });
      desligar.push(() => obs.disconnect());
    }
    sonecaLigada = passeios && !foto;               // a bancada de testes liga a soneca pelo gancho testar()
    marcarInteracao();
    vida();
    agendar();
    agendarMiau();
    return { parar, tema };
  }

  function parar() {
    if (!botao) return;
    cancelar();
    clearTimeout(relogioAcao); clearTimeout(relogioVida); clearTimeout(relogioBoca); clearTimeout(relogioMiau); clearTimeout(relogioFala);
    if (miauEl) { miauEl.remove(); miauEl = null; }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0; agendadoPara = 0; toque = null;
    desligar.forEach(f => f()); desligar = [];
    botao.remove();
    botao = null;
  }

  // tema(): o site trocou claro/escuro. As cores vêm do CSS; o gato só pisca, como quem estranha a luz.
  function tema() {
    if (!botao || foto || !est.rig) return;
    piscando = true; olhos(est.rig);
    setTimeout(() => { piscando = false; if (est.rig) olhos(est.rig); }, 160);
  }

  // Para a página de testes e a bateria: ler o estado e disparar uma ação na hora.
  function estado() {
    if (!est) return null;
    return { modo: est.modo, pose: est.pose, raf: !!rafId, acao: tokenAtual ? tokenAtual.nome : null, x: n(est.x), chao: n(est.chao), janela: !!est.naJanela, poleiro: est.poleiroNome || null,
      brincando: !!(mov && mov.tipo === 'seguir'), recargaBrincar: Math.max(0, Math.round(brincarDepois - agora())),
      dormindo: dormindoAgora(), variacao: est.variacao || null, idasBalao, trocasFala, recargaBalao: Math.max(0, Math.round(balaoDepois - agora())),
      atras: botao ? botao.classList.contains('gb-atras') : false,
      k: est.k, proximaAcaoEm: agendadoPara ? Math.round((agendadoPara - Date.now()) / 1000) : null, foto, calmo };
  }
  function acao(nome) {
    if (!botao) return false;
    if (nome === 'casa') { rodar('casa', async () => true); return true; }
    if (nome === 'soneca') { rodar('soneca', acaoSoneca); return true; }
    if (nome === 'miau') return mostrarMiau();
    const v = VARIACOES[nome === 'noBalao' ? 'balaoA' : nome];
    if (v) { if (!topoBalao()) return false; est.variacao = nome; rodar('balao', v()); return true; }
    const a = ACOES[nome];
    if (!a || !a.pode()) return false;
    rodar(nome, a.fn);
    return true;
  }

  // Gancho de teste: { acaso: 0 a 1 ou null } fixa o sorteio do balão; { dormirEm: ms } liga a
  // soneca com outro tempo (para a bateria não esperar 12 s de verdade).
  function testar(o) {
    if ('acaso' in o) acasoFixo = o.acaso;
    if ('passeios' in o) { passeios = !!o.passeios; agendar(); }   // desliga/liga o sorteio de ações
    if ('dormirEm' in o) { dormirApos = o.dormirEm; sonecaLigada = !foto; marcarInteracao(); }
    return estado();
  }

  return { iniciar, estado, acao, testar };
})();
