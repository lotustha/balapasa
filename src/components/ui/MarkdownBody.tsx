import ReactMarkdown from 'react-markdown'

interface MarkdownBodyProps {
  source: string
}

export default function MarkdownBody({ source }: MarkdownBodyProps) {
  return (
    <div
      className="
        prose prose-slate max-w-none
        prose-headings:font-heading prose-headings:font-extrabold prose-headings:text-slate-900
        prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
        prose-p:text-slate-600 prose-p:leading-relaxed
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-slate-800
        prose-li:text-slate-600 prose-li:marker:text-primary
        prose-ul:my-3 prose-ol:my-3
      "
    >
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  )
}
