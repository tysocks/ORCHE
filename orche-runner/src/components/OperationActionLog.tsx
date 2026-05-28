import { useMemo } from 'react'
import { buildActionLogEntries } from '../lib/actionLog'
import { formatDateTime } from '../lib/format'
import type { ParsedOperation, ProcessEvent } from '../lib/types'

type Props = {
  events: ProcessEvent[]
  operationNo: number
  opId: string
  operation: ParsedOperation
}

function kindClass(kind: string): string {
  switch (kind) {
    case 'step_completed':
    case 'operation_completed':
      return 'actionLogKind_done'
    case 'step_uncompleted':
    case 'operation_uncompleted':
      return 'actionLogKind_reopen'
    case 'input_changed':
      return 'actionLogKind_input'
    case 'step_note':
      return 'actionLogKind_note'
    default:
      return ''
  }
}

export function OperationActionLog({ events, operationNo, opId, operation }: Props) {
  const entries = useMemo(
    () => buildActionLogEntries(events, operationNo, opId, operation),
    [events, operationNo, opId, operation],
  )

  if (entries.length === 0) {
    return <div className="muted">No actions recorded for this operation yet.</div>
  }

  return (
    <ol className="actionLogList">
      {entries.map((entry) => (
        <li key={entry.id} className={`actionLogEntry ${kindClass(entry.kind)}`}>
          <div className="actionLogEntryHead">
            <span className="actionLogTitle">{entry.title}</span>
            <time className="actionLogTime mono muted" dateTime={entry.at}>
              {formatDateTime(entry.at)}
            </time>
          </div>
          <div className="actionLogDetail">{entry.detail}</div>
          {entry.operator ? <div className="actionLogOperator muted">{entry.operator}</div> : null}
        </li>
      ))}
    </ol>
  )
}
