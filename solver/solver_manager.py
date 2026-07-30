from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Any

from db import get_client
from import_json import import_design


BASE_DIR = Path(__file__).resolve().parent
SOLVER_FILE = BASE_DIR / "solve_covering.py"
OUTPUT_DIR = BASE_DIR / "output"


def find_pending_requests(
    limit: int,
) -> list[dict[str, Any]]:
    client = get_client()

    response = (
        client.table("covering_design_requests")
        .select(
            "id,"
            "lottery_id,"
            "universe_size,"
            "ticket_size,"
            "guarantee_size,"
            "status,"
            "updated_at"
        )
        .eq("status", "pending")
        .order("updated_at")
        .limit(limit)
        .execute()
    )

    return response.data or []


def find_lottery_code(
    lottery_id: str,
) -> str:
    client = get_client()

    response = (
        client.table("lotteries")
        .select("code")
        .eq("id", lottery_id)
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise RuntimeError(
            f"Loteria não encontrada para o ID {lottery_id}."
        )

    lottery_code = rows[0].get("code")

    if not lottery_code:
        raise RuntimeError(
            f"A loteria {lottery_id} não possui código."
        )

    return str(lottery_code)


def expected_output_file(
    universe_size: int,
    ticket_size: int,
    guarantee_size: int,
) -> Path:
    filename = (
        f"C{universe_size}-"
        f"{ticket_size}-"
        f"{guarantee_size}.json"
    )

    return OUTPUT_DIR / filename


def run_solver(
    universe_size: int,
    ticket_size: int,
    guarantee_size: int,
    time_limit: int,
    workers: int,
) -> Path:
    if not SOLVER_FILE.exists():
        raise FileNotFoundError(
            f"Solver não encontrado: {SOLVER_FILE}"
        )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    output_file = expected_output_file(
        universe_size=universe_size,
        ticket_size=ticket_size,
        guarantee_size=guarantee_size,
    )

    command = [
        sys.executable,
        str(SOLVER_FILE),
        "--v",
        str(universe_size),
        "--k",
        str(ticket_size),
        "--t",
        str(guarantee_size),
        "--time-limit",
        str(time_limit),
        "--workers",
        str(workers),
        "--output",
        str(OUTPUT_DIR),
    ]

    print()
    print(
        f"Executando solver para "
        f"C({universe_size},{ticket_size},{guarantee_size})"
    )
    print(f"Limite de tempo: {time_limit} segundos")
    print(f"Threads: {workers}")

    result = subprocess.run(
        command,
        cwd=BASE_DIR,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "O solver terminou com erro. "
            f"Código de saída: {result.returncode}."
        )

    if not output_file.exists():
        raise FileNotFoundError(
            "O solver terminou, mas o JSON esperado "
            f"não foi encontrado: {output_file}"
        )

    return output_file


def process_request(
    request: dict[str, Any],
    time_limit: int,
    workers: int,
) -> None:
    request_id = request.get("id")
    lottery_id = request.get("lottery_id")

    universe_size = request.get("universe_size")
    ticket_size = request.get("ticket_size")
    guarantee_size = request.get("guarantee_size")

    if not request_id:
        raise ValueError(
            "A solicitação não possui ID."
        )

    if not lottery_id:
        raise ValueError(
            f"A solicitação {request_id} não possui lottery_id."
        )

    if not isinstance(universe_size, int):
        raise ValueError(
            f"A solicitação {request_id} possui "
            "universe_size inválido."
        )

    if not isinstance(ticket_size, int):
        raise ValueError(
            f"A solicitação {request_id} possui "
            "ticket_size inválido."
        )

    if not isinstance(guarantee_size, int):
        raise ValueError(
            f"A solicitação {request_id} possui "
            "guarantee_size inválido."
        )

    reference = (
        f"C({universe_size},"
        f"{ticket_size},"
        f"{guarantee_size})"
    )

    lottery_code = find_lottery_code(
        str(lottery_id)
    )

    print()
    print("=" * 60)
    print(f"Solicitação: {request_id}")
    print(f"Loteria: {lottery_code}")
    print(f"Fechamento: {reference}")
    print("=" * 60)

    output_file = expected_output_file(
        universe_size=universe_size,
        ticket_size=ticket_size,
        guarantee_size=guarantee_size,
    )

    if output_file.exists():
        print()
        print(f"JSON já existente: {output_file.name}")
        print("O solver não será executado novamente.")
    else:
        output_file = run_solver(
            universe_size=universe_size,
            ticket_size=ticket_size,
            guarantee_size=guarantee_size,
            time_limit=time_limit,
            workers=workers,
        )

    print()
    print(f"Importando {output_file.name}...")

    result = import_design(
        file_path=output_file,
        lottery_code=lottery_code,
    )

    print()
    print(f"Resultado: {result}")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Busca solicitações pendentes, executa o solver "
            "e importa as matrizes no Supabase."
        )
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=1,
        help=(
            "Quantidade máxima de solicitações a processar. "
            "Padrão: 1."
        ),
    )

    parser.add_argument(
        "--time-limit",
        type=int,
        default=300,
        help=(
            "Limite do solver em segundos para cada solicitação. "
            "Padrão: 300."
        ),
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help=(
            "Quantidade de threads utilizadas pelo solver. "
            "Padrão: 8."
        ),
    )

    return parser.parse_args()


def validate_arguments(
    arguments: argparse.Namespace,
) -> None:
    if arguments.limit < 1:
        raise ValueError(
            "--limit deve ser maior ou igual a 1."
        )

    if arguments.time_limit < 1:
        raise ValueError(
            "--time-limit deve ser maior ou igual a 1."
        )

    if arguments.workers < 1:
        raise ValueError(
            "--workers deve ser maior ou igual a 1."
        )


def main() -> int:
    arguments = parse_arguments()

    try:
        validate_arguments(arguments)

        requests = find_pending_requests(
            limit=arguments.limit,
        )

    except Exception as error:
        print()
        print(f"Erro ao buscar solicitações: {error}")
        return 1

    print()
    print("Gerenciador automático de fechamentos")
    print("------------------------------------")

    if not requests:
        print("Nenhuma solicitação pendente encontrada.")
        return 0

    print(
        f"Solicitações encontradas: {len(requests)}"
    )

    processed = 0
    failed = 0

    for request in requests:
        try:
            process_request(
                request=request,
                time_limit=arguments.time_limit,
                workers=arguments.workers,
            )

            processed += 1

        except Exception as error:
            failed += 1

            request_id = request.get(
                "id",
                "não identificado",
            )

            print()
            print(
                f"ERRO na solicitação {request_id}: {error}"
            )

    print()
    print("=" * 60)
    print("Resumo")
    print("=" * 60)
    print(f"Processadas com sucesso: {processed}")
    print(f"Falhas: {failed}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())