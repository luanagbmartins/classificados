"""Gera classificados.json a partir da planilha de classificação final.

Uso:
    python3 gerar_json.py CLASSIFICACAO.csv [ESCOLAS.csv]

CLASSIFICACAO.csv: categoria, pos_categoria, equipe, id, uf, f1_tabular,
f1_visao, f1_media_tab_vis, situacao. Só entram as linhas
"Classificada - <vaga>"; o CSV em si não vai para o repositório.
ESCOLAS.csv (opcional): equipe_id, inscricao — mostra o nº de inscrição.

Mesma regra do /api/classificados do plataforma-olimpiada-ia-ranking.
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

CARROSSEL_SEGUNDOS = 20


def normaliza(texto):
    texto = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return texto.strip().lower()


def numero(valor):
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def digitos(valor):
    return re.sub(r"\D", "", valor or "")


def carregar_inscricoes(caminho):
    if not caminho:
        return {}
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        return {int(digitos(l["equipe_id"])): int(digitos(l["inscricao"]))
                for l in csv.DictReader(f) if digitos(l.get("equipe_id")) and digitos(l.get("inscricao"))}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    inscricoes = carregar_inscricoes(sys.argv[2] if len(sys.argv) > 2 else None)

    categorias = {"publica": [], "privada": []}
    with open(sys.argv[1], encoding="utf-8-sig", newline="") as f:
        for l in csv.DictReader(f):
            rotulo, _, vaga = (l.get("situacao") or "").partition(" - ")
            tipo = normaliza(l.get("categoria"))
            posicao = digitos(l.get("pos_categoria"))
            if normaliza(rotulo) != "classificada" or tipo not in categorias or not posicao:
                continue
            equipe_id = int(digitos(l.get("id")) or 0) or None
            categorias[tipo].append({
                "id": equipe_id,
                "nome": (l.get("equipe") or "").strip(),
                "inscricao": inscricoes.get(equipe_id),
                "uf": (l.get("uf") or "").strip().upper() or None,
                "posicao": int(posicao),
                "tabular": numero(l.get("f1_tabular")),
                "visao": numero(l.get("f1_visao")),
                "total": numero(l.get("f1_media_tab_vis")),
                "vaga": vaga.strip() or None,
            })

    for equipes in categorias.values():
        equipes.sort(key=lambda e: e["posicao"])
    dados = {
        "carrossel_segundos": CARROSSEL_SEGUNDOS,
        "rankings": [
            {"id": "publica", "titulo": "Escolas públicas", "equipes": categorias["publica"]},
            {"id": "privada", "titulo": "Escolas privadas", "equipes": categorias["privada"]},
        ],
    }
    saida = Path(__file__).resolve().parent / "classificados.json"
    saida.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{saida.name}: " + ", ".join(f"{r['titulo']} ({len(r['equipes'])})" for r in dados["rankings"]))


if __name__ == "__main__":
    main()
