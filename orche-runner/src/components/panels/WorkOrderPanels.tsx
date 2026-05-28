import { useMemo, useState } from 'react'
import { buildWorkOrderActionLogEntries, filterEventsForOperation } from '../../lib/actionLog'
import { deriveStepMeta, operationHasRecordedData } from '../../lib/events'
import { hierarchyEdges, adHocOperations } from '../../lib/routingTable'
import type { RequiredToolEntry } from '../../lib/tools'
import type { ProcessEvent, RoutingRow, WorkOrderOperation } from '../../lib/types'
import { CollapsibleGroup } from '../CollapsibleGroup'
import { formatDateTime } from '../../lib/format'
import { RequiredToolsTable } from '../RequiredToolsTable'

export function WorkOrderActionLogPanel({
  events,
  operations,
}: {
  events: ProcessEvent[]
  operations: WorkOrderOperation[]
}) {
  const sortedOps = useMemo(
    () => [...operations].sort((a, b) => a.operationNo - b.operationNo),
    [operations],
  )

  const woLevel = useMemo(() => {
    const routingKinds = new Set(['operation_added', 'operation_removed'])
    const entries = buildWorkOrderActionLogEntries(
      events.filter(
        (e) =>
          e.kind === 'work_order_completed' ||
          e.kind === 'work_order_uncompleted' ||
          (e.kind != null && routingKinds.has(e.kind)),
      ),
      new Map(),
    )
    return entries
  }, [events])

  if (operations.length === 0) {
    return <div className="muted">No operations on this work order.</div>
  }

  return (
    <div className="woPanelStack">
      {woLevel.length > 0 ? (
        <CollapsibleGroup title="Work order" meta={`${woLevel.length}`} defaultOpen>
          <ol className="actionLogList">
            {woLevel.map((entry) => (
              <li key={entry.id} className="actionLogEntry">
                <div className="actionLogEntryHead">
                  <span className="actionLogTitle">{entry.title}</span>
                  <time className="actionLogTime mono muted" dateTime={entry.at}>
                    {formatDateTime(entry.at)}
                  </time>
                </div>
                <div className="actionLogDetail">{entry.detail}</div>
              </li>
            ))}
          </ol>
        </CollapsibleGroup>
      ) : null}
      {sortedOps.map((op) => {
        const labels = new Map([[`${op.operationNo}:${op.operationId}`, `${op.operationNo}. ${op.operationName}`]])
        const entries = buildWorkOrderActionLogEntries(
          filterEventsForOperation(events, op.operationNo, op.operationId),
          labels,
        )
        return (
          <CollapsibleGroup
            key={`${op.operationNo}-${op.operationId}`}
            title={`${op.operationNo}. ${op.operationName}`}
            meta={entries.length ? `${entries.length}` : '—'}
          >
            {entries.length === 0 ? (
              <div className="muted">No actions recorded.</div>
            ) : (
              <ol className="actionLogList">
                {entries.map((entry) => (
                  <li key={entry.id} className="actionLogEntry">
                    <div className="actionLogEntryHead">
                      <span className="actionLogTitle">{entry.title}</span>
                      <time className="actionLogTime mono muted" dateTime={entry.at}>
                        {formatDateTime(entry.at)}
                      </time>
                    </div>
                    <div className="actionLogDetail">{entry.detail}</div>
                  </li>
                ))}
              </ol>
            )}
          </CollapsibleGroup>
        )
      })}
    </div>
  )
}

export function WorkOrderToolLogPanel({
  toolsByOperation,
}: {
  toolsByOperation: Array<{ op: WorkOrderOperation; tools: RequiredToolEntry[] }>
}) {
  if (toolsByOperation.every((g) => g.tools.length === 0)) {
    return <div className="muted">No tools listed for operations on this work order.</div>
  }

  return (
    <div className="woPanelStack">
      {toolsByOperation.map(({ op, tools }) => (
        <CollapsibleGroup
          key={`${op.operationNo}-${op.operationId}`}
          title={`${op.operationNo}. ${op.operationName}`}
          meta={tools.length ? `${tools.length}` : '—'}
        >
          <RequiredToolsTable tools={tools} emptyMessage="No tools for this operation." />
        </CollapsibleGroup>
      ))}
    </div>
  )
}

export function WorkOrderNotesPanel({
  operations,
  events,
}: {
  operations: WorkOrderOperation[]
  events: ProcessEvent[]
}) {
  const groups = useMemo(() => {
    return [...operations]
      .sort((a, b) => a.operationNo - b.operationNo)
      .map((op) => {
      const meta = deriveStepMeta(events, op.operationNo, op.operationId)
      const notes = Object.entries(meta)
        .filter(([, m]) => m.note.trim())
        .map(([stepId, m]) => ({ stepId, note: m.note }))
      return { op, notes }
    })
  }, [operations, events])

  const any = groups.some((g) => g.notes.length > 0)
  if (!any) return <div className="muted">No notes recorded on this work order.</div>

  return (
    <div className="woPanelStack">
      {groups.map(({ op, notes }) => (
        <CollapsibleGroup
          key={`${op.operationNo}-${op.operationId}`}
          title={`${op.operationNo}. ${op.operationName}`}
          meta={notes.length ? `${notes.length}` : '—'}
        >
          {notes.length === 0 ? (
            <div className="muted">No notes.</div>
          ) : (
            <div className="notesPanelList">
              {notes.map((n) => (
                <div key={n.stepId} className="opNoteItem">
                  <div className="opNoteTitle mono">{n.stepId}</div>
                  <div className="opNoteText muted">{n.note}</div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleGroup>
      ))}
    </div>
  )
}

export function OperationHierarchyPanel({ rows }: { rows: RoutingRow[] }) {
  const edges = hierarchyEdges(rows)
  const standalone = adHocOperations(rows)
  const rowMap = new Map(rows.map((r) => [r.operationNo, r]))

  if (edges.length === 0 && standalone.length === 0) {
    return <div className="muted">No operation dependencies defined.</div>
  }

  return (
    <div className="hierarchyPanel">
      {edges.length > 0 ? (
        <div className="hierarchyChain">
          {edges.map((edge) => {
            const from = rowMap.get(edge.from)
            const to = rowMap.get(edge.to)
            if (!from || !to) return null
            return (
              <div key={`${edge.from}-${edge.to}`} className="hierarchyLink">
                <div className="hierarchyNode">
                  <span className="hierarchyNo">{from.operationNo}</span>
                  <span className="hierarchyName">{from.operationName}</span>
                  <span className="hierarchyId mono">{from.operationId}</span>
                </div>
                <div className="hierarchyArrow" aria-hidden>
                  → {to.operationNo}
                </div>
                <div className="hierarchyNode">
                  <span className="hierarchyNo">{to.operationNo}</span>
                  <span className="hierarchyName">{to.operationName}</span>
                  <span className="hierarchyId mono">{to.operationId}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      {standalone.length > 0 ? (
        <div className="hierarchyStandalone">
          <div className="sectionLabel sectionLabelCompact">No chain dependency</div>
          {standalone.map((row) => (
            <div key={row.operationNo} className="hierarchyNode hierarchyNodeStandalone">
              <span className="hierarchyNo">{row.operationNo}</span>
              <span className="hierarchyName">{row.operationName}</span>
              <span className="hierarchyId mono">{row.operationId}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AddOperationPanel({
  onAdd,
  onCancel,
}: {
  onAdd: (payload: {
    operationNo: number
    operationName: string
  }) => void
  onCancel: () => void
}) {
  const [operationNo, setOperationNo] = useState('')
  const [operationName, setOperationName] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const no = Number(operationNo)
    if (Number.isNaN(no) || !operationName.trim()) return
    onAdd({
      operationNo: no,
      operationName: operationName.trim(),
    })
  }

  return (
    <form className="addOpForm" onSubmit={submit}>
      <label className="field">
        <div className="fieldLabel">Operation no.</div>
        <input
          className="input"
          type="number"
          step="any"
          required
          value={operationNo}
          onChange={(e) => setOperationNo(e.target.value)}
        />
      </label>
      <label className="field">
        <div className="fieldLabel">Title</div>
        <input
          className="input"
          required
          value={operationName}
          onChange={(e) => setOperationName(e.target.value)}
        />
      </label>
      <p className="muted addOpHint">
        Operations are ordered by operation number (e.g. 1.5 appears between 1 and 2). Operation
        IDs are auto-assigned as incremental numbers. Ad-hoc operations have no routing
        dependencies.
      </p>
      <div className="addOpActions">
        <button type="button" className="buttonGhost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="buttonPrimary">
          Add operation
        </button>
      </div>
    </form>
  )
}

export function DeleteOperationPanel({
  operations,
  events,
  onDelete,
  onCancel,
}: {
  operations: WorkOrderOperation[]
  events: ProcessEvent[]
  onDelete: (op: WorkOrderOperation) => void
  onCancel: () => void
}) {
  const sorted = useMemo(
    () => [...operations].sort((a, b) => a.operationNo - b.operationNo),
    [operations],
  )
  const [selectedKey, setSelectedKey] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  const selected = sorted.find((op) => `${op.operationNo}:${op.operationId}` === selectedKey)
  const hasData = selected
    ? operationHasRecordedData(events, selected.operationNo, selected.operationId)
    : false
  const canDelete = selected && !hasData && confirmChecked

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !canDelete) return
    onDelete(selected)
  }

  if (sorted.length === 0) {
    return <div className="muted">No operations on this work order.</div>
  }

  return (
    <form className="addOpForm" onSubmit={submit}>
      <div className="deleteOpWarning">
        Removing an operation cannot be undone. Only operations with no completed steps or captured
        data can be deleted.
      </div>
      <label className="field">
        <div className="fieldLabel">Operation</div>
        <select
          className="input"
          required
          value={selectedKey}
          onChange={(e) => {
            setSelectedKey(e.target.value)
            setConfirmChecked(false)
          }}
        >
          <option value="">Select…</option>
          {sorted.map((op) => {
            const blocked = operationHasRecordedData(events, op.operationNo, op.operationId)
            return (
              <option
                key={`${op.operationNo}-${op.operationId}`}
                value={`${op.operationNo}:${op.operationId}`}
                disabled={blocked}
              >
                {op.operationNo}. {op.operationName}
                {blocked ? ' (has data — cannot delete)' : ''}
              </option>
            )
          })}
        </select>
      </label>
      {selected && hasData ? (
        <div className="errorBanner">
          This operation has recorded steps, inputs, or notes. Complete removal is not allowed.
        </div>
      ) : null}
      {selected && !hasData ? (
        <label className="deleteOpConfirm">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          <span>
            I understand this will permanently remove{' '}
            <strong>
              {selected.operationNo}. {selected.operationName}
            </strong>{' '}
            from the work order.
          </span>
        </label>
      ) : null}
      <div className="addOpActions">
        <button type="button" className="buttonGhost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="buttonDanger" disabled={!canDelete}>
          Delete operation
        </button>
      </div>
    </form>
  )
}
