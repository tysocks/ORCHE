import { useState } from 'react'
import type { ParsedOperation, ProcessEvent } from '../lib/types'
import { OperationActionLog } from './OperationActionLog'

type Tab = 'log' | 'notes'

type NoteEntry = { id: string; title: string; note: string }

type Props = {
  operation: ParsedOperation
  noteEntries: NoteEntry[]
  events: ProcessEvent[]
  operationNo: number
  opId: string
  onClose: () => void
}

export function OperationRecordModal({
  operation,
  noteEntries,
  events,
  operationNo,
  opId,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>('log')
  const notesWithText = noteEntries.filter((e) => e.note.trim())

  return (
    <>
      <button type="button" className="modalScrim" onClick={onClose} aria-label="Close record" />
      <div className="modalCard modalCardWide" role="dialog" aria-label="Operation record">
        <div className="modalHead">
          <div className="modalTitle">Operation record</div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modalTabs">
          <button
            type="button"
            className={`modalTab ${tab === 'log' ? 'modalTabActive' : ''}`}
            onClick={() => setTab('log')}
          >
            Action log
          </button>
          <button
            type="button"
            className={`modalTab ${tab === 'notes' ? 'modalTabActive' : ''}`}
            onClick={() => setTab('notes')}
          >
            Notes{notesWithText.length > 0 ? ` (${notesWithText.length})` : ''}
          </button>
        </div>

        <div className="modalBody modalBodyScroll">
          {tab === 'log' ? (
            <OperationActionLog
              events={events}
              operationNo={operationNo}
              opId={opId}
              operation={operation}
            />
          ) : notesWithText.length > 0 ? (
            <div className="opNotesList">
              {notesWithText.map((entry) => (
                <div key={entry.id} className="opNoteItem">
                  <div className="opNoteTitle">{entry.title}</div>
                  <div className="opNoteText muted">{entry.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No step notes recorded for this operation.</div>
          )}
        </div>
      </div>
    </>
  )
}
