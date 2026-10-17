/* Zen · feed
   Posts de exemplo renderizados a partir do <template id="modelo-post">.
   Curtidas, comentários e marcações acontecem só na memória desta aba. */
window.Zen = window.Zen || {};

(function(){
  const AV = 'assets/avatares/';

  const EU = { nome: 'davikskk', arroba: '@6davik9', avatar: AV + 'watari.jpg' };

  const POSTS = [
    {
      nome: 'menina_yas', arroba: '@yasmimzz', avatar: AV + 'anya.jpg', tempo: '2min',
      texto: 'amo pedir pro chatgpt transformar meu pão com ovo em pizza',
      curtidas: 3, totalComentarios: 3,
      comentarios: [
        { nome: 'ykkmiguel2', avatar: AV + 'pug.jpg', texto: 'manda o prompt' },
        { nome: 'chopper_md', avatar: AV + 'chopper.jpg', texto: 'como médico eu recomendo a pizza' }
      ]
    },
    {
      nome: 'Varella Renault', arroba: '@varellar', avatar: AV + 'loira.jpg', tempo: '14min',
      texto: 'Saudades do meu cabelo vermelho mds',
      curtidas: 2, totalComentarios: 1,
      comentarios: [
        { nome: 'luazinha', avatar: AV + 'desenho.png', texto: 'volta pro vermelho agora' }
      ]
    },
    {
      nome: 'ykkmiguel2', arroba: '@miguelfit', avatar: AV + 'pug.jpg', tempo: '1h',
      texto: 'Como não da para viver com um salário mínimo? olha:\nAluguel: R$100,00\n71kg de batata doce: R$1320,00',
      curtidas: 78500, totalComentarios: 164,
      comentarios: [
        { nome: 'rafa.dev', avatar: AV + 'barbudo.jpg', texto: 'aluguel de 100 reais onde????' },
        { nome: 'leoa.raw', avatar: AV + 'leoa.jpg', texto: 'a batata doce é o verdadeiro aluguel' }
      ]
    },
    {
      nome: 'bocchi.wav', arroba: '@hitorigotoh', avatar: AV + 'bocchi.jpg', tempo: '2h',
      texto: 'ensaiei 40 minutos pra pedir um café e na hora falei "obrigada, você também"',
      curtidas: 1204, totalComentarios: 87,
      comentarios: [
        { nome: 'kaori_violino', avatar: AV + 'kaori.jpg', texto: 'você é corajosa só de ter ido' }
      ]
    },
    {
      nome: 'kaori_violino', arroba: '@miyazono', avatar: AV + 'kaori.jpg', tempo: '3h',
      texto: 'toquei no parque hoje e um pombo ficou até o final. melhor plateia que já tive',
      curtidas: 342, totalComentarios: 12,
      comentarios: [
        { nome: 'davikskk', avatar: EU.avatar, texto: 'o pombo tem bom gosto' }
      ]
    },
    {
      nome: 'gato_do_teclado', arroba: '@miau.exe', avatar: AV + 'gato.jpg', tempo: '5h',
      texto: 'asdfghjkkkkkkkkkkkkkkkkkkkkkkk\n\n(meu humano saiu pra almoçar)',
      curtidas: 5630, totalComentarios: 201,
      comentarios: [
        { nome: 'pochita', avatar: AV + 'pochita.jpg', texto: 'woof' }
      ]
    },
    {
      nome: 'pixel_pedro', arroba: '@ppedro8bit', avatar: AV + 'pixel.png', tempo: '8h',
      texto: 'terminei meu primeiro jogo em pixel art. tem 1 fase só e ninguém conseguiu passar, nem eu',
      curtidas: 96, totalComentarios: 9,
      comentarios: [
        { nome: 'mega_meowstic', avatar: AV + 'meowstic.jpg', texto: 'zerei de primeira' }
      ]
    },
    {
      nome: 'chopper_md', arroba: '@doutorrena', avatar: AV + 'chopper.jpg', tempo: '1d',
      texto: 'me chamaram de ótimo médico hoje. não fiquei feliz não, seu idiota',
      curtidas: 2210, totalComentarios: 58,
      comentarios: []
    },
    {
      nome: 'pochita', arroba: '@woofwoof', avatar: AV + 'pochita.jpg', tempo: '1d',
      texto: 'woof woof. woof?',
      curtidas: 9999, totalComentarios: 404,
      comentarios: [
        { nome: 'gato_do_teclado', avatar: AV + 'gato.jpg', texto: 'concordo plenamente' }
      ]
    },
    {
      nome: 'luazinha', arroba: '@lua.desenha', avatar: AV + 'desenho.png', tempo: '2d',
      texto: 'fiz um autorretrato e ficou parecido demais, tô preocupada',
      curtidas: 158, totalComentarios: 6,
      comentarios: []
    }
  ];

  const lista = document.getElementById('lista-posts');
  const modelo = document.getElementById('modelo-post');

  function formatarNumero(n){
    if(n < 1000) return String(n);
    if(n < 1000000) return (n / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'K';
    return (n / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + 'M';
  }

  function criarComentario(c){
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.className = 'avatar mini';
    img.src = c.avatar;
    img.alt = '';
    const texto = document.createElement('div');
    const nome = document.createElement('strong');
    nome.textContent = c.nome;
    texto.append(nome, c.texto);
    li.append(img, texto);
    return li;
  }

  function criarPost(post){
    const el = modelo.content.firstElementChild.cloneNode(true);
    const avatar = el.querySelector('.avatar');
    avatar.src = post.avatar;
    avatar.alt = 'foto de ' + post.nome;
    el.querySelector('.nome').textContent = post.nome;
    el.querySelector('.arroba').textContent = post.arroba;
    el.querySelector('.tempo').textContent = post.tempo;
    el.querySelector('.texto').textContent = post.texto;

    const curtir = el.querySelector('.curtir');
    const comentar = el.querySelector('.comentar');
    const marcar = el.querySelector('.marcar');
    const painel = el.querySelector('.comentarios');
    const listaComentarios = el.querySelector('.lista-comentarios');
    const formComentario = el.querySelector('.form-comentario');

    const atualizar = () => {
      curtir.querySelector('.contador').textContent = formatarNumero(post.curtidas);
      curtir.setAttribute('aria-pressed', !!post.curtido);
      comentar.querySelector('.contador').textContent = formatarNumero(post.totalComentarios);
      marcar.setAttribute('aria-pressed', !!post.marcado);
      marcar.title = post.marcado ? 'desmarcar post' : 'marcar post';
    };

    post.comentarios.forEach(c => listaComentarios.append(criarComentario(c)));

    curtir.addEventListener('click', () => {
      post.curtido = !post.curtido;
      post.curtidas += post.curtido ? 1 : -1;
      atualizar();
    });

    comentar.addEventListener('click', () => {
      painel.hidden = !painel.hidden;
      comentar.setAttribute('aria-expanded', !painel.hidden);
      if(!painel.hidden) formComentario.querySelector('input').focus();
    });

    marcar.addEventListener('click', () => {
      post.marcado = !post.marcado;
      atualizar();
    });

    formComentario.addEventListener('submit', (e) => {
      e.preventDefault();
      const campo = formComentario.querySelector('input');
      const texto = campo.value.trim();
      if(!texto) return;
      const c = { nome: EU.nome, avatar: EU.avatar, texto };
      post.comentarios.push(c);
      post.totalComentarios++;
      listaComentarios.append(criarComentario(c));
      campo.value = '';
      atualizar();
    });

    atualizar();
    return el;
  }

  function publicar(texto){
    const post = { ...EU, tempo: 'agora', texto, curtidas: 0, totalComentarios: 0, comentarios: [] };
    POSTS.unshift(post);
    const el = criarPost(post);
    el.classList.add('novo');
    lista.prepend(el);
    return el;
  }

  POSTS.forEach(p => lista.append(criarPost(p)));

  Zen.feed = { publicar };
})();
