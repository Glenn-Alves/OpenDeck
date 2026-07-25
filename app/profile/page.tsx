"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type ActivityItem = {
  id: string;
  type: "comment" | "rating";
  authorName: string;
  deckId: string;
  deckTitle: string;
  detail: string;
  createdAt: string;
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, loading: checkingAuth } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadActivity() {
      setLoadingActivity(true);

      const { data: commentsData } = await supabase
        .from("comments")
        .select(
          "id, body, created_at, profiles(username), decks!inner(id, title, owner_id)"
        )
        .eq("decks.owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: ratingsData } = await supabase
        .from("ratings")
        .select(
          "id, score, created_at, profiles(username), decks!inner(id, title, owner_id)"
        )
        .eq("decks.owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const commentItems: ActivityItem[] = (commentsData ?? []).map((c: any) => ({
        id: `comment-${c.id}`,
        type: "comment",
        authorName: c.profiles?.username ?? "someone",
        deckId: c.decks.id,
        deckTitle: c.decks.title,
        detail: c.body,
        createdAt: c.created_at,
      }));

      const ratingItems: ActivityItem[] = (ratingsData ?? []).map((r: any) => ({
        id: `rating-${r.id}`,
        type: "rating",
        authorName: r.profiles?.username ?? "someone",
        deckId: r.decks.id,
        deckTitle: r.decks.title,
        detail: `${r.score} star${r.score > 1 ? "s" : ""}`,
        createdAt: r.created_at,
      }));

      const combined = [...commentItems, ...ratingItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setActivity(combined.slice(0, 20));
      setLoadingActivity(false);
    }

    loadActivity();
  }, [user, supabase]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordSuccess(true);
    setNewPassword("");
  }

  async function handleDeleteAccount() {
    const confirmed = confirm(
      "Delete your account? This permanently deletes your decks, cards, comments, ratings, and saved decks. This can't be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const data = await res.json();

    if (!res.ok) {
      setDeleting(false);
      setDeleteError(data.error ?? "Could not delete your account.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (checkingAuth) {
    return <div className="pt-16 text-sm text-muted">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="pt-16 max-w-md">
        
        <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
          profile
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-4">
          Log in to see your profile
        </h1>
        <Link
          href="/login"
          className="inline-block bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-12 max-w-2xl">
    
      <p className="font-display text-xs text-margin uppercase tracking-widest mb-3">
        profile
      </p>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display font-bold text-ink text-2xl md:text-3xl">
          {user.user_metadata?.username ?? user.email}
        </h1>
        <LogoutButton />
      </div>

      <section className="mb-12">
        <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
          Recent activity on your decks
        </h2>

        {loadingActivity ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted">
            No comments or ratings on your decks yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <Link
                key={item.id}
                href={`/deck/${item.deckId}`}
className="block bg-card border border-border rounded-sm px-4 py-3 hover:border-ink transition-colors focus-ring"              >
                <p className="text-sm text-ink">
                  <strong>{item.authorName}</strong>{" "}
                  {item.type === "comment" ? "commented on" : "rated"}{" "}
                  <span className="text-rule">{item.deckTitle}</span>
                </p>
                <p className="text-xs text-muted mt-1">
                  {item.type === "comment" ? `"${item.detail}"` : item.detail}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12 max-w-md">
        <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
          Change password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (at least 8 characters)"
className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"          />
          {passwordError && <p className="text-xs text-margin">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-xs text-rule">Password updated.</p>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
          >
            {passwordSaving ? "Saving..." : "Update password"}
          </button>
        </form>
      </section>

      <section className="max-w-md">
        <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
          Danger zone
        </h2>
        <p className="text-sm text-muted mb-3">
          Permanently deletes your account, decks, cards, comments, ratings,
          and saved decks. This can&rsquo;t be undone.
        </p>
        {deleteError && <p className="text-xs text-margin mb-2">{deleteError}</p>}
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="bg-margin text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity focus-ring disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete my account"}
        </button>
      </section>

      <p className="mt-12 text-xs text-muted">
        <Link href="/privacy" className="hover:text-ink transition-colors focus-ring">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}