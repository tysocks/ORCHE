import './App.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { HomeView } from './components/HomeView'
import { OperationRunner } from './components/OperationRunner'
import { WorkOrderRunner } from './components/WorkOrderRunner'
import {
  WorkOrderSummaryView,
  type WorkOrderSummaryData,
} from './components/WorkOrderSummaryView'
import { useUserSettings } from './context/UserSettingsContext'
import { deriveBlockedOps, deriveOperationStatus } from './lib/events'
import { type AppRoute, navigateTo, readRoute } from './lib/routes'
import type {
  ParsedOperation,
  ProcessEvent,
  RoutingRow,
  WorkOrderListItem,
  WorkOrderOperation,
} from './lib/types'

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
  const [route, setRoute] = useState<AppRoute>(readRoute)
  const [workOrderList, setWorkOrderList] = useState<WorkOrderListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [workOrder, setWorkOrder] = useState<WorkOrderData | null>(null)
  const [summary, setSummary] = useState<WorkOrderSummaryData | null>(null)
  const [events, setEvents] = useState<ProcessEvent[]>([])
  const [activeOp, setActiveOp] = useState<ActiveOperation | null>(null)
  const [activeParsed, setActiveParsed] = useState<ParsedOperation | null>(null)
  const [activeTemplatePath, setActiveTemplatePath] = useState<string | null>(null)
  const [woLoading, setWoLoading] = useState(false)
  const [opLoading, setOpLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const onPopState = () => setRoute(readRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function goTo(next: AppRoute, replace = false) {
    navigateTo(next, replace)
    setRoute(next)
    setLoadError(null)
  }

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
    if (route.screen !== 'home') return
    const id = setInterval(() => refreshWorkOrderList(), 5000)
    return () => clearInterval(id)
  }, [route.screen, refreshWorkOrderList])

  const refreshEvents = useCallback(async (workOrderId: string) => {
    const r = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`)
    const data = await r.json()
    const list = Array.isArray(data?.events) ? data.events : []
    setEvents(list)
    return list
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
          return null
        }
        const wo = (await woRes.json()) as WorkOrderData
        setWorkOrder(wo)
        return wo
      } catch {
        setWorkOrder(null)
        setLoadError('Failed to load work order')
        return null
      } finally {
        setWoLoading(false)
      }
    },
    [refreshEvents],
  )

  const workOrderId =
    route.screen === 'home' ? null : route.workOrderId

  useEffect(() => {
    if (!workOrderId) {
      setWorkOrder(null)
      setEvents([])
      return
    }
    void loadWorkOrder(workOrderId)
  }, [workOrderId, loadWorkOrder])

  useEffect(() => {
    if (route.screen !== 'summary' || !workOrderId) {
      if (route.screen !== 'summary') setSummary(null)
      return
    }
    let cancelled = false
    setSummaryLoading(true)
    setLoadError(null)
    fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/summary`)
      .then((r) => {
        if (!r.ok) throw new Error('summary')
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setSummary(data.summary as WorkOrderSummaryData)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load summary')
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [route.screen, workOrderId])

  useEffect(() => {
    if (route.screen !== 'operation' || !workOrderId) {
      setActiveOp(null)
      setActiveParsed(null)
      setActiveTemplatePath(null)
      return
    }

    const opRow = workOrder?.operations.find((o) => o.operationNo === route.operationNo)
    if (!opRow?.templatePath) {
      if (workOrder && !woLoading) {
        setLoadError('Operation not found on this work order')
      }
      return
    }

    let cancelled = false
    setOpLoading(true)
    setLoadError(null)

    Promise.all([
      fetch(`/api/operation?path=${encodeURIComponent(opRow.templatePath)}`),
      refreshEvents(workOrderId),
    ])
      .then(async ([r]) => {
        if (!r.ok) throw new Error('operation')
        const data = await r.json()
        if (cancelled) return
        setActiveParsed(data.operation as ParsedOperation)
        setActiveTemplatePath(opRow.templatePath)
        setActiveOp({ ...opRow, templatePath: opRow.templatePath } as ActiveOperation)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load operation')
      })
      .finally(() => {
        if (!cancelled) setOpLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [route, workOrder, workOrderId, woLoading, refreshEvents])

  const operationsWithStatus: WorkOrderOperation[] = useMemo(() => {
    if (!workOrder) return []

    const completedOpNos = new Set<number>()
    for (const op of workOrder.operations) {
      if (deriveOperationStatus(events, op.operationNo, op.operationId) === 'completed') {
        completedOpNos.add(op.operationNo)
      }
    }
    const blocked = deriveBlockedOps(workOrder.operations, completedOpNos)

    return [...workOrder.operations]
      .sort((a, b) => a.operationNo - b.operationNo)
      .map((op) => {
      let status: WorkOrderOperation['status'] = deriveOperationStatus(
        events,
        op.operationNo,
        op.operationId,
      )
      if (blocked.has(op.operationNo)) status = 'blocked'
      return { ...op, status }
    })
  }, [workOrder, events])

  function openWorkOrder(id: string) {
    if (!userSettingsComplete) return
    goTo({ screen: 'work-order', workOrderId: id })
  }

  async function appendWorkOrderEvent(workOrderId: string, event: object) {
    if (!userSettingsComplete) return
    const res = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workOrderId,
        operatorName: settings.operatorName,
        ...event,
      }),
    })
    if (!res.ok) {
      console.error('Failed to record event', await res.text().catch(() => res.statusText))
    }
  }

  async function appendOperationEvent(event: object) {
    if (!activeOp || !workOrderId || !userSettingsComplete) return
    await appendWorkOrderEvent(workOrderId, {
      operationNo: activeOp.operationNo,
      opId: activeOp.operationId,
      ...event,
    })
  }

  async function refreshWorkOrderState(id: string) {
    await refreshEvents(id)
    await loadWorkOrder(id)
  }

  if (
    route.screen === 'operation' &&
    activeOp &&
    activeParsed &&
    activeTemplatePath &&
    workOrderId
  ) {
    return (
      <OperationRunner
        operation={activeParsed}
        templatePath={activeTemplatePath}
        operationNo={activeOp.operationNo}
        operationName={activeOp.operationName}
        workOrderId={workOrderId}
        events={events}
        onHome={() => goTo({ screen: 'home' })}
        onBack={() => goTo({ screen: 'work-order', workOrderId })}
        onEvent={appendOperationEvent}
        onRefreshEvents={() => refreshEvents(workOrderId)}
      />
    )
  }

  if (route.screen === 'summary' && summary && workOrderId) {
    return (
      <AppShell onHome={() => goTo({ screen: 'home' })}>
        <WorkOrderSummaryView
          summary={summary}
          onBack={() => goTo({ screen: 'work-order', workOrderId })}
        />
      </AppShell>
    )
  }

  if (route.screen === 'home') {
    return (
      <AppShell onHome={() => goTo({ screen: 'home' })}>
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

  if (woLoading && !workOrder) {
    return (
      <AppShell onHome={() => goTo({ screen: 'home' })}>
        <div className="muted">Loading work order…</div>
      </AppShell>
    )
  }

  if (!workOrder || !workOrderId) {
    return (
      <AppShell onHome={() => goTo({ screen: 'home' })}>
        {loadError ? <div className="errorBanner">{loadError}</div> : null}
        <p className="muted">{loadError ?? 'Work order unavailable.'}</p>
      </AppShell>
    )
  }

  return (
    <>
      {loadError ? <div className="errorBanner errorBannerOverlay">{loadError}</div> : null}
      {opLoading || summaryLoading ? (
        <div className="loadingOverlay">
          {summaryLoading ? 'Loading summary…' : 'Opening operation…'}
        </div>
      ) : null}
      <WorkOrderRunner
        workOrder={{
          id: workOrder.id,
          partNumber: workOrder.partNumber,
          serialNumber: workOrder.serialNumber,
          routing: workOrder.routing,
          status: workOrder.status,
          startDate: workOrder.startDate,
          endDate: workOrder.endDate,
          estimatedTimeMinutes: workOrder.estimatedTimeMinutes,
          actualTimeMinutes: workOrder.actualTimeMinutes,
        }}
        operations={operationsWithStatus}
        events={events}
        onHome={() => goTo({ screen: 'home' })}
        onNavigateOperation={(op) =>
          goTo({ screen: 'operation', workOrderId, operationNo: op.operationNo })
        }
        onOpenSummary={() => goTo({ screen: 'summary', workOrderId })}
        onEvent={(event) => appendWorkOrderEvent(workOrderId, event)}
        onRefresh={() => refreshWorkOrderState(workOrderId)}
      />
    </>
  )
}
