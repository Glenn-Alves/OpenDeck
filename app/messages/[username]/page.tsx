import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ConversationView from "@/components/ConversationView";

export default async function ConversationPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) redirect("/login");

  const username = decodeURIComponent(params.username);

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!otherProfile) return notFound();
  if (otherProfile.id === user.id) redirect("/messages");

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${otherProfile.id}),and(sender_id.eq.${otherProfile.id},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  // Mark incoming messages from this person as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherProfile.id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return (
    <ConversationView
      currentUserId={user.id}
      otherUser={{ id: otherProfile.id, username: otherProfile.username, avatarUrl: otherProfile.avatar_url }}
      initialMessages={initialMessages ?? []}
    />
  );
}