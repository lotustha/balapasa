import { splitBrandName } from '@/lib/site-settings-shared'

interface BrandTextProps {
  name:       string
  className?: string
  /** Override the auto-split (e.g. when settings already provide a split). */
  split?: { primary: string; accent: string }
}

/**
 * Wordmark used across header, footer, admin sidebar, and auth pages.
 * Renders `primary` + accented `accent` half (iridescent gradient).
 */
export default function BrandText({ name, className, split }: BrandTextProps) {
  const { primary, accent } = split ?? splitBrandName(name)
  return (
    <span className={className}>
      {primary}
      {accent && <span className="iridescent-text">{accent}</span>}
    </span>
  )
}
