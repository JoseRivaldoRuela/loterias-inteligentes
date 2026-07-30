from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import time
from pathlib import Path
from typing import Iterable

from ortools.sat.python import cp_model


def combinations_as_tuples(
    values: Iterable[int],
    size: int,
) -> list[tuple[int, ...]]:
    return list(itertools.combinations(values, size))


def canonical_key(values: Iterable[int]) -> str:
    return "-".join(str(value) for value in sorted(values))


def validate_parameters(v: int, k: int, t: int) -> None:
    if v <= 0:
        raise ValueError("v deve ser maior que zero.")

    if k <= 0 or k > v:
        raise ValueError("k deve estar entre 1 e v.")

    if t <= 0 or t > k:
        raise ValueError("t deve estar entre 1 e k.")


def create_candidate_blocks(
    v: int,
    k: int,
) -> list[tuple[int, ...]]:
    universe = range(1, v + 1)
    return combinations_as_tuples(universe, k)


def create_scenarios(
    v: int,
    t: int,
) -> list[tuple[int, ...]]:
    universe = range(1, v + 1)
    return combinations_as_tuples(universe, t)


def build_candidate_index(
    candidates: list[tuple[int, ...]],
) -> dict[str, int]:
    return {
        canonical_key(candidate): index
        for index, candidate in enumerate(candidates)
    }


def candidate_indexes_covering_scenario(
    scenario: tuple[int, ...],
    universe: tuple[int, ...],
    k: int,
    candidate_index: dict[str, int],
) -> list[int]:
    scenario_set = set(scenario)

    remaining_numbers = [
        number
        for number in universe
        if number not in scenario_set
    ]

    remaining_needed = k - len(scenario)

    indexes: list[int] = []

    for complement in itertools.combinations(
        remaining_numbers,
        remaining_needed,
    ):
        block = tuple(sorted((*scenario, *complement)))
        index = candidate_index.get(canonical_key(block))

        if index is None:
            raise RuntimeError(
                f"Bloco candidato não encontrado: {block}",
            )

        indexes.append(index)

    return indexes


def lower_bound(v: int, k: int, t: int) -> int:
    """
    Limite inferior simples de contagem:

    cada bloco de tamanho k cobre C(k,t) subconjuntos de tamanho t;
    existem C(v,t) subconjuntos obrigatórios.
    """
    return math.ceil(
        math.comb(v, t) / math.comb(k, t),
    )


def verify_covering(
    v: int,
    t: int,
    selected_blocks: list[tuple[int, ...]],
) -> tuple[bool, int, int, list[tuple[int, ...]]]:
    scenarios = create_scenarios(v, t)
    block_sets = [set(block) for block in selected_blocks]

    uncovered: list[tuple[int, ...]] = []

    for scenario in scenarios:
        scenario_set = set(scenario)

        covered = any(
            scenario_set.issubset(block_set)
            for block_set in block_sets
        )

        if not covered:
            uncovered.append(scenario)

    total = len(scenarios)
    covered_total = total - len(uncovered)

    return (
        len(uncovered) == 0,
        total,
        covered_total,
        uncovered[:100],
    )


def solve_covering(
    v: int,
    k: int,
    t: int,
    time_limit_seconds: float,
    workers: int,
) -> dict[str, object]:
    validate_parameters(v, k, t)

    started_at = time.perf_counter()

    universe = tuple(range(1, v + 1))
    candidates = create_candidate_blocks(v, k)
    scenarios = create_scenarios(v, t)
    candidate_index = build_candidate_index(candidates)

    print(f"Problema: C({v},{k},{t})")
    print(f"Cartões candidatos: {len(candidates):,}")
    print(f"Subconjuntos obrigatórios: {len(scenarios):,}")
    print(f"Limite inferior inicial: {lower_bound(v, k, t):,}")
    print("Montando modelo matemático...")

    model = cp_model.CpModel()

    selected_variables = [
        model.new_bool_var(f"block_{index}")
        for index in range(len(candidates))
    ]

    for scenario_number, scenario in enumerate(
        scenarios,
        start=1,
    ):
        covering_indexes = (
            candidate_indexes_covering_scenario(
                scenario=scenario,
                universe=universe,
                k=k,
                candidate_index=candidate_index,
            )
        )

        model.add(
            sum(
                selected_variables[index]
                for index in covering_indexes
            )
            >= 1,
        )

        if scenario_number % 5000 == 0:
            print(
                f"Restrições criadas: "
                f"{scenario_number:,}/{len(scenarios):,}",
            )

    model.minimize(sum(selected_variables))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = (
        time_limit_seconds
    )
    solver.parameters.num_search_workers = workers
    solver.parameters.log_search_progress = True

    print("Iniciando otimização exata...")

    solve_started_at = time.perf_counter()
    status = solver.solve(model)
    solve_time = time.perf_counter() - solve_started_at

    status_name = solver.status_name(status)

    if status not in (
        cp_model.OPTIMAL,
        cp_model.FEASIBLE,
    ):
        raise RuntimeError(
            f"O solver terminou sem solução utilizável. "
            f"Status: {status_name}",
        )

    selected_blocks = [
        candidates[index]
        for index, variable in enumerate(selected_variables)
        if solver.value(variable) == 1
    ]

    print("Validando a matriz de forma independente...")

    (
        coverage_verified,
        total_required_subsets,
        covered_required_subsets,
        uncovered_sample,
    ) = verify_covering(
        v=v,
        t=t,
        selected_blocks=selected_blocks,
    )

    if not coverage_verified:
        raise RuntimeError(
            "A matriz produzida não passou na validação exata.",
        )

    total_time = time.perf_counter() - started_at

    matrix_content = json.dumps(
        selected_blocks,
        separators=(",", ":"),
    )

    matrix_hash = hashlib.sha256(
        matrix_content.encode("utf-8"),
    ).hexdigest()

    optimality_status = (
        "proven_optimal"
        if status == cp_model.OPTIMAL
        else "valid_construction"
    )

    best_bound = math.ceil(solver.best_objective_bound)

    result: dict[str, object] = {
        "v": v,
        "k": k,
        "t": t,
        "ticketCount": len(selected_blocks),
        "lowerBound": best_bound,
        "upperBound": len(selected_blocks),
        "optimalityStatus": optimality_status,
        "solverStatus": status_name,
        "sourceType": "exact_solver",
        "sourceName": "Google OR-Tools CP-SAT",
        "blocks": [
            list(block)
            for block in selected_blocks
        ],
        "coverageVerified": coverage_verified,
        "totalRequiredSubsets": total_required_subsets,
        "coveredRequiredSubsets": covered_required_subsets,
        "uncoveredScenariosSample": [
            list(scenario)
            for scenario in uncovered_sample
        ],
        "verificationAlgorithm": (
            "Exact subset containment verification"
        ),
        "verificationVersion": "1.0.0",
        "solverVersion": "OR-Tools 9.15.6755",
        "solveTimeSeconds": round(solve_time, 3),
        "totalTimeSeconds": round(total_time, 3),
        "matrixHash": matrix_hash,
    }

    return result


def save_result(
    result: dict[str, object],
    output_directory: Path,
) -> Path:
    output_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    filename = (
        f"C{result['v']}-"
        f"{result['k']}-"
        f"{result['t']}.json"
    )

    output_path = output_directory / filename

    output_path.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return output_path


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Resolve e valida um Covering Design C(v,k,t)."
        ),
    )

    parser.add_argument(
        "--v",
        type=int,
        required=True,
        help="Quantidade total de posições do universo.",
    )

    parser.add_argument(
        "--k",
        type=int,
        required=True,
        help="Quantidade de posições em cada cartão.",
    )

    parser.add_argument(
        "--t",
        type=int,
        required=True,
        help="Quantidade de posições que devem ser cobertas.",
    )

    parser.add_argument(
        "--time-limit",
        type=float,
        default=300,
        help="Limite do solver em segundos. Padrão: 300.",
    )

    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Quantidade de threads do solver. Padrão: 8.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output"),
        help="Pasta para salvar o JSON.",
    )

    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()

    result = solve_covering(
        v=arguments.v,
        k=arguments.k,
        t=arguments.t,
        time_limit_seconds=arguments.time_limit,
        workers=arguments.workers,
    )

    output_path = save_result(
        result=result,
        output_directory=arguments.output,
    )

    print()
    print("Resultado concluído")
    print("-------------------")
    print(
        f"Fechamento: "
        f"C({result['v']},{result['k']},{result['t']})",
    )
    print(f"Cartões: {result['ticketCount']}")
    print(f"Limite inferior: {result['lowerBound']}")
    print(f"Limite superior: {result['upperBound']}")
    print(
        f"Situação: {result['optimalityStatus']}",
    )
    print(
        f"Cobertura verificada: "
        f"{result['coverageVerified']}",
    )
    print(
        f"Tempo total: "
        f"{result['totalTimeSeconds']} segundos",
    )
    print(f"Arquivo: {output_path.resolve()}")


if __name__ == "__main__":
    main()