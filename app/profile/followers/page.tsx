import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function FollowersPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) redirect("/login");

  const { data: followers } = await supabase
    .from("follows")
    .select("created_at, profiles!follows_follower_id_fkey(username, avatar_url)")
    .eq("followed_id", user.id)
    .order("created_at", { ascending: false });

  const list = (followers ?? []).map((f: any) => ({
    username: f.profiles?.username ?? "someone",
    avatarUrl: f.profiles?.avatar_url ?? null,
  }));

  return (
    <div className="pt-12 max-w-md">
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        profile
      </p>
      <h1 className="font-display font-bold text-ink text-2xl mb-8">
        Followers
      </h1>

      {list.length === 0 ? (
        <p className="text-sm text-muted">No followers yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((f) => (
            <Link
              key={f.username}
              href={`/creator/${encodeURIComponent(f.username)}`}
              className="flex items-center gap-3 bg-card border border-border rounded-sm px-4 py-3 hover:border-ink transition-colors focus-ring"
            >
              {f.avatarUrl ? (
                <img
                  src={f.avatarUrl}
                  alt={f.username}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-display font-bold shrink-0">
                  {f.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-ink font-medium">{f.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}