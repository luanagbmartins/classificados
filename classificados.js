// Página de evento com os classificados: lê classificados.json e gira o
// carrossel entre Escolas públicas e Escolas privadas. Mesmo comportamento do
// painel de ranking (app.js), sem rolagem: todas as equipes cabem na tela.
// Teclado: ← → trocam a categoria, espaço liga/desliga o giro automático.

const CONSULTA_MS = 60_000;
const PAUSA_INTERACAO_MS = 60_000;

const PODIO = { 1: 'ouro', 2: 'prata', 3: 'bronze' };

const el = (id) => document.getElementById(id);
const fmt4 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
// A média vem com 5 casas no CSV e separa equipes que empatariam com 4 (0,77780 × 0,77775).
const fmt5 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 });

let dados = null;
let assinatura = null;
let indice = 0;
let timerCarrossel = null;
let pausadoAte = 0;
let girarAuto = lerPreferencia();

function lerPreferencia() {
  try { return localStorage.getItem('classificados-girar-auto') !== 'false'; } catch { return true; }
}
function salvarPreferencia() {
  try { localStorage.setItem('classificados-girar-auto', String(girarAuto)); } catch { /* sem storage */ }
}

function numero(v, f = fmt4) {
  return v === null || v === undefined ? '—' : f.format(v);
}

function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function rotuloAba(titulo) {
  const t = escapar(titulo.toUpperCase());
  return t.startsWith('ESCOLAS ') ? `<span class="so-desktop">ESCOLAS </span>${t.slice(8)}` : t;
}

function renderAbas(atual) {
  el('abas').innerHTML = dados.rankings
    .map((r, i) => `<button type="button" class="aba${r.id === atual.id ? ' ativa' : ''}" data-indice="${i}"
      aria-pressed="${r.id === atual.id}">${rotuloAba(r.titulo)}</button>`)
    .join('');
}

function selo(vaga) {
  if (!vaga) return '';
  const goiana = vaga.toLowerCase().includes('goian');
  return `<span class="vaga${goiana ? ' vaga--goiana' : ''}">${escapar(vaga.toUpperCase())}</span>`;
}

function renderSlide({ animar = true } = {}) {
  indice %= dados.rankings.length;
  const ranking = dados.rankings[indice];

  renderAbas(ranking);
  el('slide-titulo').innerHTML = `&gt; ${escapar(ranking.titulo.toUpperCase())}
    <span class="contagem">${ranking.equipes.length} EQUIPES CLASSIFICADAS</span>`;

  const lista = el('lista');
  lista.style.setProperty('--n', Math.max(ranking.equipes.length, 1));
  lista.innerHTML = ranking.equipes
    .map((e, i) => {
      const medalha = PODIO[e.posicao];
      return `<li class="linha${medalha ? ` ${medalha}` : ''}" style="--i:${i}">
        <span class="col-pos">${medalha
          ? `<span class="moeda" title="${e.posicao}º lugar · ${medalha}">${e.posicao}</span>`
          : `${e.posicao}º`}</span>
        <span class="col-nome">${e.inscricao ? `<span class="inscricao">#${e.inscricao}</span> ` : ''}${escapar(e.nome)}</span>
        <span class="col-uf">${e.uf ? escapar(e.uf) : '—'}</span>
        <span class="col-num">${numero(e.tabular)}</span>
        <span class="col-num">${numero(e.visao)}</span>
        <span class="col-num col-total">${numero(e.total, fmt5)}</span>
        <span class="col-vaga">${selo(e.vaga)}</span>
        <span class="col-trilhas">${e.uf ? `${escapar(e.uf)} · ` : ''}Tabular ${numero(e.tabular)} · Visão ${numero(e.visao)}</span>
      </li>`;
    })
    .join('');

  if (!animar) return;
  const slide = el('slide');
  slide.classList.remove('entrando');
  void slide.offsetWidth; // reinicia a animação de entrada
  slide.classList.add('entrando');
  reiniciarBarra();
}

function reiniciarBarra() {
  const barra = el('barra');
  barra.classList.remove('rodando');
  void barra.offsetWidth;
  barra.style.animationDuration = `${dados.carrossel_segundos}s`;
  barra.classList.add('rodando');
}

function proximoSlide() {
  if (!girarAuto) return;
  if (Date.now() < pausadoAte) {
    agendarCarrossel(pausadoAte - Date.now());
    return;
  }
  document.querySelector('.progresso').classList.remove('parado');
  indice += 1;
  renderSlide();
  agendarCarrossel();
}

function pausarPorInteracao() {
  pausadoAte = Date.now() + PAUSA_INTERACAO_MS;
  document.querySelector('.progresso').classList.add('parado');
}

function agendarCarrossel(ms = dados.carrossel_segundos * 1000) {
  clearTimeout(timerCarrossel);
  timerCarrossel = girarAuto ? setTimeout(proximoSlide, ms) : null;
}

function aplicarToggle() {
  const botao = el('toggle-auto');
  botao.setAttribute('aria-pressed', String(girarAuto));
  botao.querySelector('.toggle-estado').textContent = girarAuto ? 'ON' : 'OFF';
  document.querySelector('.progresso').classList.toggle('desligado', !girarAuto);
}

function alternarAuto() {
  girarAuto = !girarAuto;
  salvarPreferencia();
  aplicarToggle();
  if (!dados) return;
  pausadoAte = 0;
  document.querySelector('.progresso').classList.remove('parado');
  if (girarAuto) {
    reiniciarBarra();
    agendarCarrossel();
  } else {
    clearTimeout(timerCarrossel);
    timerCarrossel = null;
  }
}

function irPara(i) {
  if (!dados) return;
  indice = (i + dados.rankings.length) % dados.rankings.length;
  renderSlide();
  pausarPorInteracao();
  agendarCarrossel();
}

async function consultar() {
  try {
    const resp = await fetch('classificados.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const novos = await resp.json();
    const vazio = !novos.rankings || novos.rankings.every((r) => r.equipes.length === 0);
    el('pausa').hidden = !vazio;
    el('slide').hidden = vazio;
    el('controles').hidden = vazio;
    document.querySelector('.progresso').hidden = vazio;
    if (vazio) {
      if (novos.erro) console.error(novos.erro);
      return;
    }

    const nova = JSON.stringify(novos.rankings);
    const primeira = dados === null;
    dados = novos;
    if (primeira) {
      renderSlide();
      agendarCarrossel();
    } else if (nova !== assinatura) {
      renderSlide({ animar: false }); // CSV trocado: atualiza a tela atual sem reiniciar o giro
    }
    assinatura = nova;
  } catch (err) {
    console.error('Falha ao carregar classificados.json', err);
  }
}

el('abas').addEventListener('click', (ev) => {
  const aba = ev.target.closest('.aba');
  if (aba) irPara(Number(aba.dataset.indice));
});
el('toggle-auto').addEventListener('click', alternarAuto);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'ArrowRight') irPara(indice + 1);
  else if (ev.key === 'ArrowLeft') irPara(indice - 1);
  else if (ev.key === ' ' && ev.target === document.body) {
    ev.preventDefault();
    alternarAuto();
  }
});
window.addEventListener('touchstart', pausarPorInteracao, { passive: true });

aplicarToggle();
consultar();
setInterval(consultar, CONSULTA_MS);
