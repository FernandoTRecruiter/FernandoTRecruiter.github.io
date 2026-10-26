/* =============================================================================
   agentes.js: o "time" de agentes do Claude Code em órbita em volta de mim.

   Cada agente: tarefa fixa, o que ele NÃO pode fazer e (quando importa) o
   modelo. Rotina vai no modelo menor e mais barato; pergunta nova no maior.
   ============================================================================= */
window.Agentes = (function () {
  'use strict';
  const T = (pt, en) => ({ pt, en });
  const TIME = [
    { ic: '⚖', nome: T('Auditor ERP × Lake', 'ERP × Lake auditor'), curto: T('pergunta nova', 'new question'), modelo: 'Opus',
      faz: T('Pergunta nova: compara o número dos dois lados e devolve a consulta usada e a classe do achado.', 'New question: compares the number on both sides and returns the query used and the finding class.'),
      nao: T('Não escreve no ERP nem no Lake. Não mostra nome, CPF ou salário de ninguém.', 'Never writes to the ERP or the Lake. Never shows anyone\'s name, ID or salary.') },
    { ic: '✓', nome: T('Conferente semanal', 'Weekly checker'), curto: T('toda semana, depois da carga', 'every week, after the load'), modelo: 'Sonnet',
      faz: T('Roda a conferência fixa depois da carga e diz o que bate, o que já é conhecido, o que é novo e o que regrediu.', 'Runs the fixed checklist after the load and says what matches, what is known, what is new and what regressed.'),
      nao: T('Não inventa regra: pergunta nova vai para o auditor.', 'Never invents a rule: a new question goes to the auditor.') },
    { ic: '▣', nome: T('Conferente de telas', 'Screen checker'), curto: T('o número da tela', 'the number on screen'), modelo: 'Sonnet',
      faz: T('Lê o que cada gráfico mostra e recalcula na fonte, pela regra da casa.', 'Reads what each chart shows and recomputes it at the source, by our rule.'),
      nao: T('Não testa botão e não edita o painel.', 'Does not test buttons and never edits the dashboard.') },
    { ic: '⌘', nome: T('Testador de funções', 'Feature tester'), curto: T('clica em tudo', 'clicks everything'), modelo: 'Sonnet',
      faz: T('Usa o painel como uma pessoa: abas, filtros, busca, downloads, tema e idioma. Mede se a conta fecha ao ligar e limpar filtros.', 'Uses the dashboard like a person: tabs, filters, search, downloads, theme and language. Checks the math holds when filters go on and off.'),
      nao: T('Não confere número contra a fonte (isso é do conferente).', 'Does not check numbers against the source (that is the checker\'s job).') },
    { ic: '◎', nome: T('Testador cego de UX', 'Blind UX tester'), curto: T('sem ler o código', 'without reading code'), modelo: 'Sonnet',
      faz: T('Testa os outros apps com roteiro de pessoa ("você é um gestor...") e foto de cada passo.', 'Tests the other apps with a person\'s script ("you are a manager...") and a screenshot of every step.'),
      nao: T('Não escreve código, não publica, não mexe em dado real.', 'Never writes code, never publishes, never touches real data.') },
    { ic: '⎇', nome: T('Revisor de PR', 'PR reviewer'), curto: T('antes do TI', 'before IT'),
      faz: T('Lê a mudança antes de pedir revisão e barra o que o TI barraria: dado pessoal, descrição fora do padrão, teste sem número.', 'Reads the change before review and blocks what IT would block: personal data, off-standard description, tests without numbers.'),
      nao: T('Só lê. Não altera, não comita.', 'Read-only. Never edits, never commits.') },
    { ic: '✎', nome: T('Documentador', 'Documenter'), curto: T('fim de cada rodada', 'end of each round'),
      faz: T('Atualiza a documentação com o que mudou, sem inventar nada que não esteja na entrada.', 'Updates the docs with what changed, inventing nothing that is not in the input.'),
      nao: T('Não publica e não mexe em código.', 'Never publishes and never touches code.') },
    { ic: '?', nome: T('Redator de pergunta', 'Question writer'), curto: T('decisão pendente', 'pending decision'),
      faz: T('Transforma decisão pendente em pergunta fechada: contexto com número, opções com consequência e uma recomendação.', 'Turns a pending decision into a closed question: context with a number, options with consequences and one recommendation.'),
      nao: T('Não decide por mim.', 'Never decides for me.') }
  ];

  function iniciar(orbita, painel, rotulos) {
    let idioma = 'pt', ativo = -1;
    const txt = v => v[idioma];
    function montar() {
      const larg = orbita.clientWidth || 700, alt = Math.max(orbita.clientHeight, 520);
      const cx = larg / 2, cy = alt / 2, rx = Math.min(larg * 0.37, 300), ry = alt * 0.38;
      const pos = TIME.map((_, i) => { const a = -Math.PI / 2 + i * (2 * Math.PI / TIME.length); return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
      orbita.innerHTML = `<svg aria-hidden="true">${pos.map((p, i) => `<line class="linha-ag${i === ativo ? ' acesa' : ''}" x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}"/>`).join('')}</svg>` +
        `<div class="centro-eu" style="left:${cx}px;top:${cy}px"><span><b>${rotulos('eu')}</b>${rotulos('decido')}</span></div>` +
        TIME.map((a, i) => `<button class="ag${i === ativo ? ' ativo' : ''}" data-ag="${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px"><span class="ag-ic">${a.ic}</span><b>${txt(a.nome)}</b><span>${txt(a.curto)}</span></button>`).join('');
      if (ativo < 0) painel.innerHTML = `<p>${rotulos('clique_agente')}</p>`;
      else mostrar(ativo);
    }
    function mostrar(i) {
      ativo = i;
      const a = TIME[i];
      orbita.querySelectorAll('.ag').forEach((b, k) => b.classList.toggle('ativo', k === i));
      orbita.querySelectorAll('.linha-ag').forEach((l, k) => l.classList.toggle('acesa', k === i));
      painel.innerHTML = `<b>${a.ic} ${txt(a.nome)}</b>` + (a.modelo ? `<span class="mono" style="font-size:12px;color:var(--tx3)">${rotulos('modelo')}: ${a.modelo}</span>` : '') +
        `<span class="rotulo">${rotulos('o_que')}</span><p>${txt(a.faz)}</p><span class="rotulo">${rotulos('nao_faz')}</span><p>${txt(a.nao)}</p>`;
    }
    orbita.addEventListener('click', e => { const b = e.target.closest('[data-ag]'); if (b) mostrar(Number(b.dataset.ag)); });
    window.addEventListener('resize', montar);
    montar();
    return { idioma(l) { idioma = l === 'en' ? 'en' : 'pt'; montar(); }, mostrar, montar };
  }
  return { iniciar, TIME };
})();
