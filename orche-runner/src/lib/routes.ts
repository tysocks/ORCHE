import type { MouseEvent } from 'react'

export type AppRoute =
  | { screen: 'home' }
  | { screen: 'work-order'; workOrderId: string }
  | { screen: 'operation'; workOrderId: string; operationNo: number }
  | { screen: 'summary'; workOrderId: string }

export function readRoute(): AppRoute {
  const params = new URLSearchParams(window.location.search)
  const workOrderId = params.get('wo')?.trim()
  if (!workOrderId) return { screen: 'home' }

  if (params.get('summary') === '1') {
    return { screen: 'summary', workOrderId }
  }

  const opRaw = params.get('op')
  if (opRaw != null && opRaw !== '') {
    const operationNo = Number(opRaw)
    if (!Number.isNaN(operationNo)) {
      return { screen: 'operation', workOrderId, operationNo }
    }
  }

  return { screen: 'work-order', workOrderId }
}

export function routeToUrl(route: AppRoute): string {
  const base = `${window.location.origin}${window.location.pathname}`
  if (route.screen === 'home') return base

  const params = new URLSearchParams()
  params.set('wo', route.workOrderId)
  if (route.screen === 'summary') {
    params.set('summary', '1')
  } else if (route.screen === 'operation') {
    params.set('op', String(route.operationNo))
  }
  return `${base}?${params.toString()}`
}

export function navigateTo(route: AppRoute, replace = false) {
  const url = routeToUrl(route)
  if (replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
}

export function workOrderUrl(workOrderId: string): string {
  return routeToUrl({ screen: 'work-order', workOrderId })
}

export function operationUrl(workOrderId: string, operationNo: number): string {
  return routeToUrl({ screen: 'operation', workOrderId, operationNo })
}

export function summaryUrl(workOrderId: string): string {
  return routeToUrl({ screen: 'summary', workOrderId })
}

/** Same-tab navigation; skip when user opens a new browser tab (Ctrl/Cmd+click, middle-click). */
export function handleRouteLinkClick(e: MouseEvent, navigate: () => void) {
  if (e.defaultPrevented) return
  if (e.button !== 0) return
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
  e.preventDefault()
  navigate()
}
