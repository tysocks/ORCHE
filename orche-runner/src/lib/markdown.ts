/**
 * Normalize markdown so images render reliably in the runner.
 * - Obsidian wiki embeds: ![[path]] or ![[path|alt]]
 * - Paths with spaces: wrap in angle brackets for CommonMark
 */
export function normalizeMarkdownForRunner(markdown: string): string {
  let out = markdown

  // ![[image.png]] or ![[image.png|alt text]]
  out = out.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_match, path, alt) => {
    const p = String(path).trim()
    const a = alt ? String(alt).trim() : ''
    const dest = wrapAssetPath(p)
    return a ? `![${a}](${dest})` : `![](${dest})`
  })

  // ![alt](path with spaces) — wrap path if it contains spaces and isn't already wrapped
  out = out.replace(/!\[([^\]]*)\]\(([^)<>]+)\)/g, (_match, alt, url) => {
    const u = String(url).trim()
    if (u.includes(' ') && !u.startsWith('<')) {
      return `![${alt}](${wrapAssetPath(u)})`
    }
    return `![${alt}](${u})`
  })

  return out
}

function wrapAssetPath(p: string): string {
  if (p.startsWith('<') && p.endsWith('>')) return p
  if (p.includes(' ')) return `<${p}>`
  return p
}
