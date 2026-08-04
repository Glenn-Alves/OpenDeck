"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type SubsectionNode = {
  id: string;
  title: string;
  children: SubsectionNode[];
};

function isNewId(id: string) {
  return id.startsWith("new-");
}

function newNode(): SubsectionNode {
  return { id: `new-${crypto.randomUUID()}`, title: "", children: [] };
}

function findAndRemove(
  nodes: SubsectionNode[],
  id: string
): [SubsectionNode | null, SubsectionNode[]] {
  let removed: SubsectionNode | null = null;
  function walk(list: SubsectionNode[]): SubsectionNode[] {
    const result: SubsectionNode[] = [];
    for (const n of list) {
      if (n.id === id) {
        removed = n;
        continue;
      }
      result.push({ ...n, children: walk(n.children) });
    }
    return result;
  }
  const rest = walk(nodes);
  return [removed, rest];
}

function insertAsChild(
  nodes: SubsectionNode[],
  targetId: string,
  toInsert: SubsectionNode
): SubsectionNode[] {
  return nodes.map((n) =>
    n.id === targetId
      ? { ...n, children: [...n.children, toInsert] }
      : { ...n, children: insertAsChild(n.children, targetId, toInsert) }
  );
}

function collectDescendantIds(node: SubsectionNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: SubsectionNode) {
    for (const c of n.children) {
      ids.add(c.id);
      walk(c);
    }
  }
  walk(node);
  return ids;
}

function findNode(nodes: SubsectionNode[], id: string): SubsectionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function removeNode(nodes: SubsectionNode[], id: string): SubsectionNode[] {
  const [, rest] = findAndRemove(nodes, id);
  return rest;
}

function updateTitle(nodes: SubsectionNode[], id: string, title: string): SubsectionNode[] {
  return nodes.map((n) =>
    n.id === id ? { ...n, title } : { ...n, children: updateTitle(n.children, id, title) }
  );
}

function flatten(nodes: SubsectionNode[], depth = 0): { node: SubsectionNode; depth: number }[] {
  const out: { node: SubsectionNode; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

// Flattens to a map of id -> parentId (or "ROOT" for top-level, meaning a
// direct child of the deck this manager is scoped to).
function flattenParents(nodes: SubsectionNode[], parentId: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const n of nodes) {
    map.set(n.id, parentId);
    for (const [cid, pid] of flattenParents(n.children, n.id)) {
      map.set(cid, pid);
    }
  }
  return map;
}

export default function SubsectionManagerDraggable({
  deckId,
  initialNodes,
}: {
  deckId: string;
  initialNodes: SubsectionNode[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [nodes, setNodes] = useState<SubsectionNode[]>(initialNodes);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const flat = flatten(nodes);

  function markDirty(updated: SubsectionNode[]) {
    setNodes(updated);
    setDirty(true);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
    setRootDragOver(false);
  }

  function canDropOnto(targetId: string): boolean {
    if (!draggedId) return false;
    if (draggedId === targetId) return false;
    const draggedNode = findNode(nodes, draggedId);
    if (!draggedNode) return false;
    return !collectDescendantIds(draggedNode).has(targetId);
  }

  function handleDropOnNode(targetId: string) {
    if (!draggedId || !canDropOnto(targetId)) {
      handleDragEnd();
      return;
    }
    const [removedNode, without] = findAndRemove(nodes, draggedId);
    if (!removedNode) {
      handleDragEnd();
      return;
    }
    markDirty(insertAsChild(without, targetId, removedNode));
    handleDragEnd();
  }

  function handleDropOnRoot() {
    if (!draggedId) {
      handleDragEnd();
      return;
    }
    const [removedNode, without] = findAndRemove(nodes, draggedId);
    if (!removedNode) {
      handleDragEnd();
      return;
    }
    markDirty([...without, removedNode]);
    handleDragEnd();
  }

  function addSubsection() {
    markDirty([...nodes, newNode()]);
  }

  function removeSubsection(id: string) {
    if (!isNewId(id)) {
      // Safety: don't allow deleting an already-persisted subsection from
      // here, since that would silently orphan its cards. Use the delete
      // button on that subsection's own deck page instead.
      return;
    }
    markDirty(removeNode(nodes, id));
  }

  function handleTitleChange(id: string, title: string) {
    markDirty(updateTitle(nodes, id, title));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      setError("You need to be logged in.");
      return;
    }
    const ownerId = user.id;

    const originalParents = flattenParents(initialNodes, deckId);
    const currentParents = flattenParents(nodes, deckId);
    const idMap = new Map<string, string>(); // temp "new-..." id -> real db id

    // Insert new subsections first, in top-down order, so children can
    // resolve their parent's real id via idMap.
    async function insertNew(list: SubsectionNode[], parentRealId: string) {
      for (const n of list) {
        if (isNewId(n.id)) {
          if (!n.title.trim()) continue;
          const { data: sub, error: subError } = await supabase
            .from("decks")
            .insert({
              owner_id: ownerId,
              parent_deck_id: parentRealId,
              title: n.title.trim(),
              description: "",
              tags: [],
              visibility: "public",
            })
            .select()
            .single();
          if (sub && !subError) {
            idMap.set(n.id, sub.id);
            await insertNew(n.children, sub.id);
          }
        } else {
          await insertNew(n.children, n.id);
        }
      }
    }

    await insertNew(nodes, deckId);

    // Update parent_deck_id for any existing subsection whose parent changed.
    for (const [id, parentId] of currentParents) {
      if (isNewId(id)) continue; // already handled above
      const originalParentId = originalParents.get(id);
      if (originalParentId !== parentId) {
        const resolvedParent = isNewId(parentId) ? idMap.get(parentId) ?? deckId : parentId;
        await supabase.from("decks").update({ parent_deck_id: resolvedParent }).eq("id", id);
      }
    }

    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  return (
    <div>
      {flat.length > 0 && (
        <p className="text-xs text-muted mb-3">
          Drag a subsection onto another to nest it inside. Drag it down to
          the bottom zone to make it a direct child of this deck again.
        </p>
      )}

      <div className="space-y-2">
        {flat.map(({ node, depth }) => {
          const isDragging = draggedId === node.id;
          const isDragOver = dragOverId === node.id && canDropOnto(node.id);
          const isNew = isNewId(node.id);

          return (
            <div
              key={node.id}
              draggable
              onDragStart={() => handleDragStart(node.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                e.preventDefault();
                if (canDropOnto(node.id)) setDragOverId(node.id);
              }}
              onDragLeave={() => setDragOverId((prev) => (prev === node.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnNode(node.id);
              }}
              style={{ marginLeft: depth * 24 }}
              className={`flex items-center gap-2 bg-card border-2 rounded-sm px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                isDragOver
                  ? "border-rule bg-rule/10"
                  : isDragging
                  ? "border-border opacity-40"
                  : "border-border"
              }`}
            >
              <span className="text-muted text-sm select-none" aria-hidden="true">
                ⠿
              </span>
              <input
                type="text"
                value={node.title}
                onChange={(e) => handleTitleChange(node.id, e.target.value)}
                placeholder="Subsection name"
                disabled={!isNew}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-70"
              />
              {isNew ? (
                <button
                  type="button"
                  onClick={() => removeSubsection(node.id)}
                  className="text-xs text-muted hover:text-margin transition-colors focus-ring"
                  aria-label="Remove subsection"
                >
                  ✕
                </button>
              ) : (
                <span className="text-[10px] text-muted uppercase tracking-wide">saved</span>
              )}
            </div>
          );
        })}
      </div>

      {draggedId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setRootDragOver(true);
          }}
          onDragLeave={() => setRootDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            handleDropOnRoot();
          }}
          className={`mt-3 border-2 border-dashed rounded-sm py-3 text-center text-xs transition-colors ${
            rootDragOver ? "border-rule bg-rule/10 text-ink" : "border-border text-muted"
          }`}
        >
          Drop here to make a direct child of this deck
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={addSubsection}
          className="text-sm text-rule hover:text-ink transition-colors focus-ring"
        >
          + Add subsection
        </button>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-ink text-paper px-4 py-1.5 rounded-sm text-xs font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save structure"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-margin mt-2">{error}</p>}

      <p className="text-[11px] text-muted mt-2">
        Existing subsections can be renamed on their own deck page. To
        delete one, open it and use its Delete button there.
      </p>
    </div>
  );
}