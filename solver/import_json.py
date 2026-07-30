from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from db import get_client


ALLOWED_OPTIMALITY_STATUSES = {
    "proven_optimal",
    "best_known",
    "valid_construction",
}

ALLOWED_SOURCE_TYPES = {
    "literature",
    "repository",
    "exact_solver",
    "imported",
    "internal",
}


def read_json_file(file_path: Path) -> dict[str, Any]:
    if not file_path.exists():
        raise FileNotFoundError(
            f"Arquivo não encontrado: {file_path}"
        )

    if not file_path.is_file():
        raise ValueError(
            f"O caminho não é um arquivo: {file_path}"
        )

    try:
        content = file_path.read_text(encoding="utf-8")
        data = json.loads(content)
    except UnicodeDecodeError as error:
        raise ValueError(
            f"Não foi possível ler {file_path.name} como UTF-8."
        ) from error
    except json.JSONDecodeError as error:
        raise ValueError(
            f"JSON inválido em {file_path.name}: "
            f"linha {error.lineno}, coluna {error.colno}."
        ) from error

    if not isinstance(data, dict):
        raise ValueError(
            f"O conteúdo de {file_path.name} deve ser um objeto JSON."
        )

    return data


def require_integer(
    data: dict[str, Any],
    field: str,
    minimum: int | None = None,
) -> int:
    value = data.get(field)

    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(
            f"O campo '{field}' deve ser um número inteiro."
        )

    if minimum is not None and value < minimum:
        raise ValueError(
            f"O campo '{field}' deve ser maior ou igual a {minimum}."
        )

    return value


def require_string(
    data: dict[str, Any],
    field: str,
) -> str:
    value = data.get(field)

    if not isinstance(value, str) or not value.strip():
        raise ValueError(
            f"O campo '{field}' deve ser um texto não vazio."
        )

    return value.strip()


def validate_blocks(
    blocks: Any,
    universe_size: int,
    ticket_size: int,
    ticket_count: int,
) -> list[list[int]]:
    if not isinstance(blocks, list):
        raise ValueError(
            "O campo 'blocks' deve ser uma lista de cartões."
        )

    if len(blocks) != ticket_count:
        raise ValueError(
            "A quantidade de blocos não corresponde ao ticketCount: "
            f"esperado {ticket_count}, encontrado {len(blocks)}."
        )

    validated_blocks: list[list[int]] = []
    canonical_blocks: set[tuple[int, ...]] = set()

    for block_index, raw_block in enumerate(blocks, start=1):
        if not isinstance(raw_block, list):
            raise ValueError(
                f"O cartão {block_index} não é uma lista."
            )

        if len(raw_block) != ticket_size:
            raise ValueError(
                f"O cartão {block_index} possui {len(raw_block)} posições; "
                f"deveria possuir {ticket_size}."
            )

        block: list[int] = []

        for position in raw_block:
            if (
                isinstance(position, bool)
                or not isinstance(position, int)
            ):
                raise ValueError(
                    f"O cartão {block_index} contém posição não inteira."
                )

            if position < 1 or position > universe_size:
                raise ValueError(
                    f"O cartão {block_index} contém a posição "
                    f"{position}, fora do intervalo 1 a {universe_size}."
                )

            block.append(position)

        if len(set(block)) != ticket_size:
            raise ValueError(
                f"O cartão {block_index} contém posições repetidas."
            )

        canonical_block = tuple(sorted(block))

        if canonical_block in canonical_blocks:
            raise ValueError(
                f"O cartão {block_index} está duplicado na matriz."
            )

        canonical_blocks.add(canonical_block)
        validated_blocks.append(block)

    return validated_blocks


def calculate_matrix_hash(
    blocks: list[list[int]],
) -> str:
    matrix_content = json.dumps(
        blocks,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    return hashlib.sha256(
        matrix_content.encode("utf-8")
    ).hexdigest()


def validate_covering_json(
    data: dict[str, Any],
) -> dict[str, Any]:
    universe_size = require_integer(data, "v", minimum=1)
    ticket_size = require_integer(data, "k", minimum=1)
    guarantee_size = require_integer(data, "t", minimum=1)
    ticket_count = require_integer(
        data,
        "ticketCount",
        minimum=1,
    )

    if guarantee_size > ticket_size:
        raise ValueError(
            "A garantia não pode ser maior que o tamanho do cartão."
        )

    if ticket_size > universe_size:
        raise ValueError(
            "O tamanho do cartão não pode ser maior que o universo."
        )

    lower_bound = require_integer(
        data,
        "lowerBound",
        minimum=1,
    )

    upper_bound = require_integer(
        data,
        "upperBound",
        minimum=1,
    )

    if lower_bound > upper_bound:
        raise ValueError(
            "O limite inferior não pode ser maior que o superior."
        )

    if upper_bound != ticket_count:
        raise ValueError(
            "O upperBound deve corresponder ao ticketCount."
        )

    optimality_status = require_string(
        data,
        "optimalityStatus",
    )

    if optimality_status not in ALLOWED_OPTIMALITY_STATUSES:
        raise ValueError(
            "optimalityStatus inválido: "
            f"{optimality_status}."
        )

    source_type = require_string(data, "sourceType")

    if source_type not in ALLOWED_SOURCE_TYPES:
        raise ValueError(
            f"sourceType inválido: {source_type}."
        )

    source_name = require_string(data, "sourceName")

    coverage_verified = data.get("coverageVerified")

    if coverage_verified is not True:
        raise ValueError(
            "A matriz não está marcada como matematicamente verificada."
        )

    total_required_subsets = require_integer(
        data,
        "totalRequiredSubsets",
        minimum=1,
    )

    covered_required_subsets = require_integer(
        data,
        "coveredRequiredSubsets",
        minimum=1,
    )

    if covered_required_subsets != total_required_subsets:
        raise ValueError(
            "A cobertura não está completa: "
            f"{covered_required_subsets} de "
            f"{total_required_subsets} subconjuntos."
        )

    verification_algorithm = require_string(
        data,
        "verificationAlgorithm",
    )

    verification_version = require_string(
        data,
        "verificationVersion",
    )

    blocks = validate_blocks(
        blocks=data.get("blocks"),
        universe_size=universe_size,
        ticket_size=ticket_size,
        ticket_count=ticket_count,
    )

    calculated_hash = calculate_matrix_hash(blocks)
    informed_hash = require_string(data, "matrixHash")

    if calculated_hash != informed_hash:
        raise ValueError(
            "O hash da matriz não corresponde ao conteúdo dos blocos. "
            "O arquivo pode ter sido alterado."
        )

    total_time_seconds = data.get("totalTimeSeconds", 0)

    if not isinstance(total_time_seconds, (int, float)):
        total_time_seconds = 0

    solver_status = str(
        data.get("solverStatus", "não informado")
    )

    solver_version = str(
        data.get("solverVersion", "não informado")
    )

    notes = (
        "Construção produzida e validada pelo solver. "
        f"Status do solver: {solver_status}. "
        f"Versão: {solver_version}. "
        f"Tempo total: {total_time_seconds} segundos."
    )

    return {
        "universe_size": universe_size,
        "ticket_size": ticket_size,
        "guarantee_size": guarantee_size,
        "ticket_count": ticket_count,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "optimality_status": optimality_status,
        "source_type": source_type,
        "source_name": source_name,
        "source_reference": (
            f"C({universe_size},"
            f"{ticket_size},"
            f"{guarantee_size})"
        ),
        "blocks": blocks,
        "coverage_verified": True,
        "total_required_subsets": total_required_subsets,
        "covered_required_subsets": covered_required_subsets,
        "verification_algorithm": verification_algorithm,
        "verification_version": verification_version,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "verification_time_ms": (
            float(total_time_seconds) * 1000
        ),
        "matrix_hash": calculated_hash,
        "notes": notes,
        "active": True,
    }


def find_lottery_id(
    lottery_code: str,
) -> str:
    client = get_client()

    response = (
        client.table("lotteries")
        .select("id,code,name")
        .eq("code", lottery_code)
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise RuntimeError(
            f"Nenhuma loteria encontrada com o código "
            f"'{lottery_code}'."
        )

    lottery_id = rows[0].get("id")

    if not lottery_id:
        raise RuntimeError(
            "A loteria encontrada não possui um ID válido."
        )

    return str(lottery_id)


def design_already_exists(
    lottery_id: str,
    design: dict[str, Any],
) -> bool:
    client = get_client()

    response = (
        client.table("covering_designs")
        .select("id")
        .eq("lottery_id", lottery_id)
        .eq("universe_size", design["universe_size"])
        .eq("ticket_size", design["ticket_size"])
        .eq("guarantee_size", design["guarantee_size"])
        .eq("matrix_hash", design["matrix_hash"])
        .limit(1)
        .execute()
    )

    return bool(response.data)


def import_design(
    file_path: Path,
    lottery_code: str,
) -> str:
    data = read_json_file(file_path)
    design = validate_covering_json(data)
    lottery_id = find_lottery_id(lottery_code)

    reference = (
        f"C({design['universe_size']},"
        f"{design['ticket_size']},"
        f"{design['guarantee_size']})"
    )

    if design_already_exists(lottery_id, design):
        update_pending_requests(
            lottery_id=lottery_id,
            universe_size=design["universe_size"],
            ticket_size=design["ticket_size"],
            guarantee_size=design["guarantee_size"],
        )

        return (
            f"{reference}: já estava cadastrado; "
            "solicitações atualizadas."
        )

    payload = {
        "lottery_id": lottery_id,
        **design,
    }

    client = get_client()

    response = (
        client.table("covering_designs")
        .upsert(
            payload,
            on_conflict=(
                "lottery_id,"
                "universe_size,"
                "ticket_size,"
                "guarantee_size,"
                "matrix_hash"
            ),
        )
        .execute()
    )

    if not response.data:
        raise RuntimeError(
            f"O Supabase não retornou confirmação da importação "
            f"de {reference}."
        )

    update_pending_requests(
        lottery_id=lottery_id,
        universe_size=design["universe_size"],
        ticket_size=design["ticket_size"],
        guarantee_size=design["guarantee_size"],
    )

    return (
        f"{reference}: {design['ticket_count']} cartões "
        "importados com sucesso."
    )


def update_pending_requests(
    lottery_id: str,
    universe_size: int,
    ticket_size: int,
    guarantee_size: int,
) -> None:
    client = get_client()

    (
        client.table("covering_design_requests")
        .update(
            {
                "status": "available",
                "updated_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            }
        )
        .eq("lottery_id", lottery_id)
        .eq("universe_size", universe_size)
        .eq("ticket_size", ticket_size)
        .eq("guarantee_size", guarantee_size)
        .execute()
    )


def collect_json_files(
    input_path: Path,
) -> list[Path]:
    if not input_path.exists():
        raise FileNotFoundError(
            f"Caminho não encontrado: {input_path}"
        )

    if input_path.is_file():
        if input_path.suffix.lower() != ".json":
            raise ValueError(
                "O arquivo informado não possui extensão .json."
            )

        return [input_path]

    files = sorted(
        file_path
        for file_path in input_path.glob("C*.json")
        if file_path.is_file()
    )

    if not files:
        raise ValueError(
            f"Nenhum arquivo C*.json encontrado em {input_path}."
        )

    return files


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Importa matrizes verificadas para o catálogo "
            "de fechamentos do Supabase."
        )
    )

    parser.add_argument(
        "input",
        type=Path,
        help=(
            "Arquivo JSON ou pasta contendo arquivos C*.json."
        ),
    )

    parser.add_argument(
        "--lottery-code",
        default="lotofacil",
        help=(
            "Código da loteria no banco. "
            "Padrão: lotofacil."
        ),
    )

    return parser.parse_args()


def main() -> int:
    arguments = parse_arguments()

    try:
        files = collect_json_files(arguments.input)
    except Exception as error:
        print(f"Erro: {error}")
        return 1

    imported = 0
    skipped_or_updated = 0
    failed = 0

    print()
    print("Importação de fechamentos")
    print("-------------------------")
    print(f"Arquivos encontrados: {len(files)}")
    print()

    for file_path in files:
        print(f"Processando: {file_path.name}")

        try:
            result = import_design(
                file_path=file_path,
                lottery_code=arguments.lottery_code,
            )

            print(f"  OK: {result}")

            if "já estava cadastrado" in result:
                skipped_or_updated += 1
            else:
                imported += 1

        except Exception as error:
            failed += 1
            print(f"  ERRO: {error}")

    print()
    print("Resumo")
    print("------")
    print(f"Importados: {imported}")
    print(
        "Já existentes/atualizados: "
        f"{skipped_or_updated}"
    )
    print(f"Falhas: {failed}")

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())