import Link from "next/link";

export type BreadcrumbItem = {
  id: string;
  title: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <li>
          <Link href="/" className="hover:text-ink transition-colors focus-ring">
            Browse
          </Link>
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.id} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span className="text-ink font-medium" aria-current="page">
                  {item.title}
                </span>
              ) : (
                <Link
                  href={`/deck/${item.id}`}
                  className="hover:text-ink transition-colors focus-ring"
                >
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}