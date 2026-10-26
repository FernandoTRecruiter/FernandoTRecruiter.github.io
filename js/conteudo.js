/* =============================================================================
   conteudo.js: TODO texto e configuração que muda com o idioma, num lugar só.

   - O português da página está no index.html (é o que o Google e quem está sem
     JavaScript leem). Aqui fica o INGLÊS de cada [data-i18n].
   - falas: o que o bonequinho diz em cada seção (PT e EN). Uma fala pode ser
     texto ou { t: 'texto', audio: 'audio/arquivo.mp3' } (ver audio/LEIA-ME.md).
   - aparencia: a imagem do bonequinho (img/boneco.webp).
   - sobreMim: a lista "fora do expediente" (acrescente, tire, troque à vontade).
     Um item pode ter link: { pasta: 'nome-do-repositorio', rotulo: { pt, en } }.
   - cases: o que eu já fiz nas empresas, em três linhas (problema, solução,
     resultado). Sem nome de empresa, de sistema interno ou de pessoa.
   Projetos ficam em js/projetos.js.
   ============================================================================= */
window.CONTEUDO = {
  en: {
    pular: 'Skip to content', nav_projetos: 'Projects', nav_cases: "What I've done", nav_trajetoria: 'Journey', nav_aprendi: 'What I learned', nav_contato: 'Contact',
    ab_eyebrow: 'PORTFOLIO · HR DATA · AUTOMATION', ab_oi: "Hi, I'm",
    ab_lead: 'I came from tech recruiting and today I work on the data side of HR: people dashboards, automations and small apps, with Claude Code as my pair.',
    ab_ver: 'See what I built ↓', ab_dica3d: 'drag to rotate · click a project',
    t_projetos: 'What I built',
    // títulos das barras das janelas
    jt_painel: 'executive-dashboard · people analytics',
    jt_cases: 'what-ive-done · problem, solution, outcome',
    jt_pipe: 'data-path · before and after',
    jt_fluxos: 'power-automate · flows',
    jt_agentes: 'agent-team · claude code',
    jt_repos: '~/github · open repositories',
    intro_projetos: 'Each window is a project. The little guy down there tells you what I did and why; the demos use fictional data.',
    painel_desc: 'The people dashboard I built for leadership, rebuilt from scratch with a fictional company: every number explains its math, clicking a bar shows the names and one tab shows a map of the site.',
    abrir_inteira: 'Open full screen ↗', ver_codigo: 'See the code ↗', ler_historia: 'Read the story as text',
    cases_desc: 'What I actually delivered at work, three lines each and without anyone\'s data.',
    pipe_extra: 'click a block',
    pipe_antes_t: 'Before', pipe_antes_s: 'spreadsheet exported by hand',
    pipe_depois_t: "After: today's cycle", pipe_depois_s: 'from source to dashboard, numbered: start at 1',
    leg_ti: 'infrastructure and hosting', leg_eu: 'building, checking and access', leg_ambos: 'both together',
    chip_ti: 'IT', chip_eu: 'me', chip_ambos: 'IT + me',
    pipe_ini: 'Click a block to see what it is, why it exists and who takes care of it. The order follows the numbers.',
    pipe_desc: 'The HR data path. IT runs the infrastructure (Data Lake and hosting); I mapped the data sources, built the tables through PRs in Data Factory and check everything with agents.',
    fluxos_desc: 'Four flows I designed and maintain, redrawn here without any company data: the trigger, every step and where the alert goes.',
    agentes_desc: 'The agents I created in Claude Code. Each one has a fixed job, rules for what it must not do, and it returns evidence: a number, a query or a screenshot.',
    repos_desc: 'Everything open on my GitHub. Click to see it live or read the code.',
    t_traj: 'Journey',
    lt1_t: 'Starting in HR, through recruiting', lt1: 'I started at one of the largest recruiting consultancies in the world. There I learned how strategic HR works and how to recruit for in-demand roles, mostly in tech.',
    lt2_q: 'then', lt2_t: 'From the job to the data', lt2: 'I learned to translate what a company needs into a profile, and the profile into numbers. The first analyses and dashboards came from there.',
    lt3_t: 'People Analytics', lt3: 'Where I really started working with people data: analyses, indicators and dashboards for leadership.',
    lt4_q: 'along the way', lt4_t: 'AI as a delivery engine', lt4: 'I started using AI every day and studying it in depth: what it does well, where it fails and how to check it.',
    lt5_q: 'recent months', lt5_t: 'Deliveries', lt5: 'A leadership dashboard, a view for each manager, reports that run on their own and a weekly check of the numbers with AI agents.',
    lt6_q: 'now', lt6_t: 'Data and AI for strategy', lt6: 'Specializing in data and AI with a focus on strategy and control: reliable numbers for the company to decide on.',
    sobre_t: 'Off the clock', sobre_s: 'What I do when nobody is asking for a report.',
    t_aprendi: 'What I learned',
    ld_paineis: 'dashboards', ld_apps: 'apps', ld_dados: 'data', ld_req: 'requirements',
    l1: "A green test run doesn't replace opening the screen and looking.",
    l2: '"Accepted" is not "delivered". Proof is the message arriving.',
    l3: 'Whatever enters the repository history never leaves. Personal data never goes up.',
    l4: "Two systems only compare on the same cut-off date. Otherwise the difference is the clock's, not the data's.",
    l5: 'Access control inside the file is cosmetic. Security lives on the server.',
    l6: 'A request that arrives as a list is usually a rule in disguise. Write the rule, not the list.',
    s_rs: 'Tech recruiting',
    aberto: 'Open to talk and projects',
    t_contato: 'Shall we talk?', contato_txt: 'If you need someone who understands people AND data, reach out.',
    rodape_dados: 'The demos use fictional data.'
  },
  // Rótulos que só existem no JavaScript (português e inglês).
  ui: {
    o_que: ['O que é', 'What it is'], por_que: ['Por que existe', 'Why it exists'], aprendi: ['O que aprendi', 'What I learned'],
    quem_cuida: ['Quem cuida', 'Who takes care of it'], como_era: ['Como era', 'How it was'], problema: ['O problema', 'The problem'], antes: ['antes', 'before'],
    comeca_aqui: ['comece aqui', 'start here'],
    c_problema: ['Problema', 'Problem'], c_solucao: ['Solução', 'Solution'], c_resultado: ['Resultado', 'Outcome'],
    nao_faz: ['O que ele não faz', 'What it does not do'], modelo: ['Modelo', 'Model'], eu: ['Eu', 'Me'], decido: ['decido', 'decide'],
    sim: ['sim', 'yes'], nao: ['não', 'no'], voltar_doca: ['Restaurar', 'Restore'],
    voz_gravada: ['Ouvir (minha voz gravada)', 'Listen (my recorded voice)'], ligada: ['ligada', 'on'],
    ver_no_ar: ['Ver no ar ↗', 'See it live ↗'], codigo: ['Código ↗', 'Code ↗'], fechar: ['Fechar', 'Close'],
    clique_agente: ['Clique num agente para ver a tarefa dele e o que ele não pode fazer.', 'Click an agent to see its job and what it must not do.']
  },

  // ------------------------------------------------------------------ aparência do bonequinho
  // A imagem do bonequinho: PNG ou WebP com fundo transparente, do peito para cima (proporção perto de 344 x 533).
  aparencia: { imagem: 'img/boneco.webp' },

  // ------------------------------------------------------------------ o que já fiz nas empresas
  // Uma entrada por entrega: título, problema, solução e resultado (PT e EN), mais as ferramentas.
  // Resultado sem número inventado: se não foi medido, conte o efeito em palavras.
  cases: [
    { t: { pt: 'Painel de pessoas da liderança', en: 'People dashboard for leadership' },
      problema: { pt: 'Os números de pessoas viviam em planilhas exportadas à mão, cada uma de um dia.', en: 'People numbers lived in hand-exported spreadsheets, each from a different day.' },
      solucao: { pt: 'Um dashboard que abre no navegador, lê a base oficial e mostra a conta de cada número.', en: 'A dashboard that opens in the browser, reads the official base and shows the math behind each number.' },
      resultado: { pt: 'Um número só para todo mundo, e as perguntas do dia a dia respondidas sem pedir planilha.', en: 'One number for everyone, and everyday questions answered without asking for a spreadsheet.' },
      chips: ['HTML', 'JavaScript', 'SQL'] },
    { t: { pt: 'A visão de cada gestor', en: 'A view for each manager' },
      problema: { pt: 'Gestores pediam ao RH os dados da própria equipe, um pedido por vez.', en: 'Managers asked HR for their own team data, one request at a time.' },
      solucao: { pt: 'Uma versão do painel só com a equipe de cada gestor, em português e inglês.', en: "A version of the dashboard with only each manager's team, in Portuguese and English." },
      resultado: { pt: 'O gestor consulta sozinho, e o dado de uma equipe não aparece para outra.', en: "Managers look things up on their own, and one team's data never shows up for another." },
      chips: ['JavaScript', { pt: 'Controle de acesso', en: 'Access control' }] },
    { t: { pt: 'Dados de RH num lugar só', en: 'HR data in one place' },
      problema: { pt: 'Cada relatório lia uma cópia diferente, e ninguém sabia de quando era o número.', en: 'Each report read a different copy, and nobody knew how old the number was.' },
      solucao: { pt: 'Mapeei as bases, propus as tabelas por PR revisada pela TI e montei uma conferência semanal contra o sistema de origem.', en: 'I mapped the sources, proposed the tables through PRs reviewed by IT and set up a weekly check against the source system.' },
      resultado: { pt: 'Uma fonte única, conferida toda semana. Diferença vira correção no código da carga, não ajuste à mão.', en: 'A single source, checked every week. A difference becomes a fix in the load code, not a manual patch.' },
      chips: ['SQL', 'Python', 'Azure Data Factory'] },
    { t: { pt: 'Relatórios mensais que saem sozinhos', en: 'Monthly reports that run themselves' },
      problema: { pt: 'Os relatórios de quadro e os indicadores ESG eram montados à mão todo mês.', en: 'Headcount reports and ESG indicators were built by hand every month.' },
      solucao: { pt: 'Scripts agendados que geram, conferem e enviam, com um verificador que avisa quando algo não saiu.', en: "Scheduled scripts that build, check and send them, with a checker that warns when something didn't go out." },
      resultado: { pt: 'O relatório chega no dia certo sem trabalho manual, e falha não passa em silêncio.', en: 'The report arrives on the right day with no manual work, and failures are never silent.' },
      chips: ['Python', 'Excel', { pt: 'Agendador', en: 'Scheduler' }] },
    { t: { pt: 'Aprovações e avisos automáticos', en: 'Automated approvals and alerts' },
      problema: { pt: 'Aprovações por e-mail se perdiam e ninguém sabia em que pé estava o pedido.', en: 'Email approvals got lost and nobody knew where a request stood.' },
      solucao: { pt: 'Fluxos com aprovação registrada e aviso no Teams e no Outlook, com o que a empresa já tinha.', en: 'Flows with recorded approvals and alerts in Teams and Outlook, using what the company already had.' },
      resultado: { pt: 'Cada pedido tem dono, histórico e aviso na hora certa.', en: 'Every request has an owner, a history and an alert at the right time.' },
      chips: ['Power Automate', 'SharePoint', 'Teams'] },
    { t: { pt: 'Pedido de cargo novo', en: 'New role requests' },
      problema: { pt: 'Pedidos de cargo chegavam incompletos e por canais diferentes.', en: 'Role requests arrived incomplete and through different channels.' },
      solucao: { pt: 'Um formulário em etapas que monta a descrição do cargo, e um painel de aprovação com papéis.', en: 'A step-by-step form that builds the job description, plus an approval panel with roles.' },
      resultado: { pt: 'Pedidos completos e padronizados, com o histórico de cada decisão.', en: 'Complete, standardized requests, with the history of every decision.' },
      chips: ['JavaScript', { pt: 'Formulário', en: 'Forms' }, 'Power Automate'] },
    { t: { pt: 'Recrutamento tech', en: 'Tech recruiting' },
      problema: { pt: 'Vagas de tecnologia e engenharia difíceis de preencher.', en: 'Hard-to-fill technology and engineering roles.' },
      solucao: { pt: 'Busca ativa, triagem técnica e conversa franca com a área sobre o perfil de verdade.', en: 'Active sourcing, technical screening and honest conversations with the team about the real profile.' },
      resultado: { pt: 'Mais de 200 contratações.', en: '200+ hires.' },
      chips: ['LinkedIn Recruiter', 'ATS'] }
  ],

  // ------------------------------------------------------------------ fora do expediente
  sobreMim: [
    { ic: '🎮', t: { pt: 'Jogos', en: 'Games' },
      d: { pt: 'Jogo de tudo, crio mods para os jogos que curto e programo por diversão: fiz do zero o Geometry Reaper.',
        en: 'I play everything, build mods for the games I enjoy and code for fun: I made Geometry Reaper from scratch.' },
      link: { pasta: 'geometry-reaper', rotulo: { pt: 'Jogar ↗', en: 'Play ↗' } } },
    { ic: '🖥️', t: { pt: 'Monto meus PCs', en: 'I build my PCs' }, d: { pt: 'Escolher peça por peça é o meu tipo favorito de planilha.', en: 'Picking parts one by one is my favorite kind of spreadsheet.' } },
    { ic: '🎯', t: { pt: 'Airsoft', en: 'Airsoft' }, d: { pt: 'Fim de semana no mato, com estratégia de equipe.', en: 'Weekends in the woods, with team strategy.' } },
    { ic: '🛠️', t: { pt: 'Projetos paralelos', en: 'Side projects' }, d: { pt: 'Sempre tem um rodando: site, mod de jogo, automação para casa.', en: 'There is always one running: a website, a game mod, home automation.' } },
    { ic: '🐈', t: { pt: 'Três gatos', en: 'Three cats' }, d: { pt: 'Woody, Lazuli e Petra: o departamento de Recursos Animais.', en: 'Woody, Lazuli and Petra: the Animal Resources Department.' } },
    { ic: '🦇', t: { pt: 'Um pé no gótico', en: 'A bit goth' }, d: { pt: 'Daí o morcego.', en: 'Hence the bat.' } }
  ],

  // ------------------------------------------------------------------ falas
  // Formato que funcionou: o que fiz -> por quê -> o que aprendi, uma frase por fala.
  // Falas do bonequinho: curtas e poucas de propósito (cada uma vira um arquivo para gravar)
  falas: {
    inicio: {
      pt: ["Oi! Eu sou o Fernando. Role a página: em cada janela eu conto o que construí e por quê.", "O gato não ajuda em nada, mas dá para arrastar ele."],
      en: ["Hi! I'm Fernando. Scroll down: in each window I tell what I built and why.", "The cat doesn't help at all, but you can drag it around."]
    },
    painel: {
      pt: ["Fiz esse painel para dar visibilidade: quem entrou, quem saiu e por quê.", "Todo número tem um \"i\" com a conta. Os dados vêm da TI; montar e conferir é comigo."],
      en: ["I built this dashboard for visibility: who joined, who left and why.", "Every number has an \"i\" with the math. The data comes from IT; building and checking it is on me."]
    },
    cases: {
      pt: ["O que eu já entreguei de verdade: o problema, o que fiz e o que mudou."],
      en: ["What I actually delivered: the problem, what I did and what changed."]
    },
    pipeline: {
      pt: ["À esquerda, o antes: planilha exportada à mão, atrasada e sem data.", "À direita, o ciclo de hoje: a TI cuida do Data Lake; eu mapeio, monto as tabelas e confiro toda semana."],
      en: ["On the left, before: a spreadsheet exported by hand, late and undated.", "On the right, today's cycle: IT runs the Data Lake; I map the sources, build the tables and check them every week."]
    },
    fluxos: {
      pt: ["Fluxos que nasceram de aprovação perdida no e-mail, feitos com o que a empresa já tinha."],
      en: ["Flows born from approvals lost in email, built with what the company already had."]
    },
    agentes: {
      pt: ["Uso o Claude Code como um time: cada agente tem uma tarefa e devolve prova. Quem decide sou eu."],
      en: ["I use Claude Code as a team: each agent has one job and returns proof. I make the call."]
    },
    repos: {
      pt: ["Aqui ficam os projetos abertos: RH, dados e projetos paralelos."],
      en: ["Here are the open projects: HR, data and side projects."]
    },
    trajetoria: {
      pt: ["Recrutamento me ensinou a ouvir o que a área pede. Dados me ensinaram a provar."],
      en: ["Recruiting taught me to listen to what a team asks for. Data taught me to prove it."]
    },
    fora: {
      pt: ["Fora do expediente: jogos, PC montado por mim, airsoft e sempre um projeto paralelo."],
      en: ["Off the clock: games, a PC I built myself, airsoft and always a side project."]
    },
    aprendi: {
      pt: ["Cada lição dessas veio de um erro meu ou de um número que não fechava."],
      en: ["Each of these lessons came from a mistake of mine or a number that didn't add up."]
    },
    contato: {
      pt: ["Gostou? Me chama no LinkedIn. Prometo responder mais rápido que o gato."],
      en: ["Liked it? Reach out on LinkedIn. I promise to answer faster than the cat."]
    }
  },

  // Os três gatos do README antigo (o "Animal Resources Department").
  gatos: [
    { pt: 'Woody, Analista Sênior de Soneca: só vai em reunião se tiver petisco.', en: 'Woody, Senior Nap Analyst: attends meetings only if treats are involved.' },
    { pt: 'Lazuli, Head de Gestão do Caos: derrubou 3 notebooks. Diz que foi pesquisa de mercado.', en: 'Lazuli, Head of Chaos Management: knocked 3 laptops off the desk. Claims it was market research.' },
    { pt: 'Petra, Diretora de Vibes: a mais fotogênica 3 anos seguidos. Zero entregas.', en: 'Petra, Director of Vibes: most photogenic employee 3 years running. Zero deliverables.' }
  ]
};
