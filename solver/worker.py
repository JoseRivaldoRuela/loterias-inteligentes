from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from solver_manager import find_pending_requests, process_request


BASE_DIR = Path(__file__).resolve().parent
LOCK_FILE = BASE_DIR / "worker.lock"


def current_time() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def create_lock() -> None:
    if LOCK_FILE.exists():
        try:
            existing_pid = LOCK_FILE.read_text(
                encoding="utf-8"
            ).strip()
        except OSError:
            existing_pid = "desconhecido"

        raise RuntimeError(
            "Já existe um worker em execução ou o arquivo de "
            f"bloqueio não foi removido.\n"
            f"Arquivo: {LOCK_FILE}\n"
            f"PID registrado: {existing_pid}\n\n"
            "Caso tenha certeza de que nenhum worker está rodando, "
            "apague o arquivo worker.lock."
        )

    LOCK_FILE.write_text(
        str(os.getpid()),
        encoding="utf-8",
    )


def remove_lock() -> None:
    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
    except OSError as error:
        print(
            f"[{current_time()}] Aviso: não foi possível remover "
            f"o arquivo de bloqueio: {error}"
        )


def process_next_request(
    time_limit: int,
    workers: int,
) -> bool:
    requests = find_pending_requests(limit=1)

    if not requests:
        return False

    request = requests[0]

    request_id = request.get(
        "id",
        "não identificado",
    )

    print()
    print(
        f"[{current_time()}] Solicitação pendente encontrada: "
        f"{request_id}"
    )

    process_request(
        request=request,
        time_limit=time_limit,
        workers=workers,
    )

    return True


def run_worker(
    interval: int,
    time_limit: int,
    workers: int,
    once: bool,
) -> int:
    create_lock()

    print()
    print("=" * 60)
    print("Worker automático de fechamentos")
    print("=" * 60)
    print(f"Iniciado em: {current_time()}")
    print(f"Intervalo de consulta: {interval} segundos")
    print(f"Limite por cálculo: {time_limit} segundos")
    print(f"Threads do solver: {workers}")
    print(f"PID: {os.getpid()}")

    if once:
        print("Modo: executar uma verificação e encerrar")
    else:
        print("Modo: monitoramento contínuo")
        print("Para encerrar com segurança, pressione Ctrl+C.")

    print("=" * 60)

    try:
        while True:
            try:
                processed = process_next_request(
                    time_limit=time_limit,
                    workers=workers,
                )

                if processed:
                    print()
                    print(
                        f"[{current_time()}] Solicitação concluída."
                    )

                    # Verifica imediatamente se existe outra
                    # solicitação pendente, sem aguardar o intervalo.
                    if not once:
                        continue

                elif not once:
                    print(
                        f"[{current_time()}] Nenhuma solicitação "
                        f"pendente. Nova verificação em "
                        f"{interval} segundos."
                    )

            except Exception as error:
                print()
                print(
                    f"[{current_time()}] ERRO durante o "
                    f"processamento: {error}"
                )

                if once:
                    return 1

                print(
                    f"[{current_time()}] O worker continuará ativo "
                    f"e tentará novamente em {interval} segundos."
                )

            if once:
                return 0

            time.sleep(interval)

    except KeyboardInterrupt:
        print()
        print()
        print(
            f"[{current_time()}] Encerramento solicitado pelo usuário."
        )
        return 0

    finally:
        remove_lock()

        print(
            f"[{current_time()}] Worker encerrado."
        )


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Monitora automaticamente solicitações de fechamentos "
            "pendentes, executa o solver e importa os resultados."
        )
    )

    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help=(
            "Intervalo, em segundos, entre consultas quando não "
            "existirem solicitações. Padrão: 60."
        ),
    )

    parser.add_argument(
        "--time-limit",
        type=int,
        default=300,
        help=(
            "Limite do solver em segundos para cada fechamento. "
            "Padrão: 300."
        ),
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help=(
            "Quantidade de threads usadas pelo solver. Padrão: 8."
        ),
    )

    parser.add_argument(
        "--once",
        action="store_true",
        help=(
            "Executa apenas uma consulta à fila e encerra."
        ),
    )

    return parser.parse_args()


def validate_arguments(
    arguments: argparse.Namespace,
) -> None:
    if arguments.interval < 10:
        raise ValueError(
            "--interval deve ser maior ou igual a 10 segundos."
        )

    if arguments.time_limit < 1:
        raise ValueError(
            "--time-limit deve ser maior ou igual a 1 segundo."
        )

    if arguments.workers < 1:
        raise ValueError(
            "--workers deve ser maior ou igual a 1."
        )


def main() -> int:
    arguments = parse_arguments()

    try:
        validate_arguments(arguments)

        return run_worker(
            interval=arguments.interval,
            time_limit=arguments.time_limit,
            workers=arguments.workers,
            once=arguments.once,
        )

    except Exception as error:
        print()
        print(f"Erro ao iniciar o worker: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())