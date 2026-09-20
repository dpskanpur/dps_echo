/**
 * Content-area skeleton shown while a staff page renders on the server.
 *
 * Only the body is replaced — the sidebar and navbar live in the layout and
 * stay on screen, so navigation feels immediate rather than frozen.
 */
export default function StaffLoading() {
  return (
    <main className="p-8 space-y-6 flex-1 w-full max-w-6xl mx-auto animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-64 bg-slate-200 rounded" />
        <div className="h-3 w-96 bg-slate-100 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white border border-slate-200/80 rounded-2xl" />
        ))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${90 - i * 7}%` }} />
        ))}
      </div>
    </main>
  );
}
