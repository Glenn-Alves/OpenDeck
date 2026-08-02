export default function Loading() {
  return (
    <div className="pt-12 animate-pulse">
      <div className="h-3 w-40 bg-border rounded mb-3" />
      <div className="h-3 w-24 bg-border rounded mb-3" />
      <div className="h-9 w-64 bg-border rounded mb-2" />
      <div className="h-4 w-full max-w-md bg-border rounded mb-5" />
      <div className="flex gap-3 mb-10">
        <div className="h-10 w-32 bg-border rounded-sm" />
        <div className="h-10 w-32 bg-border rounded-sm" />
        <div className="h-10 w-28 bg-border rounded-sm" />
      </div>
      <div className="h-4 w-32 bg-border rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-sm h-24" />
        ))}
      </div>
    </div>
  );
}