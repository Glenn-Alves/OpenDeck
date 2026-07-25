"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({
  followedId,
  initiallyFollowing,
}: {
  followedId: string;
  initiallyFollowing: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", followedId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        followed_id: followedId,
      });
      setFollowing(true);
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors focus-ring disabled:opacity-50 ${
        following
          ? "bg-card border border-border text-ink hover:border-margin hover:text-margin"
          : "bg-ink text-paper hover:bg-margin"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}