# Classificados · OIAA 2026

Página de evento com as equipes classificadas na Fase 2 da Olimpíada de
Inteligência Artificial Aplicada, por categoria (escolas públicas e privadas).
Estilo e comportamento vêm do painel
[plataforma-olimpiada-ia-ranking](https://github.com/ceia-br/plataforma-olimpiada-ia-ranking).

Site estático, publicado pelo GitHub Pages a partir da branch `main`.

## Atualizar os dados

```sh
python3 gerar_json.py classificacao-final-tab-visao.csv escolas.csv
git commit -am "Atualiza classificados" && git push
```

`gerar_json.py` grava `classificados.json` só com as linhas
`Classificada - <vaga>`; a planilha completa não vai para o repositório.
A página relê o JSON a cada minuto, então uma tela aberta pega a atualização
sem recarregar.

## Testar localmente

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Teclado

- `←` / `→`: troca a categoria
- espaço: liga/desliga o giro automático
