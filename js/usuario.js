/* zen · usuário (simulado)
   nome, @ e foto de quem está usando o protótipo. não é uma conta:
   vive só na memória da aba. a foto escolhida é lida localmente (object URL) e
   volta para a padrão (Watari) ao recarregar a página.

   como funciona, em resumo:
   - todo elemento do HTML que mostra "você" tem uma etiqueta: data-eu-avatar, data-eu-nome ou data-eu-arroba
   - refletir() procura essas etiquetas e preenche com os dados atuais
   - definir() troca um dado e chama refletir() — muda em todo lugar de uma vez

   ferramentas expostas em Zen.usuario: dados, definir, refletir, escolherFoto */

// "se a mochila Zen já existe, usa ela; se não, cria uma vazia". todo arquivo começa assim
window.Zen = window.Zen || {};

// função que se chama sozinha: o que fica aqui dentro não vaza para o resto do site
(function(){
  // o usuário que aparece antes de qualquer mudança. sim, é o davikskk. não, não dá pra trocar o padrão pelo site
  const PADRAO = { nome: 'davikskk', arroba: '@6davik9', avatar: 'assets/avatares/watari.jpg' };
  // cópia do padrão: é esta que muda, o PADRAO fica intacto
  const dados = { ...PADRAO };
  // endereço temporário da foto escolhida (null = ainda usando a foto padrão)
  let urlFoto = null;
  // <input type="file"> escondido no index.html, usado para escolher a foto
  const entrada = document.getElementById('arquivo-avatar');

  // atualiza todo lugar que mostra o usuário atual (perfil, feed, novo post...)
  // raiz: onde procurar. por padrão a página inteira, mas dá pra passar só um pedaço (ex.: um post novo)
  function refletir(raiz = document){
    raiz.querySelectorAll('[data-eu-avatar]').forEach(img => { img.src = dados.avatar; });
    // pula o campo que está sendo digitado agora, senão o cursor pula pro começo e a pessoa surta
    raiz.querySelectorAll('[data-eu-nome]').forEach(el => { if(el !== document.activeElement) el.textContent = dados.nome; });
    raiz.querySelectorAll('[data-eu-arroba]').forEach(el => { if(el !== document.activeElement) el.textContent = dados.arroba; });
  }

  // troca só os campos passados (ex.: definir({ nome: 'outro' })) e atualiza a tela
  function definir(parcial){
    Object.assign(dados, parcial);
    refletir();
  }

  // finge um clique no <input type="file"> escondido, abrindo a janela de escolher arquivo
  function escolherFoto(){
    entrada.click();
  }

  // quais tipos de imagem aparecem na janela de escolher arquivo (lista em aparencia.js)
  entrada.accept = Zen.imagens.ACEITAR;

  // quando a pessoa escolhe um arquivo
  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files[0];
    // limpa o input para que escolher a MESMA foto de novo também dispare o change
    entrada.value = '';
    if(!arquivo) return;
    let url;
    // o detetive de imagens confere se o navegador consegue abrir mesmo. se não, avisa e desiste
    try{ url = await Zen.imagens.abrir(arquivo); }
    catch(erro){ Zen.avisar(erro.message); return; }
    // joga fora o endereço da foto anterior para não ficar ocupando memória
    if(urlFoto) URL.revokeObjectURL(urlFoto);
    urlFoto = url;
    definir({ avatar: urlFoto });
  });

  // o que os outros arquivos podem usar
  Zen.usuario = {
    // devolve uma CÓPIA: quem lê não consegue bagunçar os dados sem passar por definir()
    get dados(){ return { ...dados }; },
    definir,
    refletir,
    escolherFoto
  };
})();
