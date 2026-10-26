/* =============================================================================
   narrador.js: o balão do bonequinho que conta "o que eu fiz e por quê".

   Como funciona:
   1. Cada seção da página tem data-fala="nome". Quando ela entra na tela, o
      balão mostra as falas dela (CONTEUDO.falas), digitando letra a letra.
   2. Botão 🔈 liga a voz. Se existir um áudio GRAVADO para a fala (lista em
      js/audios.js, gerada por ferramentas/lista_audios.py), toca a gravação;
      se não existir, mostra só o texto (sem voz de robô: a voz é a dele ou nenhuma).
   3. O desenho e as animações do boneco moram no boneco.js.
   ============================================================================= */
window.Narrador = (function () {
  'use strict';

  function iniciar(o) {
    const raiz = document.querySelector('.narrador');
    const balao = raiz.querySelector('.balao'), fala = raiz.querySelector('.fala'), contador = raiz.querySelector('.contador');
    const boneco = window.Boneco.montar(document.getElementById('boneco'), o.aparencia);
    const audios = o.audios || {};
    const congelado = /[?&]foto=1/.test(location.search);
    const calmo = congelado || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let secao = 'inicio', i = 0, digitando = null, espera = null, voz = false, tocando = null;
    let calado = false;
    try { calado = localStorage.getItem('paoli-calado') === '1'; } catch (e) { /* sem armazenamento */ }
    if (calado) balao.classList.add('escondido');

    // Uma fala pode ser só o texto ou { t: 'texto', audio: 'audio/arquivo.mp3' }.
    const lista = () => ((o.falas[secao] || o.falas.inicio)[o.idioma()] || []);
    const textoDe = item => (typeof item === 'string' ? item : item.t);
    const audioDe = (item, n) => (item && item.audio) || audios[`${secao}-${n + 1}-${o.idioma()}`] || null;
    const escapar = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    function pararTudo() {
      clearInterval(digitando); clearTimeout(espera);
      if (tocando) { tocando.pause(); tocando = null; }
      boneco.falando(false);
    }

    // A voz: só a gravação. Fala sem gravação segue no ritmo do texto. "depois" roda no fim.
    function falarEmVoz(texto, arquivo, depois) {
      if (arquivo) {
        tocando = new Audio(arquivo);
        tocando.addEventListener('playing', () => boneco.falando(true));
        tocando.addEventListener('ended', () => { boneco.falando(false); tocando = null; if (depois) espera = setTimeout(depois, 700); });
        tocando.addEventListener('error', () => { tocando = null; falarEmVoz(texto, null, depois); });
        tocando.play().catch(() => falarEmVoz(texto, null, depois));
        return;
      }
      if (depois) espera = setTimeout(depois, Math.max(2600, texto.length * 48));
    }

    function dizer(texto, arquivo, depois) {
      pararTudo();
      // Com voz ligada, quem decide a hora de passar para a próxima fala é o fim do áudio.
      const proxima = voz ? null : depois;
      if (voz) falarEmVoz(texto, arquivo, depois);
      if (calmo) { fala.textContent = texto; if (proxima) espera = setTimeout(proxima, Math.max(2600, texto.length * 48)); return; }
      let n = 0;
      fala.innerHTML = '<span class="cursor"></span>';
      if (!voz) boneco.falando(true);
      digitando = setInterval(() => {
        n += 2;
        fala.innerHTML = escapar(texto.slice(0, n)) + '<span class="cursor"></span>';
        if (n >= texto.length) {
          clearInterval(digitando); digitando = null;
          if (!voz) boneco.falando(false);
          fala.textContent = texto;
          if (proxima) espera = setTimeout(proxima, Math.max(2600, texto.length * 48));
        }
      }, 26);
    }

    function mostrar() {
      const l = lista();
      i = Math.max(0, Math.min(i, l.length - 1));
      contador.textContent = `${i + 1}/${l.length}`;
      balao.classList.remove('escondido');
      // Na última fala da seção o balão se recolhe sozinho depois de um tempo
      // (para não cobrir a página); volta na próxima seção ou com um clique no boneco.
      dizer(textoDe(l[i]), audioDe(l[i], i), i < l.length - 1 ? () => { i += 1; mostrar(); } : () => { if (!congelado && !voz) balao.classList.add('escondido'); });
    }
    function irPara(nome) {
      if (!o.falas[nome] || nome === secao) return;
      secao = nome; i = 0;
      if (nome === 'inicio' || nome === 'contato') boneco.acenar();
      if (!calado) mostrar();
    }
    // Para o gato (ou outra peça) usar o balão com um texto avulso.
    function falarLivre(texto) {
      calado = false; balao.classList.remove('escondido');
      contador.textContent = '🐾';
      dizer(texto, null, null);
    }

    raiz.querySelector('[data-fala-prox]').addEventListener('click', () => { i = Math.min(i + 1, lista().length - 1); mostrar(); });
    raiz.querySelector('[data-fala-ant]').addEventListener('click', () => { i = Math.max(i - 1, 0); mostrar(); });
    raiz.querySelector('[data-calar]').addEventListener('click', () => {
      calado = true; balao.classList.add('escondido'); pararTudo();
      try { localStorage.setItem('paoli-calado', '1'); } catch (e) { /* ok */ }
    });
    const bVoz = raiz.querySelector('[data-voz]');
    const temGravacao = () => Object.keys(audios).some(k => k.endsWith('-' + o.idioma()));
    function rotularVoz() {
      bVoz.textContent = voz ? '🔊' : '🔈';
      bVoz.title = o.ui('voz_gravada') + (voz ? ' · ' + o.ui('ligada') : '');
      // Sem nenhuma gravação neste idioma, o botão nem aparece (nada de voz de robô).
      bVoz.hidden = !temGravacao();
      if (bVoz.hidden && voz) { voz = false; pararTudo(); }
      bVoz.classList.toggle('ativo', voz);
    }
    bVoz.addEventListener('click', () => { voz = !voz; rotularVoz(); if (voz) mostrar(); else pararTudo(); });
    rotularVoz();
    raiz.querySelector('.boneco').addEventListener('click', () => {
      if (calado) { calado = false; try { localStorage.removeItem('paoli-calado'); } catch (e) { /* ok */ } }
      boneco.pular(); boneco.acenar(); mostrar();
    });

    // Quem está na tela manda na fala (a seção que cruza a faixa do meio da tela).
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) irPara(e.target.dataset.fala); }), { rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('[data-fala]').forEach(s => io.observe(s));
    }
    if (!calado) { boneco.acenar(); mostrar(); }
    return { idioma() { rotularVoz(); if (!calado) mostrar(); }, irPara, falarLivre, boneco };
  }
  return { iniciar };
})();
