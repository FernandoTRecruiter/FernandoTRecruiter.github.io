/* =============================================================================
   pipeline.js: o caminho do dado em 3D isométrico, ANTES e DEPOIS lado a lado.

   Isométrico = 3D sem perspectiva: x e y do chão viram diagonais na tela e a
   altura sobe reta. Cada bloco é uma caixa (tampa + duas laterais) com:
   - um NÚMERO na ordem da história (blocos do mesmo passo têm o mesmo número);
   - a etiqueta de QUEM CUIDA dele: "TI", "eu" ou "TI + eu";
   - no primeiro bloco do "depois", a etiqueta "comece aqui".
   Clicar num bloco abre uma janela FLUTUANTE ao lado dele, em cima do desenho,
   com o que ele é, por que existe e quem cuida. Pacotes andam pelos canos.
   Para mudar texto, número ou bloco: só os objetos ANTES e DEPOIS abaixo.
   ============================================================================= */
window.Pipeline = (function () {
  'use strict';
  const T = (pt, en) => ({ pt, en });
  // tx/ty = posição na TELA (px) do bloco; o código converte para o chão isométrico. n = passo da história.
  const ANTES = {
    blocos: [
      { id: 'erp', n: 1, tx: 0, ty: 0, a: 1.1, nome: T('ERP', 'ERP'), sub: T('exportação à mão', 'manual export'),
        oque: T('Alguém exportava um relatório do ERP toda semana.', 'Someone exported an ERP report every week.'),
        problema: T('Dependia de uma pessoa lembrar e de o relatório não mudar de formato.', 'It depended on someone remembering and on the report never changing format.') },
      { id: 'ats', n: 1, tx: 0, ty: 170, a: 0.9, nome: T('ATS', 'ATS'), sub: T('outra exportação', 'another export'),
        oque: T('O recrutamento vinha de outra exportação, em outra data.', 'Recruiting came from another export, on another date.'),
        problema: T('Duas fontes, duas datas: os números não conversavam.', 'Two sources, two dates: the numbers did not match.') },
      { id: 'plan', n: 2, tx: 150, ty: 85, a: 0.8, alerta: true, nome: T('Planilha', 'Spreadsheet'), sub: T('fórmula copiada', 'copied formulas'),
        oque: T('Uma planilha juntava tudo à mão, com fórmulas copiadas.', 'A spreadsheet merged everything by hand, with copied formulas.'),
        problema: T('Uma coluna fora do lugar quebrava o painel inteiro.', 'One column out of place broke the whole dashboard.') },
      { id: 'dash', n: 3, tx: 300, ty: 85, a: 1.0, alerta: true, nome: T('Dashboard', 'Dashboard'), sub: T('de quando é?', 'as of when?'),
        oque: T('O painel lia a planilha.', 'The dashboard read the spreadsheet.'),
        problema: T('Ninguém sabia de quando era o número.', 'Nobody knew how old the number was.') }
    ],
    canos: [['erp', 'plan', 'manual'], ['ats', 'plan', 'manual'], ['plan', 'dash', 'manual']]
  };
  const DEPOIS = {
    comeca: 'erp',
    blocos: [
      { id: 'erp', n: 1, tx: 0, ty: 0, a: 1.15, dono: 'ti', nome: T('ERP', 'ERP'), sub: T('fonte da verdade', 'source of truth'),
        oque: T('O sistema de RH: admissão, cargo, férias e desligamento.', 'The HR system: hires, roles, vacation and exits.'),
        porque: T('É a régua: toda conferência começa aqui, nunca na cópia.', 'It is the ruler: every check starts here, never in the copy.'),
        quem: T('Sistema da empresa. Eu só leio.', 'Company system. I only read it.') },
      { id: 'ats', n: 1, tx: 0, ty: 190, a: 0.95, dono: 'ti', nome: T('ATS', 'ATS'), sub: T('vagas e candidatos', 'jobs and candidates'),
        oque: T('O sistema de recrutamento: vagas, etapas e candidatos.', 'The recruiting system: jobs, stages and candidates.'),
        porque: T('Recrutamento entra no mesmo painel, com a mesma régua de datas.', 'Recruiting joins the same dashboard, with the same date rules.'),
        quem: T('Sistema da empresa. Eu só leio.', 'Company system. I only read it.') },
      { id: 'map', n: 2, tx: 175, ty: -110, a: 0.7, dono: 'eu', nome: T('Mapeamento', 'Data map'), sub: T('tabelas e chaves', 'tables and keys'),
        oque: T('O mapa das tabelas e colunas que importam: o que cada uma guarda, as chaves e as armadilhas.', 'The map of the tables and columns that matter: what each holds, the keys and the traps.'),
        porque: T('Sem mapa, cada pergunta nova era uma escavação. Com ele, a mudança já nasce certa.', 'Without a map, every new question was a dig. With it, the change is born right.'),
        quem: T('Eu.', 'Me.') },
      { id: 'adf', n: 3, tx: 175, ty: 95, a: 0.85, dono: 'ambos', nome: T('Carga', 'Load'), sub: T('carga semanal', 'weekly load'),
        oque: T('A carga semanal (Azure Data Factory) que copia ERP e ATS para o Data Lake e monta as tabelas finais com funções em Python.', 'The weekly load (Azure Data Factory) that copies ERP and ATS into the Data Lake and builds the final tables with Python functions.'),
        porque: T('Regra escrita uma vez, revisada pela TI e versionada no Git, no lugar da planilha à mão.', 'Rules written once, reviewed by IT and versioned in Git, instead of the manual spreadsheet.'),
        quem: T('A TI cuida da infraestrutura; eu escrevo as PRs que montam as tabelas.', 'IT runs the infrastructure; I write the PRs that build the tables.') },
      { id: 'lake', n: 4, tx: 350, ty: 95, a: 1.45, dono: 'ti', nome: T('Data Lake', 'Data Lake'), sub: T('Azure SQL', 'Azure SQL'),
        oque: T('O banco no Azure onde o histórico fica guardado em camadas.', 'The Azure database where history is stored in layers.'),
        porque: T('Um lugar só para todos os painéis lerem o mesmo número.', 'One place for every dashboard to read the same number.'),
        quem: T('A TI hospeda e administra.', 'IT hosts and runs it.') },
      { id: 'conf', n: 5, tx: 350, ty: 290, a: 0.7, dono: 'eu', nome: T('Conferência', 'Weekly check'), sub: T('toda semana', 'every week'),
        oque: T('Toda semana, agentes de IA comparam os números do Lake com o ERP, na data da carga.', 'Every week, AI agents compare the Lake numbers with the ERP, on the load date.'),
        porque: T('Achar a diferença antes do gestor. Diferença vira correção no código da carga, nunca ajuste à mão.', 'Find the gap before the manager does. A difference becomes a fix in the load code, never a manual patch.'),
        quem: T('Eu, com os agentes.', 'Me, with the agents.') },
      { id: 'plat', n: 6, tx: 525, ty: 95, a: 1.0, dono: 'ambos', nome: T('Plataforma', 'Platform'), sub: T('banco + login', 'database + login'),
        oque: T('Onde os painéis moram: banco, login da empresa e controle de quem vê o quê.', 'Where the dashboards live: database, company login and who-sees-what control.'),
        porque: T('Tirar o dado de dentro do arquivo: segurança de verdade mora no servidor.', 'Take the data out of the file: real security lives on the server.'),
        quem: T('A TI hospeda; eu cuido dos acessos e da conformidade (só o dado necessário, para quem precisa).', 'IT hosts it; I handle access and compliance (only the data needed, for whoever needs it).') },
      { id: 'exec', n: 7, tx: 700, ty: 0, a: 1.1, dono: 'eu', nome: T('Dashboard', 'Dashboard'), sub: T('liderança', 'leadership'),
        oque: T('Os indicadores de pessoas da liderança.', 'The leadership people indicators.'),
        porque: T('A liderança responde sozinha as perguntas do dia a dia.', 'Leaders answer everyday questions on their own.'),
        quem: T('Eu monto e confiro.', 'I build and check it.') },
      { id: 'gest', n: 7, tx: 700, ty: 190, a: 0.9, dono: 'eu', nome: T('Painel do gestor', 'Manager view'), sub: T('PT e EN', 'PT and EN'),
        oque: T('Cada gestor vê só a própria equipe, em português ou inglês.', 'Each manager sees only their own team, in Portuguese or English.'),
        porque: T('Menos pedido ao RH, sem expor a equipe dos outros.', 'Fewer requests to HR, without exposing other teams.'),
        quem: T('Eu monto; o recorte do dado acontece antes de chegar na tela.', 'I build it; the data is cut before it reaches the screen.') }
    ],
    canos: [['erp', 'adf'], ['ats', 'adf'], ['adf', 'lake'], ['lake', 'plat'], ['plat', 'exec'], ['plat', 'gest'],
      ['map', 'erp', 'fino'], ['map', 'adf', 'fino'], ['conf', 'erp', 'confere'], ['conf', 'lake', 'confere']]
  };
  const C = Math.cos(Math.PI / 6), S = 0.5, U = 30, L = 2.1;
  const DONO = { ti: T('TI', 'IT'), eu: T('eu', 'me'), ambos: T('TI + eu', 'IT + me') };
  const ROTULO_SVG = { antes: T('Antes: ERP e ATS exportados à mão para uma planilha que alimentava o dashboard', 'Before: ERP and ATS exported by hand to a spreadsheet that fed the dashboard'),
    depois: T('Depois: o ciclo numerado da fonte ao painel, com mapeamento e conferência semanal', 'After: the numbered cycle from source to dashboard, with mapping and a weekly check') };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  [ANTES, DEPOIS].forEach(d => d.blocos.forEach(b => {
    const h = b.tx / (C * U), v = b.ty / (S * U);
    b.x = (h + v) / 2; b.y = (v - h) / 2;
  }));

  function iniciar(o) {
    const ns = 'http://www.w3.org/2000/svg';
    const congelado = /[?&]foto=1/.test(location.search) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let idioma = 'pt', ativo = null, pacotes = [];
    const p = (x, y, z) => [(x - y) * C * U, (x + y) * S * U - z * U * 1.05];
    const pts = l => l.map(q => q.map(n => n.toFixed(1)).join(',')).join(' ');
    const el = (tag, at, pai) => { const e = document.createElementNS(ns, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); pai.appendChild(e); return e; };
    const txt = v => (typeof v === 'string' ? v : v[idioma]);
    const meio = b => [b.x + L / 2, b.y + L / 2];
    const card = o.painel;   // a janela flutuante (uma só, que muda de lado conforme o bloco)

    // Texto que não cabe na tampa encolhe até caber (era o defeito: nome vazando).
    function caber(t, largura, max) {
      let tam = max;
      t.setAttribute('font-size', tam);
      while (tam > 7 && t.getComputedTextLength && t.getComputedTextLength() > largura) { tam -= 0.5; t.setAttribute('font-size', tam); }
    }
    // Etiqueta arredondada (quem cuida, "!", "comece aqui"), centrada em x e com a base em y.
    function etiqueta(pai, classe, x, y, texto) {
      const w = texto.length * 6.2 + 12;
      const g = el('g', { class: 'etiqueta ' + classe }, pai);
      el('rect', { x: (x - w / 2).toFixed(1), y: (y - 15).toFixed(1), width: w.toFixed(1), height: 15, rx: 7.5 }, g);
      const t = el('text', { x: x.toFixed(1), y: (y - 4.5).toFixed(1), 'text-anchor': 'middle' }, g); t.textContent = texto;
    }

    function desenhar(svg, dados, qual) {
      svg.innerHTML = '';
      svg.setAttribute('aria-label', txt(ROTULO_SVG[qual]));
      const chao = el('g', { class: 'iso-chao' }, svg);
      for (let i = -16; i <= 34; i += 2) el('polyline', { points: pts([p(i, -30, 0), p(i, 22, 0)]) }, chao);
      for (let j = -30; j <= 22; j += 2) el('polyline', { points: pts([p(-16, j, 0), p(34, j, 0)]) }, chao);
      const desenho = el('g', {}, svg);
      const porId = Object.fromEntries(dados.blocos.map(b => [b.id, b]));
      dados.canos.forEach(([a, b, tipo]) => {
        const A = meio(porId[a]), B = meio(porId[b]);
        // Cano anda em x, depois em y. A linha fina (o mapa que orienta) vai reta: em L ela dobrava em cima
        // do Data Lake e parecia que o mapa e a carga chegavam nele.
        const linha = tipo === 'fino' ? [p(A[0], A[1], 0), p(B[0], B[1], 0)] : [p(A[0], A[1], 0), p(B[0], A[1], 0), p(B[0], B[1], 0)];
        el('polyline', { class: 'iso-cano' + (tipo ? ' ' + tipo : ''), points: pts(linha) }, desenho);
        if (!tipo || tipo === 'manual') pacotes.push({ linha, el: null, svg: desenho, manual: tipo === 'manual' });
      });
      dados.blocos.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(b => {
        const g = el('g', { class: 'iso-bloco' + (b.dono ? ' dono-' + b.dono : '') + (b.alerta ? ' alerta' : '') + (ativo === qual + ':' + b.id ? ' ativo' : ''), 'data-bloco': qual + ':' + b.id, tabindex: 0, role: 'button', 'aria-label': b.n + '. ' + txt(b.nome) }, desenho);
        el('polygon', { class: 'dir', points: pts([p(b.x + L, b.y, b.a), p(b.x + L, b.y + L, b.a), p(b.x + L, b.y + L, 0), p(b.x + L, b.y, 0)]) }, g);
        el('polygon', { class: 'esq', points: pts([p(b.x, b.y + L, b.a), p(b.x + L, b.y + L, b.a), p(b.x + L, b.y + L, 0), p(b.x, b.y + L, 0)]) }, g);
        el('polygon', { class: 'topo-face', points: pts([p(b.x, b.y, b.a), p(b.x + L, b.y, b.a), p(b.x + L, b.y + L, b.a), p(b.x, b.y + L, b.a)]) }, g);
        const c = p(b.x + L / 2, b.y + L / 2, b.a), largura = 2 * L * C * U * 0.78;
        const t = el('text', { class: 'rot-bloco', x: c[0].toFixed(1), y: (c[1] + 4).toFixed(1), 'text-anchor': 'middle' }, g); t.textContent = txt(b.nome); caber(t, largura, 11.5);
        // Número do passo na ponta esquerda da tampa (por fora do nome): a ordem de leitura sem precisar de legenda.
        const canto = p(b.x, b.y + L, b.a);
        const nb = el('g', { class: 'num-bloco' }, g);
        el('circle', { cx: (canto[0] - 4).toFixed(1), cy: canto[1].toFixed(1), r: 8.5 }, nb);
        const tn = el('text', { x: (canto[0] - 4).toFixed(1), y: (canto[1] + 3.5).toFixed(1), 'text-anchor': 'middle' }, nb); tn.textContent = b.n;
        const topo = p(b.x, b.y, b.a);
        if (b.dono || b.alerta) etiqueta(g, b.alerta ? 'e-alerta' : 'e-' + b.dono, topo[0], topo[1] - 6, b.alerta ? '!' : txt(DONO[b.dono]));
        if (dados.comeca === b.id) etiqueta(g, 'comeca', topo[0], topo[1] - 25, o.rotulos('comeca_aqui'));
      });
      const caixa = desenho.getBBox();
      svg.setAttribute('viewBox', `${(caixa.x - 18).toFixed(0)} ${(caixa.y - 14).toFixed(0)} ${(caixa.width + 36).toFixed(0)} ${(caixa.height + 28).toFixed(0)}`);
    }

    function montar() {
      pacotes = [];
      desenhar(o.svgAntes, ANTES, 'antes');
      desenhar(o.svgDepois, DEPOIS, 'depois');
      pacotes.forEach((pc, i) => { pc.el = el('circle', { class: 'pacote' + (pc.manual ? ' lento' : ''), r: 3.8 }, pc.svg); pc.fase = (i * 0.23) % 1; });
      mover(congelado ? 0.45 : (performance.now() / 2800) % 1);
    }
    function noCaminho(linha, f) {
      const seg = []; let tot = 0;
      for (let i = 0; i < linha.length - 1; i++) { const d = Math.hypot(linha[i + 1][0] - linha[i][0], linha[i + 1][1] - linha[i][1]); seg.push(d); tot += d; }
      let alvo = f * tot;
      for (let i = 0; i < seg.length; i++) {
        if (alvo <= seg[i]) { const k = seg[i] ? alvo / seg[i] : 0; return [linha[i][0] + (linha[i + 1][0] - linha[i][0]) * k, linha[i][1] + (linha[i + 1][1] - linha[i][1]) * k]; }
        alvo -= seg[i];
      }
      return linha[linha.length - 1];
    }
    // O "antes" anda devagar e engasga (pacote parado um tempo): era processo manual.
    function mover(t) {
      pacotes.forEach(pc => {
        let f = (t * (pc.manual ? 0.45 : 1) + pc.fase) % 1;
        if (pc.manual && f > 0.4 && f < 0.7) f = 0.4;
        const q = noCaminho(pc.linha, f);
        pc.el.setAttribute('cx', q[0].toFixed(1)); pc.el.setAttribute('cy', q[1].toFixed(1));
      });
    }
    function laco(t) { mover((t / 2800) % 1); requestAnimationFrame(laco); }

    // A janela flutua ao lado do bloco clicado, dentro do mesmo quadro (antes ou depois).
    // Tenta a direita; não cabendo, a esquerda; não cabendo nenhum dos dois, embaixo do bloco.
    // No celular o CSS a deixa parada embaixo do desenho, e aqui não se posiciona nada.
    function posicionar(g) {
      const figura = g.closest('.pipe-lado');
      if (card.parentElement !== figura) figura.appendChild(card);
      card.hidden = false;
      if (getComputedStyle(card).position !== 'absolute') return;
      const fr = figura.getBoundingClientRect(), br = g.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
      let x = br.right - fr.left + 10, y = br.top - fr.top + br.height / 2 - h / 2;
      if (x + w > fr.width - 8) x = br.left - fr.left - w - 10;
      if (x < 8) { x = br.left - fr.left + br.width / 2 - w / 2; y = br.bottom - fr.top + 8; }
      card.style.left = Math.max(8, Math.min(fr.width - w - 8, x)) + 'px';
      card.style.top = Math.max(8, Math.min(fr.height - h - 8, y)) + 'px';
    }
    function fechar() {
      ativo = null; card.hidden = true;
      document.querySelectorAll('.iso-bloco').forEach(g => g.classList.remove('ativo'));
    }

    function mostrar(chave) {
      ativo = chave;
      const [qual, id] = chave.split(':');
      const b = (qual === 'antes' ? ANTES : DEPOIS).blocos.find(x => x.id === id);
      if (!b) return;
      document.querySelectorAll('.iso-bloco').forEach(g => g.classList.toggle('ativo', g.dataset.bloco === chave));
      const r = o.rotulos;
      const dono = b.dono ? `<span class="dono-chip e-${b.dono}">${esc(txt(DONO[b.dono]))}</span>` : `<span class="dono-chip e-alerta">${esc(r('antes'))}</span>`;
      card.innerHTML = `<button class="pipe-fechar" type="button" aria-label="${esc(r('fechar'))}">✕</button><b><span class="pipe-num">${b.n}</span>${esc(txt(b.nome))} ${dono}</b>` + (qual === 'antes'
        ? `<span class="rotulo">${esc(r('como_era'))}</span><p>${esc(txt(b.oque))}</p><span class="rotulo">${esc(r('problema'))}</span><p>${esc(txt(b.problema))}</p>`
        : `<span class="rotulo">${esc(r('o_que'))}</span><p>${esc(txt(b.oque))}</p><span class="rotulo">${esc(r('por_que'))}</span><p>${esc(txt(b.porque))}</p><span class="rotulo">${esc(r('quem_cuida'))}</span><p>${esc(txt(b.quem))}</p>`);
      const g = document.querySelector(`.iso-bloco[data-bloco="${chave}"]`);
      if (g) posicionar(g);
    }
    [o.svgAntes, o.svgDepois].forEach(svg => {
      svg.addEventListener('click', e => { const g = e.target.closest('[data-bloco]'); if (g) mostrar(g.dataset.bloco); });
      svg.addEventListener('keydown', e => { const g = e.target.closest('[data-bloco]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mostrar(g.dataset.bloco); } });
    });
    card.addEventListener('click', e => { if (e.target.closest('.pipe-fechar')) fechar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) fechar(); });
    window.addEventListener('resize', () => { if (ativo) mostrar(ativo); });

    montar();
    if (!congelado) requestAnimationFrame(laco);
    return { idioma(l) { idioma = l === 'en' ? 'en' : 'pt'; montar(); if (ativo) mostrar(ativo); }, mostrar };
  }
  return { iniciar };
})();
