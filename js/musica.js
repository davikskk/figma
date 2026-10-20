/* Zen · música (vinil)
   Cria o toca-discos usado pelas janelas de música do perfil.
   Toca um .mp3/.mp4 escolhido do computador, apenas no navegador (object URL).
   Clique no disco = tocar / pausar. Em .mp4 só o áudio é usado. */
window.Zen = window.Zen || {};

(function(){
  const EXTENSOES = /\.(mp3|mp4)$/i;
  const TIPOS = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'video/mp4'];

  function criar(corpo){
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
    let url = null;
    let nome = '';

    function mensagem(texto, erro){
      faixa.textContent = texto;
      faixa.title = texto;
      faixa.classList.toggle('erro-midia', !!erro);
    }

    function carregar(arquivo){
      if(!arquivo) return;
      if(!EXTENSOES.test(arquivo.name) && !TIPOS.includes(arquivo.type)){
        mensagem('use um arquivo .mp3 ou .mp4', true);
        return;
      }
      audio.pause();
      if(url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(arquivo);
      audio.src = url;
      nome = arquivo.name.replace(EXTENSOES, '');
      mensagem(nome);
      vinil.setAttribute('aria-label', 'tocar ' + nome);
      vinil.setAttribute('aria-pressed', 'false');
    }

    vinil.addEventListener('click', () => {
      if(!url){ entrada.click(); return; }
      if(audio.paused) audio.play().catch(() => mensagem('não foi possível tocar este arquivo', true));
      else audio.pause();
    });

    entrada.addEventListener('change', () => {
      carregar(entrada.files[0]);
      entrada.value = '';
    });

    // a rotação só pausa (animation-play-state), então o disco para onde está
    audio.addEventListener('play', () => {
      tocaDiscos.classList.add('tocando');
      vinil.setAttribute('aria-pressed', 'true');
      vinil.setAttribute('aria-label', 'pausar ' + nome);
      mensagem(nome);
    });

    // também dispara ao terminar a faixa
    audio.addEventListener('pause', () => {
      tocaDiscos.classList.remove('tocando');
      vinil.setAttribute('aria-pressed', 'false');
      vinil.setAttribute('aria-label', 'tocar ' + nome);
    });

    audio.addEventListener('error', () => {
      if(!url) return;
      tocaDiscos.classList.remove('tocando');
      mensagem('formato não suportado por este navegador', true);
    });

    return {
      temConteudo: () => !!url,
      destruir(){
        audio.pause();
        audio.removeAttribute('src');
        if(url) URL.revokeObjectURL(url);
      }
    };
  }

  Zen.musica = { criar };
})();
