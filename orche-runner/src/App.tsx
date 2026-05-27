import './App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { HomeView } from './components/HomeView'
import { OperationRunner } from './components/OperationRunner'
import { WorkOrderView } from './components/WorkOrderView'
import {
  WorkOrderSummaryView,
  type WorkOrderSummaryData,
} from './components/WorkOrderSummaryView'
import { useUserSettings } from './context/UserSettingsContext'
import { deriveBlockedOps, deriveOperationStatus } from './lib/events'
import type {
  ParsedOperation,
  ProcessEvent,
  RoutingRow,
  WorkOrderListItem,
  WorkOrderOperation,
} from './lib/types'

type Screen = 'home' | 'work-order' | 'summary'

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
  operations: Array<RoutingRow & { templatePath: string | null }>
}

type ActiveOperation = WorkOrderOperation & {
  templatePath: string
}

export default function App() {
  const { settings, isComplete: userSettingsComplete } = useUserSettings()
  const [screen, setScreen] = useState<Screen>('home')
  const [workOrderList, setWorkOrderList] = useState<WorkOrderListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [workOrderId, setWorkOrderId] = useState<string | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [summary, setSummary] = useState<WorkOrderSummaryData | null>(null)
  const [woLoading, setWoLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [events, setEvents] = useState<ProcessEvent[]>([])
  const [activeOp, setActiveOp] = useState<ActiveOperation | null>(null)
  const [activeParsed, setActiveParsed] = useState<ParsedOperation | null>(null)
  const [activeTemplatePath, setActiveTemplatePath] = useState<string | null>(null)
  const [openingOp, setOpeningOp] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshWorkOrderList = useCallback(() => {
    setListLoading(true)
    return fetch('/api/work-orders')
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data?.workOrders) ? data.workOrders : []
        setWorkOrderList(
          rows
            .map((row: unknown) => {
              if (typeof row === 'string') {
                return {
                  id: row,
                  partNumber: '',
                  serialNumber: '',
                  routing: '',
                  status: 'Not Started',
                } satisfies WorkOrderListItem
              }
              if (!row || typeof row !== 'object') return null
              const r = row as Record<string, unknown>
              const id = String(r.id ?? '').trim()
              if (!id) return null
              return {
                id,
                partNumber: String(r.partNumber ?? ''),
                serialNumber: String(r.serialNumber ?? ''),
                routing: String(r.routing ?? ''),
                status: String(r.status ?? 'Not Started'),
              } satisfies WorkOrderListItem
            })
            .filter((row: WorkOrderListItem | null): row is WorkOrderListItem => row != null),
        )
      })
      .catch(() => setWorkOrderList([]))
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => {
    refreshWorkOrderList()
  }, [refreshWorkOrderList])

  useEffect(() => {
    if (screen !== 'home') return
    const id = setInterval(() => {
      refreshWorkOrderList()
    }, 5000)
    return () => clearInterval(id)
  }, [screen, refreshWorkOrderList])

  const refreshEvents = useCallback(async (id: string) => {
    const r = await fetch(`/api/work-orders/${encodeURIComponent(id)}/events`)
    const data = await r.json()
    setEvents(Array.isArray(data?.events) ? data.events : [])
  }, [])

  const loadWorkOrder = useCallback(
    async (id: string) => {
      setLoadError(null)
      setWoLoading(true)
      try {
        const [woRes] = await Promise.all([
          fetch(`/api/work-orders/${encodeURIComponent(id)}`),
          refreshEvents(id),
        ])
        if (!woRes.ok) {
          setWorkOrder(null)
          setLoadError('Work order not found')
          return false
        }
        const wo = (await woRes.json()) as WorkOrderData
        setWorkOrder(wo)
        setWorkOrderId(id)
        return true
      } catch {
        setLoadError('Failed to load work order')
        return false
      } finally {
        setWoLoading(false)
      }
    },
    [refreshEvents],
  )

  async function openWorkOrder(id: string) {
    if (!userSettingsComplete) return
    const ok = await loadWorkOrder(id)
    if (ok) setScreen('work-order')
  }

  async function loadSummary(id: string) {
    setSummaryLoading(true)
    setLoadError(null)
    try {
      const r = await fetch(`/api/work-orders/${encodeURIComponent(id)}/summary`)
      if (!r.ok) {
        setLoadError('Failed to load summary')
        return
      }
      const data = await r.json()
      setSummary(data.summary as WorkOrderSummaryData)
      setScreen('summary')
      await loadWorkOrder(id)
    } catch {
      setLoadError('Failed to load summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  function goHome() {
    setScreen('home')
    setWorkOrderId(null)
    setWorkOrder(null)
    setSummary(null)
    setEvents([])
    setLoadError(null)
    setActiveOp(null)
    setActiveParsed(null)
    setActiveTemplatePath(null)
  }

  function backFromSummary() {
    setSummary(null)
    setScreen('work-order')
  }

  const operationsWithStatus: WorkOrderOperation[] = useMemo(() => {
    if (!workOrder) return []

    const completedOpNos = new Set<number>()
    const ops = workOrder.operations

    for (const op of ops) {
      const status = deriveOperationStatus(events, op.operationNo, op.operationId)
      if (status === 'completed') completedOpNos.add(op.operationNo)
    }

    const blocked = deriveBlockedOps(ops, completedOpNos)

    return ops.map((op) => {
      let status: WorkOrderOperation['status'] = deriveOperationStatus(
        events,
        op.operationNo,
        op.operationId,
      )
      if (blocked.has(op.operationNo)) status = 'blocked'
      return { ...op, status }
    })
  }, [workOrder, events])

  async function openOperation(op: WorkOrderOperation) {
    if (!userSettingsComplete || !op.templatePath || !workOrderId) return
    setOpeningOp(true)
    setLoadError(null)
    try {
      const r = await fetch(`/api/operation?path=${encodeURIComponent(op.templatePath)}`)
      if (!r.ok) {
        setLoadError('Failed to load operation')
        return
      }
      const data = await r.json()
      await refreshEvents(workOrderId)
      setActiveParsed(data.operation as ParsedOperation)
      setActiveTemplatePath(op.templatePath)
      setActiveOp({ ...op, templatePath: op.templatePath })
    } catch {
      setLoadError('Failed to load operation')
    } finally {
      setOpeningOp(false)
    }
  }

  function closeOperation() {
    setActiveOp(null)
    setActiveParsed(null)
    setActiveTemplatePath(null)
    if (workOrderId) {
      refreshEvents(workOrderId)
      loadWorkOrder(workOrderId)
    }
  }

  async function appendEvent(event: object) {
    if (!activeOp || !workOrderId || !userSettingsComplete) return
    await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workOrderId,
        operationNo: activeOp.operationNo,
        opId: activeOp.operationId,
        operatorName: settings.operatorName,
        workShift: settings.workShift,
        ...event,
      }),
    })
  }

  if (activeOp && activeParsed && activeTemplatePath && workOrderId) {
    return (
      <OperationRunner
        operation={activeParsed}
        templatePath={activeTemplatePath}
        operationNo={activeOp.operationNo}
        operationName={activeOp.operationName}
        workOrderId={workOrderId}
        events={events}
        onHome={goHome}
        onBack={closeOperation}
        onEvent={appendEvent}
        onRefreshEvents={() => refreshEvents(workOrderId)}
      />
    )
  }

  if (screen === 'summary' && summary) {
    return (
      <AppShell onHome={goHome}>
        <WorkOrderSummaryView summary={summary} onBack={backFromSummary} />
      </AppShell>
    )
  }

  if (screen === 'home') {
    return (
      <AppShell>
        <HomeView
          workOrders={workOrderList}
          loading={listLoading}
          onOpen={openWorkOrder}
          onCreated={openWorkOrder}
          onRefreshList={refreshWorkOrderList}
        />
        {loadError ? <div className="errorBanner">{loadError}</div> : null}
      </AppShell>
    )
  }

  return (
    <AppShell onHome={goHome}>
      {loadError ? <div className="errorBanner">{loadError}</div> : null}
      {openingOp || summaryLoading ? (
        <div className="loadingOverlay">
          {summaryLoading ? 'Loading summary…' : 'Opening operation…'}
        </div>
      ) : null}

      {woLoading && !workOrder ? (
        <div className="muted">Loading work order…</div>
      ) : workOrder && workOrderId ? (
        <WorkOrderView
          workOrderId={workOrder.id}
          partNumber={workOrder.partNumber}
          serialNumber={workOrder.serialNumber}
          routing={workOrder.routing}
          status={workOrder.status}
          operations={operationsWithStatus}
          actionsEnabled={userSettingsComplete}
          onOpenSummary={() => loadSummary(workOrderId)}
          onSelectOperation={openOperation}
        />
      ) : (
        <div>
          <button type="button" className="buttonGhost" onClick={goHome}>
            ← Back
          </button>
          <p className="muted">{loadError ?? 'Work order unavailable.'}</p>
        </div>
      )}
    </AppShell>
  )
}
