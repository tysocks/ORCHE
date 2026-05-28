import type { RequiredToolEntry } from '../lib/tools'

type Props = {
  tools: RequiredToolEntry[]
  emptyMessage?: string
}

export function RequiredToolsTable({ tools, emptyMessage = 'No tools listed.' }: Props) {
  if (tools.length === 0) {
    return <div className="muted">{emptyMessage}</div>
  }

  return (
    <div className="toolsTableWrap">
      <table className="toolsTable">
        <thead>
          <tr>
            <th>Description</th>
            <th>Part no.</th>
            <th>Equipment ID</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool, i) => (
            <tr key={`${tool.description}-${tool.partNumber ?? ''}-${tool.equipmentId ?? ''}-${i}`}>
              <td>{tool.description}</td>
              <td className="mono">{tool.partNumber ?? '—'}</td>
              <td className="mono">{tool.equipmentId ?? '—'}</td>
              <td className="muted">
                {tool.source === 'step' ? (tool.stepLabel ? `Step: ${tool.stepLabel}` : 'Step') : 'Required'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
