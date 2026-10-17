/* Zen · music.txt
   Disco de vinil: toca um .mp3/.mp4 escolhido do computador (apenas no navegador, via object URL).
   Clique no disco = tocar / pausar. Em .mp4 só o áudio é usado. */
(function(){
  const tocaDiscos = document.getElementById('toca-discos');
  const vinil = document.getElementById('vinil');
  const audio = document.getElementById('audio');
  const entrada = document.getElementById('arquivo-musica');
  const faixa = document.getElementById('faixa');
  if(!vinil) return;

  const EXTENSOES = /\.(mp3|mp4)$/i;
  const TIPOS = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'video/mp4'];
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
    if(audio.paused){
      audio.play().catch(() => mensagem('não foi possível tocar este arquivo', true));
    }else{
      audio.pause();
    }
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
})();
