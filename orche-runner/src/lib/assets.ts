/** Directory containing the operation markdown file (posix, no trailing slash). */
export function templateDirFromPath(templatePath: string): string {
  const normalized = templatePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  return idx === -1 ? '' : normalized.slice(0, idx)
}

/** Resolve Obsidian-style relative image paths to the library asset API. */
export function resolveLibraryAssetUrl(src: string | undefined, templatePath: string): string {
  if (!src) return ''
  let raw = src.trim()
  if (raw.startsWith('<') && raw.endsWith('>')) raw = raw.slice(1, -1)
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/')) return raw

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  const clean = decoded.replace(/^\.\//, '').replace(/\\/g, '/')
  const baseDir = templateDirFromPath(templatePath)
  const assetPath = baseDir ? `${baseDir}/${clean}` : clean
  return `/api/library-asset?path=${encodeURIComponent(assetPath.replace(/\/+/g, '/'))}`
}
