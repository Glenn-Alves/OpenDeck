"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FeedbackModal from "./FeedbackModal";

export default function ProfileMenu({
  username,
}: {
  username: string;
}) {
  const supabase = createClient();
  const router = useRouter();
 const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors focus-ring"
        aria-label="Account menu"
      >
        <span className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-display font-bold shrink-0">
          {username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{username}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-sm shadow-xl z-50 py-2">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-sm text-ink font-medium truncate">{username}</p>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ink hover:bg-paper transition-colors"
          >
            Settings
          </Link>

          
           <button
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
            className="block w-full text-left px-3 py-2 text-sm text-ink hover:bg-paper transition-colors"
          >
            Give feedback
          </button>

          <button
            onClick={handleLogout}
            className="block w-full text-left px-3 py-2 text-sm text-margin hover:bg-paper transition-colors"
          >
            Log out
          </button>
        </div>
      )}

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} />
      )}
    </div>
  );
}