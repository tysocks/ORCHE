import type { RoutingRow } from './types'

export function sortRoutingRows(rows: RoutingRow[]): RoutingRow[] {
  return [...rows].sort((a, b) => a.operationNo - b.operationNo)
}

export function serializeRoutingTable(rows: RoutingRow[], title = 'Routing'): string {
  const header = `# ${title}\n\n| Operation No | Operation ID | Operation Name | Next Operation No |\n| ------------ | ------------ | -------------- | ----------------- |`
  const body = sortRoutingRows(rows)
    .map(
      (r) =>
        `| ${r.operationNo} | ${r.operationId} | ${r.operationName} | ${r.nextOperationNo ?? ''} |`,
    )
    .join('\n')
  return `${header}\n${body}\n`
}

/** Appends a row; display order follows operation number (e.g. 1.5 sits between 1 and 2). */
export function insertRoutingRow(rows: RoutingRow[], row: RoutingRow): RoutingRow[] {
  return sortRoutingRows([...rows, { ...row, nextOperationNo: null }])
}

export function removeRoutingRow(
  rows: RoutingRow[],
  operationNo: number,
  operationId: string,
): RoutingRow[] {
  const id = operationId.toUpperCase()
  return sortRoutingRows(
    rows
      .filter((r) => !(r.operationNo === operationNo && r.operationId === id))
      .map((r) =>
        r.nextOperationNo === operationNo ? { ...r, nextOperationNo: null } : r,
      ),
  )
}

/** Operations that participate in the dependency chain (have Next or are pointed to). */
export function hierarchyEdges(rows: RoutingRow[]): { from: number; to: number }[] {
  const nos = new Set(rows.map((r) => r.operationNo))
  const edges: { from: number; to: number }[] = []
  for (const row of rows) {
    if (row.nextOperationNo != null && nos.has(row.nextOperationNo)) {
      edges.push({ from: row.operationNo, to: row.nextOperationNo })
    }
  }
  return edges
}

export function adHocOperations(rows: RoutingRow[]): RoutingRow[] {
  const pointed = new Set<number>()
  for (const row of rows) {
    if (row.nextOperationNo != null) pointed.add(row.nextOperationNo)
  }
  const hasOutgoing = new Set(rows.filter((r) => r.nextOperationNo != null).map((r) => r.operationNo))
  return rows.filter((r) => !hasOutgoing.has(r.operationNo) && !pointed.has(r.operationNo))
}
