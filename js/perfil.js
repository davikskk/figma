/* zen · perfil modular
   o perfil é uma pequena área de trabalho: cada janela tem uma estrutura comum
   (posição, tamanho, título, estilo) e um TIPO que decide o conteúdo.
   para criar um novo tipo basta registrá-lo em TIPOS com nome, ícone e montar().

   tamanhos seguem uma grade única (presets 2x2, 4x4, 6x6 ou personalizado) e cada janela tem uma
   camada (z-index) própria: sobrepor janelas é permitido; sair da área do perfil, não.

   o layout (tipos, posições, tamanhos, camadas, cores, textos) fica no localStorage como preferência visual.
   arquivos escolhidos (imagens, músicas, modelos 3D, foto de perfil) ficam só na memória da aba.

   palavras que aparecem o tempo todo aqui:
   - mesa   → a área do perfil onde as janelas ficam (#mesa-perfil)
   - janela → os DADOS de uma janela: { id, tipo, x, y, w, h, camada, titulo, mostrarTitulo, estilo, dados }
   - el     → o ELEMENTO html dela na tela
   - inst   → o que o montar() do tipo devolveu: { temConteudo?, atualizar?, destruir?, ... }
   - vivas  → mapa id → { el, inst } das janelas que estão montadas agora

   é o maior arquivo do projeto. pegue uma água, respira e vai */
window.Zen = window.Zen || {};

(function(){
  // gaveta do localStorage onde o layout fica
  const CHAVE = 'zen:perfil';
  // espaço vazio embaixo da última janela
  const MARGEM_INFERIOR = 40;

  /* regras de tamanho, posição e camada: toda validação consulta só este bloco */
  const LIMITES = {
    celula: 60,          // unidade da grade: 2x2 = 120px, 4x4 = 240px, 6x6 = 360px
    passo: 6,            // encaixe ao arrastar e redimensionar
    minimo: 60,          // nenhuma janela fica menor que 1 célula (além do mínimo do tipo)
    larguraPadrao: 760,  // largura lógica do perfil, usada quando a mesa não está visível
    alturaMaxima: 720,   // 12 células
    alturaMesa: 2160,    // nenhuma janela passa deste ponto para baixo
    camadaMin: 1,
    camadaMax: 20        // menu, painéis e avisos ficam acima: a .mesa isola as camadas (style.css)
  };
  // os botões de tamanho rápido: 2x2, 4x4 e 6x6 células
  const PRESETS = [2, 4, 6];

  const vista = document.querySelector('.vista.perfil');
  const mesa = document.getElementById('mesa-perfil');
  // forminha (<template>) com a moldura de toda janela: barra de título, botões, corpo e alça
  const modelo = document.getElementById('modelo-modulo');
  const botaoEdicao = document.getElementById('alternar-edicao');
  // no celular não arrasta: as janelas empilham
  const podeArrastar = window.matchMedia('(min-width: 641px)');

  // desenhinhos SVG de cada tipo, usados na lista de "nova janela"
  const ICONES = {
    perfil: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/>',
    texto: '<path d="M5 6h14M5 10h14M5 14h10M5 18h7"/>',
    imagem: '<rect x="3.5" y="5" width="17" height="14"/><path d="M4 17l5-5 4 4 2-2 5 5"/><circle cx="15.5" cy="9" r="1.5"/>',
    musica: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
    '3d': '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'
  };

  /* ---------- tipos de janela ----------
     cada tipo tem:
       nome, descricao      → o que aparece na lista de "nova janela"
       titulo               → título inicial da barra
       tamanho: [w, h]      → tamanho ao ser criada
       minimo: [w, h]       → menor tamanho permitido
       mostrarTitulo?       → false = barra de título escondida fora do modo edição
       opcoes?              → campos extras no painel de propriedades (select ou slider)
       acoes?               → botões extras no painel de propriedades
       montar(corpo, janela, api) → coloca o conteúdo dentro de "corpo" e devolve a inst */

  const TIPOS = {
    // a janela com sua foto, nome e @. dá para editar o nome direto nela no modo edição
    perfil: {
      nome: 'perfil',
      descricao: 'foto, nome e @',
      titulo: 'profile.exe',
      tamanho: [440, 150],
      minimo: [240, 110],
      mostrarTitulo: false,
      montar(corpo){
        // data-editavel: vira campo de texto no modo edição · data-linha: Enter confirma em vez de pular linha
        corpo.innerHTML = `
          <button type="button" class="avatar-trocar" title="trocar foto de perfil">
            <img class="avatar" alt="sua foto de perfil" data-eu-avatar>
            <span>trocar</span>
          </button>
          <div>
            <h2 data-eu-nome data-editavel data-linha></h2>
            <div class="arroba"><span data-eu-arroba data-editavel data-linha></span> · profile.exe</div>
          </div>`;
        corpo.querySelector('.avatar-trocar').addEventListener('click', () => Zen.usuario.escolherFoto());

        const nome = corpo.querySelector('[data-eu-nome]');
        const arroba = corpo.querySelector('[data-eu-arroba]');
        // a cada letra digitada já atualiza o nome no site todo (feed, título da aba...)
        nome.addEventListener('input', () => {
          if(nome.textContent.trim()) Zen.usuario.definir({ nome: nome.textContent.trim() });
        });
        // o @ é limpo: tira @ repetidos do começo e qualquer espaço. "@@ davi k" vira "@davik"
        arroba.addEventListener('input', () => {
          const limpo = arroba.textContent.trim().replace(/^@+/, '').replace(/\s+/g, '');
          if(limpo) Zen.usuario.definir({ arroba: '@' + limpo });
        });
        // ao sair do campo, mostra o valor normalizado (ou o anterior, se ficou vazio)
        [nome, arroba].forEach(el => el.addEventListener('blur', () => Zen.usuario.refletir()));

        Zen.usuario.refletir(corpo);
        // nunca "tem conteúdo": apagar essa janela não perde nada, você continua sendo você
        return { temConteudo: () => false };
      }
    },

    // um bloco de texto livre (a bio, por exemplo). o texto é salvo junto com o layout
    texto: {
      nome: 'texto',
      descricao: 'pensamentos, frases, notas',
      titulo: 'notas.txt',
      tamanho: [300, 160],
      minimo: [120, 90],
      montar(corpo, janela, api){
        const el = document.createElement('div');
        el.className = 'texto-livre';
        el.dataset.editavel = '';
        // texto que o CSS mostra quando a janela está vazia
        el.dataset.vazio = 'janela vazia. clique em "editar espaço" para escrever.';
        el.textContent = janela.dados.texto || '';
        el.addEventListener('input', () => {
          // innerText respeita as quebras de linha; o replace tira o \n fantasma que o navegador põe no fim
          janela.dados.texto = el.innerText.replace(/\n$/, '');
          api.salvar();
        });
        corpo.append(el);
        return { temConteudo: () => !!(janela.dados.texto || '').trim() };
      }
    },

    // uma imagem do computador, com ajuste, zoom e posição
    imagem: {
      nome: 'imagem',
      descricao: 'uma imagem do seu computador',
      titulo: 'imagem.png',
      tamanho: [280, 240],
      minimo: [120, 120],
      // valores: [valor salvo, texto mostrado] · faixa: [mín, máx, passo] do slider
      opcoes: [
        { nome: 'ajuste', rotulo: 'imagem', valores: [['cover', 'preencher'], ['contain', 'inteira'], ['fill', 'esticar']] },
        { nome: 'zoom', rotulo: 'zoom', faixa: [10, 300, 5], padrao: 100, sufixo: '%' },
        { nome: 'posicao', rotulo: 'posição', valores: [['50% 50%', 'centro'], ['50% 0%', 'topo'], ['50% 100%', 'base'], ['0% 50%', 'esquerda'], ['100% 50%', 'direita']] }
      ],
      // executar(janela, inst, ferramentas): ferramentas traz encaixarProporcao, que mora lá embaixo
      acoes: [
        { rotulo: 'caber na janela', titulo: 'mostra a imagem inteira, sem cortes, centralizada',
          executar(j){ Object.assign(j.dados, { ajuste: 'contain', zoom: 100, posicao: '50% 50%' }); } },
        { rotulo: 'janela no formato da imagem', titulo: 'ajusta a altura da janela à proporção da imagem, sem sobras nem cortes',
          executar(j, inst, ferramentas){
            Object.assign(j.dados, { ajuste: 'cover', zoom: 100, posicao: '50% 50%' });
            ferramentas.encaixarProporcao(j, inst.proporcao());
          } }
      ],
      montar(corpo, janela, api){
        // endereço temporário da imagem (null = sem imagem ainda)
        let url = null;
        const entrada = document.createElement('input');
        entrada.type = 'file';
        entrada.accept = Zen.imagens.ACEITAR;
        entrada.hidden = true;

        // estado vazio: mensagem + botão "escolher imagem..."
        function vazio(mensagem){
          corpo.innerHTML = `<div class="vazio-modulo"><span></span><button type="button" class="botao pequeno">escolher imagem...</button></div>`;
          corpo.querySelector('span').textContent = mensagem || 'nenhuma imagem ainda';
          corpo.querySelector('button').addEventListener('click', () => entrada.click());
          // o innerHTML apagou o input, então coloca ele de volta
          corpo.append(entrada);
        }

        // zoom e posição: object-position decide o recorte e serve de origem para a escala
        function ajustar(){
          const img = corpo.querySelector('img');
          if(!img) return;
          const posicao = janela.dados.posicao || '50% 50%';
          img.style.objectFit = janela.dados.ajuste || 'cover';
          img.style.objectPosition = posicao;
          img.style.transformOrigin = posicao;
          img.style.transform = `scale(${(+janela.dados.zoom || 100) / 100})`;
        }

        // estado com imagem
        function mostrar(){
          // a barra de troca flutua sobre a imagem: a área visível é a mesma dentro e fora da edição
          corpo.innerHTML = `<div class="quadro-imagem"><img class="imagem-modulo" alt=""></div>
            <div class="barra-modulo so-edicao"><button type="button" class="botao pequeno">trocar imagem...</button></div>`;
          const img = corpo.querySelector('img');
          img.src = url;
          img.alt = janela.titulo;
          ajustar();
          corpo.querySelector('button').addEventListener('click', () => entrada.click());
          corpo.append(entrada);
        }

        // a imagem é lida localmente via object URL: nunca sai do navegador
        entrada.addEventListener('change', async () => {
          const arquivo = entrada.files[0];
          entrada.value = '';
          if(!arquivo) return;
          let nova;
          // deu erro: se ainda não tinha imagem, mostra o erro dentro da janela; se tinha, avisa e mantém a antiga
          try{ nova = await Zen.imagens.abrir(arquivo); }
          catch(erro){ if(!url) vazio(erro.message); else Zen.avisar(erro.message); return; }
          if(url) URL.revokeObjectURL(url);
          url = nova;
          mostrar();
          // quando a imagem terminar de carregar, o painel de propriedades libera os botões que precisam dela
          corpo.querySelector('img').addEventListener('load', () => api.conteudoMudou(janela), { once: true });
        });

        vazio();
        return {
          temConteudo: () => !!url,
          // o painel chama isso quando muda zoom/posição/ajuste
          atualizar: ajustar,
          // largura ÷ altura da imagem original (null se ainda não carregou)
          proporcao(){
            const img = corpo.querySelector('img');
            return img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : null;
          },
          destruir(){ if(url) URL.revokeObjectURL(url); }
        };
      }
    },

    // o toca-discos inteiro mora em musica.js. aqui só terceiriza
    musica: {
      nome: 'música',
      descricao: 'vinil que toca .mp3 / .mp4',
      titulo: 'music.txt',
      tamanho: [248, 262],
      minimo: [180, 250],
      montar: (corpo) => Zen.musica.criar(corpo)
    },

    // o visor 3D mora em visor3d.js. o nome da chave tem aspas porque não pode começar com número
    '3d': {
      nome: '3D',
      descricao: 'modelo para girar e dar zoom',
      titulo: 'modelo.3d',
      tamanho: [280, 280],
      minimo: [120, 120],
      montar: (corpo, janela, api) => Zen.visor3d.criar(corpo, janela.dados, api.salvar)
    }
  };

  // o perfil de fábrica: perfil + música lado a lado, e a bio embaixo
  const PADRAO = [
    { tipo: 'perfil', x: 0, y: 0, w: 494, h: 262, camada: 1 },
    { tipo: 'musica', x: 512, y: 0, w: 248, h: 262, camada: 1 },
    { tipo: 'texto', x: 0, y: 280, w: 760, h: 110, camada: 1, titulo: 'bio.txt',
      dados: { texto: 'Curto retrô, gosto de programar e mega meowstic é o goat' } }
  ];

  // a lista de janelas (os dados). a ordem dela é a ordem no html
  let janelas = [];
  const vivas = new Map(); // id → { el, inst }
  // ids só existem nesta aba (não são salvos): cada janela ganha um número novo ao carregar
  let proximoId = 1;
  let editando = false;

  /* ---------- limites e validação ---------- */

  // prende v entre min e max. entre(15, 0, 10) = 10
  const entre = (v, min, max) => Math.min(Math.max(v, min), max);

  // largura real da mesa (0 quando o perfil está escondido, aí usa a padrão)
  function larguraMesa(){
    return mesa.clientWidth || LIMITES.larguraPadrao;
  }

  // no celular as janelas empilham: o layout continua valendo para a largura lógica do desktop
  const larguraDisponivel = () => podeArrastar.matches ? larguraMesa() : LIMITES.larguraPadrao;

  // o menor tamanho de um tipo: o mínimo dele, mas nunca menos de 1 célula
  function minimoDe(tipo){
    const [w, h] = TIPOS[tipo].minimo;
    return [Math.max(LIMITES.minimo, w), Math.max(LIMITES.minimo, h)];
  }

  // o maior tamanho: a largura da mesa × a altura máxima
  const maximo = () => [larguraDisponivel(), LIMITES.alturaMaxima];

  // devolve a mensagem de erro, ou null quando o tamanho é aceito
  // a ordem dos ifs importa: primeiro "é número?", depois "é inteiro?", depois os limites
  function validarTamanho(tipo, w, h){
    if(!Number.isFinite(w) || !Number.isFinite(h)) return 'digite a largura e a altura em números.';
    if(!Number.isInteger(w) || !Number.isInteger(h)) return 'use números inteiros, em px.';
    if(w <= 0 || h <= 0) return 'largura e altura precisam ser maiores que zero.';
    const [minW, minH] = minimoDe(tipo);
    if(w < minW || h < minH) return `pequeno demais: ${TIPOS[tipo].nome} precisa de pelo menos ${minW}×${minH} px.`;
    const [maxW, maxH] = maximo();
    if(w > maxW || h > maxH) return `tamanho maior que o permitido: o máximo aqui é ${maxW}×${maxH} px.`;
    return null;
  }

  // mesma ideia, para a camada. devolve a mensagem de erro ou null
  function validarCamada(v){
    if(!Number.isFinite(v)) return 'digite a camada em números.';
    if(!Number.isInteger(v)) return 'a camada precisa ser um número inteiro.';
    if(v < LIMITES.camadaMin || v > LIMITES.camadaMax)
      return `camada fora do intervalo: use de ${LIMITES.camadaMin} a ${LIMITES.camadaMax}.`;
    return null;
  }

  // mantém a janela inteira dentro da área do perfil; ficar sobre outra janela é permitido
  function prenderNaMesa(j){
    j.x = entre(j.x, 0, Math.max(0, larguraDisponivel() - j.w));
    j.y = entre(j.y, 0, LIMITES.alturaMesa - j.h);
  }

  /* ---------- estado e persistência ---------- */

  // pega uma janela que pode estar incompleta ou bagunçada (veio do localStorage, onde qualquer
  // um pode mexer pelo devtools) e devolve uma janela certinha, com id novo e tudo dentro dos limites
  // +j.w transforma em número; || usa o padrão se der NaN ou 0. desconfiança é tudo
  function normalizar(j){
    const tipo = TIPOS[j.tipo];
    const [minW, minH] = minimoDe(j.tipo);
    const w = entre(Math.round(+j.w) || tipo.tamanho[0], minW, LIMITES.larguraPadrao);
    const h = entre(Math.round(+j.h) || tipo.tamanho[1], minH, LIMITES.alturaMaxima);
    return {
      id: proximoId++,
      tipo: j.tipo,
      x: entre(Math.round(+j.x) || 0, 0, LIMITES.larguraPadrao - w),
      y: entre(Math.round(+j.y) || 0, 0, LIMITES.alturaMesa - h),
      w, h,
      camada: entre(Math.round(+j.camada) || LIMITES.camadaMin, LIMITES.camadaMin, LIMITES.camadaMax),
      titulo: typeof j.titulo === 'string' ? j.titulo : tipo.titulo,
      mostrarTitulo: typeof j.mostrarTitulo === 'boolean' ? j.mostrarTitulo : tipo.mostrarTitulo !== false,
      // cópias, para não dividir o mesmo objeto com o PADRAO (senão mexer em um mexe no outro)
      estilo: { ...(j.estilo || {}) },
      dados: { ...(j.dados || {}) }
    };
  }

  // lê o layout salvo. se não tiver, ou se tiver qualquer coisa estranha, usa o PADRAO
  function carregar(){
    try{
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      // layouts antigos não tinham camada: a ordem salva vira a profundidade inicial
      if(Array.isArray(salvo) && salvo.every(j => j && TIPOS[j.tipo]))
        return salvo.map((j, i) => normalizar({ camada: i + 1, ...j }));
    }catch(e){}
    return PADRAO.map(normalizar);
  }

  // salva o layout, mas espera 200ms de calmaria antes (debounce)
  // arrastar uma janela chama isso dezenas de vezes por segundo; assim só grava quando a pessoa para
  let espera = null;
  function salvar(){
    clearTimeout(espera);
    espera = setTimeout(() => {
      // tira o id de cada janela: ele é só desta aba
      const dados = janelas.map(({ id, ...resto }) => resto);
      try{ localStorage.setItem(CHAVE, JSON.stringify(dados)); }catch(e){}
    }, 200);
  }

  // o que o montar() de cada tipo recebe para conversar de volta com o perfil
  const api = {
    salvar,
    // o painel de propriedades depende do conteúdo (ex.: ações que precisam de uma imagem carregada)
    conteudoMudou(j){ if(propriedadesDe === j) preencherPropriedades(); }
  };

  /* ---------- renderização ---------- */

  // aplica as cores próprias da janela (se tiver) por cima do tema, via variáveis CSS do elemento
  // valor vazio = remove a variável, aí a janela volta a herdar a cor do tema
  function aplicarEstilo(el, j){
    const s = el.style;
    const definir = (nome, valor) => valor === undefined || valor === null ? s.removeProperty(nome) : s.setProperty(nome, valor);
    const titulo = j.estilo.titulo;
    definir('--bg-window', j.estilo.janela);
    definir('--text-dark', j.estilo.texto);
    definir('--window-opacity', j.estilo.opacidade);
    definir('--title-start', titulo);
    // o fim do degradê do título é a mesma cor misturada com 45% de branco
    definir('--title-end', titulo && Zen.cores.misturar(titulo, '#ffffff', 0.45));
    definir('--title-text', titulo && Zen.cores.textoSobre(titulo, Zen.cores.misturar(titulo, '#ffffff', 0.45)));
    el.classList.toggle('sem-titulo', !j.mostrarTitulo);
    el.querySelector('.titulo-modulo').textContent = j.titulo;
  }

  // posiciona e dimensiona o elemento. se a mesa estiver mais estreita que a janela, encolhe só na tela
  // (os dados continuam com o tamanho original, para voltar quando a tela crescer)
  function aplicarGeometria(el, j){
    const largura = larguraMesa();
    const w = Math.min(j.w, largura);
    el.style.left = Math.min(j.x, largura - w) + 'px';
    el.style.top = j.y + 'px';
    el.style.width = w + 'px';
    el.style.height = j.h + 'px';
  }

  // ajusta a altura da mesa à janela mais baixa e atualiza a camada de cada uma
  // extra: altura a mais, se precisar
  function atualizarMesa(extra = 0){
    const fundo = janelas.reduce((m, j) => Math.max(m, j.y + j.h), 0);
    // no modo edição sobra um espaço embaixo para dar onde arrastar
    mesa.style.height = fundo + MARGEM_INFERIOR + (editando ? 160 : 0) + extra + 'px';
    // camada escolhida (desktop) e ordem de leitura (celular)
    const leitura = [...janelas].sort((a, b) => a.y - b.y || a.x - b.x);
    janelas.forEach((j) => {
      const { el } = vivas.get(j.id);
      el.style.zIndex = j.camada;
      el.style.order = leitura.indexOf(j);
    });
  }

  // liga/desliga a digitação nos elementos com data-editavel, conforme o modo edição
  function definirEditaveis(raiz){
    raiz.querySelectorAll('[data-editavel]').forEach(el => {
      if(!editando){ el.removeAttribute('contenteditable'); return; }
      // plaintext-only = só texto, sem colar negrito, imagem e outras surpresas
      // navegador que não conhece (oi firefox antigo) ignora, então cai no 'true' normal
      el.contentEditable = 'plaintext-only';
      if(el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    });
  }

  // cria o elemento de uma janela: copia a moldura, aplica estilo e posição e chama o montar() do tipo
  function montar(j){
    const el = modelo.content.firstElementChild.cloneNode(true);
    el.dataset.tipo = j.tipo;
    el.dataset.id = j.id;
    aplicarEstilo(el, j);
    aplicarGeometria(el, j);
    const corpo = el.querySelector('.corpo-modulo');
    // || {}: tipo que não devolve nada também funciona
    const inst = TIPOS[j.tipo].montar(corpo, j, api) || {};
    vivas.set(j.id, { el, inst });
    definirEditaveis(el);
    return el;
  }

  // o contrário de montar: avisa o conteúdo (para liberar memória, parar música...) e tira da tela
  function desmontar(j){
    const viva = vivas.get(j.id);
    if(!viva) return;
    if(viva.inst.destruir) viva.inst.destruir();
    viva.el.remove();
    vivas.delete(j.id);
  }

  // joga tudo fora e monta tudo de novo
  function renderizarTudo(){
    janelas.forEach(desmontar);
    janelas.forEach(j => mesa.append(montar(j)));
    atualizarMesa();
  }

  // a partir de qualquer elemento dentro de uma janela, acha os dados dela
  const achar = (el) => janelas.find(j => j.id === +el.closest('.modulo').dataset.id);

  // a janela tem algo que se perde se ela for apagada? (texto escrito, imagem, música...)
  function temConteudo(j){
    const viva = vivas.get(j.id);
    return !!(viva && viva.inst.temConteudo && viva.inst.temConteudo());
  }

  /* ---------- modo edição ---------- */

  // liga ou desliga o modo edição. sem argumento, inverte
  // também é usado pelo app.js para desligar ao sair do perfil
  function alternarEdicao(ligar = !editando){
    editando = ligar;
    // a classe "editando" mostra as alças, os botões das janelas e as barras escondidas (style.css)
    vista.classList.toggle('editando', editando);
    botaoEdicao.setAttribute('aria-pressed', editando);
    botaoEdicao.textContent = editando ? 'concluir' : 'editar espaço';
    definirEditaveis(mesa);
    if(!editando){
      Zen.janelas.fechar('janela-propriedades');
      Zen.janelas.fechar('janela-tipos');
    }
    atualizarMesa();
  }

  botaoEdicao.addEventListener('click', () => alternarEdicao());

  // nome e @ são uma linha só: Enter confirma
  mesa.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && e.target.hasAttribute('data-linha')){
      e.preventDefault();
      e.target.blur();
    }
  });

  /* ---------- arrastar e redimensionar (Pointer Events nativos) ---------- */

  // arredonda para o múltiplo de 6 mais perto, para as janelas alinharem fácil
  const encaixar = (v) => Math.round(v / LIMITES.passo) * LIMITES.passo;

  // um ouvinte na mesa cuida de todas as janelas: pela barra arrasta, pela alça (canto) redimensiona
  mesa.addEventListener('pointerdown', (e) => {
    if(!editando || e.button !== 0) return;
    const modulo = e.target.closest('.modulo');
    if(!modulo) return;
    // clicar não muda a camada: a composição só muda pelas propriedades
    const j = achar(modulo);

    const barra = e.target.closest('.titlebar');
    const alca = e.target.closest('.alca');
    // clicou num botão da barra, ou fora da barra e da alça: não é arraste
    if(!podeArrastar.matches || e.target.closest('button') || (!barra && !alca)) return;
    e.preventDefault();

    const alvo = alca || barra;
    // foto de como estava no começo: o movimento é sempre calculado a partir daqui
    const inicio = { px: e.clientX, py: e.clientY, x: j.x, y: j.y, w: j.w, h: j.h };
    const [minW, minH] = minimoDe(j.tipo);
    alvo.setPointerCapture(e.pointerId);
    modulo.classList.add('arrastando');

    function mover(ev){
      // quanto o mouse andou desde o clique
      const dx = ev.clientX - inicio.px, dy = ev.clientY - inicio.py;
      const largura = larguraDisponivel();
      if(alca){
        // redimensionar: cresce para a direita e para baixo, respeitando mínimo e as bordas da mesa
        j.w = entre(encaixar(inicio.w + dx), minW, Math.max(minW, Math.min(largura - j.x, largura)));
        j.h = entre(encaixar(inicio.h + dy), minH, Math.max(minH, Math.min(LIMITES.alturaMaxima, LIMITES.alturaMesa - j.y)));
      }else{
        // limites da área do perfil: não sai pelas laterais, pelo topo nem passa do fim da mesa
        j.x = encaixar(inicio.x + dx);
        j.y = encaixar(inicio.y + dy);
        prenderNaMesa(j);
      }
      aplicarGeometria(modulo, j);
      atualizarMesa();
    }

    function soltar(){
      modulo.classList.remove('arrastando');
      // se o painel de propriedades está aberto para esta janela, atualiza os números lá
      if(propriedadesDe === j) preencherGeometria();
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerup', soltar);
      alvo.removeEventListener('pointercancel', soltar);
      salvar();
    }

    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerup', soltar);
    alvo.addEventListener('pointercancel', soltar);
  });

  window.addEventListener('resize', () => {
    janelas.forEach(j => aplicarGeometria(vivas.get(j.id).el, j));
  });

  /* ---------- adicionar, trocar, remover ---------- */

  // a mesma janelinha serve para "nova janela" e para "trocar tipo"
  const janelaTipos = document.getElementById('janela-tipos');
  const listaTipos = document.getElementById('lista-tipos');
  let trocando = null; // janela sendo trocada; null = adicionando

  // monta um botão para cada tipo: ícone + nome + descrição
  Object.entries(TIPOS).forEach(([id, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tipo-opcao';
    b.dataset.tipo = id;
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONES[id]}</svg>
      <span><strong></strong><small></small></span>`;
    b.querySelector('strong').textContent = t.nome;
    b.querySelector('small').textContent = t.descricao;
    b.addEventListener('click', () => escolherTipo(id));
    listaTipos.append(b);
  });

  // abre a lista de tipos. janela = trocar o tipo dela · null = adicionar uma nova
  function abrirTipos(janela){
    trocando = janela || null;
    document.getElementById('titulo-tipos').textContent = trocando ? 'trocar_tipo.exe' : 'nova_janela.exe';
    document.getElementById('mensagem-tipos').textContent = trocando
      ? `trocar "${trocando.titulo}" por:`
      : 'que tipo de janela?';
    // trocar texto por texto não faz sentido, então o tipo atual fica desativado
    listaTipos.querySelectorAll('.tipo-opcao').forEach(b => { b.disabled = !!trocando && b.dataset.tipo === trocando.tipo; });
    // fecha e abre de novo para atualizar o conteúdo e trazer para frente
    Zen.janelas.fechar(janelaTipos);
    Zen.janelas.abrir(janelaTipos);
  }

  // procura o primeiro cantinho vazio para uma janela w×h (de cima para baixo, da esquerda para a direita)
  // testa de 18 em 18px, com 12px de folga entre janelas. não achou? vai para baixo de tudo
  function espacoLivre(w, h){
    const largura = larguraMesa();
    w = Math.min(w, largura);
    const colide = (x, y) => janelas.some(j => x < j.x + j.w + 12 && x + w + 12 > j.x && y < j.y + j.h + 12 && y + h + 12 > j.y);
    const limite = janelas.reduce((m, j) => Math.max(m, j.y + j.h), 0) + 18;
    for(let y = 0; y <= limite; y += 18){
      for(let x = 0; x + w <= largura; x += 18){
        if(!colide(x, y)) return { x, y };
      }
    }
    return { x: 0, y: limite };
  }

  // clicou num tipo da lista: troca o tipo da janela ou cria uma nova
  async function escolherTipo(tipo){
    const t = TIPOS[tipo];
    Zen.janelas.fechar(janelaTipos);

    if(trocando){
      const antiga = trocando;
      // tem conteúdo? pergunta antes. se disser não, deixa como está
      if(temConteudo(antiga) && !await Zen.confirmar(
        `o conteúdo de "${antiga.titulo}" será perdido ao trocar para ${t.nome}. continuar?`, 'trocar')) return;
      if(propriedadesDe === antiga) Zen.janelas.fechar('janela-propriedades');
      // mantém posição, tamanho e estilo; o conteúdo recomeça
      const [minW, minH] = minimoDe(tipo);
      const nova = normalizar({ ...antiga, tipo, titulo: t.titulo, mostrarTitulo: undefined, dados: {},
        w: Math.max(antiga.w, minW), h: Math.max(antiga.h, minH) });
      prenderNaMesa(nova);
      // troca no mesmo lugar da lista, para não mudar a ordem das outras
      const indice = janelas.indexOf(antiga);
      desmontar(antiga);
      janelas[indice] = nova;
      mesa.append(montar(nova));
    }else{
      const [w, h] = t.tamanho;
      // a janela nova nasce na camada mais alta que já existe, para ficar visível
      const topo = janelas.reduce((m, o) => Math.max(m, o.camada), LIMITES.camadaMin);
      const nova = normalizar({ tipo, ...espacoLivre(w, h), w, h, camada: topo });
      prenderNaMesa(nova);
      janelas.push(nova);
      const el = montar(nova);
      mesa.append(el);
      atualizarMesa();
      // rola a página até a janela nova, caso ela tenha nascido lá embaixo
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    atualizarMesa();
    salvar();
  }

  // apaga uma janela (perguntando antes, se tiver conteúdo)
  async function remover(j){
    if(temConteudo(j) && !await Zen.confirmar(`remover "${j.titulo}"? o conteúdo dela será perdido.`, 'remover')) return;
    if(propriedadesDe === j) Zen.janelas.fechar('janela-propriedades');
    desmontar(j);
    janelas = janelas.filter(o => o !== j);
    atualizarMesa();
    salvar();
  }

  document.getElementById('adicionar-modulo').addEventListener('click', () => abrirTipos(null));

  // botão do pânico: volta para o perfil de fábrica
  document.getElementById('restaurar-layout').addEventListener('click', async () => {
    if(!await Zen.confirmar('voltar ao layout padrão? as janelas atuais e seus conteúdos serão substituídos.', 'restaurar')) return;
    Zen.janelas.fechar('janela-propriedades');
    janelas.forEach(desmontar);
    janelas = PADRAO.map(normalizar);
    renderizarTudo();
    try{ localStorage.removeItem(CHAVE); }catch(e){}
  });

  // os botões da barra de cada janela (remover, trocar, propriedades) têm data-acao
  mesa.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-acao]');
    if(!botao) return;
    const j = achar(botao);
    if(botao.dataset.acao === 'remover') remover(j);
    if(botao.dataset.acao === 'trocar') abrirTipos(j);
    if(botao.dataset.acao === 'propriedades') abrirPropriedades(j);
  });

  /* ---------- propriedades de uma janela ---------- */

  const janelaProps = document.getElementById('janela-propriedades');
  const formProps = document.getElementById('form-propriedades');
  // onde entram as opções e ações específicas do tipo (zoom da imagem etc.)
  const opcoesTipo = document.getElementById('opcoes-tipo');
  const avisoProps = formProps.querySelector('.aviso-contraste');
  // a janela cujas propriedades estão abertas (null = painel fechado)
  // ela é declarada aqui embaixo mas usada lá em cima: funciona porque só é lida depois que tudo carregou
  let propriedadesDe = null;

  // as cores que a janela está usando DE VERDADE: as dela, ou as do tema onde ela não tem
  // ?? em vez de ||: opacidade 0 é um valor válido e não pode virar a do tema
  function efetivo(j){
    const tema = Zen.aparencia.tema();
    return {
      janela: j.estilo.janela || tema.janela,
      titulo: j.estilo.titulo || tema.titulo,
      texto: j.estilo.texto || tema.texto,
      opacidade: j.estilo.opacidade ?? tema.opacidade
    };
  }

  // enche o painel com os valores da janela selecionada e cria as opções/ações do tipo dela
  function preencherPropriedades(){
    const j = propriedadesDe;
    const cor = efetivo(j);
    // f.titulo, f.corJanela... = os campos do formulário pelo atributo name
    const f = formProps.elements;
    f.titulo.value = j.titulo;
    f.mostrarTitulo.checked = j.mostrarTitulo;
    f.corJanela.value = cor.janela;
    f.corTitulo.value = cor.titulo;
    f.corTexto.value = cor.texto;
    f.opacidade.value = cor.opacidade;
    f.opacidade.parentElement.querySelector('output').textContent = Math.round(cor.opacidade * 100) + '%';
    avisoProps.hidden = Zen.cores.contraste(cor.texto, cor.janela) >= 3;
    document.getElementById('titulo-propriedades').textContent = 'propriedades · ' + j.titulo;
    preencherGeometria();
    esconderErro(erroTamanho);
    esconderErro(erroCamada);

    // opções do tipo: com faixa vira slider, sem faixa vira select
    opcoesTipo.innerHTML = '';
    (TIPOS[j.tipo].opcoes || []).forEach(op => {
      const rotulo = document.createElement('label');
      if(op.faixa){
        const [min, max, passo] = op.faixa;
        rotulo.className = 'ajuste';
        rotulo.innerHTML = `<span></span><input type="range" min="${min}" max="${max}" step="${passo}"><output></output>`;
        const faixa = rotulo.querySelector('input');
        // data-opcao diz ao ouvinte 'input' lá embaixo qual dado mudar
        faixa.dataset.opcao = op.nome;
        faixa.dataset.sufixo = op.sufixo || '';
        faixa.value = j.dados[op.nome] ?? op.padrao;
        rotulo.querySelector('output').textContent = faixa.value + faixa.dataset.sufixo;
      }else{
        rotulo.className = 'ajuste-texto';
        rotulo.innerHTML = '<span></span><select></select>';
        const select = rotulo.querySelector('select');
        select.dataset.opcao = op.nome;
        op.valores.forEach(([valor, texto]) => select.append(new Option(texto, valor)));
        select.value = j.dados[op.nome] || op.valores[0][0];
      }
      rotulo.querySelector('span').textContent = op.rotulo;
      opcoesTipo.append(rotulo);
    });

    // ações do tipo: ficam desativadas até ter conteúdo (ex.: sem imagem não tem o que encaixar)
    const acoes = TIPOS[j.tipo].acoes || [];
    if(acoes.length){
      const viva = vivas.get(j.id);
      const pronta = !!(viva.inst.temConteudo && viva.inst.temConteudo());
      const linha = document.createElement('div');
      linha.className = 'linha acoes-tipo';
      acoes.forEach(acao => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'botao pequeno';
        b.textContent = acao.rotulo;
        b.title = pronta ? acao.titulo : 'escolha uma imagem primeiro';
        b.disabled = !pronta;
        b.addEventListener('click', () => {
          acao.executar(j, viva.inst, { encaixarProporcao });
          if(viva.inst.atualizar) viva.inst.atualizar();
          // a ação pode ter mudado os dados: redesenha o painel
          preencherPropriedades();
          salvar();
        });
        linha.append(b);
      });
      opcoesTipo.append(linha);
    }
  }

  // abre o painel para uma janela e deixa ela com o contorno de "selecionada"
  function abrirPropriedades(j){
    document.querySelectorAll('.modulo.selecionado').forEach(el => el.classList.remove('selecionado'));
    propriedadesDe = j;
    vivas.get(j.id).el.classList.add('selecionado');
    preencherPropriedades();
    Zen.janelas.abrir(janelaProps);
  }

  // fechou o painel (pelo X, Esc ou qualquer outro jeito): tira a seleção
  janelaProps.addEventListener('zen:fechar', () => {
    document.querySelectorAll('.modulo.selecionado').forEach(el => el.classList.remove('selecionado'));
    propriedadesDe = null;
  });

  formProps.addEventListener('submit', (e) => e.preventDefault());

  // qualquer campo do painel mudou: aplica na hora
  formProps.addEventListener('input', (e) => {
    const j = propriedadesDe;
    const campo = e.target;
    // tamanho e camada só valem depois de validados (ver abaixo)
    if(!j || campo.closest('[data-geo]')) return;
    const viva = vivas.get(j.id);
    if(campo.dataset.opcao){
      // opção do tipo (zoom, ajuste, posição): vai para j.dados
      j.dados[campo.dataset.opcao] = campo.type === 'range' ? Number(campo.value) : campo.value;
      if(campo.type === 'range') campo.nextElementSibling.textContent = campo.value + campo.dataset.sufixo;
      if(viva.inst.atualizar) viva.inst.atualizar();
    }else{
      // campo comum: título, mostrar título, opacidade ou uma das cores (vão para j.estilo)
      const mapa = { corJanela: 'janela', corTitulo: 'titulo', corTexto: 'texto' };
      if(campo.name === 'titulo') j.titulo = campo.value;
      else if(campo.name === 'mostrarTitulo') j.mostrarTitulo = campo.checked;
      else if(campo.name === 'opacidade') j.estilo.opacidade = Number(campo.value);
      else if(mapa[campo.name]) j.estilo[mapa[campo.name]] = campo.value;
      aplicarEstilo(viva.el, j);
      const cor = efetivo(j);
      avisoProps.hidden = Zen.cores.contraste(cor.texto, cor.janela) >= 3;
      formProps.elements.opacidade.parentElement.querySelector('output').textContent = Math.round(cor.opacidade * 100) + '%';
      document.getElementById('titulo-propriedades').textContent = 'propriedades · ' + j.titulo;
    }
    salvar();
  });

  // botão "usar tema global": apaga as cores próprias da janela
  document.getElementById('propriedades-tema').addEventListener('click', () => {
    const j = propriedadesDe;
    if(!j) return;
    j.estilo = {};
    aplicarEstilo(vivas.get(j.id).el, j);
    preencherPropriedades();
    salvar();
  });

  /* ---------- tamanho e camada de uma janela ---------- */

  const botoesTamanho = [...formProps.querySelectorAll('[data-tamanho]')];
  const tamanhoLivre = document.getElementById('tamanho-livre');
  const dicaTamanho = document.getElementById('dica-tamanho');
  const erroTamanho = document.getElementById('erro-tamanho');
  const erroCamada = document.getElementById('erro-camada');
  const campoLargura = formProps.elements.largura;
  const campoAltura = formProps.elements.altura;
  const campoCamada = formProps.elements.camada;

  // os limites do HTML vêm do LIMITES, assim só existe um lugar para mudar
  campoCamada.min = LIMITES.camadaMin;
  campoCamada.max = LIMITES.camadaMax;
  [campoLargura, campoAltura].forEach(c => { c.min = LIMITES.minimo; c.step = LIMITES.passo; });

  // mostra o erro numa caixa e marca de vermelho só os campos culpados
  function mostrarErro(caixa, texto, campos){
    caixa.querySelector('span').textContent = texto;
    caixa.hidden = false;
    caixa.closest('fieldset').querySelectorAll('[aria-invalid]').forEach(c => c.removeAttribute('aria-invalid'));
    campos.forEach(c => c.setAttribute('aria-invalid', 'true'));
  }

  function esconderErro(caixa){
    caixa.hidden = true;
    caixa.closest('fieldset').querySelectorAll('[aria-invalid]').forEach(c => c.removeAttribute('aria-invalid'));
  }

  // o X das caixas de erro
  formProps.querySelectorAll('.erro-campo button').forEach(b => b.addEventListener('click', () => {
    esconderErro(b.closest('.erro-campo'));
    preencherGeometria(); // volta a mostrar os valores realmente aplicados
  }));

  // a janela está exatamente num preset (ex.: 240×240 = 4)? devolve o número, ou undefined
  const presetDe = (j) => PRESETS.find(n => j.w === n * LIMITES.celula && j.h === n * LIMITES.celula);

  // marca o botão de tamanho escolhido. "personalizado" também mostra os campos de largura e altura
  function marcarTamanho(selecionado){
    botoesTamanho.forEach(b => b.setAttribute('aria-pressed', b.dataset.tamanho === String(selecionado)));
    tamanhoLivre.hidden = selecionado !== 'personalizado';
  }

  // enche a parte de tamanho/camada do painel e desativa os presets que não cabem
  function preencherGeometria(){
    const j = propriedadesDe;
    if(!j) return;
    const [minW, minH] = minimoDe(j.tipo);
    const [maxW, maxH] = maximo();
    marcarTamanho(presetDe(j) || 'personalizado');
    botoesTamanho.forEach(b => {
      const n = +b.dataset.tamanho;
      // o botão "personalizado" não tem número: pula
      if(!n) return;
      const lado = n * LIMITES.celula;
      // o motivo vira a dica do botão desativado, para a pessoa saber por que não dá
      const motivo = lado < minW || lado < minH ? `pequeno demais para ${TIPOS[j.tipo].nome}`
        : lado > maxW || lado > maxH ? 'maior que a área do perfil' : '';
      b.disabled = !!motivo;
      b.title = motivo || `${lado}×${lado} px`;
    });
    campoLargura.value = j.w;
    campoAltura.value = j.h;
    campoCamada.value = j.camada;
    dicaTamanho.textContent = `1 célula = ${LIMITES.celula}px · mín. ${minW}×${minH} · máx. ${maxW}×${maxH} px`;
  }

  // tenta mudar o tamanho. inválido = mostra o erro e devolve false; válido = aplica, salva e devolve true
  // campos: quais campos marcar de vermelho se der erro
  function redimensionar(j, w, h, campos){
    const erro = validarTamanho(j.tipo, w, h);
    if(erro){ mostrarErro(erroTamanho, erro, campos); return false; }
    esconderErro(erroTamanho);
    j.w = w;
    j.h = h;
    prenderNaMesa(j);
    aplicarGeometria(vivas.get(j.id).el, j);
    atualizarMesa();
    salvar();
    return true;
  }

  // mede as bordas e a barra de título da janela e acha o tamanho em que o conteúdo tem a proporção pedida
  // proporcao = largura ÷ altura (ex.: 16/9 = 1.77)
  function encaixarProporcao(j, proporcao){
    if(!proporcao) return false;
    const { el } = vivas.get(j.id);
    const corpo = el.querySelector('.corpo-modulo');
    const barra = el.querySelector('.titlebar');
    // extra = o que a moldura ocupa a mais que o conteúdo (bordas, barra...)
    const extraW = el.offsetWidth - corpo.clientWidth;
    // sem título, a barra só aparece no modo edição: não conta para o perfil final
    const extraH = el.offsetHeight - corpo.clientHeight - (j.mostrarTitulo ? 0 : barra.offsetHeight);
    const [minW, minH] = minimoDe(j.tipo);
    const [maxW, maxH] = maximo();
    const alturaPara = (w) => Math.round(extraH + (w - extraW) / proporcao);
    const larguraPara = (h) => Math.round(extraW + (h - extraH) * proporcao);
    // começa mantendo a largura e calcula a altura. se estourar algum limite, corrige pelo outro lado
    let w = j.w, h = alturaPara(w);
    if(h > maxH){ h = maxH; w = larguraPara(h); }
    if(h < minH){ h = minH; w = larguraPara(h); }
    if(w < minW){ w = minW; h = alturaPara(w); }
    if(w > maxW){ w = maxW; h = alturaPara(w); }
    return redimensionar(j, w, h, []);
  }

  // campo vazio vira NaN (e não 0, que é o que Number('') daria. obrigado javascript)
  const lerNumero = (campo) => campo.value.trim() === '' ? NaN : Number(campo.value);

  // botões 2x2 / 4x4 / 6x6 / personalizado
  botoesTamanho.forEach(b => b.addEventListener('click', () => {
    const j = propriedadesDe;
    if(!j) return;
    if(b.dataset.tamanho === 'personalizado'){
      marcarTamanho('personalizado');
      campoLargura.focus();
      return;
    }
    const lado = +b.dataset.tamanho * LIMITES.celula;
    if(redimensionar(j, lado, lado, [])) preencherGeometria();
  }));

  // aplica o que foi digitado em largura e altura
  function aplicarTamanhoLivre(){
    const j = propriedadesDe;
    if(!j) return;
    const w = lerNumero(campoLargura), h = lerNumero(campoAltura);
    // testa cada medida separada para saber qual campo está errado (ou os dois)
    const ruins = [];
    if(validarTamanho(j.tipo, w, j.h)) ruins.push(campoLargura);
    if(validarTamanho(j.tipo, j.w, h)) ruins.push(campoAltura);
    if(redimensionar(j, w, h, ruins.length ? ruins : [campoLargura, campoAltura])){
      preencherGeometria();
      marcarTamanho(presetDe(j) || 'personalizado');
    }
  }

  document.getElementById('aplicar-tamanho').addEventListener('click', aplicarTamanhoLivre);

  // tenta mudar a camada. mesma lógica do redimensionar: erro → false, ok → aplica e true
  function definirCamada(j, valor){
    const erro = validarCamada(valor);
    if(erro){ mostrarErro(erroCamada, erro, [campoCamada]); return false; }
    esconderErro(erroCamada);
    j.camada = valor;
    campoCamada.value = valor;
    atualizarMesa();
    salvar();
    return true;
  }

  // em camadas iguais vale a ordem no documento: fundo/frente também reordenam
  function reordenar(j, paraFrente){
    janelas = paraFrente ? janelas.filter(o => o !== j).concat(j) : [j, ...janelas.filter(o => o !== j)];
    const el = vivas.get(j.id).el;
    if(paraFrente) mesa.append(el); else mesa.prepend(el);
  }

  // botões de camada: frente, fundo, subir e descer
  formProps.querySelectorAll('[data-camada]').forEach(b => b.addEventListener('click', () => {
    const j = propriedadesDe;
    if(!j) return;
    const outras = janelas.filter(o => o !== j).map(o => o.camada);
    const acao = b.dataset.camada;
    if(acao === 'frente' || acao === 'fundo'){
      // frente = 1 acima da mais alta das outras · fundo = 1 abaixo da mais baixa
      const frente = acao === 'frente';
      const extremo = outras.length ? (frente ? Math.max(...outras) : Math.min(...outras)) : j.camada;
      const jaEsta = frente ? j.camada > extremo : j.camada < extremo;
      if(jaEsta || !outras.length){
        mostrarErro(erroCamada, frente ? 'esta janela já está na frente de todas.' : 'esta janela já está atrás de todas.', []);
        return;
      }
      reordenar(j, frente);
      definirCamada(j, entre(extremo + (frente ? 1 : -1), LIMITES.camadaMin, LIMITES.camadaMax));
      return;
    }
    // subir / descer: só +1 ou -1
    const valor = j.camada + (acao === 'subir' ? 1 : -1);
    if(valor > LIMITES.camadaMax || valor < LIMITES.camadaMin){
      mostrarErro(erroCamada, valor > LIMITES.camadaMax
        ? `a camada máxima é ${LIMITES.camadaMax}: menus e avisos do zen ficam acima dela.`
        : `a camada mínima é ${LIMITES.camadaMin}.`, []);
      return;
    }
    definirCamada(j, valor);
  }));

  // digitou a camada na mão e saiu do campo
  campoCamada.addEventListener('change', () => {
    if(propriedadesDe) definirCamada(propriedadesDe, lerNumero(campoCamada));
  });

  // enter aplica o campo sem enviar o formulário
  formProps.addEventListener('keydown', (e) => {
    if(e.key !== 'Enter' || !e.target.closest('[data-geo]') || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if(e.target === campoCamada) definirCamada(propriedadesDe, lerNumero(campoCamada));
    else aplicarTamanhoLivre();
  });

  /* ---------- início ---------- */

  // carrega o layout e monta tudo. chegou até aqui lendo? você merece um café
  janelas = carregar();
  renderizarTudo();
  // a largura real só existe quando o perfil aparece: reaplica ao abrir a vista
  new ResizeObserver(() => {
    janelas.forEach(j => aplicarGeometria(vivas.get(j.id).el, j));
    // com um erro na tela, mantém o valor digitado até o usuário corrigir ou fechar o aviso
    if(propriedadesDe && erroTamanho.hidden && erroCamada.hidden) preencherGeometria();
  }).observe(mesa);

  // o app.js usa alternarEdicao; tipos e limites ficam expostos para quem quiser espiar pelo console
  Zen.perfil = { alternarEdicao, tipos: TIPOS, limites: LIMITES };
})();
