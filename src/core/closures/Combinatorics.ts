export class Combinatorics {
  static count(total: number, selected: number): number {
    if (
      !Number.isInteger(total) ||
      !Number.isInteger(selected) ||
      total < 0 ||
      selected < 0 ||
      selected > total
    ) {
      return 0
    }

    const smallerSelection = Math.min(
      selected,
      total - selected,
    )

    let result = 1

    for (let index = 1; index <= smallerSelection; index += 1) {
      result =
        (result * (total - smallerSelection + index)) / index

      if (result >= Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER
      }
    }

    return Math.round(result)
  }

  static generate<T>(
    items: T[],
    selected: number,
  ): T[][] {
    if (
      !Number.isInteger(selected) ||
      selected < 0 ||
      selected > items.length
    ) {
      return []
    }

    if (selected === 0) {
      return [[]]
    }

    const combinations: T[][] = []
    const current: T[] = []

    function build(startIndex: number): void {
      if (current.length === selected) {
        combinations.push([...current])
        return
      }

      const remainingNeeded = selected - current.length
      const lastPossibleIndex =
        items.length - remainingNeeded

      for (
        let index = startIndex;
        index <= lastPossibleIndex;
        index += 1
      ) {
        current.push(items[index])
        build(index + 1)
        current.pop()
      }
    }

    build(0)

    return combinations
  }

  static countIntersection<T>(
    first: T[],
    second: T[],
  ): number {
    const secondSet = new Set(second)

    return first.reduce(
      (total, item) =>
        total + (secondSet.has(item) ? 1 : 0),
      0,
    )
  }
}