import { useEffect, useState } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'

type Props = {
  onCreated: (workOrderId: string) => void
  onCancel?: () => void
}

export function CreateWorkOrderForm({ onCreated, onCancel }: Props) {
  const { isComplete } = useUserSettings()
  const [parts, setParts] = useState<string[]>([])
  const [routings, setRoutings] = useState<string[]>([])
  const [partNumber, setPartNumber] = useState('')
  const [routing, setRouting] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [customId, setCustomId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/library/parts')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.parts) ? data.parts : []
        setParts(list)
        if (list.length === 1) setPartNumber(list[0])
      })
      .catch(() => setParts([]))
  }, [])

  useEffect(() => {
    if (!partNumber) {
      setRoutings([])
      setRouting('')
      return
    }
    fetch(`/api/library/parts/${encodeURIComponent(partNumber)}/routings`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.routings) ? data.routings : []
        setRoutings(list)
        setRouting((prev) => (list.includes(prev) ? prev : list[0] ?? ''))
      })
      .catch(() => setRoutings([]))
  }, [partNumber])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isComplete) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          partNumber,
          serialNumber,
          routing,
          workOrderId: customId.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Failed to create work order')
        return
      }
      onCreated(data.id as string)
    } catch {
      setError('Failed to create work order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="createForm" onSubmit={handleSubmit}>
      <h2 className="sectionLabel">New work order</h2>

      <label className="field">
        <div className="fieldLabel">Part number</div>
        <select
          className="input"
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          required
          disabled={!isComplete}
        >
          <option value="">Select part…</option>
          {parts.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <div className="fieldLabel">Routing</div>
        <select
          className="input"
          value={routing}
          onChange={(e) => setRouting(e.target.value)}
          required
          disabled={!partNumber || !isComplete}
        >
          <option value="">Select routing…</option>
          {routings.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <div className="fieldLabel">Serial number</div>
        <input
          className="input"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="e.g. SN-00043"
          required
          disabled={!isComplete}
        />
      </label>

      <label className="field">
        <div className="fieldLabel">Work order ID (optional)</div>
        <input
          className="input"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          placeholder="Auto-generated if blank"
          disabled={!isComplete}
        />
      </label>

      {error ? <div className="formError">{error}</div> : null}

      <div className="formActions">
        {onCancel ? (
          <button type="button" className="buttonGhost" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="buttonPrimary"
          disabled={loading || !partNumber || !routing || !isComplete}
        >
          {loading ? 'Creating…' : 'Create work order'}
        </button>
      </div>
    </form>
  )
}
