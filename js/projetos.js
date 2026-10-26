/* =============================================================================
   projetos.js: a lista de projetos da janela "repositórios abertos".

   PARA ACRESCENTAR UM PROJETO: copie um bloco, troque os campos e ponha a
   miniatura em img/projetos/ (JPG de 900 x 562). Nada mais precisa mudar.
     pasta   = nome da pasta/repositório (vira o link do GitHub e do Pages)
     pages   = true se o projeto tem página no ar (GitHub Pages)
     caminho = trecho do endereço no Pages, quando não for a raiz da pasta
     chips   = nomes de ferramenta (texto) ou { pt, en } quando muda com a língua
   ============================================================================= */
window.PROJETOS = [
  {
    pasta: 'people-analytics-dashboard', pages: true, imagem: 'img/projetos/dashboard.jpg',
    titulo: { pt: 'Dashboard executivo de pessoas', en: 'Executive people dashboard' },
    desc: { pt: 'Indicadores que mostram a conta, modo tabela com os nomes por trás de cada barra, mapa da unidade e um modo para rodar dentro do Power BI.',
      en: 'Indicators that show their math, a table mode with the names behind every bar, a site map and a mode to run inside Power BI.' },
    chips: ['JavaScript', 'SVG', 'Power BI']
  },
  {
    pasta: 'gerenciamento-de-cargos', pages: true, imagem: 'img/projetos/cargos.jpg',
    titulo: { pt: 'Gerenciamento de cargos', en: 'Job management' },
    desc: { pt: 'Catálogo de cargos com faixas por grade, mapa de carreiras, a ficha de cada cargo e o pedido de cargo novo numa página em etapas, até a aprovação.',
      en: 'A job catalog with pay ranges by grade, a career map, a sheet for each role and a step-by-step page to request a new role, through approval.' },
    chips: ['JavaScript', 'SVG', { pt: 'RH', en: 'HR' }]
  },
  {
    pasta: 'organograma-institucional-2', pages: true, imagem: 'img/projetos/organo.jpg',
    titulo: { pt: 'Organograma institucional 2', en: 'Institutional org chart 2' },
    desc: { pt: 'A versão 2 do meu organograma em DAX, refeita para o navegador: busca que abre o caminho até a pessoa, vagas tracejadas, aniversariantes, CSV próprio e um modo Power BI.',
      en: 'Version 2 of my DAX org chart, rebuilt for the browser: search that opens the path to the person, dashed open positions, birthdays, your own CSV and a Power BI mode.' },
    chips: ['JavaScript', 'SVG', 'Power BI']
  },
  {
    pasta: 'portal-do-colaborador', pages: true, imagem: 'img/projetos/portal.jpg',
    titulo: { pt: 'Portal do colaborador', en: 'Employee portal' },
    desc: { pt: 'Portal de RH em uma página: busca, calendário que calcula as datas e um modo admin para o RH editar sem tocar no código.',
      en: 'A one-page HR portal: search, a calendar that computes dates and an admin mode so HR can edit without touching code.' },
    chips: ['HTML', 'JavaScript', { pt: 'Modo admin', en: 'Admin mode' }]
  },
  {
    pasta: 'claude-graphify-template', pages: true, caminho: 'demo/', imagem: 'img/projetos/graphify.jpg',
    titulo: { pt: 'Claude Graphify (template)', en: 'Claude Graphify (template)' },
    desc: { pt: 'O mapa do cérebro do Claude Code que eu uso no dia a dia, com uma simulação interativa para ver sem instalar.',
      en: 'The map of Claude Code\'s brain I use every day, with an interactive simulation you can try without installing.' },
    chips: ['Python', 'D3.js', 'Claude Code']
  },
  {
    pasta: 'alcova-flat-executivo', pages: true, imagem: 'img/projetos/alcova.jpg',
    titulo: { pt: 'Site de flat executivo', en: 'Executive flat website' },
    desc: { pt: 'Projeto paralelo: site de aluguel por temporada pensado para converter, com preço na hora, regras em 6 pontos e modo admin.',
      en: 'Side project: a long-stay rental site built to convert, with instant pricing, rules in 6 points and an admin mode.' },
    chips: ['HTML', 'CSS', 'JavaScript']
  },
  {
    pasta: 'financas-pessoais', pages: true, imagem: 'img/projetos/financas.jpg',
    titulo: { pt: 'Finanças pessoais', en: 'Personal finance' },
    desc: { pt: 'Projeto paralelo: app de finanças para o celular que abre no teclado, lança o gasto em dois toques ou pela foto da notinha e mostra quanto dá para gastar hoje, com histórico filtrável e calculadoras. Os dados ficam só no navegador.',
      en: 'Side project: a phone finance app that opens on the keypad, logs a spend in two taps or from a photo of the receipt and shows how much you can spend today, with a filterable history and calculators. The data never leaves the browser.' },
    chips: ['HTML', 'JavaScript', { pt: 'Privacidade', en: 'Privacy' }]
  },
  {
    pasta: 'geometry-reaper', pages: true, imagem: 'img/projetos/reaper.jpg',
    titulo: { pt: 'Geometry Reaper (jogo)', en: 'Geometry Reaper (game)' },
    desc: { pt: 'Projeto paralelo de game design: 4 naves, 15 habilidades, chefões e música gerada no navegador. Todo número do jogo mora num lugar só, e um robô mede cada ajuste.',
      en: 'Game design side project: 4 ships, 15 skills, bosses and music generated in the browser. Every number lives in one place, and a bot measures each tweak.' },
    chips: ['Canvas', 'JavaScript', 'Game design']
  },
  {
    pasta: 'Automation.HappyBirthday.Static', pages: false, imagem: 'img/projetos/birthday.jpg',
    titulo: { pt: 'Robô de aniversário', en: 'Birthday bot' },
    desc: { pt: 'E-mail de parabéns automático no Google Apps Script. A versão 2 corrige o que só aparece em produção e não manda em dobro.',
      en: 'Automatic birthday email on Google Apps Script. Version 2 fixes what only shows up in production and never sends twice.' },
    chips: ['Apps Script', 'Gmail', 'Node test']
  },
  {
    pasta: 'PowerBI.Circular.Organizational.Structure', pages: false, imagem: 'img/projetos/organograma.jpg',
    titulo: { pt: 'Organograma circular em DAX', en: 'Circular org chart in DAX' },
    desc: { pt: 'Organograma interativo gerado por uma medida DAX no visual HTML Content, sem plugin pago.',
      en: 'Interactive org chart generated by one DAX measure in the HTML Content visual, no paid plugin.' },
    chips: ['Power BI', 'DAX', 'HTML']
  }
];
