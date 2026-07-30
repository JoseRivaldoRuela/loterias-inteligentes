from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class CoveringDesign:

    lottery_code: str

    universe_size: int

    ticket_size: int

    guarantee_size: int

    ticket_count: int

    lower_bound: int

    upper_bound: int

    optimality_status: str

    source_type: str

    source_name: str

    source_reference: str

    blocks: list[list[int]]

    coverage_verified: bool

    total_required_subsets: int

    covered_required_subsets: int

    verification_algorithm: str

    verification_version: str

    matrix_hash: str

    notes: str

    active: bool = True