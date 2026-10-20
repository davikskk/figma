/* Zen · feed
   Posts de exemplo renderizados a partir do <template id="modelo-post">.
   Sem curtidas nem contadores: só posts, comentários e a marcação pessoal (só você vê).
   Tudo acontece na memória desta aba. */
window.Zen = window.Zen || {};

(function(){
  const AV = 'assets/avatares/';
  const EU = 'eu'; // posts/comentários do usuário atual acompanham nome e foto de Zen.usuario

  const POSTS = [
    {
      nome: 'menina_yas', arroba: '@yasmimzz', avatar: AV + 'anya.jpg', tempo: '2min',
      texto: 'finalmente comprei a minha camisa do jotaro',
      comentarios: [
        { nome: 'ykkmiguel2', avatar: AV + 'pug.jpg', texto: 'part 4 é melhor' },
        { nome: 'chopper_md', avatar: AV + 'chopper.jpg', texto: 'josuke>jotaro' },
        { nome: 'luazinha', avatar: AV + 'desenho.png', texto: 'coloca a foto da camisa numa janela 2x2 em cima do seu perfil, antes e depois' }
      ]
    },
    {
      nome: 'rafa.dev', arroba: '@rafacoda', avatar: AV + 'barbudo.jpg', tempo: '9min',
      texto: 'passei 2 horas arrumando as janelas do meu perfil e não postei nada. produtividade',
      comentarios: [
        { nome: 'pixel_pedro', avatar: AV + 'pixel.png', texto: 'mesma coisa aqui, coloquei uma janela 6x6 com um gif e uma de texto pequenininha por cima' },
        { nome: 'leoa.raw', avatar: AV + 'leoa.jpg', texto: 'pelo menos agora tem algo pra olhar quando entra no seu perfil né' },
        { nome: 'bocchi.wav', avatar: AV + 'bocchi.jpg', texto: 'eu deixei o meu vazio. assim ninguém julga' }
      ]
    },
    {
      nome: 'Varella Renault', arroba: '@varellar', avatar: AV + 'aespa.jpg', tempo: '14min',
      texto: 'Saudades do meu cabelo vermelho mds',
      comentarios: [
        { nome: 'luazinha', avatar: AV + 'desenho.png', texto: 'volta pro vermelho agora' },
        { nome: 'menina_yas', avatar: AV + 'anya.jpg', texto: 'pinta o fundo do perfil de vermelho enquanto isso kkkk' }
      ]
    },
    {
      nome: 'leoa.raw', arroba: '@leoasemfiltro', avatar: AV + 'leoa.jpg', tempo: '40min',
      texto: 'não ter curtida é estranho. postei uma foto ontem e não faço ideia se alguém gostou',
      comentarios: [
        { nome: 'kaori_violino', avatar: AV + 'kaori.jpg', texto: 'eu gostei, por isso tô comentando' },
        { nome: 'rafa.dev', avatar: AV + 'barbudo.jpg', texto: 'sinceramente sinto falta às vezes. mas também parei de ficar abrindo o app de 5 em 5 min' },
        { nome: 'chopper_md', avatar: AV + 'chopper.jpg', texto: 'sintoma clássico de abstinência. passa em uma semana' }
      ]
    },
    {
      nome: 'ykkmiguel2', arroba: '@miguelfit', avatar: AV + 'pug.jpg', tempo: '1h',
      texto: 'Como não da para viver com um salário mínimo? olha:\nAluguel: R$100,00\n71kg de batata doce: R$1320,00',
      comentarios: [
        { nome: 'rafa.dev', avatar: AV + 'barbudo.jpg', texto: 'aluguel de 100 reais onde????' },
        { nome: 'leoa.raw', avatar: AV + 'leoa.jpg', texto: 'a batata doce é o verdadeiro aluguel' },
        { nome: 'pixel_pedro', avatar: AV + 'pixel.png', texto: 'vi que você colocou um modelo 3d de batata doce girando no perfil. respeito o compromisso' }
      ]
    },
    {
      nome: 'bocchi.wav', arroba: '@hitorigotoh', avatar: AV + 'bocchi.jpg', tempo: '2h',
      texto: 'ensaiei 40 minutos pra pedir um café e na hora falei "obrigada, você também"',
      comentarios: [
        { nome: 'kaori_violino', avatar: AV + 'kaori.jpg', texto: 'você é corajosa só de ter ido' },
        { nome: 'Varella Renault', avatar: AV + 'aespa.jpg', texto: 'a música que tá tocando no vinil do seu perfil combina demais com esse post' }
      ]
    },
    {
      nome: 'mega_meowstic', arroba: '@meowstic.mega', avatar: AV + 'meowstic.jpg', tempo: '3h',
      texto: 'coloquei um modelo 3d do meowstic no perfil e fico girando ele em vez de dormir',
      comentarios: [
        { nome: 'gato_do_teclado', avatar: AV + 'gato.jpg', texto: 'ele é meu primo' },
        { nome: 'ykkmiguel2', avatar: AV + 'pug.jpg', texto: 'onde vc achou o arquivo? só achei um .obj que parece uma batata' },
        { nome: 'menina_yas', avatar: AV + 'anya.jpg', texto: 'achei meio pesado no meu celular, mas ficou bonito' }
      ]
    },
    {
      nome: 'kaori_violino', arroba: '@miyazono', avatar: AV + 'kaori.jpg', tempo: '3h',
      texto: 'toquei no parque hoje e um pombo ficou até o final. melhor plateia que já tive',
      comentarios: [
        { autor: EU, texto: 'o pombo tem bom gosto' },
        { nome: 'bocchi.wav', avatar: AV + 'bocchi.jpg', texto: 'eu teria fugido antes do pombo' }
      ]
    },
    {
      nome: 'gato_do_teclado', arroba: '@miau.exe', avatar: AV + 'gato.jpg', tempo: '5h',
      texto: 'asdfghjkkkkkkkkkkkkkkkkkkkkkkk\n\n(meu humano saiu pra almoçar)',
      comentarios: [
        { nome: 'pochita', avatar: AV + 'pochita.jpg', texto: 'woof' },
        { nome: 'rafa.dev', avatar: AV + 'barbudo.jpg', texto: 'ele também arrastou todas as janelas do perfil pra um canto só. foi o gato né' }
      ]
    },
    {
      nome: 'pixel_pedro', arroba: '@ppedro8bit', avatar: AV + 'pixel.png', tempo: '8h',
      texto: 'terminei meu primeiro jogo em pixel art. tem 1 fase só e ninguém conseguiu passar, nem eu',
      comentarios: [
        { nome: 'mega_meowstic', avatar: AV + 'meowstic.jpg', texto: 'zerei de primeira' },
        { nome: 'luazinha', avatar: AV + 'desenho.png', texto: 'põe um print numa janela do perfil, quero ver' }
      ]
    },
    {
      nome: 'chopper_md', arroba: '@doutorrena', avatar: AV + 'chopper.jpg', tempo: '1d',
      texto: 'me chamaram de ótimo médico hoje. não fiquei feliz não, seu idiota',
      comentarios: [
        { nome: 'Varella Renault', avatar: AV + 'aespa.jpg', texto: 'o seu perfil rosa com a janela de texto escrito "NÃO SOU FOFO" por cima de tudo diz o contrário' }
      ]
    },
    {
      nome: 'pochita', arroba: '@woofwoof', avatar: AV + 'pochita.jpg', tempo: '1d',
      texto: 'woof woof. woof?',
      comentarios: [
        { nome: 'gato_do_teclado', avatar: AV + 'gato.jpg', texto: 'concordo plenamente' }
      ]
    },
    {
      nome: 'luazinha', arroba: '@lua.desenha', avatar: AV + 'desenho.png', tempo: '2d',
      texto: 'fiz um autorretrato e ficou parecido demais, tô preocupada',
      comentarios: [
        { nome: 'kaori_violino', avatar: AV + 'kaori.jpg', texto: 'deixa ele de fundo do perfil e vê se alguém percebe' },
        { nome: 'ykkmiguel2', avatar: AV + 'pug.jpg', texto: 'não entendi o problema' }
      ]
    }
  ];

  const lista = document.getElementById('lista-posts');
  const modelo = document.getElementById('modelo-post');

  function criarComentario(c){
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.className = 'avatar mini';
    img.alt = '';
    const texto = document.createElement('div');
    const nome = document.createElement('strong');
    if(c.autor === EU){
      img.dataset.euAvatar = '';
      nome.dataset.euNome = '';
    }else{
      img.src = c.avatar;
      nome.textContent = c.nome;
    }
    texto.append(nome, c.texto);
    li.append(img, texto);
    return li;
  }

  function criarPost(post){
    const el = modelo.content.firstElementChild.cloneNode(true);
    const avatar = el.querySelector('.avatar');
    const nome = el.querySelector('.nome');
    const arroba = el.querySelector('.arroba');
    if(post.autor === EU){
      avatar.dataset.euAvatar = '';
      nome.dataset.euNome = '';
      arroba.dataset.euArroba = '';
      avatar.alt = 'sua foto';
    }else{
      avatar.src = post.avatar;
      avatar.alt = 'foto de ' + post.nome;
      nome.textContent = post.nome;
      arroba.textContent = post.arroba;
    }
    el.querySelector('.tempo').textContent = post.tempo;
    el.querySelector('.texto').textContent = post.texto;

    const comentar = el.querySelector('.comentar');
    const marcar = el.querySelector('.marcar');
    const painel = el.querySelector('.comentarios');
    const listaComentarios = el.querySelector('.lista-comentarios');
    const formComentario = el.querySelector('.form-comentario');

    post.comentarios.forEach(c => listaComentarios.append(criarComentario(c)));

    comentar.addEventListener('click', () => {
      painel.hidden = !painel.hidden;
      comentar.setAttribute('aria-expanded', !painel.hidden);
      if(!painel.hidden) formComentario.querySelector('input').focus();
    });

    // marcação pessoal: não é contada nem mostrada para ninguém
    marcar.addEventListener('click', () => {
      post.marcado = !post.marcado;
      marcar.setAttribute('aria-pressed', post.marcado);
      marcar.title = post.marcado ? 'desmarcar post' : 'marcar post (só você vê)';
    });

    formComentario.addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = formComentario.querySelector('input');
      const texto = campo.value.trim();
      if(!texto) return;
      const c = { autor: EU, texto };
      post.comentarios.push(c);
      const li = criarComentario(c);
      listaComentarios.append(li);
      Zen.usuario.refletir(li);
      campo.value = '';
    });

    return el;
  }

  function publicar(texto){
    const post = { autor: EU, tempo: 'agora', texto, comentarios: [] };
    POSTS.unshift(post);
    const el = criarPost(post);
    el.classList.add('novo');
    lista.prepend(el);
    Zen.usuario.refletir(el);
    return el;
  }

  POSTS.forEach(p => lista.append(criarPost(p)));
  Zen.usuario.refletir(lista);

  Zen.feed = { publicar };
})();
