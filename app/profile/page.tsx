"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import AvatarUploadField from "@/components/AvatarUploadField";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user, loading: checkingAuth } = useAuth();

  const [username, setUsername] = useState(user?.user_metadata?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

 useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url, bio")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setBio(data.bio ?? "");
      }

      const { count: followers } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("followed_id", user.id);

      const { count: following } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", user.id);

      setFollowerCount(followers ?? 0);
      setFollowingCount(following ?? 0);
      setLoadingProfile(false);
    }
    loadProfile();
  }, [user, supabase]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!username.trim()) {
      setProfileError("Username can't be empty.");
      return;
    }

    setProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
      })
      .eq("id", user!.id);

    setProfileSaving(false);

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        setProfileError("That username is already taken.");
      } else {
        setProfileError(error.message);
      }
      return;
    }

    setProfileSuccess(true);
    router.refresh();
  }

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
          settings
        </p>
        <h1 className="font-display font-bold text-ink text-2xl mb-4">
          Log in to see your settings
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
      <h1 className="font-display font-bold text-ink text-2xl md:text-3xl mb-2">
        {user.user_metadata?.username ?? user.email}
      </h1>
      <p className="text-sm text-muted mb-8">
        <Link href="/profile/followers" className="hover:text-ink transition-colors focus-ring">
          {followerCount} follower{followerCount === 1 ? "" : "s"}
        </Link>
        {" · "}
        <Link href="/profile/following" className="hover:text-ink transition-colors focus-ring">
          {followingCount} following
        </Link>
      </p>

      {!loadingProfile && (
        <section className="mb-12 max-w-md">
          <h2 className="font-display font-bold text-ink text-sm uppercase tracking-wide mb-4">
            Edit profile
          </h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <AvatarUploadField value={avatarUrl} onChange={setAvatarUrl} />

            <div>
              <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink focus-ring"
              />
            </div>

            <div>
              <label className="block font-display text-xs text-ink uppercase tracking-wide mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a bit about yourself"
                rows={3}
                maxLength={280}
                className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"
              />
              <p className="text-xs text-muted mt-1">{bio.length}/280</p>
            </div>

            {profileError && <p className="text-xs text-margin">{profileError}</p>}
            {profileSuccess && <p className="text-xs text-rule">Profile updated.</p>}

            <button
              type="submit"
              disabled={profileSaving}
              className="bg-ink text-paper px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
            >
              {profileSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      )}

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
            className="w-full bg-card border-2 border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-muted focus-ring"
          />
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