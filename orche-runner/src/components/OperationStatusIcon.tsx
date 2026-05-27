import type { WorkOrderOperation } from '../lib/types'

type Props = {
  status: WorkOrderOperation['status']
}

function statusLabel(status: WorkOrderOperation['status']): string {
  switch (status) {
    case 'completed':
      return 'Complete'
    case 'in_progress':
      return 'In progress'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Not started'
  }
}

export function OperationStatusIcon({ status }: Props) {
  const label = statusLabel(status)

  return (
    <span
      className={`operationStatusIcon operationStatusIcon_${status}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {status === 'completed' ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 12.5l2.5 2.5L16 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : status === 'in_progress' ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : status === 'blocked' ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="7" y="11" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M9 11V8a3 3 0 116 0v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </span>
  )
}
