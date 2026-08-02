export default function Loading() {
  return (
    <div className="pt-12 max-w-md animate-pulse">
      <div className="h-3 w-24 bg-border rounded mb-3" />
      <div className="h-8 w-48 bg-border rounded mb-8" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-card border border-border rounded-sm" />
        ))}
      </div>
    </div>
  );
}