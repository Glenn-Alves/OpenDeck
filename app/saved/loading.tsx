export default function Loading() {
  return (
    <div className="pt-16 animate-pulse">
      <div className="h-3 w-24 bg-border rounded mb-3" />
      <div className="h-8 w-48 bg-border rounded mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-5 h-48" />
        ))}
      </div>
    </div>
  );
}