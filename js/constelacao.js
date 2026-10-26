/* =============================================================================
   constelacao.js: a esfera 3D da abertura (projetos ligados às ferramentas).

   Feita à mão num <canvas>, sem biblioteca 3D: cada ponto tem x, y, z numa
   esfera; a cada quadro giramos a esfera e projetamos na tela com perspectiva
   (o que está perto fica maior e mais forte). Arrastar gira; clicar num
   projeto leva até a janela dele.
   ============================================================================= */
window.Constelacao = (function () {
  'use strict';
  // Projetos (p) e ferramentas (s). "janela" = para onde o clique leva.
  const NOS = [
    { id: 'painel', nome: { pt: 'Dashboard', en: 'Dashboard' }, t: 'p', janela: 'j-painel' },
    { id: 'gestor', nome: { pt: 'Painel do gestor', en: 'Manager view' }, t: 'p', janela: 'j-painel' },
    { id: 'lake', nome: 'Data Lake', t: 'p', janela: 'j-pipeline' },
    { id: 'pa', nome: 'Power Automate', t: 'p', janela: 'j-fluxos' },
    { id: 'agentes', nome: { pt: 'Agentes de IA', en: 'AI agents' }, t: 'p', janela: 'j-agentes' },
    { id: 'graphify', nome: 'Graphify', t: 'p', janela: 'j-repos' },
    { id: 'cargos', nome: { pt: 'Gestão de cargos', en: 'Job management' }, t: 'p', janela: 'j-repos' },
    { id: 'organo', nome: { pt: 'Organograma', en: 'Org chart' }, t: 'p', janela: 'j-repos' },
    { id: 'portal', nome: { pt: 'Portal do colaborador', en: 'Employee portal' }, t: 'p', janela: 'j-repos' },
    { id: 'bday', nome: 'Birthday Bot', t: 'p', janela: 'j-repos' },
    { id: 'org', nome: { pt: 'Organograma DAX', en: 'DAX org chart' }, t: 'p', janela: 'j-repos' },
    { id: 'sql', nome: 'SQL', t: 's' }, { id: 'python', nome: 'Python', t: 's' }, { id: 'polars', nome: 'Polars', t: 's' },
    { id: 'adf', nome: 'Data Factory', t: 's' }, { id: 'azsql', nome: 'Azure SQL', t: 's' }, { id: 'erp', nome: 'ERP', t: 's' },
    { id: 'supa', nome: 'Supabase', t: 's' }, { id: 'js', nome: 'JavaScript', t: 's' }, { id: 'html', nome: 'HTML · CSS', t: 's' },
    { id: 'svg', nome: 'SVG · Canvas', t: 's' }, { id: 'd3', nome: 'D3.js', t: 's' }, { id: 'pbi', nome: 'Power BI', t: 's' },
    { id: 'dax', nome: 'DAX', t: 's' }, { id: 'sp', nome: 'SharePoint', t: 's' }, { id: 'teams', nome: 'Teams', t: 's' },
    { id: 'outlook', nome: 'Outlook', t: 's' }, { id: 'approvals', nome: 'Approvals', t: 's' }, { id: 'gas', nome: 'Apps Script', t: 's' },
    { id: 'claude', nome: 'Claude Code', t: 's' }, { id: 'git', nome: 'Git', t: 's' }, { id: 'devops', nome: 'Azure DevOps', t: 's' },
    { id: 'peopleA', nome: 'People Analytics', t: 's' }, { id: 'ats', nome: 'ATS', t: 's' }, { id: 'rs', nome: { pt: 'Recrutamento', en: 'Recruiting' }, t: 's' },
    { id: 'hooks', nome: 'Hooks', t: 's' }, { id: 'mcp', nome: 'MCP', t: 's' }
  ];
  const LIGA = {
    painel: ['js', 'html', 'svg', 'supa', 'peopleA', 'python', 'claude', 'git', 'pbi'],
    gestor: ['js', 'html', 'supa', 'peopleA', 'python', 'painel'],
    lake: ['sql', 'python', 'polars', 'adf', 'azsql', 'erp', 'ats', 'devops', 'git', 'peopleA'],
    pa: ['sp', 'teams', 'outlook', 'approvals', 'supa'],
    agentes: ['claude', 'hooks', 'mcp', 'sql', 'lake', 'painel'],
    graphify: ['python', 'd3', 'claude', 'hooks', 'js'],
    cargos: ['js', 'html', 'svg', 'peopleA', 'rs', 'organo'],
    organo: ['js', 'svg', 'html', 'peopleA', 'org'],
    portal: ['html', 'js', 'sp', 'rs'],
    bday: ['gas', 'js', 'rs'],
    org: ['pbi', 'dax', 'html', 'rs', 'sp']
  };

  function iniciar(canvas, opcoes) {
    const ctx = canvas.getContext('2d');
    const congelado = /[?&]foto=1/.test(location.search);
    const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dica = document.createElement('div');
    dica.className = 'dica3d';
    canvas.parentElement.appendChild(dica);

    // Passo 1: posições na esfera (espiral de Fibonacci = pontos bem espalhados).
    // Projetos e ferramentas ganham cada um a sua esfera: projetos numa casca de
    // dentro (raio 0,62) e ferramentas na de fora. Assim nenhum grupo se amontoa.
    const ouro = Math.PI * (3 - Math.sqrt(5));
    ['p', 's'].forEach(tipo => {
      const grupo = NOS.filter(no => no.t === tipo), n = grupo.length, k = tipo === 'p' ? 0.62 : 1;
      grupo.forEach((no, i) => {
        const y = 1 - ((i + 0.5) / n) * 2, raio = Math.sqrt(1 - y * y), th = ouro * i + (tipo === 'p' ? 0.9 : 0);
        no.x = Math.cos(th) * raio * k; no.y = y * k; no.z = Math.sin(th) * raio * k;
      });
    });
    const porId = Object.fromEntries(NOS.map(no => [no.id, no]));
    const arestas = [];
    Object.entries(LIGA).forEach(([a, lista]) => lista.forEach(b => arestas.push([porId[a], porId[b]])));

    let ay = 0.6, ax = -0.28, vy = calmo ? 0 : 0.0032, vx = 0;
    let arrastando = false, ultimo = null, foco = null, cores = {}, larg = 0, alt = 0, visivel = true, idioma = 'pt';

    function lerCores() {
      const cs = getComputedStyle(document.documentElement);
      cores = { acc: cs.getPropertyValue('--acc').trim(), tx: cs.getPropertyValue('--tx').trim(), tx3: cs.getPropertyValue('--tx3').trim(), borda: cs.getPropertyValue('--borda2').trim(), fundo: cs.getPropertyValue('--fundo').trim() };
    }
    function medir() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      larg = r.width; alt = r.height;
      canvas.width = Math.round(larg * dpr); canvas.height = Math.round(alt * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const nomeDe = no => typeof no.nome === 'string' ? no.nome : no.nome[idioma];

    // Passo 2: girar e projetar. z positivo = mais perto de quem olha.
    function projetar() {
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      const R = Math.min(larg, alt) * 0.37, d = 3.2;
      NOS.forEach(no => {
        const x1 = no.x * cy + no.z * sy, z1 = -no.x * sy + no.z * cy;
        const y2 = no.y * cx - z1 * sx, z2 = no.y * sx + z1 * cx;
        const s = d / (d - z2);
        no.sx = larg / 2 + x1 * R * s; no.sy = alt / 2 + y2 * R * s; no.sz = z2; no.s = s;
      });
    }
    const ligado = (a, b) => (LIGA[a.id] || []).includes(b.id) || (LIGA[b.id] || []).includes(a.id);

    // Passo 2b: quem ganha nome escrito. Primeiro o ponto sob o mouse e os ligados a ele, depois os
    // projetos e por último as ferramentas, sempre do mais perto para o mais longe. Um nome que
    // encostaria num já aceito fica escondido até a esfera girar (com 11 projetos, eles se atropelavam).
    function escolherRotulos() {
      const caixas = [];
      const cabe = c => !caixas.some(o => c.x0 < o.x1 && c.x1 > o.x0 && c.y0 < o.y1 && c.y1 > o.y0);
      const forcado = no => !!foco && (no === foco || ligado(no, foco));
      const ordem = no => (forcado(no) ? 0 : no.t === 'p' ? 1 : 2);
      NOS.forEach(no => { no.rotulo = false; });
      NOS.filter(no => no.t === 'p' || no.sz > 0.62 || forcado(no))
        .sort((a, b) => ordem(a) - ordem(b) || b.sz - a.sz)
        .forEach(no => {
          const p = no.t === 'p', tam = p ? Math.round(12 * Math.min(no.s, 1.25)) : Math.round(11 * Math.min(no.s, 1.2));
          ctx.font = p ? `600 ${tam}px "DM Sans", system-ui, sans-serif` : `500 ${tam}px "DM Mono", ui-monospace, monospace`;
          const w = ctx.measureText(nomeDe(no)).width, base = p ? no.sy - 6.5 * no.s - 9 : no.sy + 15 * no.s;
          const c = { x0: no.sx - w / 2 - 3, x1: no.sx + w / 2 + 3, y0: base - tam, y1: base + 3 };
          if (forcado(no) || cabe(c)) { no.rotulo = true; caixas.push(c); }
        });
    }

    function desenhar() {
      projetar();
      escolherRotulos();
      ctx.clearRect(0, 0, larg, alt);
      // arestas primeiro (ficam atrás dos pontos)
      arestas.forEach(([a, b]) => {
        const aceso = foco && (a === foco || b === foco);
        const prof = ((a.sz + b.sz) / 2 + 1) / 2;
        ctx.strokeStyle = aceso ? cores.acc : cores.borda;
        ctx.globalAlpha = aceso ? 0.95 : (foco ? 0.12 : 0.18 + prof * 0.45);
        ctx.lineWidth = aceso ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      });
      // pontos do fundo para a frente; os nomes ficam guardados e vão por último, por cima de todos
      // os pontos (senão o ponto de um projeto mais à frente cobria o nome de outro)
      const textos = [];
      // Contorno da cor do fundo atrás de cada nome: o ponto que estiver atrás não aparece entre as letras.
      const contorno = (texto, x, y) => { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = cores.fundo; ctx.strokeText(texto, x, y); };
      NOS.slice().sort((a, b) => a.sz - b.sz).forEach(no => {
        const prof = (no.sz + 1) / 2, perto = foco && (no === foco || ligado(no, foco));
        const apagado = foco && !perto;
        ctx.globalAlpha = apagado ? 0.18 : 0.35 + prof * 0.65;
        if (no.t === 'p') {
          const r = 6.5 * no.s;
          ctx.fillStyle = cores.acc;
          ctx.beginPath(); ctx.arc(no.sx, no.sy, r + 6 * no.s, 0, Math.PI * 2); ctx.globalAlpha *= 0.18; ctx.fill();
          ctx.globalAlpha = apagado ? 0.25 : 0.55 + prof * 0.45;
          ctx.beginPath(); ctx.arc(no.sx, no.sy, r, 0, Math.PI * 2); ctx.fill();
          if (no.rotulo) {
            const alfa = ctx.globalAlpha;
            textos.push(() => {
              ctx.globalAlpha = alfa; ctx.fillStyle = cores.tx; ctx.textAlign = 'center';
              ctx.font = `600 ${Math.round(12 * Math.min(no.s, 1.25))}px "DM Sans", system-ui, sans-serif`;
              contorno(nomeDe(no), no.sx, no.sy - r - 9);
              ctx.fillText(nomeDe(no), no.sx, no.sy - r - 9);
            });
          }
        } else {
          ctx.fillStyle = perto ? cores.acc : cores.tx3;
          ctx.beginPath(); ctx.arc(no.sx, no.sy, 3.2 * no.s, 0, Math.PI * 2); ctx.fill();
          if (no.rotulo) {
            const alfa = apagado ? 0.2 : (perto ? 1 : (no.sz - 0.62) * 2.2);
            textos.push(() => {
              ctx.globalAlpha = alfa; ctx.fillStyle = perto ? cores.tx : cores.tx3; ctx.textAlign = 'center';
              ctx.font = `500 ${Math.round(11 * Math.min(no.s, 1.2))}px "DM Mono", ui-monospace, monospace`;
              contorno(nomeDe(no), no.sx, no.sy + 15 * no.s);
              ctx.fillText(nomeDe(no), no.sx, no.sy + 15 * no.s);
            });
          }
        }
      });
      textos.forEach(escrever => escrever());
      ctx.globalAlpha = 1;
    }

    // Passo 3: o laço de animação (para quando a esfera sai da tela).
    let antes = performance.now();
    function quadro(t) {
      const dt = Math.min(48, t - antes); antes = t;
      if (!arrastando) { ay += vy * dt / 16; ax += vx * dt / 16; vx *= 0.94; ax = Math.max(-1.1, Math.min(1.1, ax)); if (!calmo) vy += (0.0032 - vy) * 0.02; }
      desenhar();
      if (visivel) requestAnimationFrame(quadro);
    }

    // Passo 4: mouse e toque.
    function perto(x, y) {
      let melhor = null, dist = 18;
      NOS.forEach(no => { const d = Math.hypot(no.sx - x, no.sy - y); if (d < dist + (no.t === 'p' ? 6 : 0) && (!melhor || no.sz > melhor.sz)) { melhor = no; dist = d; } });
      return melhor;
    }
    function posicao(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    canvas.addEventListener('pointerdown', e => { arrastando = true; ultimo = posicao(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      const [x, y] = posicao(e);
      if (arrastando && ultimo) {
        vy = (x - ultimo[0]) * 0.006; vx = (y - ultimo[1]) * 0.006;
        ay += vy; ax = Math.max(-1.1, Math.min(1.1, ax + vx)); ultimo = [x, y];
        if (congelado || calmo) desenhar();
        return;
      }
      foco = perto(x, y);
      canvas.style.cursor = foco && foco.t === 'p' ? 'pointer' : 'grab';
      if (foco) { dica.textContent = nomeDe(foco); dica.style.left = foco.sx + 'px'; dica.style.top = foco.sy + 'px'; dica.classList.add('visivel'); }
      else dica.classList.remove('visivel');
      if (congelado || calmo) desenhar();
    });
    canvas.addEventListener('pointerup', e => {
      const [x, y] = posicao(e);
      const moveu = ultimo && Math.hypot(x - ultimo[0], y - ultimo[1]) > 3;
      arrastando = false; ultimo = null;
      const no = perto(x, y);
      if (!moveu && no && no.janela && opcoes && opcoes.aoClicar) opcoes.aoClicar(no.janela);
    });
    canvas.addEventListener('pointerleave', () => { foco = null; dica.classList.remove('visivel'); arrastando = false; });

    lerCores(); medir();
    window.addEventListener('resize', () => { medir(); desenhar(); });
    if (congelado) { desenhar(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visivel) { visivel = true; antes = performance.now(); requestAnimationFrame(quadro); } visivel = v; }).observe(canvas);
      requestAnimationFrame(quadro);
    } else requestAnimationFrame(quadro);

    return {
      // Para os testes: onde cada ponto está na tela agora.
      nos: () => NOS.map(no => ({ id: no.id, t: no.t, x: no.sx, y: no.sy, z: no.sz })),
      tema() { lerCores(); desenhar(); },
      idioma(l) { idioma = l === 'en' ? 'en' : 'pt'; desenhar(); }
    };
  }
  return { iniciar };
})();
