/* =============================================================================
   site.js: a cola. Tema, idioma, janelas (recolher, tela cheia, doca), a demo
   dentro do iframe, as listas (projetos, o que já fiz, fora do expediente) e a
   inicialização de cada peça (3D, pipeline, fluxos, agentes, narrador, gato).
   ============================================================================= */
(function () {
  'use strict';
  const C = window.CONTEUDO;
  document.documentElement.classList.add('js');
  const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* navegador sem armazenamento: segue sem lembrar */ } };
  const q = new URLSearchParams(location.search);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Passo 1: tema e idioma. Ordem: endereço > última escolha > sistema/navegador.
  let tema = q.get('tema') || ler('paoli-tema') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro');
  let idioma = q.get('lang') || ler('paoli-lang') || 'en';   // primeiro acesso: inglês (pedido dele)
  const ui = k => (C.ui[k] ? C.ui[k][idioma === 'en' ? 1 : 0] : k);

  // Endereço de cada projeto: no PC (file://) é a pasta vizinha; no GitHub Pages é /pasta/.
  const local = location.protocol === 'file:';
  const linkDe = (pasta, caminho) => local ? `../${pasta}/${caminho ? caminho + 'index.html' : 'index.html'}` : `/${pasta}/${caminho || ''}`;
  const DEMO = linkDe('people-analytics-dashboard');
  const iframe = document.querySelector('iframe[data-src="demo"]');
  const avisarDemo = m => { if (iframe && iframe.contentWindow && iframe.src) iframe.contentWindow.postMessage(Object.assign({ paoliDemo: true }, m), '*'); };

  function aplicarTema() {
    document.documentElement.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
    gravar('paoli-tema', tema);
    if (pecas.constelacao) pecas.constelacao.tema();
    if (pecas.gato && pecas.gato.tema) pecas.gato.tema();
    avisarDemo({ tema });
  }

  // Passo 2: listas que vêm de dados (projetos, o que já fiz, fora do expediente).
  function desenharListas() {
    const t = o => o[idioma] || o.pt;
    // chip é texto (nome de ferramenta, igual nas duas línguas) ou { pt, en }
    const chips = lista => `<span class="chips">${(lista || []).map(c => `<span>${esc(typeof c === 'string' ? c : t(c))}</span>`).join('')}</span>`;
    const lp = document.getElementById('lista-projetos');
    if (lp) lp.innerHTML = (window.PROJETOS || []).map(p => {
      const noAr = p.pages ? linkDe(p.pasta, p.caminho) : null;
      return `<article class="repo"><a class="r-img" href="${esc(noAr || 'https://github.com/FernandoTRecruiter/' + p.pasta)}" target="_blank" rel="noopener"><img src="${esc(p.imagem)}" alt="" loading="lazy"></a>` +
        `<div class="r-corpo"><span class="r-nome mono">${esc(p.pasta)}</span><b>${esc(t(p.titulo))}</b><span class="r-desc">${esc(t(p.desc))}</span>` +
        chips(p.chips) +
        `<span class="r-links">${noAr ? `<a href="${esc(noAr)}" target="_blank" rel="noopener">${esc(ui('ver_no_ar'))}</a>` : ''}<a href="https://github.com/FernandoTRecruiter/${esc(p.pasta)}" target="_blank" rel="noopener">${esc(ui('codigo'))}</a></span></div></article>`;
    }).join('');
    // O que já fiz: cada entrega em três linhas fixas (problema, solução, resultado), para ler em segundos.
    const lc = document.getElementById('lista-cases');
    if (lc) lc.innerHTML = (C.cases || []).map(c => `<article class="case"><h3>${esc(t(c.t))}</h3><dl>` +
      `<dt>${esc(ui('c_problema'))}</dt><dd>${esc(t(c.problema))}</dd>` +
      `<dt>${esc(ui('c_solucao'))}</dt><dd>${esc(t(c.solucao))}</dd>` +
      `<dt class="resultado">${esc(ui('c_resultado'))}</dt><dd class="resultado">${esc(t(c.resultado))}</dd></dl>` +
      (c.chips ? chips(c.chips) : '') + `</article>`).join('');
    const sm = document.getElementById('sobre-mim');
    // "link" é opcional: { pasta, rotulo } vira um link para o projeto (ex.: o jogo).
    if (sm) sm.innerHTML = (C.sobreMim || []).map(s => `<div class="sobre-item"><span class="s-ic" aria-hidden="true">${s.ic}</span><b>${esc(t(s.t))}</b><span>${esc(t(s.d))}` +
      (s.link ? ` <a href="${esc(linkDe(s.link.pasta))}" target="_blank" rel="noopener">${esc(t(s.link.rotulo))}</a>` : '') + `</span></div>`).join('');
  }

  // Passo 3: idioma. O português original de cada [data-i18n] fica guardado na
  // primeira troca; o inglês vem do conteudo.js.
  const originais = new Map();
  function aplicarIdioma() {
    document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (!originais.has(el)) originais.set(el, el.innerHTML);
      const en = C.en[el.dataset.i18n];
      el.innerHTML = idioma === 'en' && en ? en : originais.get(el);
    });
    document.title = idioma === 'en' ? 'Fernando Paoli · HR data, dashboards and automation' : 'Fernando Paoli · dados de RH, painéis e automação';
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('ativo', b.dataset.lang === idioma));
    document.querySelectorAll('[data-historia]').forEach(div => {
      const f = C.falas[div.dataset.historia];
      div.innerHTML = f ? f[idioma].map(x => `<p>${esc(typeof x === 'string' ? x : x.t)}</p>`).join('') : '';
    });
    desenharListas();
    gravar('paoli-lang', idioma);
    Object.values(pecas).forEach(p => p && p.idioma && p.idioma(idioma));
    avisarDemo({ lang: idioma });
  }

  // Passo 4: as peças desenhadas.
  const pecas = {};
  function rolarPara(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.classList.remove('na-doca', 'recolhida');
    alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  pecas.constelacao = window.Constelacao.iniciar(document.getElementById('constelacao'), { aoClicar: rolarPara });
  pecas.pipeline = window.Pipeline.iniciar({ svgAntes: document.getElementById('pipe-antes'), svgDepois: document.getElementById('pipe-depois'), painel: document.querySelector('.pipe-detalhe'), rotulos: ui });
  pecas.fluxos = window.Fluxos.iniciar(document.getElementById('fluxograma'), document.querySelector('.abas-fluxo'), document.querySelector('.fluxo-nota'), ui);
  pecas.agentes = window.Agentes.iniciar(document.getElementById('orbita'), document.querySelector('.agente-detalhe'), ui);

  // Passo 5: janelas. Entram com um leve giro 3D quando aparecem na tela.
  const janelas = [...document.querySelectorAll('.janela')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { threshold: 0.06 });
    janelas.forEach(j => io.observe(j));
    // A demo só carrega quando a janela dela chega perto (a página abre mais rápido).
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { carregarDemo(); io2.disconnect(); } }), { rootMargin: '600px 0px' });
    if (iframe) io2.observe(iframe);
  } else { janelas.forEach(j => j.classList.add('visivel')); carregarDemo(); }
  if (q.get('foto') === '1') { janelas.forEach(j => j.classList.add('visivel')); carregarDemo(); }

  function carregarDemo() {
    if (!iframe || iframe.src) return;
    iframe.src = `${DEMO}?embed=1&lang=${idioma}&tema=${tema}`;
  }
  document.querySelectorAll('[data-link="demo"]').forEach(a => { a.href = DEMO; });

  // Botões das janelas: recolher, tela cheia (Esc sai) e "fechar" = vai para a doca.
  const doca = document.querySelector('.doca');
  let veu = null;
  function sairDaTelaCheia() {
    document.querySelectorAll('.janela.max').forEach(j => j.classList.remove('max'));
    document.body.classList.remove('trava');
    if (veu) { veu.remove(); veu = null; }
  }
  janelas.forEach(j => {
    const titulo = j.querySelector('.j-titulo').textContent.split('·')[0].trim();
    j.querySelector('.j-min').addEventListener('click', () => j.classList.toggle('recolhida'));
    j.querySelector('.j-max').addEventListener('click', () => {
      if (j.classList.contains('max')) return sairDaTelaCheia();
      j.classList.add('max'); document.body.classList.add('trava');
      veu = document.createElement('div'); veu.className = 'veu'; veu.addEventListener('click', sairDaTelaCheia); document.body.appendChild(veu);
      if (j.id === 'j-agentes') pecas.agentes.montar();
    });
    j.querySelector('.j-fechar').addEventListener('click', () => {
      sairDaTelaCheia();
      j.classList.add('na-doca');
      const b = document.createElement('button');
      b.textContent = '▢ ' + titulo; b.title = ui('voltar_doca');
      b.addEventListener('click', () => { j.classList.remove('na-doca'); b.remove(); rolarPara(j.id); });
      doca.appendChild(b);
    });
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') sairDaTelaCheia(); });

  // Controles do topo.
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { idioma = b.dataset.lang; aplicarIdioma(); }));
  document.querySelector('[data-tema]').addEventListener('click', () => { tema = tema === 'escuro' ? 'claro' : 'escuro'; aplicarTema(); });
  if (iframe) iframe.addEventListener('load', () => avisarDemo({ lang: idioma, tema }));
  // A demo conta a altura dela; a janela acompanha, para não ter rolagem dentro da janela.
  window.addEventListener('message', e => {
    if (!iframe || e.source !== iframe.contentWindow || !e.data || typeof e.data.paoliAltura !== 'number') return;
    const h = Math.min(Math.max(e.data.paoliAltura, 500), 4000);
    iframe.parentElement.style.setProperty('--altura-demo', h + 'px');
  });

  aplicarTema();
  aplicarIdioma();
  // O narrador nasce por último: ele lê o idioma já aplicado.
  pecas.narrador = window.Narrador.iniciar({ falas: C.falas, aparencia: C.aparencia, audios: window.AUDIOS || {}, idioma: () => idioma, ui });
  // O gato é opcional: se o arquivo js/gato.js estiver na página, ele aparece.
  if (window.Gato) pecas.gato = window.Gato.iniciar({ ancora: document.querySelector('.narrador'), falar: t => pecas.narrador.falarLivre(t), textos: C.gatos, idioma: () => idioma });
  window.__portfolio = { pecas, get idioma() { return idioma; }, get tema() { return tema; } }; // para os testes
})();
