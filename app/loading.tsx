export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-lime-100">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 animate-pulse shadow-[0_16px_36px_rgba(251,191,36,0.22)]">
          <span className="text-2xl font-bold text-white">Ⓟ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Phcl Super</h1>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
