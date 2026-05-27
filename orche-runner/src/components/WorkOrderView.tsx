import type { WorkOrderOperation } from '../lib/types'
import { IconSummary } from './IconSummary'
import { OpenProfileLink } from './OpenProfileLink'
import { OperationStatusIcon } from './OperationStatusIcon'

type Props = {
  workOrderId: string
  partNumber?: string
  serialNumber?: string
  routing?: string
  status?: string
  operations: WorkOrderOperation[]
  actionsEnabled: boolean
  onOpenSummary: () => void
  onSelectOperation: (op: WorkOrderOperation) => void
}

export function WorkOrderView({
  workOrderId,
  partNumber,
  serialNumber,
  routing,
  status,
  operations,
  actionsEnabled,
  onOpenSummary,
  onSelectOperation,
}: Props) {
  return (
    <div className="workOrderView">
      <header className="workOrderHeaderCompact">
        <div className="workOrderHeaderMain">
          <div>
            <h1 className="workOrderTitle">{workOrderId}</h1>
            <div className="workOrderMeta">
              {partNumber ? <span>{partNumber}</span> : null}
              {serialNumber ? (
                <>
                  <span className="dot">•</span>
                  <span className="mono">{serialNumber}</span>
                </>
              ) : null}
              {routing ? (
                <>
                  <span className="dot">•</span>
              <span>{routing}</span>
                </>
              ) : null}
              {status ? (
                <>
                  <span className="dot">•</span>
                  <span>{status}</span>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="iconBtn"
            onClick={onOpenSummary}
            disabled={!actionsEnabled}
            title="Work order summary"
            aria-label="Work order summary"
          >
            <IconSummary />
          </button>
        </div>
      </header>

      {!actionsEnabled ? (
        <div className="gateBanner gateBannerCompact">
          Set operator name and shift in <OpenProfileLink /> to run operations.
        </div>
      ) : null}

      <section className="operationsSection">
        <h2 className="sectionLabel sectionLabelCompact">Operations</h2>
        <ul className="operationsList">
          {operations.map((op) => {
            const disabled = !actionsEnabled || op.status === 'blocked' || !op.templatePath
            const clickable = !disabled

            const handleClick = () => {
              if (!clickable) return
              onSelectOperation(op)
            }
            return (
              <li key={`${op.operationNo}-${op.operationId}`}>
                <button
                  type="button"
                  className={`operationRow ${op.status === 'completed' ? 'operationRowDone' : ''} ${!clickable ? 'operationRowDisabled' : ''}`}
                  disabled={disabled}
                  onClick={handleClick}
                >
                  <div className="operationRowNo">{op.operationNo}</div>
                  <div className="operationRowBody">
                    <div className="operationRowTitle">{op.operationName}</div>
                    <div className="operationRowMeta">
                      <span className="mono">{op.operationId}</span>
                    </div>
                  </div>
                  <OperationStatusIcon status={op.status} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
