/* Zen · aparência
   Preferências visuais do painel de controle (painel_de_controle.exe).
   Guarda SOMENTE escolhas de aparência no localStorage — nada de conta, sessão ou senha.
   Carrega no <head> para aplicar as preferências antes da página aparecer. */
window.Zen = window.Zen || {};

/* imagens escolhidas pelo usuário (foto, janela de imagem, papel de parede).
   Não confia só em arquivo.type: no Linux ele vem do banco de MIME do sistema e pode chegar vazio.
   Quem decide é o próprio navegador, tentando decodificar a imagem. */
Zen.imagens = {
  ACEITAR: 'image/*,.png,.jpg,.jpeg,.jfif,.gif,.webp,.avif,.bmp,.svg,.ico',
  EXTENSOES: /\.(png|jpe?g|jfif|gif|webp|avif|bmp|svg|ico)$/i,

  // devolve uma object URL já testada, ou rejeita com uma mensagem para mostrar ao usuário
  abrir(arquivo){
    return new Promise((resolver, rejeitar) => {
      if(!arquivo) return rejeitar(new Error('nenhum arquivo escolhido.'));
      const pareceImagem = arquivo.type.startsWith('image/') || Zen.imagens.EXTENSOES.test(arquivo.name) || !arquivo.type;
      if(!pareceImagem) return rejeitar(new Error(`"${arquivo.name}" não é uma imagem.`));
      const url = URL.createObjectURL(arquivo);
      const teste = new Image();
      teste.onload = () => resolver(url);
      teste.onerror = async () => {
        URL.revokeObjectURL(url);
        const real = await Zen.imagens.formatoReal(arquivo);
        rejeitar(new Error(real
          ? `"${arquivo.name}" na verdade é ${real}, que o navegador não abre. converta para .png ou .jpg.`
          : `não consegui abrir "${arquivo.name}". tente um .png, .jpg, .gif ou .webp.`));
      };
      teste.src = url;
    });
  },

  // muita foto ".jpg" é outro formato renomeado: os primeiros bytes contam a verdade
  async formatoReal(arquivo){
    if(!arquivo.size) return 'um arquivo vazio (0 bytes)';
    const b = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
    const texto = String.fromCharCode(...b);
    if(/^....ftyp(heic|heix|hevc|mif1|msf1|heim|heis)/.test(texto)) return 'uma foto HEIC (formato do iPhone)';
    if(/^(II\*\0|MM\0\*)/.test(texto)) return 'um TIFF';
    if(texto.startsWith('%PDF')) return 'um PDF';
    if(b[0] === 0xFF && b[1] === 0xD8) return 'um JPEG com codificação que o navegador não suporta (ex.: CMYK ou aritmética)';
    return null;
  }
};

/* utilitários de cor, também usados pelas janelas do perfil */
Zen.cores = {
  rgb(hex){
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, n >> 8 & 255, n & 255];
  },
  hex(rgb){
    return '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  },
  misturar(a, b, peso){
    const x = Zen.cores.rgb(a), y = Zen.cores.rgb(b);
    return Zen.cores.hex(x.map((v, i) => v * (1 - peso) + y[i] * peso));
  },
  luminancia(hex){
    const [r, g, b] = Zen.cores.rgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  contraste(a, b){
    const [l1, l2] = [Zen.cores.luminancia(a), Zen.cores.luminancia(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  },
  // texto da barra de título: branco como no visual original; escuro só em barras bem claras
  textoSobre(a, b){
    const meio = Zen.cores.misturar(a, b || a, 0.5);
    return Zen.cores.contraste(meio, '#ffffff') >= 2.2 ? '#ffffff' : '#2e2c28';
  }
};

(function(){
  const CHAVE = 'zen:aparencia';
  const raiz = document.documentElement;

  const FUNDOS = [
    { id: 'foto',       nome: 'campo (padrão)', imagem: "url('foto.png')" },
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

  const TITULOS = [
    { nome: 'azul (padrão)', inicio: '#6b7fb0', fim: '#a9b8e0' },
    { nome: 'musgo',         inicio: '#5d7a4f', fim: '#a8c08a' },
    { nome: 'pôr do sol',    inicio: '#b0705b', fim: '#e8c07a' },
    { nome: 'lavanda',       inicio: '#7d6bb0', fim: '#c9b8e0' },
    { nome: 'grafite',       inicio: '#3f3f3f', fim: '#9a9a9a' }
  ];

  const FONTES = [
    { id: 'pixel',  nome: 'pixel · Silkscreen (padrão)', pilha: "'Silkscreen', monospace" },
    { id: 'mono',   nome: 'terminal · monospace',        pilha: "'Courier New', Courier, ui-monospace, monospace" },
    { id: 'serif',  nome: 'serifada · Georgia',          pilha: "Georgia, 'Times New Roman', serif" },
    { id: 'sans',   nome: 'sistema · Tahoma',            pilha: "Tahoma, Verdana, 'DejaVu Sans', sans-serif" }
  ];

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

  let prefs = { ...PADRAO, ...ler() };
  let urlFundoLocal = null; // imagem escolhida pelo usuário (só existe nesta aba)

  function ler(){
    try{
      return JSON.parse(localStorage.getItem(CHAVE)) || {};
    }catch(e){
      return {};
    }
  }

  function salvar(){
    // a imagem enviada não é persistida: ao recarregar, volta ao fundo padrão
    const copia = { ...prefs, fundo: prefs.fundo === 'upload' ? 'foto' : prefs.fundo };
    try{ localStorage.setItem(CHAVE, JSON.stringify(copia)); }catch(e){}
  }

  function aplicar(){
    const s = raiz.style;
    const fundo = prefs.fundo === 'upload' && urlFundoLocal
      ? `url("${urlFundoLocal}")`
      : (FUNDOS.find(f => f.id === prefs.fundo) || FUNDOS[0]).imagem;
    const fimTitulo = prefs.titleGradient ? prefs.titleEnd : prefs.titleStart;

    s.setProperty('--bg-image', fundo);
    s.setProperty('--bg-size', prefs.bgSize);
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

  aplicar();

  // cores atuais do tema, usadas como ponto de partida nas propriedades de cada janela
  Zen.aparencia = {
    tema: () => ({ janela: prefs.windowColor, titulo: prefs.titleStart, texto: prefs.textColor, opacidade: prefs.windowOpacity })
  };

  /* ---------- painel de controle ---------- */

  const UNIDADES = { windowBlur: 'px', shadowOffset: 'px', borderWidth: 'px', radius: 'px' };

  function formatar(nome, valor){
    if(nome === 'windowOpacity' || nome === 'bgDim') return Math.round(valor * 100) + '%';
    return valor + (UNIDADES[nome] || '');
  }

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

  function iniciarPainel(){
    const form = document.getElementById('form-config');
    if(!form) return;

    const caixaFundos = document.getElementById('amostras-fundo');
    const caixaTexto = document.getElementById('amostras-texto');
    const caixaJanela = document.getElementById('amostras-janela');
    const caixaTitulo = document.getElementById('amostras-titulo');
    const arquivoFundo = document.getElementById('arquivo-fundo');
    const avisoContraste = form.querySelector('.aviso-contraste');
    let amostraUpload = null;

    FONTES.forEach(f => {
      const o = new Option(f.nome, f.id);
      o.style.fontFamily = f.pilha;
      form.elements.font.append(o);
    });

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
      b.dataset.valor = t.inicio + t.fim;
      caixaTitulo.append(b);
    });

    const marcar = (caixa, valor) => caixa.querySelectorAll('.amostra').forEach(b =>
      b.setAttribute('aria-pressed', b.dataset.valor === valor));

    function sincronizar(){
      for(const campo of form.elements){
        if(!campo.name || !(campo.name in prefs)) continue;
        if(campo.type === 'checkbox') campo.checked = prefs[campo.name];
        else campo.value = prefs[campo.name];
        const saida = campo.parentElement.querySelector('output');
        if(saida) saida.textContent = formatar(campo.name, prefs[campo.name]);
      }
      marcar(caixaFundos, prefs.fundo);
      marcar(caixaTexto, prefs.textColor.toLowerCase());
      marcar(caixaJanela, prefs.windowColor.toLowerCase());
      marcar(caixaTitulo, prefs.titleGradient ? (prefs.titleStart + prefs.titleEnd).toLowerCase() : '');
      avisoContraste.hidden = Zen.cores.contraste(prefs.textColor, prefs.windowColor) >= 3;
    }

    function mudar(parcial){
      Object.assign(prefs, parcial);
      aplicar();
      salvar();
      sincronizar();
    }

    // sliders, cores, selects e checkbox: atualizam em tempo real
    form.addEventListener('input', (e) => {
      const campo = e.target;
      if(!campo.name || !(campo.name in prefs)) return;
      let valor = campo.value;
      if(campo.type === 'checkbox') valor = campo.checked;
      else if(campo.type === 'range') valor = Number(valor);
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

    document.getElementById('restaurar-aparencia').addEventListener('click', () => {
      prefs = { ...PADRAO };
      aplicar();
      try{ localStorage.removeItem(CHAVE); }catch(e){}
      sincronizar();
    });

    sincronizar();
  }

  document.addEventListener('DOMContentLoaded', iniciarPainel);
})();
