/* Zen · janelas flutuantes
   Abre, fecha, traz para frente e arrasta (pela barra de título) as janelas .janela.flutuante.
   Também oferece Zen.confirmar(), o aviso.exe usado antes de ações que perdem conteúdo,
   e Zen.avisar(), o mesmo aviso só com "ok". */
window.Zen = window.Zen || {};

(function(){
  const MARGEM = 16;
  const podeArrastar = window.matchMedia('(min-width: 641px)');
  let camada = 20;

  const todas = () => [...document.querySelectorAll('.janela.flutuante')];
  const visiveis = () => todas().filter(j => !j.hidden);
  const pegar = (alvo) => typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
  const daFrente = () => visiveis()
    .filter(j => !j.classList.contains('dialogo'))
    .sort((a, b) => (b.style.zIndex || 0) - (a.style.zIndex || 0))[0];

  function focar(janela){
    if(!janela.classList.contains('dialogo')) janela.style.zIndex = ++camada;
    todas().forEach(j => j.classList.toggle('inativa', j !== janela));
  }

  // offsetWidth/Height ignoram a escala da animação de abertura
  function limitar(janela){
    const x = Math.min(Math.max(MARGEM, parseFloat(janela.style.left) || 0), Math.max(MARGEM, innerWidth - janela.offsetWidth - MARGEM));
    const y = Math.min(Math.max(MARGEM, parseFloat(janela.style.top) || 0), Math.max(MARGEM, innerHeight - janela.offsetHeight - MARGEM));
    janela.style.left = x + 'px';
    janela.style.top = y + 'px';
  }

  function centralizar(janela){
    // janelas abertas em sequência ficam levemente em cascata
    const deslocamento = visiveis().filter(j => j !== janela && !j.classList.contains('dialogo')).length * 24;
    janela.style.left = (innerWidth - janela.offsetWidth) / 2 + deslocamento + 'px';
    janela.style.top = (innerHeight - janela.offsetHeight) / 2 + deslocamento + 'px';
    limitar(janela);
  }

  function abrir(alvo){
    const janela = pegar(alvo);
    if(!janela) return null;
    const estavaFechada = janela.hidden;
    janela.hidden = false;
    if(estavaFechada){
      if(janela.dataset.posicionada) limitar(janela);
      else{ centralizar(janela); janela.dataset.posicionada = '1'; }
      janela.dispatchEvent(new CustomEvent('zen:abrir'));
    }
    focar(janela);
    return janela;
  }

  function fechar(alvo){
    const janela = pegar(alvo);
    if(!janela || janela.hidden) return;
    janela.hidden = true;
    janela.classList.remove('inativa');
    janela.dispatchEvent(new CustomEvent('zen:fechar'));
    const proxima = daFrente();
    if(proxima) focar(proxima);
  }

  function alternar(alvo){
    const janela = pegar(alvo);
    if(!janela) return;
    // aberta mas atrás de outra: traz para frente em vez de fechar
    const naFrente = !janela.classList.contains('inativa') || visiveis().length === 1;
    if(janela.hidden) abrir(janela);
    else if(naFrente) fechar(janela);
    else focar(janela);
  }

  function fecharTodas(){
    todas().forEach(j => { if(!j.hidden) fechar(j); });
  }

  /* ---------- aviso.exe ---------- */

  function confirmar(mensagem, rotulo = 'continuar'){
    const janela = document.getElementById('janela-aviso');
    const ok = document.getElementById('aviso-confirmar');
    const cancelar = document.getElementById('aviso-cancelar');
    document.getElementById('mensagem-aviso').textContent = mensagem;
    ok.textContent = rotulo;
    abrir(janela);
    ok.focus();
    return new Promise((resolver) => {
      function responder(sim){
        ok.removeEventListener('click', sim1);
        cancelar.removeEventListener('click', nao);
        janela.removeEventListener('keydown', tecla);
        fechar(janela);
        resolver(sim);
      }
      const sim1 = () => responder(true);
      const nao = () => responder(false);
      const tecla = (e) => { if(e.key === 'Escape'){ e.stopPropagation(); responder(false); } };
      ok.addEventListener('click', sim1);
      cancelar.addEventListener('click', nao);
      janela.addEventListener('keydown', tecla);
    });
  }

  // aviso só informativo: reaproveita o aviso.exe sem o botão de cancelar
  async function avisar(mensagem){
    const cancelar = document.getElementById('aviso-cancelar');
    cancelar.hidden = true;
    await confirmar(mensagem, 'ok');
    cancelar.hidden = false;
  }

  /* ---------- arrastar ---------- */

  function iniciarArraste(e){
    const barra = e.target.closest('.titlebar');
    const janela = barra && barra.closest('.janela.flutuante');
    if(!janela || janela.classList.contains('dialogo') || e.target.closest('button')) return;
    focar(janela);
    if(!podeArrastar.matches || e.button !== 0) return;

    const r = janela.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    barra.setPointerCapture(e.pointerId);
    janela.classList.add('arrastando');

    function mover(ev){
      // a barra de título sempre continua alcançável dentro da tela
      const x = Math.min(Math.max(ev.clientX - dx, 40 - r.width), innerWidth - 40);
      const y = Math.min(Math.max(ev.clientY - dy, 0), innerHeight - 30);
      janela.style.left = x + 'px';
      janela.style.top = y + 'px';
    }
    function soltar(){
      janela.classList.remove('arrastando');
      barra.removeEventListener('pointermove', mover);
      barra.removeEventListener('pointerup', soltar);
      barra.removeEventListener('pointercancel', soltar);
    }
    barra.addEventListener('pointermove', mover);
    barra.addEventListener('pointerup', soltar);
    barra.addEventListener('pointercancel', soltar);
  }

  document.addEventListener('pointerdown', (e) => {
    const janela = e.target.closest('.janela.flutuante');
    if(!janela) return;
    if(e.target.closest('.titlebar')) iniciarArraste(e);
    else focar(janela);
  });

  document.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-fechar]');
    if(botao) fechar(botao.closest('.janela'));
  });

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape' || !document.getElementById('janela-aviso').hidden) return;
    const frente = daFrente();
    if(frente) fechar(frente);
  });

  window.addEventListener('resize', () => visiveis().forEach(limitar));

  Zen.janelas = { abrir, fechar, alternar, fecharTodas };
  Zen.confirmar = confirmar;
  Zen.avisar = avisar;
})();
