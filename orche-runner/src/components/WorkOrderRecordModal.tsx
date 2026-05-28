import { useMemo, useState } from 'react'
import { buildWorkOrderActionLogEntries } from '../lib/actionLog'
import { formatDateTime, formatMinutes } from '../lib/format'
import type { ProcessEvent, WorkOrderOperation } from '../lib/types'

type Tab = 'log' | 'details'

function kindClass(kind: string): string {
  switch (kind) {
    case 'step_completed':
    case 'operation_completed':
    case 'work_order_completed':
      return 'actionLogKind_done'
    case 'step_uncompleted':
    case 'operation_uncompleted':
    case 'work_order_uncompleted':
      return 'actionLogKind_reopen'
    case 'input_changed':
      return 'actionLogKind_input'
    case 'step_note':
      return 'actionLogKind_note'
    default:
      return ''
  }
}

type WorkOrderDetails = {
  workOrderId: string
  partNumber?: string
  serialNumber?: string
  routing?: string
  status?: string
  estimatedTimeMinutes?: number | null
  actualTimeMinutes?: number | null
  startDate?: string | null
  endDate?: string | null
}

type Props = {
  details: WorkOrderDetails
  operations: WorkOrderOperation[]
  events: ProcessEvent[]
  onClose: () => void
}

export function WorkOrderRecordModal({ details, operations, events, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('log')

  const operationLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const op of operations) {
      map.set(`${op.operationNo}:${op.operationId}`, `${op.operationNo}. ${op.operationName}`)
    }
    return map
  }, [operations])

  const logEntries = useMemo(
    () => buildWorkOrderActionLogEntries(events, operationLabels),
    [events, operationLabels],
  )

  return (
    <>
      <button type="button" className="modalScrim" onClick={onClose} aria-label="Close record" />
      <div className="modalCard modalCardWide" role="dialog" aria-label="Work order record">
        <div className="modalHead">
          <div className="modalTitle">Work order record</div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modalTabs">
          <button
            type="button"
            className={`modalTab ${tab === 'log' ? 'modalTabActive' : ''}`}
            onClick={() => setTab('log')}
          >
            Action log
          </button>
          <button
            type="button"
            className={`modalTab ${tab === 'details' ? 'modalTabActive' : ''}`}
            onClick={() => setTab('details')}
          >
            Details
          </button>
        </div>

        <div className="modalBody modalBodyScroll">
          {tab === 'log' ? (
            logEntries.length === 0 ? (
              <div className="muted">No actions recorded for this work order yet.</div>
            ) : (
              <ol className="actionLogList">
                {logEntries.map((entry) => (
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
          ) : (
            <dl className="woDetailsList">
              <div className="woDetailsRow">
                <dt>Work order</dt>
                <dd className="mono">{details.workOrderId}</dd>
              </div>
              {details.partNumber ? (
                <div className="woDetailsRow">
                  <dt>Part</dt>
                  <dd>{details.partNumber}</dd>
                </div>
              ) : null}
              {details.serialNumber ? (
                <div className="woDetailsRow">
                  <dt>Serial</dt>
                  <dd className="mono">{details.serialNumber}</dd>
                </div>
              ) : null}
              {details.routing ? (
                <div className="woDetailsRow">
                  <dt>Routing</dt>
                  <dd>{details.routing}</dd>
                </div>
              ) : null}
              {details.status ? (
                <div className="woDetailsRow">
                  <dt>Status</dt>
                  <dd>{details.status}</dd>
                </div>
              ) : null}
              <div className="woDetailsRow">
                <dt>Estimated</dt>
                <dd>{formatMinutes(details.estimatedTimeMinutes)}</dd>
              </div>
              <div className="woDetailsRow">
                <dt>Actual</dt>
                <dd>{formatMinutes(details.actualTimeMinutes)}</dd>
              </div>
              <div className="woDetailsRow">
                <dt>Started</dt>
                <dd>{formatDateTime(details.startDate)}</dd>
              </div>
              <div className="woDetailsRow">
                <dt>Ended</dt>
                <dd>{formatDateTime(details.endDate)}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </>
  )
}
