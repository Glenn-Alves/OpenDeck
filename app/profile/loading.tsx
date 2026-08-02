export default function Loading() {
  return (
    <div className="pt-12 max-w-2xl animate-pulse">
      <div className="h-3 w-20 bg-border rounded mb-3" />
      <div className="h-8 w-40 bg-border rounded mb-8" />
      <div className="h-16 w-16 bg-border rounded-full mb-4" />
      <div className="h-10 w-full bg-border rounded-sm mb-4" />
      <div className="h-20 w-full bg-border rounded-sm" />
    </div>
  );
}