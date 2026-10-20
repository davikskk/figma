/* zen · música (vinil)
   cria o toca-discos usado pelas janelas de música do perfil.
   toca um .mp3/.mp4 escolhido do computador, apenas no navegador (object URL).
   clique no disco = tocar / pausar. em .mp4 só o áudio é usado.

   uso: const inst = Zen.musica.criar(corpoDaJanela)
   devolve { temConteudo(), destruir() } — o formato que o perfil.js espera de todo tipo de janela

   spotify quem? aqui é vinil raiz */
window.Zen = window.Zen || {};

(function(){
  // aceita pelo nome do arquivo OU pelo tipo informado pelo sistema (um dos dois às vezes vem vazio)
  const EXTENSOES = /\.(mp3|mp4)$/i;
  const TIPOS = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'video/mp4'];

  // monta o toca-discos dentro de "corpo" e liga todos os botões
  function criar(corpo){
    // o HTML do toca-discos: disco (botão), braço da agulha, nome da faixa, botão de arquivo e o <audio> invisível
    corpo.innerHTML = `
      <div class="toca-discos">
        <button type="button" class="vinil" aria-label="escolher música">
          <span class="vinil-disco"><span class="vinil-rotulo">zen</span></span>
          <span class="vinil-brilho"></span>
        </button>
        <span class="braco" aria-hidden="true"></span>
      </div>
      <p class="faixa" aria-live="polite">clique no disco p/ escolher</p>
      <label class="botao pequeno">
        abrir arquivo...
        <input type="file" accept=".mp3,.mp4,audio/mpeg,video/mp4" hidden>
      </label>
      <audio preload="metadata"></audio>`;

    const tocaDiscos = corpo.querySelector('.toca-discos');
    const vinil = corpo.querySelector('.vinil');
    const audio = corpo.querySelector('audio');
    const entrada = corpo.querySelector('input[type="file"]');
    const faixa = corpo.querySelector('.faixa');
    // endereço temporário da música carregada (null = nada carregado ainda)
    let url = null;
    // nome da música sem a extensão, para mostrar embaixo do disco
    let nome = '';

    // escreve embaixo do disco. erro = true deixa o texto com cara de erro (classe erro-midia)
    function mensagem(texto, erro){
      faixa.textContent = texto;
      // title: se o nome for grande e cortar, passando o mouse aparece inteiro
      faixa.title = texto;
      faixa.classList.toggle('erro-midia', !!erro);
    }

    // confere o arquivo e coloca ele no <audio>
    function carregar(arquivo){
      if(!arquivo) return;
      if(!EXTENSOES.test(arquivo.name) && !TIPOS.includes(arquivo.type)){
        mensagem('use um arquivo .mp3 ou .mp4', true);
        return;
      }
      audio.pause();
      // libera a música anterior da memória
      if(url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(arquivo);
      audio.src = url;
      nome = arquivo.name.replace(EXTENSOES, '');
      mensagem(nome);
      vinil.setAttribute('aria-label', 'tocar ' + nome);
      vinil.setAttribute('aria-pressed', 'false');
    }

    // clique no disco: sem música abre o arquivo; com música alterna tocar/pausar
    vinil.addEventListener('click', () => {
      if(!url){ entrada.click(); return; }
      // play() devolve uma Promise que pode falhar (arquivo zoado, navegador chato...)
      if(audio.paused) audio.play().catch(() => mensagem('não foi possível tocar este arquivo', true));
      else audio.pause();
    });

    entrada.addEventListener('change', () => {
      carregar(entrada.files[0]);
      // limpa para que escolher o mesmo arquivo de novo funcione
      entrada.value = '';
    });

    // começou a tocar: o CSS vê a classe "tocando" e faz o disco girar
    // a rotação só pausa (animation-play-state), então o disco para onde está
    audio.addEventListener('play', () => {
      tocaDiscos.classList.add('tocando');
      vinil.setAttribute('aria-pressed', 'true');
      vinil.setAttribute('aria-label', 'pausar ' + nome);
      mensagem(nome);
    });

    // pausou: o disco para de girar
    // também dispara ao terminar a faixa
    audio.addEventListener('pause', () => {
      tocaDiscos.classList.remove('tocando');
      vinil.setAttribute('aria-pressed', 'false');
      vinil.setAttribute('aria-label', 'tocar ' + nome);
    });

    // o navegador não conseguiu ler o arquivo (ex.: mp4 com codec esquisito)
    audio.addEventListener('error', () => {
      if(!url) return;
      tocaDiscos.classList.remove('tocando');
      mensagem('formato não suportado por este navegador', true);
    });

    return {
      // tem música carregada? o perfil pergunta isso antes de apagar a janela
      temConteudo: () => !!url,
      // a janela foi removida: desliga o som e devolve a memória. guardar o brinquedo na caixa
      destruir(){
        audio.pause();
        audio.removeAttribute('src');
        if(url) URL.revokeObjectURL(url);
      }
    };
  }

  Zen.musica = { criar };
})();
