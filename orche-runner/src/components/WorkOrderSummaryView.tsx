import { formatDateTime, formatInputValue, formatMinutes } from '../lib/format'

export type WorkOrderSummaryData = {
  id: string
  partNumber: string
  serialNumber: string
  routing: string
  status: string
  startDate: string | null
  endDate: string | null
  estimatedTimeMinutes: number
  actualTimeMinutes: number | null
  operations: Array<{
    operationNo: number
    operationId: string
    operationName: string
    status: string
    completedAt: string | null
    capturedInputs: Record<string, unknown>
  }>
  allCapturedInputs: Array<{
    operationNo: number
    operationId: string
    operationName: string
    inputId: string
    value: unknown
  }>
}

type Props = {
  summary: WorkOrderSummaryData
  onBack: () => void
}

function statusClass(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '_')
  if (s === 'completed' || s === 'complete') return 'summaryStatus_completed'
  if (s === 'active' || s === 'in_progress') return 'summaryStatus_active'
  return 'summaryStatus_default'
}

function opStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Complete'
    case 'in_progress':
      return 'In progress'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Not started'
  }
}

export function WorkOrderSummaryView({ summary, onBack }: Props) {
  return (
    <div className="summaryView">
      <header className="summaryHeader">
        <button type="button" className="buttonGhost backButton" onClick={onBack}>
          ← Back
        </button>
        <div>
          <h1 className="summaryTitle">Summary</h1>
          <p className="summarySubtitle mono">{summary.id}</p>
        </div>
        <span className={`summaryStatusBadge ${statusClass(summary.status)}`}>{summary.status}</span>
      </header>

      <section className="summaryGrid">
        <div className="summaryStat">
          <div className="summaryStatLabel">Part</div>
          <div className="summaryStatValue">{summary.partNumber}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Serial</div>
          <div className="summaryStatValue mono">{summary.serialNumber}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Routing</div>
          <div className="summaryStatValue">{summary.routing}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Started</div>
          <div className="summaryStatValue">{formatDateTime(summary.startDate)}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Completed</div>
          <div className="summaryStatValue">{formatDateTime(summary.endDate)}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Est. time</div>
          <div className="summaryStatValue">{formatMinutes(summary.estimatedTimeMinutes)}</div>
        </div>
        <div className="summaryStat">
          <div className="summaryStatLabel">Actual time</div>
          <div className="summaryStatValue">{formatMinutes(summary.actualTimeMinutes)}</div>
        </div>
      </section>

      <section className="summarySection">
        <h2 className="sectionLabel">Operations</h2>
        <ul className="summaryOpList">
          {summary.operations.map((op) => (
            <li key={`${op.operationNo}-${op.operationId}`} className="summaryOpItem">
              <div className="summaryOpHead">
                <span className="summaryOpNo">{op.operationNo}</span>
                <span className="summaryOpName">{op.operationName}</span>
                <span className={`operationStatus operationStatus_${op.status}`}>
                  {opStatusLabel(op.status)}
                </span>
              </div>
              <div className="summaryOpMeta mono">
                {op.operationId}
                {op.completedAt ? (
                  <>
                    <span className="dot">•</span>
                    {formatDateTime(op.completedAt)}
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {summary.allCapturedInputs.length > 0 ? (
        <section className="summarySection">
          <h2 className="sectionLabel">Captured data</h2>
          <div className="summaryTableWrap">
            <table className="summaryTable">
              <thead>
                <tr>
                  <th>Op</th>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.allCapturedInputs.map((row) => (
                  <tr key={`${row.operationNo}-${row.inputId}`}>
                    <td>
                      {row.operationNo}. {row.operationName}
                    </td>
                    <td className="mono">{row.inputId}</td>
                    <td>{formatInputValue(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="muted summaryEmpty">No captured inputs yet.</p>
      )}
    </div>
  )
}
