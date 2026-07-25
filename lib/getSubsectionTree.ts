import { createClient } from "@/lib/supabase/server";

export type SubsectionNode = {
  id: string;
  title: string;
  children: SubsectionNode[];
};

export async function getSubsectionTree(rootId: string): Promise<SubsectionNode[]> {
  const supabase = await createClient();

  // Fetch every deck in the whole tree in one pass, level by level
  const allNodes = new Map<string, { id: string; title: string; parent_deck_id: string | null }>();
  let frontier = [rootId];

  while (frontier.length > 0) {
    const { data: children } = await supabase
      .from("decks")
      .select("id, title, parent_deck_id")
      .in("parent_deck_id", frontier)
      .order("created_at", { ascending: true });

    if (!children || children.length === 0) break;

    for (const c of children as any[]) {
      allNodes.set(c.id, c);
    }
    frontier = children.map((c: any) => c.id);
  }

  // Build the tree recursively from the flat map
  function buildChildren(parentId: string): SubsectionNode[] {
    return Array.from(allNodes.values())
      .filter((n) => n.parent_deck_id === parentId)
      .map((n) => ({
        id: n.id,
        title: n.title,
        children: buildChildren(n.id),
      }));
  }

  return buildChildren(rootId);
}