/* zen · app
   navegação entre entrar, criar conta, feed e perfil dentro da mesma página (#hash).
   o login e o cadastro são SIMULADOS: nada é enviado, validado em servidor ou guardado.
   a "sessão" é só uma variável em memória — recarregar a página volta para a tela de entrar.

   é o último script a carregar: quando ele roda, todos os outros robôs (Zen.janelas, Zen.feed,
   Zen.perfil...) já estão prontos, então ele dá a largada no fim do arquivo.

   segurança nível: confia */
(function(){
  // cada "tela" do site é um elemento com a classe .vista e um data-vista (acesso, feed, perfil)
  const vistas = document.querySelectorAll('.vista');
  const menu = document.querySelector('.menu');
  const janelaAcesso = document.getElementById('janela-acesso');
  const formEntrar = document.getElementById('form-entrar');
  const formCadastro = document.getElementById('form-cadastro');
  const tituloAcesso = document.getElementById('titulo-acesso');

  /* ---------- rotas ----------
     o que vem depois do # no endereço decide qual tela aparece.
     vista: qual .vista mostrar · titulo: o texto da aba do navegador (pode ser função) */
  const ROTAS = {
    entrar:   { vista: 'acesso', titulo: 'zen · entrar' },
    cadastro: { vista: 'acesso', titulo: 'zen · cadastro' },
    feed:     { vista: 'feed',   titulo: 'zen · feed' },
    // função porque o nome pode mudar enquanto a pessoa usa o site
    perfil:   { vista: 'perfil', titulo: () => 'zen · ' + Zen.usuario.dados.nome }
  };

  // a "sessão" inteira do site. uma variável. o banco do brasil odeia essa técnica
  let logado = false;

  // vai para uma rota. se já estiver nela, o hash não muda e o hashchange não dispara, então mostra na mão
  function ir(rota){
    if(location.hash === '#' + rota) mostrar();
    else location.hash = rota;
  }

  // lê o # do endereço, aplica as regras do porteiro e mostra a tela certa
  function mostrar(){
    let rota = location.hash.slice(1);
    // rota que não existe: manda para o lugar padrão
    if(!ROTAS[rota]) rota = logado ? 'feed' : 'entrar';
    // o porteiro: deslogado só vê login/cadastro; logado não volta para o login
    if(!logado && ROTAS[rota].vista !== 'acesso') rota = 'entrar';
    if(logado && ROTAS[rota].vista === 'acesso') rota = 'feed';
    // corrige o endereço sem criar uma entrada nova no histórico (o botão voltar não fica em loop)
    if(location.hash !== '#' + rota) history.replaceState(null, '', '#' + rota);

    const { vista, titulo } = ROTAS[rota];
    // esconde todas as telas menos a escolhida
    vistas.forEach(v => { v.hidden = v.dataset.vista !== vista; });
    // menu de cima não aparece na tela de login
    menu.hidden = vista === 'acesso';
    // destaca no menu o link da tela atual
    menu.querySelectorAll('[data-rota]').forEach(a => a.classList.toggle('ativo', a.dataset.rota === rota));
    document.title = typeof titulo === 'function' ? titulo() : titulo;

    // saiu do perfil: desliga o modo edição
    if(vista !== 'perfil') Zen.perfil.alternarEdicao(false);

    if(vista === 'acesso'){
      Zen.janelas.fecharTodas();
      // entrar e cadastro são a mesma janela, só troca qual formulário aparece
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
  // tira a animação, força o navegador a recalcular (offsetWidth) e devolve. gambiarra oficial da web desde 2010
  function reanimar(el){
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  /* ---------- login / cadastro simulados ---------- */

  // esconde a mensagem de erro e tira a marcação vermelha dos campos
  function limparErros(form){
    form.querySelector('.erro').hidden = true;
    form.querySelectorAll('input').forEach(i => i.removeAttribute('aria-invalid'));
  }

  // mostra o erro no formulário e, se tiver um campo culpado, marca ele e coloca o cursor lá
  function mostrarErro(form, texto, campo){
    const erro = form.querySelector('.erro');
    erro.textContent = texto;
    erro.hidden = false;
    if(campo){
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
    }
  }

  // liga um formulário de acesso de mentirinha
  // validar(form): devolve true se pode continuar · mensagem: o texto da janelinha "conectando..."
  function simularAcesso(form, validar, mensagem){
    form.addEventListener('submit', (e) => {
      // NÃO envia nada para lugar nenhum. é tudo teatro
      e.preventDefault();
      limparErros(form);
      if(!validar(form)) return;

      // trava o botão para a pessoa não clicar 47 vezes
      const botao = form.querySelector('[type="submit"]');
      botao.disabled = true;
      document.getElementById('mensagem-conectando').textContent = mensagem;
      Zen.janelas.abrir('janela-conectando');

      // espera 1,3s só para parecer que está fazendo algo importante. spoiler: não está
      setTimeout(() => {
        Zen.janelas.fechar('janela-conectando');
        form.reset(); // a senha digitada é descartada aqui
        botao.disabled = false;
        logado = true;
        ir('feed');
      }, 1300);
    });
  }

  // regra básica: nenhum campo pode estar vazio (espaços não contam)
  function camposVazios(form){
    const vazio = [...form.querySelectorAll('input')].find(i => !i.value.trim());
    if(vazio){
      mostrarErro(form, 'preencha todos os campos', vazio);
      return false;
    }
    return true;
  }

  // entrar: só precisa preencher tudo. qualquer senha serve. inclusive "1234"
  simularAcesso(formEntrar, camposVazios, 'conectando ao zen...');

  // cadastro: preencher tudo + senha com pelo menos 4 caracteres
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

  // um ouvinte só para o menu inteiro (em vez de um por link)
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if(!link) return;
    // links com data-abrir abrem uma janela em vez de navegar (ex.: notificações, aparência)
    if(link.dataset.abrir){
      e.preventDefault();
      Zen.janelas.alternar(link.dataset.abrir);
    }
    // link "sair": desloga. o próprio href (#entrar) leva de volta ao login
    if('sair' in link.dataset){
      logado = false;
    }
  });

  /* ---------- notificações: só comentários ----------
     nada de curtidas, seguidores, menções ou reações: só avisa quando alguém escreveu algo
     para você, e mostra o que foi escrito — sem contagens nem métricas. */

  // notificações de exemplo (inventadas, como tudo aqui. menos o pochita, o pochita é real)
  const NOTIFICACOES = [
    { avatar: 'assets/avatares/kaori.jpg', texto: 'kaori_violino respondeu seu comentário no post do pombo: "ele voltou hoje!! sentou no mesmo banco"', quando: 'agora' },
    { avatar: 'assets/avatares/barbudo.jpg', texto: 'rafa.dev comentou no seu post: "como você colocou o vinil em cima da foto? quero fazer isso"', quando: '1h' },
    { avatar: 'assets/avatares/leoa.jpg', texto: 'leoa.raw comentou no seu post: "seu perfil parece a área de trabalho do meu tio em 2004 e isso é um elogio"', quando: '3h' },
    { avatar: 'assets/avatares/pochita.jpg', texto: 'pochita comentou no seu post: "woof"', quando: '1d' }
  ];

  // monta cada notificação: foto + texto + "quando"
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

  // abriu as notificações: some a bolinha de "tem coisa nova"
  document.getElementById('janela-notificacoes').addEventListener('zen:abrir', () => {
    document.getElementById('selo-notificacoes').hidden = true;
  });

  /* ---------- novo post ---------- */

  const formPost = document.getElementById('form-novo-post');
  const textoPost = document.getElementById('texto-novo-post');
  const contador = document.getElementById('contador-caracteres');

  // contador "x/280". o limite em si é o maxlength do <textarea>, aqui só mostra
  const contar = () => { contador.textContent = textoPost.value.length + '/280'; };
  textoPost.addEventListener('input', contar);

  // abriu a janela de novo post: cursor já no campo
  document.getElementById('janela-novo-post').addEventListener('zen:abrir', () => textoPost.focus());

  // publicar: manda para o feed, limpa o campo, fecha a janela e vai ver o post
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

  /* ---------- largada ---------- */

  // coloca nome e foto em tudo, fica de olho quando o # mudar e mostra a primeira tela
  Zen.usuario.refletir();
  window.addEventListener('hashchange', mostrar);
  mostrar();
})();
