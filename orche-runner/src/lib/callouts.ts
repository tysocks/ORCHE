export const CALLOUT_LABELS: Record<string, string> = {
  note: 'Note',
  abstract: 'Abstract',
  summary: 'Summary',
  info: 'Info',
  todo: 'Todo',
  tip: 'Tip',
  hint: 'Hint',
  important: 'Important',
  success: 'Success',
  check: 'Check',
  done: 'Done',
  question: 'Question',
  help: 'Help',
  faq: 'FAQ',
  warning: 'Warning',
  caution: 'Caution',
  attention: 'Attention',
  failure: 'Failure',
  fail: 'Fail',
  missing: 'Missing',
  danger: 'Danger',
  error: 'Error',
  bug: 'Bug',
  example: 'Example',
  quote: 'Quote',
  cite: 'Cite',
}

export function calloutDisplayTitle(type: string, customTitle: string): string {
  const t = type.toLowerCase()
  const custom = customTitle.trim()
  if (custom && !/^\[!/.test(custom)) return custom
  return CALLOUT_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1)
}

export type MarkdownSegment =
  | { kind: 'md'; content: string }
  | { kind: 'callout'; type: string; title: string; content: string }

/** Split markdown into normal sections and Obsidian callout blockquote blocks. */
export function splitMarkdownWithCallouts(markdown: string): MarkdownSegment[] {
  const lines = markdown.split('\n')
  const segments: MarkdownSegment[] = []
  let mdBuffer: string[] = []

  function flushMd() {
    const text = mdBuffer.join('\n')
    if (text.trim()) segments.push({ kind: 'md', content: text })
    mdBuffer = []
  }

  let i = 0
  while (i < lines.length) {
    const m = lines[i].match(/^>\s*\[!([a-zA-Z-]+)\]\s*(.*)$/)
    if (m) {
      flushMd()
      const type = m[1].toLowerCase()
      const title = calloutDisplayTitle(type, m[2])
      i++
      const body: string[] = []
      while (i < lines.length && /^>/.test(lines[i])) {
        const line = lines[i].replace(/^>\s?/, '')
        if (!/^\[![a-zA-Z-]+\]/.test(line.trim())) {
          body.push(line)
        }
        i++
      }
      segments.push({ kind: 'callout', type, title, content: body.join('\n').trim() })
      continue
    }
    mdBuffer.push(lines[i])
    i++
  }
  flushMd()
  return segments.length ? segments : [{ kind: 'md', content: markdown }]
}
