import { useMemo, useState } from 'react'
import type { WorkOrderListItem } from '../lib/types'
import { useUserSettings } from '../context/UserSettingsContext'
import { CreateWorkOrderForm } from './CreateWorkOrderForm'
import { OpenProfileLink } from './OpenProfileLink'

type Props = {
  workOrders: WorkOrderListItem[]
  loading: boolean
  onOpen: (workOrderId: string) => void
  onCreated: (workOrderId: string) => void
  onRefreshList: () => void
}

type SearchFilters = {
  workOrderId: string
  partNumber: string
  serialNumber: string
}

function statusClass(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('complete')) return 'homeStatus_completed'
  if (s.includes('active') || s.includes('progress')) return 'homeStatus_active'
  return 'homeStatus_default'
}

function matchesFilters(wo: WorkOrderListItem, filters: SearchFilters): boolean {
  const woQ = filters.workOrderId.trim().toLowerCase()
  const partQ = filters.partNumber.trim().toLowerCase()
  const serialQ = filters.serialNumber.trim().toLowerCase()
  if (woQ && !wo.id.toLowerCase().includes(woQ)) return false
  if (partQ && !wo.partNumber.toLowerCase().includes(partQ)) return false
  if (serialQ && !wo.serialNumber.toLowerCase().includes(serialQ)) return false
  return true
}

export function HomeView({ workOrders, loading, onOpen, onCreated, onRefreshList }: Props) {
  const { isComplete } = useUserSettings()
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    workOrderId: '',
    partNumber: '',
    serialNumber: '',
  })

  const filtered = useMemo(
    () => workOrders.filter((wo) => matchesFilters(wo, filters)),
    [workOrders, filters],
  )

  const hasFilters =
    Boolean(filters.workOrderId.trim()) ||
    Boolean(filters.partNumber.trim()) ||
    Boolean(filters.serialNumber.trim())

  function handleCreated(id: string) {
    setShowCreate(false)
    onRefreshList()
    onCreated(id)
  }

  function updateFilter(key: keyof SearchFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="homeView">
      {!isComplete ? (
        <div className="gateBanner gateBannerCompact">
          Enter your operator name and shift in <OpenProfileLink /> before opening or creating
          work orders.
        </div>
      ) : null}

      {!showCreate ? (
        <button
          type="button"
          className="buttonPrimary homeCreateBtn"
          onClick={() => setShowCreate(true)}
          disabled={!isComplete}
        >
          + New work order
        </button>
      ) : (
        <CreateWorkOrderForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <section className="homeFilters">
        <div className="homeFiltersGrid">
          <label className="field">
            <div className="fieldLabel">Work order</div>
            <input
              className="input"
              type="search"
              placeholder="WO-…"
              value={filters.workOrderId}
              onChange={(e) => updateFilter('workOrderId', e.target.value)}
              disabled={!isComplete}
            />
          </label>
          <label className="field">
            <div className="fieldLabel">Part number</div>
            <input
              className="input"
              type="search"
              placeholder="E02-…"
              value={filters.partNumber}
              onChange={(e) => updateFilter('partNumber', e.target.value)}
              disabled={!isComplete}
            />
          </label>
          <label className="field">
            <div className="fieldLabel">Serial number</div>
            <input
              className="input"
              type="search"
              placeholder="SN-…"
              value={filters.serialNumber}
              onChange={(e) => updateFilter('serialNumber', e.target.value)}
              disabled={!isComplete}
            />
          </label>
        </div>
        {hasFilters ? (
          <button
            type="button"
            className="buttonGhost homeClearFilters"
            onClick={() =>
              setFilters({ workOrderId: '', partNumber: '', serialNumber: '' })
            }
          >
            Clear filters
          </button>
        ) : null}
      </section>

      <section className="homeListSection">
        <h2 className="sectionLabel sectionLabelCompact">Work orders</h2>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">
            {workOrders.length === 0
              ? 'No work orders yet. Create one above.'
              : 'No work orders match your filters.'}
          </p>
        ) : (
          <ul className="homeList">
            {filtered.map((wo) => (
              <li key={wo.id}>
                <button
                  type="button"
                  className="homeRow"
                  onClick={() => onOpen(wo.id)}
                  disabled={!isComplete}
                >
                  <div className="homeRowBody">
                    <div className="homeRowId">{wo.id}</div>
                    <div className="homeRowMeta">
                      {wo.partNumber ? <span className="mono">{wo.partNumber}</span> : null}
                      {wo.serialNumber ? (
                        <>
                          <span className="dot">•</span>
                          <span className="mono">{wo.serialNumber}</span>
                        </>
                      ) : null}
                      {wo.routing ? (
                        <>
                          <span className="dot">•</span>
                          <span>{wo.routing}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className={`homeStatus ${statusClass(wo.status)}`}>{wo.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
