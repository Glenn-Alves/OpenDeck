import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) redirect("/login");

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const otherIds = new Set<string>();
  for (const m of messages ?? []) {
    otherIds.add(m.sender_id === user.id ? m.recipient_id : m.sender_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", Array.from(otherIds));

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const conversations = Array.from(otherIds).map((otherId) => {
    const latest = (messages ?? []).find(
      (m) => m.sender_id === otherId || m.recipient_id === otherId
    );
    const unread = (messages ?? []).filter(
      (m) => m.sender_id === otherId && m.recipient_id === user.id && !m.read_at
    ).length;
    return {
      otherId,
      username: profileMap.get(otherId)?.username ?? "someone",
      avatarUrl: profileMap.get(otherId)?.avatar_url ?? null,
      lastBody: latest?.body ?? "",
      lastAt: latest?.created_at ?? "",
      unread,
    };
  });

  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return (
    <div className="pt-12 max-w-md">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        messages
      </p>
      <h1 className="font-display font-bold text-ink text-2xl mb-8">
        Conversations
      </h1>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted">
          No conversations yet. Visit someone&rsquo;s creator page to say hello.
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.otherId}
              href={`/messages/${encodeURIComponent(c.username)}`}
              className="flex items-center gap-3 bg-card border border-border rounded-sm px-4 py-3 hover:border-ink transition-colors focus-ring"
            >
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-display font-bold shrink-0">
                  {c.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium">{c.username}</p>
                <p className="text-xs text-muted truncate">{c.lastBody}</p>
              </div>
              {c.unread > 0 && (
                <span className="bg-margin text-paper text-[10px] rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}