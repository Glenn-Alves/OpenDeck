"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type NotifItem = {
  id: string;
  type: "follow" | "comment" | "rating";
  actorUsername: string;
  createdAt: string;
  deckId?: string;
  deckTitle?: string;
  detail?: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("last_seen_notifications_at")
        .eq("id", userId)
        .single();

      const lastSeen = profile?.last_seen_notifications_at ?? new Date(0).toISOString();

      const { data: follows } = await supabase
        .from("follows")
        .select("id, created_at, profiles!follows_follower_id_fkey(username)")
        .eq("followed_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: comments } = await supabase
        .from("comments")
        .select("id, body, created_at, profiles(username), decks!inner(id, title, owner_id)")
        .eq("decks.owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: ratings } = await supabase
        .from("ratings")
        .select("id, score, created_at, profiles(username), decks!inner(id, title, owner_id)")
        .eq("decks.owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const followItems: NotifItem[] = (follows ?? []).map((f: any) => ({
        id: `follow-${f.id}`,
        type: "follow",
        actorUsername: f.profiles?.username ?? "someone",
        createdAt: f.created_at,
      }));

      const commentItems: NotifItem[] = (comments ?? []).map((c: any) => ({
        id: `comment-${c.id}`,
        type: "comment",
        actorUsername: c.profiles?.username ?? "someone",
        createdAt: c.created_at,
        deckId: c.decks.id,
        deckTitle: c.decks.title,
        detail: c.body,
      }));

      const ratingItems: NotifItem[] = (ratings ?? []).map((r: any) => ({
        id: `rating-${r.id}`,
        type: "rating",
        actorUsername: r.profiles?.username ?? "someone",
        createdAt: r.created_at,
        deckId: r.decks.id,
        deckTitle: r.decks.title,
        detail: `${r.score} star${r.score > 1 ? "s" : ""}`,
      }));

      const combined = [...followItems, ...commentItems, ...ratingItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined.slice(0, 20));
      setUnreadCount(
        combined.filter((n) => new Date(n.createdAt) > new Date(lastSeen)).length
      );
      setLoading(false);
    }
    load();
  }, [userId, supabase]);

  async function handleOpen() {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      await supabase
        .from("profiles")
        .update({ last_seen_notifications_at: new Date().toISOString() })
        .eq("id", userId);
      setUnreadCount(0);
    }
  }

  function notifText(n: NotifItem) {
    if (n.type === "follow") return <><strong>{n.actorUsername}</strong> started following you</>;
    if (n.type === "comment") return <><strong>{n.actorUsername}</strong> commented on <em>{n.deckTitle}</em></>;
    return <><strong>{n.actorUsername}</strong> rated <em>{n.deckTitle}</em> {n.detail}</>;
  }

  function notifHref(n: NotifItem) {
    if (n.type === "follow") return `/creator/${encodeURIComponent(n.actorUsername)}`;
    return `/deck/${n.deckId}`;
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative text-muted hover:text-ink transition-colors focus-ring w-8 h-8 flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0.5 bg-margin text-paper text-[9px] font-medium rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-sm shadow-xl z-50 py-2">
          <p className="font-display text-xs text-ink uppercase tracking-wide px-3 pb-2">
            Notifications
          </p>
          {loading ? (
            <p className="text-xs text-muted px-3 py-2">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-muted px-3 py-2">No notifications yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={notifHref(n)}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-ink hover:bg-paper transition-colors"
                >
                  {notifText(n)}
                  {n.type !== "follow" && n.detail && n.type === "comment" && (
                    <p className="text-muted mt-0.5 truncate">"{n.detail}"</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}