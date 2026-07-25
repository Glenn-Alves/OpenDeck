# OpenDeck

OpenDeck is a place to find and share flashcard decks with other people.

Instead of building every study deck from scratch, you can browse decks
other students and learners have already made, on history, science,
languages, whatever, and use them right away. If you've made your own
deck, you can publish it so others studying the same thing can find it too.

**Best for:**
- Finding ready-made flashcards for a class, exam, or subject you're
  studying, without starting from zero
- Sharing decks you've already built in Anki, so other people can use them
- Studying directly in the browser with a simple flip-card mode
- Organizing big topics into folders (e.g. a "Chemistry" deck with
  "Organic Chemistry" and "Inorganic Chemistry" subsections inside it)

## How it works

1. **Browse or search** for a deck by topic, tag, or the person who
   made it. Every deck shows its difficulty, an estimated study time,
   how many times it's been downloaded and saved, and when it was last
   updated.
2. **Study it** right on the site with a flip-card mode, or **export it
   to Anki** if that's the app you already use.
3. **Rate and comment** on decks that helped you.
4. **Publish your own deck.** Type cards in manually, or import an
   existing `.apkg` file from Anki. Decks can have nested subsections
   (like folders), so a big topic can be broken into smaller ones.
5. **Save decks for later**, follow creators whose decks you like, and
   see your own decks and activity from your profile.

## Tech stack

- **Next.js 14** (App Router) with TypeScript
- **Supabase**: Postgres database, authentication, file storage (card
  images), and realtime (live visitor count)
- **Tailwind CSS**, with a light/dark mode toggle
- **Vercel** for hosting, auto-deploys on push to `main`