type Row = { name: string; type: string; required?: boolean; desc: string }

export default function ParamTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-slate-700/60">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-800/60">
            <th className="px-4 py-2.5 font-semibold text-slate-200">Name</th>
            <th className="px-4 py-2.5 font-semibold text-slate-200">Type</th>
            <th className="px-4 py-2.5 font-semibold text-slate-200">Required</th>
            <th className="px-4 py-2.5 font-semibold text-slate-200">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-b border-slate-800 last:border-0 transition-colors duration-200 hover:bg-slate-800/40"
            >
              <td className="px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {row.name}
              </td>
              <td className="px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-slate-400">
                {row.type}
              </td>
              <td className="px-4 py-2.5">
                {row.required ? (
                  <span className="text-rose-400">required</span>
                ) : (
                  <span className="text-slate-500">optional</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-300">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
