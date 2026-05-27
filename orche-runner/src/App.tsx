import './App.css'
import { useEffect, useMemo, useState } from 'react'
import matter from 'gray-matter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type TemplateListItem = {
  id: string
  relPath: string
  displayName: string
}

type OrcheInput =
  | {
      id: string
      type: 'text'
      label: string
      required?: boolean
    }
  | {
      id: string
      type: 'textarea'
      label: string
      required?: boolean
    }
  | {
      id: string
      type: 'checkbox'
      label: string
      required?: boolean
    }

function safeJsonParse<T>(raw: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as T }
  } catch {
    return { ok: false }
  }
}

function App() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [selected, setSelected] = useState<TemplateListItem | null>(null)
  const [templateContent, setTemplateContent] = useState<string>('')
  const [workOrderId, setWorkOrderId] = useState<string>('WO-LOCAL-DEMO')
  const [inputs, setInputs] = useState<Record<string, unknown>>({})
  const [eventsCount, setEventsCount] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = (data?.templates ?? []) as TemplateListItem[]
        setTemplates(list)
        setSelected((prev) => prev ?? list[0] ?? null)
      })
      .catch(() => {
        // ignore for MVP
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    fetch(`/api/template?path=${encodeURIComponent(selected.relPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setTemplateContent(String(data?.content ?? ''))
      })
      .catch(() => {
        if (cancelled) return
        setTemplateContent('')
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setEventsCount(Array.isArray(data?.events) ? data.events.length : 0)
      })
      .catch(() => {
        if (cancelled) return
        setEventsCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [workOrderId])

  const parsed = useMemo(() => {
    const res = matter(templateContent || '')
    return {
      frontmatter: res.data as Record<string, unknown>,
      markdown: res.content,
    }
  }, [templateContent])

  const opId = String(parsed.frontmatter?.op_id ?? selected?.id ?? 'OP-UNKNOWN')

  async function appendEvent(event: object) {
    await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workOrderId,
        opId,
        ...event,
      }),
    })
    const refreshed = await fetch(`/api/work-orders/${encodeURIComponent(workOrderId)}/events`).then((r) =>
      r.json(),
    )
    setEventsCount(Array.isArray(refreshed?.events) ? refreshed.events.length : 0)
  }

  return (
    <>
      <div className="appShell">
        <header className="topBar">
          <div className="brand">
            <div className="brandMark">ORCHE</div>
            <div className="brandSub">Work instruction runner (local MVP)</div>
          </div>

          <div className="topControls">
            <label className="field">
              <div className="fieldLabel">Work order</div>
              <input
                className="input"
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                placeholder="WO-..."
              />
            </label>

            <label className="field">
              <div className="fieldLabel">Template</div>
              <select
                className="input"
                value={selected?.relPath ?? ''}
                onChange={(e) => {
                  const next = templates.find((t) => t.relPath === e.target.value) ?? null
                  setSelected(next)
                  setInputs({})
                }}
              >
                {templates.map((t) => (
                  <option key={t.relPath} value={t.relPath}>
                    {t.displayName}
                  </option>
                ))}
              </select>
            </label>

            <div className="pill">Events: {eventsCount}</div>
          </div>
        </header>

        <main className="main">
          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">{String(parsed.frontmatter?.default_title ?? selected?.displayName ?? 'Operation')}</div>
                <div className="cardMeta">
                  <span className="mono">{opId}</span>
                  <span className="dot">•</span>
                  <span className="muted">
                    Est. {String(parsed.frontmatter?.estimated_minutes ?? '—')} min
                  </span>
                </div>
              </div>

              <button
                className="buttonPrimary"
                type="button"
                onClick={() =>
                  appendEvent({
                    kind: 'step_completed',
                    stepId: 'operation_complete',
                    inputs,
                  })
                }
              >
                Complete operation
              </button>
            </div>

            <div className="doc">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props) {
                    const { className, children } = props
                    const match = /language-(\S+)/.exec(className || '')
                    const lang = match?.[1] ?? ''

                    if (lang === 'orche-input') {
                      const raw = String(children ?? '').trim()
                      const parsed = safeJsonParse<OrcheInput>(raw)
                      if (!parsed.ok) {
                        return <pre className="codeBlock">Invalid orche-input JSON</pre>
                      }
                      const def = parsed.value
                      const value = inputs[def.id]
                      const required = Boolean(def.required)

                      return (
                        <div className="orcheInput">
                          <div className="orcheLabel">
                            {def.label} {required ? <span className="req">*</span> : null}
                          </div>

                          {def.type === 'text' ? (
                            <input
                              className="input"
                              value={typeof value === 'string' ? value : ''}
                              onChange={async (e) => {
                                const v = e.target.value
                                setInputs((prev) => ({ ...prev, [def.id]: v }))
                                await appendEvent({ kind: 'input_changed', inputId: def.id, value: v })
                              }}
                            />
                          ) : def.type === 'textarea' ? (
                            <textarea
                              className="input textarea"
                              value={typeof value === 'string' ? value : ''}
                              onChange={async (e) => {
                                const v = e.target.value
                                setInputs((prev) => ({ ...prev, [def.id]: v }))
                                await appendEvent({ kind: 'input_changed', inputId: def.id, value: v })
                              }}
                            />
                          ) : (
                            <label className="checkboxRow">
                              <input
                                type="checkbox"
                                checked={value === true}
                                onChange={async (e) => {
                                  const v = e.target.checked
                                  setInputs((prev) => ({ ...prev, [def.id]: v }))
                                  await appendEvent({ kind: 'input_changed', inputId: def.id, value: v })
                                }}
                              />
                              <span className="muted">Mark complete</span>
                            </label>
                          )}
                        </div>
                      )
                    }

                    // render normal inline code
                    return <code className={className}>{children}</code>
                  },
                }}
              >
                {parsed.markdown}
              </ReactMarkdown>
            </div>
          </section>

          <section className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Current captured inputs</div>
                <div className="cardMeta muted">These are also written as events (append-only).</div>
              </div>
            </div>
            <pre className="codeBlock">{JSON.stringify(inputs, null, 2)}</pre>
          </section>
        </main>
      </div>
    </>
  )
}

export default App
