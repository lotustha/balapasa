// Instant skeleton shown while the product page's server render (several DB
// queries) resolves. Without this, clicking a product card showed nothing until
// the full page was ready, which read as a slow, unresponsive navigation.
// Mirrors the real hero: sticky-left square gallery + scrolling-right info.
export default function ProductLoading() {
  return (
    <div className="min-h-screen relative"
      style={{ background: 'linear-gradient(135deg,#EEF2FF 0%,#FAF5FF 40%,#FFF0F9 70%,#F0FDF4 100%)' }}>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full min-w-0">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT — gallery */}
          <div className="lg:col-span-7 min-w-0">
            <div className="flex flex-col-reverse lg:flex-row gap-3 min-w-0">
              {/* Thumbnail strip */}
              <div className="flex lg:flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-20 shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
              {/* Main square */}
              <div className="flex-1 min-w-0 lg:max-w-[calc(100vh-9rem)] lg:mx-auto">
                <div className="aspect-square rounded-[2rem] bg-slate-200 animate-pulse" />
              </div>
            </div>
          </div>

          {/* RIGHT — info */}
          <div className="lg:col-span-5 min-w-0 space-y-4">
            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-8 w-3/4 rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="h-10 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-12 w-32 rounded-2xl bg-slate-200 animate-pulse" />
              <div className="h-12 flex-1 rounded-2xl bg-slate-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
