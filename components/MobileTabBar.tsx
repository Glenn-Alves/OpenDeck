"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function TabIcon({ name }: { name: "browse" | "create" | "decks" | "saved" | "profile" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "browse") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    );
  }
  if (name === "create") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "decks") {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
 if (name === "saved") {
    return (
      <svg {...common}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const tabs = [
    { href: "/", label: "Browse", icon: "browse" as const },
    { href: "/create", label: "New", icon: "create" as const },
    ...(user
      ? [
          { href: "/my-decks", label: "My Decks", icon: "decks" as const },
          { href: "/saved", label: "Saved", icon: "saved" as const },
          { href: "/profile", label: "Profile", icon: "profile" as const },
        ]
      : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border flex justify-around items-center py-2 z-40">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 focus-ring rounded-sm ${
              active ? "text-ink" : "text-muted"
            }`}
          >
            <TabIcon name={tab.icon} />
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}