export default function Loading() {
  return (
    <div className="pt-16 animate-pulse">
      <div className="h-3 w-40 bg-border rounded mb-3" />
      <div className="h-10 w-3/4 bg-border rounded mb-2" />
      <div className="h-10 w-1/2 bg-border rounded mb-5" />
      <div className="h-4 w-2/3 bg-border rounded mb-8" />

      <div className="flex gap-2 mb-10">
        <div className="h-11 flex-1 bg-border rounded-sm" />
        <div className="h-11 w-24 bg-border rounded-sm" />
      </div>

      <div className="h-4 w-32 bg-border rounded mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-5 h-48" />
        ))}
      </div>
    </div>
  );
}