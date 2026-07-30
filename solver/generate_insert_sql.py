from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def sql_text(value: str | None) -> str:
    if value is None:
        return "null"

    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def validate_result(data: dict[str, Any]) -> None:
    required_fields = [
        "v",
        "k",
        "t",
        "ticketCount",
        "lowerBound",
        "upperBound",
        "optimalityStatus",
        "sourceType",
        "sourceName",
        "blocks",
        "coverageVerified",
        "totalRequiredSubsets",
        "coveredRequiredSubsets",
        "verificationAlgorithm",
        "verificationVersion",
        "matrixHash",
    ]

    missing_fields = [
        field
        for field in required_fields
        if field not in data
    ]

    if missing_fields:
        raise ValueError(
            "Campos ausentes no JSON: "
            + ", ".join(missing_fields),
        )

    if not data["coverageVerified"]:
        raise ValueError(
            "A matriz não possui cobertura verificada.",
        )

    blocks = data["blocks"]

    if not isinstance(blocks, list):
        raise ValueError(
            "O campo blocks possui formato inválido.",
        )

    if len(blocks) != data["ticketCount"]:
        raise ValueError(
            "ticketCount não corresponde ao número de blocos.",
        )

    for index, block in enumerate(blocks, start=1):
        if not isinstance(block, list):
            raise ValueError(
                f"O cartão {index} possui formato inválido.",
            )

        if len(block) != data["k"]:
            raise ValueError(
                f"O cartão {index} não possui "
                f"{data['k']} posições.",
            )

        if len(set(block)) != len(block):
            raise ValueError(
                f"O cartão {index} possui posições repetidas.",
            )

        if any(
            not isinstance(position, int)
            or position < 1
            or position > data["v"]
            for position in block
        ):
            raise ValueError(
                f"O cartão {index} possui posição inválida.",
            )


def create_sql(
    data: dict[str, Any],
    lottery_code: str,
) -> str:
    blocks_json = json.dumps(
        data["blocks"],
        ensure_ascii=False,
        separators=(",", ":"),
    )

    notes = (
        f"Construção produzida pelo solver. "
        f"Status do solver: "
        f"{data.get('solverStatus', 'não informado')}. "
        f"Tempo total: "
        f"{data.get('totalTimeSeconds', 'não informado')} segundos."
    )

    return f"""-- Loterias Inteligentes
-- Importação validada de C({data["v"]},{data["k"]},{data["t"]})

begin;

insert into public.covering_designs (
  lottery_id,
  universe_size,
  ticket_size,
  guarantee_size,
  ticket_count,
  lower_bound,
  upper_bound,
  optimality_status,
  source_type,
  source_name,
  source_reference,
  blocks,
  coverage_verified,
  total_required_subsets,
  covered_required_subsets,
  verification_algorithm,
  verification_version,
  verified_at,
  verification_time_ms,
  matrix_hash,
  notes,
  active
)
select
  lotteries.id,
  {data["v"]},
  {data["k"]},
  {data["t"]},
  {data["ticketCount"]},
  {data["lowerBound"]},
  {data["upperBound"]},
  {sql_text(data["optimalityStatus"])},
  {sql_text(data["sourceType"])},
  {sql_text(data["sourceName"])},
  {sql_text(f'C({data["v"]},{data["k"]},{data["t"]})')},
  $blocks${blocks_json}$blocks$::jsonb,
  true,
  {data["totalRequiredSubsets"]},
  {data["coveredRequiredSubsets"]},
  {sql_text(data["verificationAlgorithm"])},
  {sql_text(data["verificationVersion"])},
  now(),
  {float(data.get("totalTimeSeconds", 0)) * 1000},
  {sql_text(data["matrixHash"])},
  {sql_text(notes)},
  true
from public.lotteries
where lotteries.code = {sql_text(lottery_code)}
on conflict (
  lottery_id,
  universe_size,
  ticket_size,
  guarantee_size,
  matrix_hash
)
do nothing;

update public.covering_design_requests
set
  status = 'available',
  updated_at = now()
where lottery_id = (
  select id
  from public.lotteries
  where code = {sql_text(lottery_code)}
  limit 1
)
and universe_size = {data["v"]}
and ticket_size = {data["k"]}
and guarantee_size = {data["t"]};

commit;
"""


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Gera o SQL de importação de uma matriz "
            "validada para o Supabase."
        ),
    )

    parser.add_argument(
        "json_file",
        type=Path,
        help="Arquivo JSON produzido pelo solver.",
    )

    parser.add_argument(
        "--lottery-code",
        default="lotofacil",
        help="Código da loteria. Padrão: lotofacil.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Arquivo SQL de saída.",
    )

    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()

    if not arguments.json_file.exists():
        raise FileNotFoundError(
            f"Arquivo não encontrado: "
            f"{arguments.json_file}",
        )

    data = json.loads(
        arguments.json_file.read_text(
            encoding="utf-8",
        ),
    )

    validate_result(data)

    output_path = (
        arguments.output
        if arguments.output is not None
        else arguments.json_file.with_suffix(".sql")
    )

    sql = create_sql(
        data=data,
        lottery_code=arguments.lottery_code,
    )

    output_path.write_text(
        sql,
        encoding="utf-8",
    )

    print("SQL gerado com sucesso")
    print("----------------------")
    print(
        f"Fechamento: "
        f"C({data['v']},{data['k']},{data['t']})",
    )
    print(f"Cartões: {data['ticketCount']}")
    print(
        f"Cobertura verificada: "
        f"{data['coverageVerified']}",
    )
    print(f"Arquivo: {output_path.resolve()}")


if __name__ == "__main__":
    main()