/* Zen · visor 3D
   Renderizador pequeno em Canvas 2D (sem bibliotecas): triângulos com sombreamento chapado,
   em baixa resolução para combinar com a estética pixelada.
   Modelos: alguns predefinidos (gerados por código aqui mesmo, sem IA nem servidor)
   ou um .obj / .stl importado do computador, lido apenas no navegador. */
window.Zen = window.Zen || {};

(function(){
  const MAX_TRIANGULOS = 30000;
  const ESCALA_PIXEL = 2; // 1 pixel do canvas = 2 pixels na tela

  /* ---------- modelos predefinidos ---------- */

  // gira um perfil (raio, altura) em volta do eixo Y
  function torno(perfil, segmentos, corDoTrecho = () => null){
    const v = [], f = [], c = [];
    const m = perfil.length;
    for(let j = 0; j < segmentos; j++){
      const a = j / segmentos * Math.PI * 2;
      for(const [r, y] of perfil) v.push([r * Math.cos(a), y, r * Math.sin(a)]);
    }
    for(let j = 0; j < segmentos; j++){
      const k = (j + 1) % segmentos;
      for(let i = 0; i < m - 1; i++){
        const a = j * m + i, b = a + 1, d = k * m + i, e = d + 1;
        f.push([a, b, e], [a, e, d]);
        c.push(corDoTrecho(i), corDoTrecho(i));
      }
    }
    return { v, f, c };
  }

  const circulo = (cx, cy, r, n) => Array.from({ length: n + 1 }, (_, i) => {
    const a = i / n * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

  const MODELOS = {
    cubo: {
      nome: 'cubo',
      gerar: () => ({
        v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
        f: [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]]
      })
    },
    piramide: {
      nome: 'pirâmide',
      gerar: () => ({
        v: [[-1, -0.8, -1], [1, -0.8, -1], [1, -0.8, 1], [-1, -0.8, 1], [0, 1, 0]],
        f: [[0, 1, 2], [0, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]]
      })
    },
    cristal: {
      nome: 'cristal',
      gerar: () => torno([[0, 1.4], [0.7, 0.2], [0.7, -0.2], [0, -1.1]], 6)
    },
    rosquinha: {
      nome: 'rosquinha',
      gerar: () => torno(circulo(1, 0, 0.42, 12), 24, (i) => i < 6 ? '#c98a5a' : '#e7a6b8')
    },
    cogumelo: {
      nome: 'cogumelo',
      gerar: () => torno(
        [[0, 1.05], [0.45, 1.0], [0.8, 0.82], [1.0, 0.55], [1.02, 0.4], [0.3, 0.38], [0.3, -0.55], [0.36, -0.75], [0, -0.75]],
        16, (i) => i < 4 ? '#b5484a' : '#e8e0cc')
    },
    vaso: {
      nome: 'vaso',
      gerar: () => torno([[0, -1], [0.55, -1], [0.75, -0.6], [0.8, 0], [0.5, 0.6], [0.35, 0.85], [0.45, 1], [0.4, 1.02]], 18)
    }
  };

  /* ---------- leitura de arquivos ---------- */

  function lerOBJ(texto){
    const v = [], f = [];
    for(const linha of texto.split('\n')){
      const p = linha.trim().split(/\s+/);
      if(p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
      else if(p[0] === 'f'){
        const idx = p.slice(1).map(s => { const i = parseInt(s, 10); return i < 0 ? v.length + i : i - 1; });
        for(let k = 1; k < idx.length - 1; k++) f.push([idx[0], idx[k], idx[k + 1]]);
      }
    }
    return { v, f };
  }

  function lerSTL(buffer){
    const dv = new DataView(buffer);
    const v = [], f = [];
    const n = buffer.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if(buffer.byteLength === 84 + n * 50){
      for(let t = 0; t < n; t++){
        const base = 84 + t * 50 + 12;
        for(let k = 0; k < 3; k++){
          const o = base + k * 12;
          v.push([dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]);
        }
        f.push([t * 3, t * 3 + 1, t * 3 + 2]);
      }
    }else{
      const texto = new TextDecoder().decode(buffer);
      for(const m of texto.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) v.push([+m[1], +m[2], +m[3]]);
      for(let i = 0; i + 2 < v.length; i += 3) f.push([i, i + 1, i + 2]);
    }
    return { v, f };
  }

  async function lerArquivo(arquivo){
    const nome = arquivo.name.toLowerCase();
    let modelo;
    if(nome.endsWith('.obj')) modelo = lerOBJ(await arquivo.text());
    else if(nome.endsWith('.stl')) modelo = lerSTL(await arquivo.arrayBuffer());
    else throw new Error('use um arquivo .obj ou .stl');

    const valido = modelo.f.length && modelo.v.every(p => p.every(Number.isFinite)) &&
      modelo.f.every(t => t.every(i => i >= 0 && i < modelo.v.length));
    if(!valido) throw new Error('não consegui ler este modelo');
    if(modelo.f.length > MAX_TRIANGULOS) throw new Error('modelo grande demais (máx. 30 mil triângulos)');
    return modelo;
  }

  /* ---------- preparação: centraliza, normaliza e calcula normais ---------- */

  function preparar({ v, f, c }){
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    v.forEach(p => p.forEach((x, i) => { min[i] = Math.min(min[i], x); max[i] = Math.max(max[i], x); }));
    const centro = min.map((x, i) => (x + max[i]) / 2);
    let raio = 0;
    v.forEach(p => { raio = Math.max(raio, Math.hypot(p[0] - centro[0], p[1] - centro[1], p[2] - centro[2])); });
    raio = raio || 1;

    const pos = new Float32Array(v.length * 3);
    v.forEach((p, i) => { for(let k = 0; k < 3; k++) pos[i * 3 + k] = (p[k] - centro[k]) / raio; });

    const tri = new Uint32Array(f.length * 3);
    const normais = new Float32Array(f.length * 3);
    f.forEach((t, i) => {
      tri.set(t, i * 3);
      const [a, b, d] = t.map(j => [pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const len = Math.hypot(...n) || 1;
      normais.set(n.map(x => x / len), i * 3);
    });

    const cores = c ? c.map(cor => cor && Zen.cores.rgb(cor)) : null;
    return { pos, tri, normais, cores, total: f.length };
  }

  /* ---------- janela ---------- */

  function criar(corpo, dados, aoMudar){
    corpo.innerHTML = `
      <div class="palco-3d" title="arraste p/ girar · roda do mouse p/ zoom · duplo clique p/ centralizar">
        <canvas></canvas>
        <span class="aviso-3d" aria-live="polite"></span>
      </div>
      <div class="barra-modulo">
        <select class="campo-mini" aria-label="modelo 3D"></select>
        <label class="botao pequeno">importar .obj/.stl<input type="file" accept=".obj,.stl" hidden></label>
        <span class="dica">arraste p/ girar</span>
      </div>`;

    const palco = corpo.querySelector('.palco-3d');
    const canvas = corpo.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const seletor = corpo.querySelector('select');
    const entrada = corpo.querySelector('input[type="file"]');
    const aviso = corpo.querySelector('.aviso-3d');

    Object.entries(MODELOS).forEach(([id, m]) => seletor.append(new Option(m.nome, id)));

    let modelo, importado = null;
    let profundidade, ordem, tela;
    let yaw = 0.6, pitch = -0.35, zoom = 1, arrastando = false, visivel = false, raf = null, destruido = false;

    function usar(bruto){
      modelo = preparar(bruto);
      profundidade = new Float32Array(modelo.total);
      ordem = new Uint32Array(modelo.total);
      tela = new Float32Array(modelo.pos.length);
    }

    function escolher(id){
      if(id === 'importado' && importado) usar(importado);
      else{
        if(!MODELOS[id]) id = 'cogumelo';
        usar(MODELOS[id].gerar());
        dados.modelo = id;
        aoMudar();
      }
      seletor.value = id;
      aviso.textContent = '';
      desenhar();
    }

    function desenhar(){
      const w = canvas.width, h = canvas.height;
      if(!w || !h || !modelo) return;
      ctx.clearRect(0, 0, w, h);

      const estilo = getComputedStyle(corpo);
      const base = Zen.cores.rgb(/^#[0-9a-f]{6}$/i.test(estilo.getPropertyValue('--title-start').trim())
        ? estilo.getPropertyValue('--title-start').trim() : '#6b7fb0');
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const dist = 3.2 / zoom, foco = Math.min(w, h) * 0.95;
      const { pos, tri, normais, cores, total } = modelo;

      for(let i = 0; i < pos.length; i += 3){
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + dist;
        tela[i] = w / 2 + x1 * foco / z2;
        tela[i + 1] = h / 2 - y2 * foco / z2;
        tela[i + 2] = z2;
      }

      for(let t = 0; t < total; t++){
        profundidade[t] = tela[tri[t * 3] * 3 + 2] + tela[tri[t * 3 + 1] * 3 + 2] + tela[tri[t * 3 + 2] * 3 + 2];
        ordem[t] = t;
      }
      ordem.sort((a, b) => profundidade[b] - profundidade[a]); // do fundo para a frente

      ctx.lineWidth = 0.6;
      for(const t of ordem){
        const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, d = tri[t * 3 + 2] * 3;
        if(tela[a + 2] < 0.1 || tela[b + 2] < 0.1 || tela[d + 2] < 0.1) continue;
        // normal girada para a luz; iluminação dos dois lados (modelos importados nem sempre são consistentes)
        const nx = normais[t * 3], ny = normais[t * 3 + 1], nz = normais[t * 3 + 2];
        const nx1 = nx * cy + nz * sy, nz1 = -nx * sy + nz * cy;
        const ny2 = ny * cp - nz1 * sp, nz2 = ny * sp + nz1 * cp;
        const luz = Math.abs(nx1 * -0.45 + ny2 * 0.6 + nz2 * -0.66);
        const nivel = Math.round((0.38 + 0.62 * luz) * 7) / 7; // faixas de luz, estilo retrô
        const cor = (cores && cores[t]) || base;
        ctx.fillStyle = ctx.strokeStyle = `rgb(${cor[0] * nivel | 0},${cor[1] * nivel | 0},${cor[2] * nivel | 0})`;
        ctx.beginPath();
        ctx.moveTo(tela[a], tela[a + 1]);
        ctx.lineTo(tela[b], tela[b + 1]);
        ctx.lineTo(tela[d], tela[d + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    function quadro(){
      raf = null;
      if(destruido || !visivel) return;
      if(!arrastando) yaw += 0.008;
      desenhar();
      raf = requestAnimationFrame(quadro);
    }

    function iniciar(){
      if(!raf && visivel && !destruido) raf = requestAnimationFrame(quadro);
    }

    const tamanho = new ResizeObserver(() => {
      canvas.width = Math.max(1, Math.ceil(palco.clientWidth / ESCALA_PIXEL));
      canvas.height = Math.max(1, Math.ceil(palco.clientHeight / ESCALA_PIXEL));
      desenhar();
    });
    tamanho.observe(palco);

    // só anima enquanto a janela está visível na tela
    const presenca = new IntersectionObserver((e) => {
      visivel = e[e.length - 1].isIntersecting;
      iniciar();
    });
    presenca.observe(palco);

    palco.addEventListener('pointerdown', (e) => {
      if(e.button !== 0) return;
      e.stopPropagation();
      arrastando = true;
      palco.setPointerCapture(e.pointerId);
      let ux = e.clientX, uy = e.clientY;
      const mover = (ev) => {
        yaw += (ev.clientX - ux) * 0.012;
        pitch = Math.max(-1.5, Math.min(1.5, pitch + (ev.clientY - uy) * 0.012));
        ux = ev.clientX; uy = ev.clientY;
        desenhar();
      };
      const soltar = () => {
        arrastando = false;
        palco.removeEventListener('pointermove', mover);
        palco.removeEventListener('pointerup', soltar);
        palco.removeEventListener('pointercancel', soltar);
      };
      palco.addEventListener('pointermove', mover);
      palco.addEventListener('pointerup', soltar);
      palco.addEventListener('pointercancel', soltar);
    });

    palco.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom = Math.max(0.5, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      desenhar();
    }, { passive: false });

    palco.addEventListener('dblclick', () => { yaw = 0.6; pitch = -0.35; zoom = 1; desenhar(); });

    seletor.addEventListener('change', () => escolher(seletor.value));

    entrada.addEventListener('change', async () => {
      const arquivo = entrada.files[0];
      entrada.value = '';
      if(!arquivo) return;
      try{
        importado = await lerArquivo(arquivo);
        let opcao = seletor.querySelector('option[value="importado"]');
        if(!opcao){ opcao = new Option('', 'importado'); seletor.append(opcao); }
        opcao.textContent = 'importado: ' + arquivo.name.replace(/\.\w+$/, '').slice(0, 18);
        zoom = 1;
        escolher('importado');
      }catch(erro){
        aviso.textContent = erro.message;
      }
    });

    escolher(dados.modelo);

    return {
      temConteudo: () => !!importado,
      destruir(){
        destruido = true;
        if(raf) cancelAnimationFrame(raf);
        tamanho.disconnect();
        presenca.disconnect();
      }
    };
  }

  Zen.visor3d = { criar, lerOBJ, lerSTL };
})();
