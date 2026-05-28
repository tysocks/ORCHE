import type { ParsedOperation } from '../../lib/types'

type NoteRow = { title: string; note: string }

type Props = {
  operation: ParsedOperation
  noteEntries: NoteRow[]
}

export function OperationNotesPanel({ operation, noteEntries }: Props) {
  const ordered: NoteRow[] = []

  if (operation.operationType === 'checklist') {
    for (const section of operation.checklistSections ?? []) {
      for (const item of section.items) {
        const entry = noteEntries.find((n) => n.title === `${item.number} ${item.title}`)
        if (entry?.note.trim()) ordered.push({ title: entry.title, note: entry.note })
      }
    }
  } else {
    for (const step of operation.steps) {
      const entry = noteEntries.find((n) => n.title === step.title)
      if (entry?.note.trim()) ordered.push({ title: step.title, note: entry.note })
    }
  }

  if (ordered.length === 0) {
    return <div className="muted">No notes recorded for this operation.</div>
  }

  return (
    <div className="notesPanelList">
      {ordered.map((row) => (
        <div key={row.title} className="opNoteItem">
          <div className="opNoteTitle">{row.title}</div>
          <div className="opNoteText muted">{row.note}</div>
        </div>
      ))}
    </div>
  )
}
