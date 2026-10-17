/* Zen · aparência
   Preferências visuais do painel de controle (painel_de_controle.exe).
   Guarda SOMENTE escolhas de aparência no localStorage — nada de conta, sessão ou senha.
   Este arquivo carrega no <head> para aplicar as preferências antes da página aparecer. */
window.Zen = window.Zen || {};

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

  const TITULOS = [
    { nome: 'azul (padrão)', inicio: '#6b7fb0', fim: '#a9b8e0' },
    { nome: 'musgo',         inicio: '#5d7a4f', fim: '#a8c08a' },
    { nome: 'pôr do sol',    inicio: '#b0705b', fim: '#e8c07a' },
    { nome: 'lavanda',       inicio: '#7d6bb0', fim: '#c9b8e0' },
    { nome: 'grafite',       inicio: '#3f3f3f', fim: '#9a9a9a' }
  ];

  const PADRAO = {
    fundo: 'foto',
    bgSize: 'cover',
    bgDim: 0,
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

  // texto claro ou escuro na barra de título, conforme a luminância média das cores
  function corTextoTitulo(a, b){
    const lum = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    };
    return (lum(a) + lum(b)) / 2 > 0.68 ? '#2e2c28' : '#fff';
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
    s.setProperty('--bg-window', prefs.windowColor);
    s.setProperty('--window-opacity', prefs.windowOpacity);
    s.setProperty('--window-blur', prefs.windowBlur + 'px');
    s.setProperty('--shadow-offset', prefs.shadowOffset + 'px');
    s.setProperty('--border-width', prefs.borderWidth + 'px');
    s.setProperty('--radius', prefs.radius + 'px');
    s.setProperty('--title-start', prefs.titleStart);
    s.setProperty('--title-end', fimTitulo);
    s.setProperty('--title-text', corTextoTitulo(prefs.titleStart, fimTitulo));
  }

  aplicar();

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
    const caixaJanela = document.getElementById('amostras-janela');
    const caixaTitulo = document.getElementById('amostras-titulo');
    const arquivoFundo = document.getElementById('arquivo-fundo');
    let amostraUpload = null;

    FUNDOS.forEach(f => {
      const b = criarAmostra(f.nome, `${f.imagem} center / cover`, () => mudar({ fundo: f.id }));
      b.dataset.fundo = f.id;
      caixaFundos.append(b);
    });

    CORES_JANELA.forEach(c => {
      const b = criarAmostra(c.nome, c.cor, () => mudar({ windowColor: c.cor }));
      b.dataset.cor = c.cor;
      caixaJanela.append(b);
    });

    TITULOS.forEach(t => {
      const b = criarAmostra(t.nome, `linear-gradient(90deg, ${t.inicio}, ${t.fim})`,
        () => mudar({ titleStart: t.inicio, titleEnd: t.fim, titleGradient: true }));
      b.dataset.inicio = t.inicio;
      b.dataset.fim = t.fim;
      caixaTitulo.append(b);
    });

    function sincronizar(){
      for(const campo of form.elements){
        if(!campo.name || !(campo.name in prefs)) continue;
        if(campo.type === 'checkbox') campo.checked = prefs[campo.name];
        else campo.value = prefs[campo.name];
        const saida = campo.parentElement.querySelector('output');
        if(saida) saida.textContent = formatar(campo.name, prefs[campo.name]);
      }
      caixaFundos.querySelectorAll('.amostra').forEach(b =>
        b.setAttribute('aria-pressed', b.dataset.fundo === prefs.fundo));
      caixaJanela.querySelectorAll('.amostra').forEach(b =>
        b.setAttribute('aria-pressed', b.dataset.cor === prefs.windowColor.toLowerCase()));
      caixaTitulo.querySelectorAll('.amostra').forEach(b =>
        b.setAttribute('aria-pressed', prefs.titleGradient &&
          b.dataset.inicio === prefs.titleStart.toLowerCase() && b.dataset.fim === prefs.titleEnd.toLowerCase()));
    }

    function mudar(parcial){
      Object.assign(prefs, parcial);
      aplicar();
      salvar();
      sincronizar();
    }

    // sliders, cores, select e checkbox: atualizam em tempo real
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
    arquivoFundo.addEventListener('change', () => {
      const arquivo = arquivoFundo.files[0];
      arquivoFundo.value = '';
      if(!arquivo || !arquivo.type.startsWith('image/')) return;
      if(urlFundoLocal) URL.revokeObjectURL(urlFundoLocal);
      urlFundoLocal = URL.createObjectURL(arquivo);

      if(!amostraUpload){
        amostraUpload = criarAmostra('', '', () => mudar({ fundo: 'upload' }));
        amostraUpload.dataset.fundo = 'upload';
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
