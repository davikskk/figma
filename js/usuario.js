/* Zen · usuário (simulado)
   Nome, @ e foto de quem está usando o protótipo. Não é uma conta:
   vive só na memória da aba. A foto escolhida é lida localmente (object URL) e
   volta para a padrão (Watari) ao recarregar a página. */
window.Zen = window.Zen || {};

(function(){
  const PADRAO = { nome: 'davikskk', arroba: '@6davik9', avatar: 'assets/avatares/watari.jpg' };
  const dados = { ...PADRAO };
  let urlFoto = null;
  const entrada = document.getElementById('arquivo-avatar');

  // atualiza todo lugar que mostra o usuário atual (perfil, feed, novo post...)
  function refletir(raiz = document){
    raiz.querySelectorAll('[data-eu-avatar]').forEach(img => { img.src = dados.avatar; });
    raiz.querySelectorAll('[data-eu-nome]').forEach(el => { if(el !== document.activeElement) el.textContent = dados.nome; });
    raiz.querySelectorAll('[data-eu-arroba]').forEach(el => { if(el !== document.activeElement) el.textContent = dados.arroba; });
  }

  function definir(parcial){
    Object.assign(dados, parcial);
    refletir();
  }

  function escolherFoto(){
    entrada.click();
  }

  entrada.accept = Zen.imagens.ACEITAR;
  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files[0];
    entrada.value = '';
    if(!arquivo) return;
    let url;
    try{ url = await Zen.imagens.abrir(arquivo); }
    catch(erro){ Zen.avisar(erro.message); return; }
    if(urlFoto) URL.revokeObjectURL(urlFoto);
    urlFoto = url;
    definir({ avatar: urlFoto });
  });

  Zen.usuario = {
    get dados(){ return { ...dados }; },
    definir,
    refletir,
    escolherFoto
  };
})();
