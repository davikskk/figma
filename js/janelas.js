/* zen · janelas flutuantes
   abre, fecha, traz para frente e arrasta (pela barra de título) as janelas .janela.flutuante.
   também oferece Zen.confirmar(), o aviso.exe usado antes de ações que perdem conteúdo,
   e Zen.avisar(), o mesmo aviso só com "ok".

   ferramentas expostas: Zen.janelas.{abrir, fechar, alternar, fecharTodas}, Zen.confirmar, Zen.avisar
   eventos disparados em cada janela: 'zen:abrir' e 'zen:fechar' (outros arquivos escutam eles)

   windows 98 feelings. só falta a tela azul */
window.Zen = window.Zen || {};

(function(){
  // distância mínima, em px, entre a janela e a borda da tela
  const MARGEM = 16;
  // só deixa arrastar em telas maiores que celular (mesmo corte do style.css)
  const podeArrastar = window.matchMedia('(min-width: 641px)');
  // contador de camadas: cada janela focada ganha um número maior e vai para cima da pilha
  let camada = 20;

  /* ---------- atalhos ---------- */

  // todas as janelas flutuantes da página, abertas ou não
  const todas = () => [...document.querySelectorAll('.janela.flutuante')];
  // só as que estão aparecendo
  const visiveis = () => todas().filter(j => !j.hidden);
  // aceita tanto o id ('janela-aviso') quanto o próprio elemento
  const pegar = (alvo) => typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
  // a janela normal (não diálogo) que está mais em cima
  const daFrente = () => visiveis()
    .filter(j => !j.classList.contains('dialogo'))
    .sort((a, b) => (b.style.zIndex || 0) - (a.style.zIndex || 0))[0];

  // coloca a janela no topo da pilha e deixa as outras com cara de "dormindo" (classe inativa)
  // diálogos (aviso.exe) já têm camada fixa alta no CSS, então não mexe no zIndex deles
  function focar(janela){
    if(!janela.classList.contains('dialogo')) janela.style.zIndex = ++camada;
    todas().forEach(j => j.classList.toggle('inativa', j !== janela));
  }

  // empurra a janela de volta para dentro da tela se ela estiver fugindo
  // offsetWidth/Height ignoram a escala da animação de abertura
  function limitar(janela){
    const x = Math.min(Math.max(MARGEM, parseFloat(janela.style.left) || 0), Math.max(MARGEM, innerWidth - janela.offsetWidth - MARGEM));
    const y = Math.min(Math.max(MARGEM, parseFloat(janela.style.top) || 0), Math.max(MARGEM, innerHeight - janela.offsetHeight - MARGEM));
    janela.style.left = x + 'px';
    janela.style.top = y + 'px';
  }

  // põe a janela no meio da tela
  function centralizar(janela){
    // janelas abertas em sequência ficam levemente em cascata
    const deslocamento = visiveis().filter(j => j !== janela && !j.classList.contains('dialogo')).length * 24;
    janela.style.left = (innerWidth - janela.offsetWidth) / 2 + deslocamento + 'px';
    janela.style.top = (innerHeight - janela.offsetHeight) / 2 + deslocamento + 'px';
    limitar(janela);
  }

  /* ---------- abrir / fechar ---------- */

  // mostra a janela. na primeira vez centraliza; nas próximas volta para onde a pessoa deixou
  // devolve a janela (ou null se não achou)
  function abrir(alvo){
    const janela = pegar(alvo);
    if(!janela) return null;
    const estavaFechada = janela.hidden;
    janela.hidden = false;
    if(estavaFechada){
      if(janela.dataset.posicionada) limitar(janela);
      else{ centralizar(janela); janela.dataset.posicionada = '1'; }
      // avisa quem estiver ouvindo (ex.: notificações apagam a bolinha vermelha)
      janela.dispatchEvent(new CustomEvent('zen:abrir'));
    }
    focar(janela);
    return janela;
  }

  // esconde a janela e passa o foco para a próxima da pilha
  function fechar(alvo){
    const janela = pegar(alvo);
    if(!janela || janela.hidden) return;
    janela.hidden = true;
    janela.classList.remove('inativa');
    janela.dispatchEvent(new CustomEvent('zen:fechar'));
    const proxima = daFrente();
    if(proxima) focar(proxima);
  }

  // usado pelos botões do menu: abre, fecha ou traz para frente, dependendo do caso
  function alternar(alvo){
    const janela = pegar(alvo);
    if(!janela) return;
    // aberta mas atrás de outra: traz para frente em vez de fechar
    const naFrente = !janela.classList.contains('inativa') || visiveis().length === 1;
    if(janela.hidden) abrir(janela);
    else if(naFrente) fechar(janela);
    else focar(janela);
  }

  // fecha geral. usado quando volta para a tela de login
  function fecharTodas(){
    todas().forEach(j => { if(!j.hidden) fechar(j); });
  }

  /* ---------- aviso.exe ----------
     o confirm() do navegador é feio, então a gente fez o nosso. com blackjack e pixel art */

  // mostra a pergunta e devolve uma Promise: resolve true (clicou em continuar) ou false (cancelou / Esc)
  // uso: if(await Zen.confirmar('apagar?', 'apagar')) { ... }
  function confirmar(mensagem, rotulo = 'continuar'){
    const janela = document.getElementById('janela-aviso');
    const ok = document.getElementById('aviso-confirmar');
    const cancelar = document.getElementById('aviso-cancelar');
    document.getElementById('mensagem-aviso').textContent = mensagem;
    ok.textContent = rotulo;
    abrir(janela);
    ok.focus();
    return new Promise((resolver) => {
      // responde uma vez só e tira os ouvintes, senão a próxima pergunta recebe a resposta desta
      function responder(sim){
        ok.removeEventListener('click', sim1);
        cancelar.removeEventListener('click', nao);
        janela.removeEventListener('keydown', tecla);
        fechar(janela);
        resolver(sim);
      }
      // sim1 porque "sim" já era o nome do parâmetro ali em cima. criatividade nível máximo
      const sim1 = () => responder(true);
      const nao = () => responder(false);
      // stopPropagation: o Esc fecha só o aviso, e não a janela que está atrás dele também
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

  // começa a arrastar quando a pessoa aperta o botão do mouse na barra de título
  function iniciarArraste(e){
    const barra = e.target.closest('.titlebar');
    const janela = barra && barra.closest('.janela.flutuante');
    // diálogos não arrastam, e clicar no X da barra não deve começar arraste
    if(!janela || janela.classList.contains('dialogo') || e.target.closest('button')) return;
    focar(janela);
    // no celular, ou com o botão direito, só foca e pronto
    if(!podeArrastar.matches || e.button !== 0) return;

    // dx/dy = onde, dentro da janela, a pessoa "segurou". assim ela não pula para o cursor
    const r = janela.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    // capture: mesmo se o mouse sair da barra rápido demais, os eventos continuam chegando aqui
    barra.setPointerCapture(e.pointerId);
    janela.classList.add('arrastando');

    // a cada movimento do mouse, a janela vai junto
    function mover(ev){
      // a barra de título sempre continua alcançável dentro da tela
      const x = Math.min(Math.max(ev.clientX - dx, 40 - r.width), innerWidth - 40);
      const y = Math.min(Math.max(ev.clientY - dy, 0), innerHeight - 30);
      janela.style.left = x + 'px';
      janela.style.top = y + 'px';
    }
    // soltou o mouse: para de seguir e limpa os ouvintes
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

  /* ---------- ouvintes globais ---------- */

  // clicou em qualquer lugar de uma janela: na barra pode arrastar, no resto só traz para frente
  document.addEventListener('pointerdown', (e) => {
    const janela = e.target.closest('.janela.flutuante');
    if(!janela) return;
    if(e.target.closest('.titlebar')) iniciarArraste(e);
    else focar(janela);
  });

  // qualquer botão com data-fechar fecha a janela onde ele mora (o X da barra, por exemplo)
  document.addEventListener('click', (e) => {
    const botao = e.target.closest('[data-fechar]');
    if(botao) fechar(botao.closest('.janela'));
  });

  // Esc fecha a janela da frente. se o aviso.exe estiver aberto, quem cuida do Esc é ele
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape' || !document.getElementById('janela-aviso').hidden) return;
    const frente = daFrente();
    if(frente) fechar(frente);
  });

  // a tela encolheu? empurra as janelas de volta para dentro
  window.addEventListener('resize', () => visiveis().forEach(limitar));

  // guarda as ferramentas na mochila
  Zen.janelas = { abrir, fechar, alternar, fecharTodas };
  Zen.confirmar = confirmar;
  Zen.avisar = avisar;
})();
