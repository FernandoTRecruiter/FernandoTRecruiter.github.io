/* =============================================================================
   fluxos.js: os fluxos do Power Automate redesenhados como fluxograma (SVG).

   Cada fluxo é uma lista de passos: gatilho -> ações -> uma condição com dois
   ramos (sim / não) -> passos depois da condição (opcional). Uma "ficha" anda
   pelo caminho e acende cada passo; a cada volta ela pega o outro ramo, para
   mostrar os dois desfechos. Nenhum dado de empresa: só o desenho da lógica.
   ============================================================================= */
window.Fluxos = (function () {
  'use strict';
  const T = (pt, en) => ({ pt, en });
  const FLUXOS = [
    { id: 'aprov', aba: T('Aprovação de conteúdo', 'Content approval'),
      passos: [
        { ic: 'SP', t: T('Item novo na lista', 'New list item'), s: T('card ou evento no SharePoint', 'card or event on SharePoint'), gatilho: true },
        { ic: 'AP', t: T('Pedir aprovação', 'Request approval'), s: T('o RH aprova ou devolve', 'HR approves or returns') },
        { cond: T('Aprovado?', 'Approved?'),
          sim: [{ ic: 'SP', t: T('Publicar', 'Publish'), s: T('o status muda na lista', 'status changes on the list') }, { ic: 'TM', t: T('Avisar no Teams', 'Notify on Teams'), s: T('quem pediu fica sabendo', 'the requester is told') }],
          nao: [{ ic: 'OL', t: T('Devolver com comentário', 'Return with comment'), s: T('e-mail para quem pediu', 'email to the requester') }] }
      ],
      oque: T('Conteúdo do portal de RH só vai ao ar aprovado.', 'HR portal content only goes live once approved.'),
      porque: T('A aprovação era por e-mail e se perdia. Agora tem dono, prazo e histórico.', 'Approval used to happen by email and got lost. Now it has an owner, a deadline and a history.'),
      aprendi: T('Um fluxo irmão manda um lembrete diário das pendências: aprovação parada é o problema mais comum.', 'A sibling flow sends a daily reminder of pending items: a stalled approval is the most common problem.') },
    { id: 'http', aba: T('Aviso do app (HTTP)', 'App alert (HTTP)'),
      passos: [
        { ic: 'HTTP', t: T('Pedido HTTP recebido', 'HTTP request received'), s: T('o app manda o aviso pronto', 'the app sends the ready alert'), gatilho: true },
        { ic: '1×', t: T('Um disparo por vez', 'One run at a time'), s: T('as mensagens chegam na ordem', 'messages arrive in order') },
        { cond: T('Canal?', 'Channel?'), simRot: T('chat', 'chat'), naoRot: T('e-mail', 'email'),
          sim: [{ ic: 'TM', t: T('Postar no chat', 'Post to chat'), s: T('Teams, como bot', 'Teams, as a bot') }],
          nao: [{ ic: 'OL', t: T('Enviar e-mail', 'Send email'), s: T('assinado pela caixa do RH', 'signed by the HR mailbox') }] },
        { ic: '202', t: T('Responder 202', 'Reply 202'), s: T('aceito, não entregue', 'accepted, not delivered') }
      ],
      oque: T('O app decide e escreve o aviso; o fluxo só entrega.', 'The app decides and writes the alert; the flow only delivers it.'),
      porque: T('Regra no app, entrega no Power Automate: dá para trocar o canal sem mexer no app.', 'Rules in the app, delivery in Power Automate: the channel can change without touching the app.'),
      aprendi: T('O aviso sai depois de gravar e falha é silêncio: o aviso nunca desfaz a decisão.', 'The alert goes out after saving and failure is silent: an alert never undoes the decision.') },
    { id: 'org', aba: T('Organograma: já começou?', 'Org chart: started yet?'),
      passos: [
        { ic: '⏰', t: T('Todo dia de madrugada', 'Every day before dawn'), s: T('recorrência', 'recurrence'), gatilho: true },
        { ic: 'SP', t: T('Buscar quem começa', 'Find who starts'), s: T('começa até hoje, ainda "não"', 'starts by today, still "no"') },
        { cond: T('Achou alguém?', 'Anyone found?'),
          sim: [{ ic: 'SP', t: T('Marcar "já iniciou"', 'Mark "started"'), s: T('aparece no organograma', 'shows on the org chart') }],
          nao: [{ ic: '·', t: T('Nada a fazer', 'Nothing to do'), s: T('fim da execução', 'end of run') }] }
      ],
      oque: T('O organograma mostra a pessoa no primeiro dia, sem ninguém lembrar.', 'The org chart shows the person on day one, without anyone remembering.'),
      porque: T('Alguém atualizava à mão e o novo colaborador aparecia uma semana depois.', 'Someone updated it by hand and new employees showed up a week late.'),
      aprendi: T('Filtrar no pedido (filtro OData) e não depois: a lista já devolve só o que serve.', 'Filter in the request (OData filter), not afterwards: the list returns only what matters.') },
    { id: 'news', aba: T('News de aniversariantes', 'Birthday newsletter'),
      passos: [
        { ic: '⏰', t: T('Último dia útil do mês', 'Last business day'), s: T('recorrência', 'recurrence'), gatilho: true },
        { ic: 'PY', t: T('Gerar as artes', 'Generate the art'), s: T('script monta os cards', 'a script builds the cards') },
        { ic: 'TM', t: T('Avisar que estão prontas', 'Announce they are ready'), s: T('Teams, para revisão', 'Teams, for review') },
        { cond: T('Aprovaram até o dia 1?', 'Approved by day 1?'),
          sim: [{ ic: 'SP', t: T('Publicar a news', 'Publish the newsletter'), s: T('página do portal', 'portal page') }],
          nao: [{ ic: 'SP', t: T('Rascunho de reserva', 'Fallback draft'), s: T('ninguém fica sem news', 'nobody goes without it') }] }
      ],
      oque: T('A news de aniversariantes do mês se monta sozinha.', "The month's birthday newsletter builds itself."),
      porque: T('Era uma tarde inteira de trabalho manual todo fim de mês.', 'It used to take a full afternoon of manual work every month.'),
      aprendi: T('Toda automação ganha um plano B: se a aprovação não vier, sai o rascunho.', "Every automation gets a plan B: if approval doesn't come, the draft goes out.") }
  ];
  const W = 214, H = 54, GAP = 30, CX = 280, LADO = 134, LARG = 560;

  function iniciar(svg, abas, nota, rotulos) {
    const ns = 'http://www.w3.org/2000/svg';
    const congelado = /[?&]foto=1/.test(location.search) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let idioma = 'pt', atual = 0, nos = [], rotas = [], volta = 0, inicio = performance.now();
    const txt = v => (typeof v === 'string' ? v : v[idioma]);
    const el = (tag, at, pai) => { const e = document.createElementNS(ns, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); (pai || svg).appendChild(e); return e; };

    function caixa(passo, x, y) {
      const g = el('g', { class: 'fx-no' + (passo.gatilho ? ' gatilho' : '') });
      el('rect', { x, y, width: W, height: H, rx: 12 }, g);
      const ic = el('g', { class: 'fx-ic' }, g);
      el('rect', { x: x + 10, y: y + 13, width: 30, height: 28, rx: 8 }, ic);
      const ti = el('text', { x: x + 25, y: y + 31, 'text-anchor': 'middle' }, ic); ti.textContent = passo.ic;
      const t = el('text', { class: 'fx-t', x: x + 50, y: y + 24 }, g); t.textContent = txt(passo.t);
      const s = el('text', { class: 'fx-s', x: x + 50, y: y + 40 }, g); s.textContent = txt(passo.s);
      const no = { g, cx: x + W / 2, cy: y + H / 2, topo: [x + W / 2, y], base: [x + W / 2, y + H] };
      nos.push(no);
      return no;
    }
    const linha = (a, b) => el('path', { class: 'fx-linha', d: `M${a[0]},${a[1]} L${a[0]},${(a[1] + b[1]) / 2} L${b[0]},${(a[1] + b[1]) / 2} L${b[0]},${b[1]}`, 'marker-end': 'url(#seta)' });

    function montar() {
      svg.innerHTML = ''; nos = []; rotas = [[], []];
      const f = FLUXOS[atual];
      const defs = el('defs');
      const m = el('marker', { id: 'seta', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--borda2)' }, m);
      let y = 12, ultimo = null, finais = null;
      f.passos.forEach(p => {
        if (!p.cond) {
          const no = caixa(p, CX - W / 2, y);
          if (finais) finais.forEach(fm => linha(fm.base, no.topo));
          else if (ultimo) linha(ultimo.base, no.topo);
          rotas.forEach(r => r.push(no));
          ultimo = no; finais = null; y += H + GAP;
          return;
        }
        // Condição: losango no meio, ramo "sim" à esquerda e "não" à direita.
        const cy = y + 36;
        const los = el('polygon', { class: 'fx-losango', points: `${CX},${y} ${CX + 82},${cy} ${CX},${y + 72} ${CX - 82},${cy}` });
        const lt = el('text', { class: 'fx-t', x: CX, y: cy + 4, 'text-anchor': 'middle' }); lt.textContent = txt(p.cond);
        if (ultimo) linha(ultimo.base, [CX, y]);
        const noCond = { g: { classList: los.classList }, cx: CX, cy, base: [CX, y + 72] };
        rotas.forEach(r => r.push(noCond));
        let yb = y + 72 + GAP + 6;
        const ramos = [['sim', -1], ['nao', 1]];
        finais = [];
        ramos.forEach(([chave, lado], k) => {
          let yy = yb, prev = null;
          const rot = el('text', { class: 'fx-ramo', x: CX + lado * 104, y: cy - 10, 'text-anchor': 'middle' });
          rot.textContent = txt(p[chave + 'Rot'] || (chave === 'sim' ? rotulos('sim') : rotulos('nao')));
          p[chave].forEach((q, i) => {
            const no = caixa(q, CX + lado * LADO - W / 2, yy);
            if (i === 0) el('path', { class: 'fx-linha', d: `M${CX + lado * 82},${cy} L${CX + lado * LADO},${cy} L${CX + lado * LADO},${yy}`, 'marker-end': 'url(#seta)' });
            else linha(prev.base, no.topo);
            rotas[k].push(no); prev = no; yy += H + GAP;
          });
          finais.push(prev);
          y = Math.max(y, yy);
        });
        ultimo = null;
      });
      svg.setAttribute('viewBox', `0 0 ${LARG} ${y + 4}`);
      svg.setAttribute('aria-label', txt(f.aba));
      ficha = el('circle', { class: 'fx-ficha', r: 6 });
      nota.innerHTML = `<b>${txt(f.aba)}</b><span class="rotulo">${rotulos('o_que')}</span>${txt(f.oque)}<span class="rotulo">${rotulos('por_que')}</span>${txt(f.porque)}<span class="rotulo">${rotulos('aprendi')}</span>${txt(f.aprendi)}`;
      abas.innerHTML = FLUXOS.map((x, i) => `<button role="tab" aria-selected="${i === atual}" class="${i === atual ? 'ativo' : ''}" data-fluxo="${i}">${txt(x.aba)}</button>`).join('');
      if (congelado) passo(0.62, 0);
    }

    // A ficha anda de passo em passo na rota da volta atual (sim nas pares, não nas ímpares).
    let ficha = null;
    function passo(f, rotaIdx) {
      const rota = rotas[rotaIdx];
      if (!rota || rota.length < 2 || !ficha) return;
      const pos = f * (rota.length - 1), i = Math.min(Math.floor(pos), rota.length - 2), k = pos - i;
      const a = rota[i], b = rota[i + 1];
      ficha.setAttribute('cx', a.cx + (b.cx - a.cx) * k);
      ficha.setAttribute('cy', a.cy + (b.cy - a.cy) * k);
      nos.concat(rotas[0], rotas[1]).forEach(n => n.g.classList.remove('aceso'));
      rota.slice(0, i + (k > 0.5 ? 2 : 1)).forEach(n => n.g.classList.add('aceso'));
    }
    function laco(t) {
      const dur = 5200, f = ((t - inicio) % dur) / dur, v = Math.floor((t - inicio) / dur);
      if (v !== volta) volta = v;
      passo(Math.min(1, f * 1.15), volta % 2);
      requestAnimationFrame(laco);
    }
    abas.addEventListener('click', e => { const b = e.target.closest('[data-fluxo]'); if (b) { atual = Number(b.dataset.fluxo); inicio = performance.now(); volta = 0; montar(); } });

    montar();
    if (!congelado) requestAnimationFrame(laco);
    return { idioma(l) { idioma = l === 'en' ? 'en' : 'pt'; montar(); } };
  }
  return { iniciar, FLUXOS };
})();
