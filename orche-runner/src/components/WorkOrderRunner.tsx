import { useCallback, useMemo, useState } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import {
  deriveAllOperationsComplete,
  deriveOperationStatus,
  deriveWorkOrderCompletedBy,
  deriveWorkOrderSignedOff,
} from '../lib/events'
import { handleRouteLinkClick, operationUrl, summaryUrl } from '../lib/routes'
import { formatMinutes } from '../lib/format'
import type { RequiredToolEntry } from '../lib/tools'
import type { ProcessEvent, RoutingRow, WorkOrderOperation } from '../lib/types'
import { operationTypeLabel } from '../lib/operationTypes'
import { AppShell } from './AppShell'
import { IconSummary } from './IconSummary'
import { OpenProfileLink } from './OpenProfileLink'
import { OperationStatusIcon } from './OperationStatusIcon'
import { MenuDropdown } from './MenuDropdown'
import { SidePanel } from './SidePanel'
import {
  AddOperationPanel,
  DeleteOperationPanel,
  OperationHierarchyPanel,
  WorkOrderActionLogPanel,
  WorkOrderNotesPanel,
  WorkOrderToolLogPanel,
} from './panels/WorkOrderPanels'

function IconCheck() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type WoPanel =
  | 'add-operation'
  | 'delete-operation'
  | 'action-log'
  | 'tool-log'
  | 'notes'
  | 'hierarchy'
  | null

type WorkOrderData = {
  id: string
  partNumber?: string
  serialNumber?: string
  routing?: string
  status?: string
  startDate?: string | null
  endDate?: string | null
  estimatedTimeMinutes?: number | null
  actualTimeMinutes?: number | null
}

type Props = {
  workOrder: WorkOrderData
  operations: WorkOrderOperation[]
  events: ProcessEvent[]
  onHome: () => void
  onNavigateOperation: (op: WorkOrderOperation) => void
  onOpenSummary: () => void
  onEvent: (event: object) => Promise<void>
  onRefresh: () => Promise<void>
}

export function WorkOrderRunner({
  workOrder,
  operations,
  events,
  onHome,
  onNavigateOperation,
  onOpenSummary,
  onEvent,
  onRefresh,
}: Props) {
  const { settings, isComplete: profileComplete } = useUserSettings()
  const [panel, setPanel] = useState<WoPanel>(null)
  const [toolsByOperation, setToolsByOperation] = useState<
    Array<{ op: WorkOrderOperation; tools: RequiredToolEntry[] }>
  >([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const sortedOperations = useMemo(
    () => [...operations].sort((a, b) => a.operationNo - b.operationNo),
    [operations],
  )

  const routingRows: RoutingRow[] = useMemo(
    () =>
      operations.map((op) => ({
        operationNo: op.operationNo,
        operationId: op.operationId,
        operationName: op.operationName,
        nextOperationNo: op.nextOperationNo,
      })),
    [operations],
  )

  const loadToolLog = useCallback(async () => {
    setToolsLoading(true)
    try {
      const res = await fetch(`/api/work-orders/${encodeURIComponent(workOrder.id)}/tools`)
      if (!res.ok) throw new Error('Failed to load tools')
      const data = (await res.json()) as {
        groups: Array<{
          operationNo: number
          operationId: string
          operationName: string
          tools: RequiredToolEntry[]
        }>
      }
      const opMap = new Map(operations.map((o) => [`${o.operationNo}:${o.operationId}`, o]))
      setToolsByOperation(
        data.groups.map((g) => {
          const op = opMap.get(`${g.operationNo}:${g.operationId}`)
          return {
            op:
              op ??
              ({
                operationNo: g.operationNo,
                operationId: g.operationId,
                operationName: g.operationName,
                nextOperationNo: null,
                templatePath: null,
                status: 'not_started',
              } satisfies WorkOrderOperation),
            tools: g.tools,
          }
        }),
      )
    } catch {
      setToolsByOperation(operations.map((op) => ({ op, tools: [] })))
    } finally {
      setToolsLoading(false)
    }
  }, [workOrder.id, operations])

  async function openPanel(next: WoPanel) {
    setAddError(null)
    setDeleteError(null)
    if (next === 'tool-log') await loadToolLog()
    setPanel(next)
  }

  async function handleAddOperation(payload: {
    operationNo: number
    operationName: string
  }) {
    setAddError(null)
    const res = await fetch(`/api/work-orders/${encodeURIComponent(workOrder.id)}/operations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      setAddError(err.error ?? 'Could not add operation')
      return
    }
    const data = (await res.json()) as { operationId?: string }
    const operationId = String(data.operationId ?? '').trim()
    await onEvent({
      kind: 'operation_added',
      operationNo: payload.operationNo,
      opId: operationId,
      operationName: payload.operationName,
    })
    setPanel(null)
    await onRefresh()
  }

  async function handleDeleteOperation(op: WorkOrderOperation) {
    setDeleteError(null)
    const res = await fetch(`/api/work-orders/${encodeURIComponent(workOrder.id)}/operations`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        operationNo: op.operationNo,
        operationId: op.operationId,
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      setDeleteError(err.error ?? 'Could not delete operation')
      return
    }
    await onEvent({
      kind: 'operation_removed',
      operationNo: op.operationNo,
      opId: op.operationId,
      operationName: op.operationName,
    })
    setPanel(null)
    await onRefresh()
  }

  const routingOps = useMemo(
    () =>
      operations.map((op) => ({
        operationNo: op.operationNo,
        operationId: op.operationId,
      })),
    [operations],
  )

  const completedCount = useMemo(
    () =>
      operations.filter(
        (op) => deriveOperationStatus(events, op.operationNo, op.operationId) === 'completed',
      ).length,
    [operations, events],
  )

  const allOpsComplete = useMemo(
    () => deriveAllOperationsComplete(events, routingOps),
    [events, routingOps],
  )

  const woSignedOff = useMemo(() => deriveWorkOrderSignedOff(events), [events])
  const woCompletedBy = useMemo(() => deriveWorkOrderCompletedBy(events), [events])
  const signoffName = woCompletedBy ?? settings.operatorName

  async function toggleWorkOrderComplete() {
    if (!profileComplete) return
    if (!woSignedOff) {
      if (!allOpsComplete) return
      await onEvent({
        kind: 'work_order_completed',
        completedBy: settings.operatorName,
      })
    } else {
      await onEvent({ kind: 'work_order_uncompleted' })
    }
    await onRefresh()
  }

  const headerCenter = (
    <>
      <div className="operationHeaderTitle">{workOrder.id}</div>
      <div className="operationHeaderMeta">
        {workOrder.partNumber ? <span>{workOrder.partNumber}</span> : null}
        {workOrder.serialNumber ? (
          <>
            <span className="dot">•</span>
            <span className="mono">{workOrder.serialNumber}</span>
          </>
        ) : null}
        {workOrder.routing ? (
          <>
            <span className="dot">•</span>
            <span>{workOrder.routing}</span>
          </>
        ) : null}
        <span className="dot">•</span>
        <span className="muted">
          {completedCount}/{operations.length} operations
        </span>
        {workOrder.estimatedTimeMinutes != null ? (
          <>
            <span className="dot">•</span>
            <span className="muted">~{formatMinutes(workOrder.estimatedTimeMinutes)}</span>
          </>
        ) : null}
        {workOrder.status ? (
          <>
            <span className="dot">•</span>
            <span className="muted">{workOrder.status}</span>
          </>
        ) : null}
      </div>
    </>
  )

  return (
    <AppShell
      fullHeight
      onHome={onHome}
      topBarClassName="operationTopBar"
      topBarCenter={headerCenter}
      topBarTrailing={
        <div className="opTopActions">
          <button
            type="button"
            className={`stepToolBtn stepToolComplete ${woSignedOff ? 'stepToolCompleteDone' : 'stepToolSquare'}`}
            onClick={toggleWorkOrderComplete}
            disabled={!profileComplete || (!woSignedOff && !allOpsComplete)}
            title={
              woSignedOff
                ? `Completed by ${signoffName} — click to mark incomplete`
                : allOpsComplete
                  ? 'Complete work order'
                  : 'Complete all operations to enable'
            }
            aria-label="Complete work order"
          >
            <IconCheck />
            {woSignedOff ? <span className="stepToolCompleteName">{signoffName}</span> : null}
          </button>

          <a
            href={summaryUrl(workOrder.id)}
            className="stepToolBtn stepToolSquare"
            title="Work order summary"
            aria-label="Work order summary"
            onClick={(e) => handleRouteLinkClick(e, onOpenSummary)}
          >
            <IconSummary />
          </a>

          <MenuDropdown
            ariaLabel="Work order menu"
            items={[
              { id: 'add-operation', label: 'Add Operation', onClick: () => openPanel('add-operation') },
              {
                id: 'delete-operation',
                label: 'Delete Operation',
                onClick: () => openPanel('delete-operation'),
              },
              { id: 'action-log', label: 'Action Log', onClick: () => openPanel('action-log') },
              { id: 'tool-log', label: 'Tool Log', onClick: () => openPanel('tool-log') },
              { id: 'notes', label: 'Notes', onClick: () => openPanel('notes') },
              {
                id: 'hierarchy',
                label: 'Operation Hierarchy',
                onClick: () => openPanel('hierarchy'),
              },
            ]}
          />
        </div>
      }
    >
      <div className="operationRunnerInner">
        {panel === 'add-operation' ? (
          <SidePanel title="Add operation" onClose={() => setPanel(null)}>
            {addError ? <div className="errorBanner">{addError}</div> : null}
            <AddOperationPanel onAdd={handleAddOperation} onCancel={() => setPanel(null)} />
          </SidePanel>
        ) : null}

        {panel === 'delete-operation' ? (
          <SidePanel title="Delete operation" onClose={() => setPanel(null)}>
            {deleteError ? <div className="errorBanner">{deleteError}</div> : null}
            <DeleteOperationPanel
              operations={sortedOperations}
              events={events}
              onDelete={handleDeleteOperation}
              onCancel={() => setPanel(null)}
            />
          </SidePanel>
        ) : null}

        {panel === 'action-log' ? (
          <SidePanel title="Action log" onClose={() => setPanel(null)} width="lg">
            <WorkOrderActionLogPanel events={events} operations={sortedOperations} />
          </SidePanel>
        ) : null}

        {panel === 'tool-log' ? (
          <SidePanel title="Tool log" onClose={() => setPanel(null)} width="lg">
            {toolsLoading ? (
              <div className="muted">Loading tools…</div>
            ) : (
              <WorkOrderToolLogPanel toolsByOperation={toolsByOperation} />
            )}
          </SidePanel>
        ) : null}

        {panel === 'notes' ? (
          <SidePanel title="Notes" onClose={() => setPanel(null)} width="lg">
            <WorkOrderNotesPanel operations={sortedOperations} events={events} />
          </SidePanel>
        ) : null}

        {panel === 'hierarchy' ? (
          <SidePanel title="Operation hierarchy" onClose={() => setPanel(null)} width="lg">
            <OperationHierarchyPanel rows={routingRows} />
          </SidePanel>
        ) : null}

        {!profileComplete ? (
          <div className="gateBanner gateBannerSticky">
            Set operator name in <OpenProfileLink /> before completing operations.
          </div>
        ) : null}

        <div className={`operationBody ${!profileComplete ? 'operationBodyLocked' : ''}`}>
          <ul className="operationsList operationsListRunner">
            {sortedOperations.map((op) => {
              const disabled = !profileComplete || op.status === 'blocked' || !op.templatePath
              const clickable = !disabled

              return (
                <li key={`${op.operationNo}-${op.operationId}`}>
                  <a
                    href={operationUrl(workOrder.id, op.operationNo)}
                    className={`operationRow ${op.status === 'completed' ? 'operationRowDone' : ''} ${!clickable ? 'operationRowDisabled' : ''}`}
                    aria-disabled={disabled}
                    onClick={(e) => {
                      if (!clickable) {
                        e.preventDefault()
                        return
                      }
                      handleRouteLinkClick(e, () => onNavigateOperation(op))
                    }}
                  >
                    <div className="operationRowNo">{op.operationNo}</div>
                    <div className="operationRowBody">
                      <div className="operationRowTitle">{op.operationName}</div>
                      <div className="operationRowMeta">
                        <span className="mono">{op.operationId}</span>
                        {op.operationType ? (
                          <>
                            <span className="dot">•</span>
                            <span className={`opTypeTag opTypeTag_${op.operationType}`}>
                              {operationTypeLabel(op.operationType)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <OperationStatusIcon status={op.status} />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        {allOpsComplete && !woSignedOff ? (
          <footer className="operationFooter">
            <span className="muted">All operations complete — sign off the work order when ready.</span>
          </footer>
        ) : null}
      </div>
    </AppShell>
  )
}
