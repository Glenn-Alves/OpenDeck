import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OnlineCount from "./OnlineCount";
import ThemeToggle from "./ThemeToggle";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";
import MessageIcon from "./MessageIcon";

export default async function Navbar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;

  let avatarUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();
    avatarUrl = profile?.avatar_url ?? null;
  }

  return (
    <header className="border-b-2 border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display font-bold text-lg tracking-tight text-ink focus-ring"
        >
          Open<span className="text-margin">Deck</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <Link href="/" className="hover:text-ink transition-colors focus-ring">
            Browse
          </Link>
          <Link href="/create" className="hover:text-ink transition-colors focus-ring">
            New deck
          </Link>
          {user && (
            <Link href="/my-decks" className="hover:text-ink transition-colors focus-ring">
              My Decks
            </Link>
          )}
          {user && (
            <Link href="/saved" className="hover:text-ink transition-colors focus-ring">
              Saved
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <OnlineCount />
          <ThemeToggle />
          {user && <NotificationBell userId={user.id} />}
          {user && <MessageIcon userId={user.id} />}
          {user ? (
            <ProfileMenu
              username={user.user_metadata?.username ?? user.email}
              avatarUrl={avatarUrl}
            />
          ) : (
            <Link
              href="/login"
              className="text-sm text-muted hover:text-ink transition-colors focus-ring"
            >
              Log in
            </Link>
          )}
          <Link
            href="/create"
            className="text-sm bg-ink text-paper px-4 py-2 rounded-sm hover:bg-margin transition-colors focus-ring"
          >
            Create deck
          </Link>
        </div>
      </div>
    </header>
  );
}