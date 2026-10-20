/* zen · aparência
   preferências visuais do painel de controle (painel_de_controle.exe).
   guarda SOMENTE escolhas de aparência no localStorage — nada de conta, sessão ou senha.
   carrega no <head> para aplicar as preferências antes da página aparecer.

   ferramentas expostas:
   - Zen.imagens   → abre e confere imagens escolhidas pelo usuário
   - Zen.cores     → contas com cores (misturar, contraste...)
   - Zen.aparencia → tema(): as cores atuais, usadas pelas janelas do perfil

   o resto (painel de controle) só liga depois que a página termina de carregar (DOMContentLoaded) */
window.Zen = window.Zen || {};

/* imagens escolhidas pelo usuário (foto, janela de imagem, papel de parede).
   não confia só em arquivo.type: no Linux ele vem do banco de MIME do sistema e pode chegar vazio.
   quem decide é o próprio navegador, tentando decodificar a imagem. */
Zen.imagens = {
  // o que aparece na janela de escolher arquivo
  ACEITAR: 'image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.avif,.bmp,.svg,.ico',
  EXTENSOES: /\.(png|jpe?g|jfif|gif|webp|avif|bmp|svg|ico)$/i,

  // devolve uma object URL já testada, ou rejeita com uma mensagem para mostrar ao usuário
  // uso: const url = await Zen.imagens.abrir(arquivo)  (sempre dentro de try/catch)
  abrir(arquivo){
    return new Promise((resolver, rejeitar) => {
      if(!arquivo) return rejeitar(new Error('nenhum arquivo escolhido.'));
      // tipo vazio também passa: deixa o navegador tentar e ver no que dá
      const pareceImagem = arquivo.type.startsWith('image/') || Zen.imagens.EXTENSOES.test(arquivo.name) || !arquivo.type;
      if(!pareceImagem) return rejeitar(new Error(`"${arquivo.name}" não é uma imagem.`));
      const url = URL.createObjectURL(arquivo);
      // carrega numa <img> invisível só para testar
      const teste = new Image();
      teste.onload = () => resolver(url);
      teste.onerror = async () => {
        URL.revokeObjectURL(url);
        // não abriu: tenta descobrir o motivo para dar uma mensagem útil
        const real = await Zen.imagens.formatoReal(arquivo);
        rejeitar(new Error(real
          ? `"${arquivo.name}" na verdade é ${real}, que o navegador não abre. converta para .png ou .jpg.`
          : `não consegui abrir "${arquivo.name}". tente um .png, .jpg, .gif ou .webp.`));
      };
      teste.src = url;
    });
  },

  // muita foto ".jpg" é outro formato renomeado: os primeiros bytes contam a verdade
  // (todo formato começa com uma "assinatura" fixa, tipo um crachá. renomear o arquivo não troca o crachá)
  // devolve a descrição do formato verdadeiro, ou null se não reconheceu
  async formatoReal(arquivo){
    if(!arquivo.size) return 'um arquivo vazio (0 bytes)';
    // lê só os 16 primeiros bytes e transforma em texto para comparar
    const b = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
    const texto = String.fromCharCode(...b);
    // iphone mandando HEIC achando que é normal. não é
    if(/^....ftyp(heic|heix|hevc|mif1|msf1|heim|heis)/.test(texto)) return 'uma foto HEIC (formato do iPhone)';
    if(/^(II\*\0|MM\0\*)/.test(texto)) return 'um TIFF';
    // sim, tem gente que tenta colocar PDF de foto de perfil
    if(texto.startsWith('%PDF')) return 'um PDF';
    if(b[0] === 0xFF && b[1] === 0xD8) return 'um JPEG com codificação que o navegador não suporta (ex.: CMYK ou aritmética)';
    return null;
  }
};

/* utilitários de cor, também usados pelas janelas do perfil
   as cores entram e saem sempre no formato '#rrggbb' */
Zen.cores = {
  // '#ff8000' → [255, 128, 0]
  // o número inteiro tem 24 bits: >> 16 pega o vermelho, >> 8 & 255 o verde, & 255 o azul
  rgb(hex){
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, n >> 8 & 255, n & 255];
  },
  // [255, 128, 0] → '#ff8000'
  hex(rgb){
    return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  },
  // mistura duas tintas. peso 0 = só a, peso 1 = só b, 0.5 = meio a meio
  misturar(a, b, peso){
    const x = Zen.cores.rgb(a), y = Zen.cores.rgb(b);
    return Zen.cores.hex(x.map((v, i) => v * (1 - peso) + y[i] * peso));
  },
  // o quanto a cor "brilha" para o olho humano (0 = preto, 1 = branco). fórmula oficial do WCAG
  // os números mágicos vêm da norma. não pergunte, apenas aceite
  luminancia(hex){
    const [r, g, b] = Zen.cores.rgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    // o olho enxerga muito mais o verde, por isso ele pesa 0.7152
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  // contraste entre duas cores, de 1 (iguais) a 21 (preto no branco). abaixo de 3 fica difícil de ler
  contraste(a, b){
    const [l1, l2] = [Zen.cores.luminancia(a), Zen.cores.luminancia(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  },
  // texto da barra de título: branco como no visual original; escuro só em barras bem claras
  // a e b são o começo e o fim do degradê da barra
  textoSobre(a, b){
    const meio = Zen.cores.misturar(a, b || a, 0.5);
    return Zen.cores.contraste(meio, '#ffffff') >= 2.2 ? '#ffffff' : '#2e2c28';
  }
};

(function(){
  // nome da gaveta no localStorage
  const CHAVE = 'zen:aparencia';
  // o <html>: as variáveis CSS ficam nele e valem para a página toda
  const raiz = document.documentElement;

  /* ---------- as caixas de lápis de cor ---------- */

  // papéis de parede. imagem = qualquer coisa que o CSS aceita em background-image
  const FUNDOS = [
    { id: 'foto',       nome: 'campo (padrão)', imagem: "url('foto.png')" },
    // o fundo do windows 95. nostalgia que dói
    { id: 'teal',       nome: 'teal clássico',  imagem: 'linear-gradient(#3b7a78, #3b7a78)' },
    { id: 'crepusculo', nome: 'crepúsculo',     imagem: 'linear-gradient(180deg, #2d2f5e 0%, #8a5a8c 55%, #e3a46d 100%)' },
    { id: 'floresta',   nome: 'floresta',       imagem: 'linear-gradient(180deg, #9fb7a0 0%, #5f7d5a 50%, #33472f 100%)' },
    { id: 'noite',      nome: 'noite',          imagem: 'radial-gradient(circle at 70% 20%, #4a5785 0%, #1d2238 55%, #0f111d 100%)' }
  ];

  const CORES_JANELA = [
    { nome: 'bege (padrão)', cor: '#d9d3c4' },
    { nome: 'cinza',         cor: '#c3c3c3' },
    { nome: 'menta',         cor: '#cfdccb' },
    { nome: 'rosé',          cor: '#e6d3cf' },
    { nome: 'gelo',          cor: '#d6dbe8' }
  ];

  const CORES_TEXTO = [
    { nome: 'grafite (padrão)', cor: '#2e2c28' },
    { nome: 'tinta azul',       cor: '#1f3a5f' },
    { nome: 'musgo',            cor: '#33462a' },
    { nome: 'vinho',            cor: '#5a2a2e' },
    { nome: 'preto',            cor: '#000000' }
  ];

  // barras de título: degradê do início (esquerda) até o fim (direita)
  const TITULOS = [
    { nome: 'azul (padrão)', inicio: '#6b7fb0', fim: '#a9b8e0' },
    { nome: 'musgo',         inicio: '#5d7a4f', fim: '#a8c08a' },
    { nome: 'pôr do sol',    inicio: '#b0705b', fim: '#e8c07a' },
    { nome: 'lavanda',       inicio: '#7d6bb0', fim: '#c9b8e0' },
    { nome: 'grafite',       inicio: '#3f3f3f', fim: '#9a9a9a' }
  ];

  // pilha = lista de fontes em ordem de preferência: se não tem a primeira, tenta a próxima
  const FONTES = [
    { id: 'pixel',  nome: 'pixel · Silkscreen (padrão)', pilha: "'Silkscreen', monospace" },
    { id: 'mono',   nome: 'terminal · monospace',        pilha: "'Courier New', Courier, ui-monospace, monospace" },
    { id: 'serif',  nome: 'serifada · Georgia',          pilha: "Georgia, 'Times New Roman', serif" },
    // sem comic sans. a gente tem limites
    { id: 'sans',   nome: 'sistema · Tahoma',            pilha: "Tahoma, Verdana, 'DejaVu Sans', sans-serif" }
  ];

  // o visual de fábrica. os nomes batem com o atributo name dos campos do formulário no index.html
  const PADRAO = {
    fundo: 'foto',
    bgSize: 'cover',
    bgDim: 0,
    textColor: '#2e2c28',
    font: 'pixel',
    windowColor: '#d9d3c4',
    windowOpacity: 1,
    windowBlur: 0,
    shadowOffset: 5,
    borderWidth: 2,
    radius: 0,
    titleStart: '#6b7fb0',
    titleEnd: '#a9b8e0',
    titleGradient: true
  };

  // começa com o padrão e, por cima, cola o que estava salvo (o que estiver salvo ganha)
  let prefs = { ...PADRAO, ...ler() };
  let urlFundoLocal = null; // imagem escolhida pelo usuário (só existe nesta aba)

  /* ---------- caderninho (localStorage) ---------- */

  // lê as preferências salvas. se não tiver nada, ou estiver corrompido, devolve {}
  function ler(){
    try{
      return JSON.parse(localStorage.getItem(CHAVE)) || {};
    }catch(e){
      return {};
    }
  }

  // anota as preferências. o try é porque em aba anônima o localStorage pode simplesmente recusar
  function salvar(){
    // a imagem enviada não é persistida: ao recarregar, volta ao fundo padrão
    const copia = { ...prefs, fundo: prefs.fundo === 'upload' ? 'foto' : prefs.fundo };
    try{ localStorage.setItem(CHAVE, JSON.stringify(copia)); }catch(e){}
  }

  /* ---------- pintar ---------- */

  // não pinta peça por peça: troca as variáveis CSS do <html> e o style.css repinta tudo sozinho
  function aplicar(){
    const s = raiz.style;
    // fundo: a imagem do usuário (se escolheu uma) ou um dos FUNDOS prontos
    const fundo = prefs.fundo === 'upload' && urlFundoLocal
      ? `url("${urlFundoLocal}")`
      : (FUNDOS.find(f => f.id === prefs.fundo) || FUNDOS[0]).imagem;
    // degradê desligado = começo e fim iguais = cor sólida
    const fimTitulo = prefs.titleGradient ? prefs.titleEnd : prefs.titleStart;

    s.setProperty('--bg-image', fundo);
    s.setProperty('--bg-size', prefs.bgSize);
    // 'auto' = tamanho original da imagem, então repete tipo azulejo
    s.setProperty('--bg-repeat', prefs.bgSize === 'auto' ? 'repeat' : 'no-repeat');
    s.setProperty('--bg-dim', prefs.bgDim);
    s.setProperty('--text-dark', prefs.textColor);
    s.setProperty('--font', (FONTES.find(f => f.id === prefs.font) || FONTES[0]).pilha);
    s.setProperty('--bg-window', prefs.windowColor);
    s.setProperty('--window-opacity', prefs.windowOpacity);
    s.setProperty('--window-blur', prefs.windowBlur + 'px');
    s.setProperty('--shadow-offset', prefs.shadowOffset + 'px');
    s.setProperty('--border-width', prefs.borderWidth + 'px');
    s.setProperty('--radius', prefs.radius + 'px');
    s.setProperty('--title-start', prefs.titleStart);
    s.setProperty('--title-end', fimTitulo);
    s.setProperty('--title-text', Zen.cores.textoSobre(prefs.titleStart, fimTitulo));
  }

  // pinta já, antes da página aparecer (por isso este arquivo não tem defer)
  aplicar();

  // cores atuais do tema, usadas como ponto de partida nas propriedades de cada janela
  Zen.aparencia = {
    tema: () => ({ janela: prefs.windowColor, titulo: prefs.titleStart, texto: prefs.textColor, opacidade: prefs.windowOpacity })
  };

  /* ---------- painel de controle ---------- */

  // unidade mostrada ao lado de cada slider
  const UNIDADES = { windowBlur: 'px', shadowOffset: 'px', borderWidth: 'px', radius: 'px' };

  // texto do <output> ao lado do slider: 0.8 vira "80%", 5 vira "5px"
  function formatar(nome, valor){
    if(nome === 'windowOpacity' || nome === 'bgDim') return Math.round(valor * 100) + '%';
    return valor + (UNIDADES[nome] || '');
  }

  // cria um quadradinho clicável de amostra (de cor, de fundo...)
  // rotulo: o nome que aparece ao passar o mouse · estilo: o background · aoClicar: o que fazer
  function criarAmostra(rotulo, estilo, aoClicar){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'amostra';
    b.title = rotulo;
    b.setAttribute('aria-label', rotulo);
    b.setAttribute('aria-pressed', 'false');
    b.style.background = estilo;
    b.addEventListener('click', aoClicar);
    return b;
  }

  // monta o painel de controle e liga todos os campos dele
  function iniciarPainel(){
    const form = document.getElementById('form-config');
    // página sem painel (ex.: outra .html): não faz nada
    if(!form) return;

    const caixaFundos = document.getElementById('amostras-fundo');
    const caixaTexto = document.getElementById('amostras-texto');
    const caixaJanela = document.getElementById('amostras-janela');
    const caixaTitulo = document.getElementById('amostras-titulo');
    const arquivoFundo = document.getElementById('arquivo-fundo');
    const avisoContraste = form.querySelector('.aviso-contraste');
    // a amostra da imagem do usuário só nasce quando ele escolhe uma
    let amostraUpload = null;

    // preenche o <select> de fontes, cada opção já escrita na própria fonte
    FONTES.forEach(f => {
      const o = new Option(f.nome, f.id);
      o.style.fontFamily = f.pilha;
      form.elements.font.append(o);
    });

    // cria as amostras de cada caixa de lápis. dataset.valor serve para saber qual está marcada
    FUNDOS.forEach(f => {
      const b = criarAmostra(f.nome, `${f.imagem} center / cover`, () => mudar({ fundo: f.id }));
      b.dataset.valor = f.id;
      caixaFundos.append(b);
    });

    CORES_TEXTO.forEach(c => {
      const b = criarAmostra(c.nome, c.cor, () => mudar({ textColor: c.cor }));
      b.dataset.valor = c.cor;
      caixaTexto.append(b);
    });

    CORES_JANELA.forEach(c => {
      const b = criarAmostra(c.nome, c.cor, () => mudar({ windowColor: c.cor }));
      b.dataset.valor = c.cor;
      caixaJanela.append(b);
    });

    TITULOS.forEach(t => {
      const b = criarAmostra(t.nome, `linear-gradient(90deg, ${t.inicio}, ${t.fim})`,
        () => mudar({ titleStart: t.inicio, titleEnd: t.fim, titleGradient: true }));
      // título tem duas cores, então o "valor" é as duas grudadas
      b.dataset.valor = t.inicio + t.fim;
      caixaTitulo.append(b);
    });

    // marca como apertada a amostra cujo valor é o atual (as outras desmarcam)
    const marcar = (caixa, valor) => caixa.querySelectorAll('.amostra').forEach(b =>
      b.setAttribute('aria-pressed', b.dataset.valor === valor));

    // faz o formulário mostrar o que está em prefs (o caminho contrário do ouvinte 'input' lá embaixo)
    function sincronizar(){
      for(const campo of form.elements){
        if(!campo.name || !(campo.name in prefs)) continue;
        if(campo.type === 'checkbox') campo.checked = prefs[campo.name];
        else campo.value = prefs[campo.name];
        const saida = campo.parentElement.querySelector('output');
        if(saida) saida.textContent = formatar(campo.name, prefs[campo.name]);
      }
      marcar(caixaFundos, prefs.fundo);
      // toLowerCase: o <input type="color"> devolve minúsculo, as listas também são
      marcar(caixaTexto, prefs.textColor.toLowerCase());
      marcar(caixaJanela, prefs.windowColor.toLowerCase());
      // título sem degradê não bate com nenhuma amostra, então nenhuma fica marcada
      marcar(caixaTitulo, prefs.titleGradient ? (prefs.titleStart + prefs.titleEnd).toLowerCase() : '');
      // texto ilegível em cima da janela? mostra o aviso
      avisoContraste.hidden = Zen.cores.contraste(prefs.textColor, prefs.windowColor) >= 3;
    }

    // o ciclo completo de qualquer mudança: trocar → pintar → anotar → atualizar o painel
    function mudar(parcial){
      Object.assign(prefs, parcial);
      aplicar();
      salvar();
      sincronizar();
    }

    // sliders, cores, selects e checkbox: atualizam em tempo real
    // um ouvinte só para o formulário inteiro: o name do campo diz qual preferência mudou
    form.addEventListener('input', (e) => {
      const campo = e.target;
      if(!campo.name || !(campo.name in prefs)) return;
      let valor = campo.value;
      if(campo.type === 'checkbox') valor = campo.checked;
      // slider devolve texto ("5"), mas a gente quer número (5)
      else if(campo.type === 'range') valor = Number(valor);
      // [campo.name] entre colchetes = usa o VALOR da variável como nome da chave
      mudar({ [campo.name]: valor });
    });

    form.addEventListener('submit', (e) => e.preventDefault());

    // fundo do próprio computador: lido localmente via object URL, nunca enviado
    arquivoFundo.accept = Zen.imagens.ACEITAR;
    arquivoFundo.addEventListener('change', async () => {
      const arquivo = arquivoFundo.files[0];
      arquivoFundo.value = '';
      if(!arquivo) return;
      let url;
      try{ url = await Zen.imagens.abrir(arquivo); }
      catch(erro){ Zen.avisar(erro.message); return; }
      if(urlFundoLocal) URL.revokeObjectURL(urlFundoLocal);
      urlFundoLocal = url;

      // primeira imagem escolhida: cria a amostra dela no fim da lista de fundos
      if(!amostraUpload){
        amostraUpload = criarAmostra('', '', () => mudar({ fundo: 'upload' }));
        amostraUpload.dataset.valor = 'upload';
        caixaFundos.append(amostraUpload);
      }
      amostraUpload.title = 'sua imagem: ' + arquivo.name;
      amostraUpload.setAttribute('aria-label', amostraUpload.title);
      amostraUpload.style.background = `url("${urlFundoLocal}") center / cover`;
      mudar({ fundo: 'upload' });
    });

    // botão "restaurar": volta tudo para o PADRAO e apaga o caderninho
    document.getElementById('restaurar-aparencia').addEventListener('click', () => {
      prefs = { ...PADRAO };
      aplicar();
      try{ localStorage.removeItem(CHAVE); }catch(e){}
      sincronizar();
    });

    sincronizar();
  }

  // o painel está no HTML lá embaixo: espera a página terminar de carregar para procurar ele
  document.addEventListener('DOMContentLoaded', iniciarPainel);
})();
