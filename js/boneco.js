/* =============================================================================
   boneco.js: o personagem do canto da tela (eu, do peito para cima).

   O boneco É a ilustração (img/boneco.webp, fundo transparente). Por cima dela,
   no mesmo quadro de 344 x 533, vão camadas que dão vida ao rosto:
   - olhos abertos com o branco vazio (img/boneco-olho-e.webp e -olho-d.webp; o
     direito é o esquerdo espelhado, porque na ilustração ele está piscando);
   - a íris (img/boneco-iris.webp), uma em cada olho, recortada pelo contorno do
     olho: ela anda alguns pixels na direção do mouse;
   - o olho esquerdo fechado (img/boneco-fechado.webp) para o piscar;
   - a boca entreaberta e aberta, desenhadas aqui, que trocam enquanto ele fala.
   Piscadinha = as camadas do olho direito somem por 400 ms e aparece o olho
   piscando da própria ilustração.

   As camadas foram geradas a partir da ilustração (script de recorte fora do
   repositório). Para trocar o boneco: refazer as camadas com o mesmo quadro.

   API (a mesma de antes, usada pelo narrador):
   Boneco.montar(svg, aparencia) -> { falando(sim), acenar(), pular(), piscar() }
   ============================================================================= */
window.Boneco = (function () {
  'use strict';
  const LARGURA = 344, ALTURA = 533;
  // Contorno do olho esquerdo (a íris só aparece dentro dele) e a íris: canto e lado da imagem.
  const OLHO = [[116, 201], [125, 195.5], [140, 193.5], [160, 194], [172, 197.5], [182, 204], [181, 217], [171, 229], [155, 233.5], [140, 232.5], [127, 226], [118, 215]];
  const IRIS = { x: 124, y: 190, lado: 40, cx: 143.5, cy: 209.5 };
  // O olho direito é o esquerdo espelhado e encolhido (3/4): mesma conta usada para gerar a camada.
  const espelho = ([x, y]) => [216 + (188 - x) * 0.793, 185 + (y - 182) * 0.948];
  const pontos = lista => lista.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  let contador = 0;   // ids próprios por boneco (dá para ter dois na mesma página)

  function desenho(id, pasta) {
    const [dx, dy] = espelho([IRIS.cx, IRIS.cy]);
    // íris do olho direito: mesma imagem, encolhida como o olho (sem espelhar o reflexo). O olho é um
    // espelho do esquerdo, então a íris "de repouso" também ficaria espelhada (olhando para dentro: vesgo);
    // o translate(-8.7) a põe no mesmo lado relativo do esquerdo, e os dois olham para o mesmo lugar.
    const irisD = `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(.793 .948) translate(${-IRIS.cx} ${-IRIS.cy})`;
    const iris = `<image href="${pasta}boneco-iris.webp" x="${IRIS.x}" y="${IRIS.y}" width="${IRIS.lado}" height="${IRIS.lado}"/>`;
    return `
  <defs>
    <clipPath id="${id}-e"><polygon points="${pontos(OLHO)}"/></clipPath>
    <clipPath id="${id}-d"><polygon points="${pontos(OLHO.map(espelho))}"/></clipPath>
  </defs>
  <g class="bn-corpo"><g class="bn-mexe">
    <image href="${pasta}boneco.webp" width="${LARGURA}" height="${ALTURA}"/>
    <g class="bn-olho bn-esq">
      <image href="${pasta}boneco-olho-e.webp" width="${LARGURA}" height="${ALTURA}"/>
      <g clip-path="url(#${id}-e)"><g class="bn-iris">${iris}</g></g>
    </g>
    <g class="bn-olho bn-dir">
      <image href="${pasta}boneco-olho-d.webp" width="${LARGURA}" height="${ALTURA}"/>
      <g clip-path="url(#${id}-d)"><g class="bn-iris bn-iris-d"><g transform="translate(-8.7 0) ${irisD}">${iris}</g></g></g>
    </g>
    <image class="bn-fechado" href="${pasta}boneco-fechado.webp" width="${LARGURA}" height="${ALTURA}"/>
    <g class="bn-boca bn-boca-1"><path d="M168 264Q191 275 217 266Q206 278 192 278.5Q177 277 168 264Z"/></g>
    <g class="bn-boca bn-boca-2"><path d="M168 264Q191 275 217 266Q205 286 192 287Q176 285 168 264Z"/><path class="bn-lingua" d="M180 281Q192 275 204 280Q199 286.5 192 287Q185 286.5 180 281Z"/></g>
  </g></g>`;
  }

  function montar(svg, aparencia) {
    const a = aparencia || {};
    const imagem = a.imagem || 'img/boneco.webp';
    const pasta = imagem.slice(0, imagem.lastIndexOf('/') + 1);   // as camadas moram ao lado da imagem
    const id = 'bn' + (++contador);
    svg.setAttribute('viewBox', `0 0 ${LARGURA} ${ALTURA}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    svg.classList.add('bn');
    svg.innerHTML = desenho(id, pasta);
    svg.dataset.boca = '0';

    // ?foto=1 congela (foto de teste sempre igual); "reduzir movimento" também: sem relógio, sem animação.
    const congelado = /[?&]foto=1/.test(location.search);
    const calmo = congelado || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (calmo) svg.classList.add('bn-parado');
    const corpo = svg.querySelector('.bn-corpo'), cabeca = svg.querySelector('.bn-mexe');
    const anima = (el, quadros, op) => (!calmo && el.animate) ? el.animate(quadros, op) : null;

    // Piscar: o olho esquerdo fechado aparece e o direito volta a ser o da ilustração (fechado), por 150 ms.
    let piscando = false;
    function fecharOlhos() {
      if (piscando) return;
      svg.classList.add('bn-fechados');
      setTimeout(() => svg.classList.remove('bn-fechados'), 150);
    }
    // Piscadinha: só o direito fecha (é o olho da ilustração), por 400 ms. Na foto congelada ela fica.
    function piscar() {
      if (piscando) return;
      piscando = true;
      svg.classList.add('bn-piscadinha');
      if (congelado) return;
      setTimeout(() => { svg.classList.remove('bn-piscadinha'); piscando = false; }, 400);
    }
    if (!calmo) {
      (function laco() { setTimeout(() => { fecharOlhos(); if (Math.random() < 0.2) setTimeout(fecharOlhos, 300); laco(); }, 2800 + Math.random() * 3600); })();
      (function laco() { setTimeout(() => { piscar(); laco(); }, 10000 + Math.random() * 10000); })();
    }

    // Olhar: UMA direção, medida do ponto entre os olhos, vale para os dois (nunca vesgo).
    // O esquerdo anda até 4 px para o lado e 2,5 px para cima/baixo; o direito, menor, anda o mesmo
    // na proporção do tamanho dele (0,8 e 0,95). Perto do rosto (menos de 80 px) o passo diminui aos
    // poucos até zero, sem salto.
    if (!calmo) {
      const irisE = svg.querySelector('.bn-iris:not(.bn-iris-d)'), irisD = svg.querySelector('.bn-iris-d');
      let quadro = null;
      window.addEventListener('pointermove', e => {
        if (quadro) return;
        quadro = requestAnimationFrame(() => {
          quadro = null;
          const r = svg.getBoundingClientRect();
          const cx = r.left + r.width * 0.57, cy = r.top + r.height * 0.4;   // entre os olhos
          const ex = e.clientX - cx, ey = e.clientY - cy, d = Math.hypot(ex, ey) || 1;
          const k = Math.min(1, d / 80);
          const x = ex / d * 4 * k, y = ey / d * 2.5 * k;
          irisE.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
          irisD.style.transform = `translate(${(x * 0.8).toFixed(2)}px, ${(y * 0.95).toFixed(2)}px)`;
        });
      }, { passive: true });
    }

    // Fala: a boca sorteia entre a da ilustração (0), entreaberta (1) e aberta (2) a cada 120 ms.
    let fala = null;
    function falando(sim) {
      svg.classList.toggle('bn-falando', !!sim && !calmo);
      clearInterval(fala);
      svg.dataset.boca = '0';
      if (!sim || calmo) return;
      fala = setInterval(() => { const r = Math.random(); svg.dataset.boca = r < 0.3 ? '0' : r < 0.65 ? '1' : '2'; }, 120);
    }
    function pular() {
      anima(corpo, [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
    }
    function acenar() {
      anima(cabeca, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0deg)' }], { duration: 900, easing: 'ease-in-out' });
      pular();
    }
    return { falando, acenar, pular, piscar };
  }
  return { montar };
})();
