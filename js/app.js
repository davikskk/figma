/* Zen · app
   Navegação entre entrar, criar conta, feed e perfil dentro da mesma página (#hash).
   O login e o cadastro são SIMULADOS: nada é enviado, validado em servidor ou guardado.
   A "sessão" é só uma variável em memória — recarregar a página volta para a tela de entrar. */
(function(){
  const vistas = document.querySelectorAll('.vista');
  const menu = document.querySelector('.menu');
  const janelaAcesso = document.getElementById('janela-acesso');
  const formEntrar = document.getElementById('form-entrar');
  const formCadastro = document.getElementById('form-cadastro');
  const tituloAcesso = document.getElementById('titulo-acesso');

  const ROTAS = {
    entrar:   { vista: 'acesso', titulo: 'zen · entrar' },
    cadastro: { vista: 'acesso', titulo: 'zen · cadastro' },
    feed:     { vista: 'feed',   titulo: 'zen · feed' },
    perfil:   { vista: 'perfil', titulo: 'zen · davikskk' }
  };

  let logado = false;

  function ir(rota){
    if(location.hash === '#' + rota) mostrar();
    else location.hash = rota;
  }

  function mostrar(){
    let rota = location.hash.slice(1);
    if(!ROTAS[rota]) rota = logado ? 'feed' : 'entrar';
    if(!logado && ROTAS[rota].vista !== 'acesso') rota = 'entrar';
    if(logado && ROTAS[rota].vista === 'acesso') rota = 'feed';
    if(location.hash !== '#' + rota) history.replaceState(null, '', '#' + rota);

    const { vista, titulo } = ROTAS[rota];
    vistas.forEach(v => { v.hidden = v.dataset.vista !== vista; });
    menu.hidden = vista === 'acesso';
    menu.querySelectorAll('[data-rota]').forEach(a => a.classList.toggle('ativo', a.dataset.rota === rota));
    document.title = titulo;

    if(vista === 'acesso'){
      Zen.janelas.fecharTodas();
      const cadastro = rota === 'cadastro';
      formEntrar.hidden = cadastro;
      formCadastro.hidden = !cadastro;
      tituloAcesso.textContent = cadastro ? 'Criar conta' : 'Entrar';
      limparErros(formEntrar);
      limparErros(formCadastro);
      reanimar(janelaAcesso);
    }
    window.scrollTo(0, 0);
  }

  // reinicia a animação de "abrir janela" ao trocar entre entrar e criar conta
  function reanimar(el){
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  /* ---------- login / cadastro simulados ---------- */

  function limparErros(form){
    form.querySelector('.erro').hidden = true;
    form.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
  }

  function mostrarErro(form, texto, campo){
    const erro = form.querySelector('.erro');
    erro.textContent = texto;
    erro.hidden = false;
    if(campo){
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
    }
  }

  function simularAcesso(form, validar, mensagem){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      limparErros(form);
      if(!validar(form)) return;

      const botao = form.querySelector('[type="submit"]');
      botao.disabled = true;
      document.getElementById('mensagem-conectando').textContent = mensagem;
      Zen.janelas.abrir('janela-conectando');

      setTimeout(() => {
        Zen.janelas.fechar('janela-conectando');
        form.reset(); // a senha digitada é descartada aqui
        botao.disabled = false;
        logado = true;
        ir('feed');
      }, 1300);
    });
  }

  function camposVazios(form){
    const vazio = [...form.querySelectorAll('input')].find(i => !i.value.trim());
    if(vazio){
      mostrarErro(form, 'preencha todos os campos', vazio);
      return false;
    }
    return true;
  }

  simularAcesso(formEntrar, camposVazios, 'conectando ao zen...');

  simularAcesso(formCadastro, (form) => {
    if(!camposVazios(form)) return false;
    const senha = form.querySelector('[type="password"]');
    if(senha.value.length < 4){
      mostrarErro(form, 'a senha precisa de pelo menos 4 caracteres', senha);
      return false;
    }
    return true;
  }, 'criando sua conta...');

  /* ---------- menu ---------- */

  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if(!link) return;
    if(link.dataset.abrir){
      e.preventDefault();
      Zen.janelas.alternar(link.dataset.abrir);
    }
    if('sair' in link.dataset){
      logado = false;
    }
  });

  /* ---------- notificações ---------- */

  const NOTIFICACOES = [
    { avatar: 'assets/avatares/meowstic.jpg', texto: 'mega_meowstic curtiu sua bio', quando: 'agora' },
    { avatar: 'assets/avatares/kaori.jpg', texto: 'kaori_violino começou a te seguir', quando: '12min' },
    { avatar: 'assets/avatares/barbudo.jpg', texto: 'rafa.dev comentou: "manda o link do repo"', quando: '1h' },
    { avatar: 'assets/avatares/bocchi.jpg', texto: 'bocchi.wav curtiu seu post', quando: '3h' }
  ];

  const listaNotificacoes = document.getElementById('lista-notificacoes');
  NOTIFICACOES.forEach(n => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.className = 'avatar mini';
    img.src = n.avatar;
    img.alt = '';
    const texto = document.createElement('div');
    const quando = document.createElement('span');
    quando.className = 'quando';
    quando.textContent = n.quando;
    texto.append(n.texto, quando);
    li.append(img, texto);
    listaNotificacoes.append(li);
  });

  document.getElementById('janela-notificacoes').addEventListener('zen:abrir', () => {
    document.getElementById('selo-notificacoes').hidden = true;
  });

  /* ---------- novo post ---------- */

  const formPost = document.getElementById('form-novo-post');
  const textoPost = document.getElementById('texto-novo-post');
  const contador = document.getElementById('contador-caracteres');

  const contar = () => { contador.textContent = textoPost.value.length + '/280'; };
  textoPost.addEventListener('input', contar);

  document.getElementById('janela-novo-post').addEventListener('zen:abrir', () => textoPost.focus());

  formPost.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = textoPost.value.trim();
    if(!texto){ textoPost.focus(); return; }
    Zen.feed.publicar(texto);
    textoPost.value = '';
    contar();
    Zen.janelas.fechar('janela-novo-post');
    ir('feed');
  });

  window.addEventListener('hashchange', mostrar);
  mostrar();
})();
