import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveLibraryAssetUrl } from '../lib/assets'
import { normalizeMarkdownForRunner } from '../lib/markdown'
import { splitMarkdownWithCallouts } from '../lib/callouts'
import { OrcheCallout } from './OrcheCallout'

type Props = {
  children: string
  templatePath: string
}

function assetUrlTransform(url: string, key: string): string {
  if (key === 'src' && url && !/^https?:\/\//i.test(url.trim())) {
    return url
  }
  return defaultUrlTransform(url)
}

const markdownComponents = {
  blockquote({ children: c }: { children?: React.ReactNode }) {
    return <blockquote className="mdCallout_legacy">{c}</blockquote>
  },
  table({ children: c }: { children?: React.ReactNode }) {
    return (
      <div className="mdTableWrap">
        <table className="mdTable">{c}</table>
      </div>
    )
  },
}

function MarkdownBlock({
  content,
  templatePath,
}: {
  content: string
  templatePath: string
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={assetUrlTransform}
      components={{
        ...markdownComponents,
        img({ src, alt, title }) {
          const raw = src ?? ''
          const resolved = resolveLibraryAssetUrl(raw, templatePath)
          if (!resolved) return null
          return (
            <img
              className="stepImage"
              src={resolved}
              alt={alt ?? title ?? ''}
              title={title}
              loading="lazy"
            />
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function MarkdownContent({ children, templatePath }: Props) {
  const normalized = normalizeMarkdownForRunner(children)
  const segments = splitMarkdownWithCallouts(normalized)

  if (segments.length === 1 && segments[0].kind === 'md') {
    return <MarkdownBlock content={segments[0].content} templatePath={templatePath} />
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'callout' ? (
          <OrcheCallout key={`c-${i}`} type={seg.type} title={seg.title}>
            {seg.content ? (
              <MarkdownBlock content={seg.content} templatePath={templatePath} />
            ) : null}
          </OrcheCallout>
        ) : (
          <MarkdownBlock key={`m-${i}`} content={seg.content} templatePath={templatePath} />
        ),
      )}
    </>
  )
}
