"use client";

import { useState } from "react";

export type SubsectionNode = {
  id: string;
  title: string;
  children: SubsectionNode[];
};

export function emptySubsectionNode(): SubsectionNode {
  return { id: crypto.randomUUID(), title: "", children: [] };
}

// --- tree helpers ---

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

  const newNodes = walk(nodes);
  return [removed, newNodes];
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
    for (const child of n.children) {
      ids.add(child.id);
      walk(child);
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

function updateNode(
  nodes: SubsectionNode[],
  id: string,
  updater: (n: SubsectionNode) => SubsectionNode
): SubsectionNode[] {
  return nodes.map((n) =>
    n.id === id ? updater(n) : { ...n, children: updateNode(n.children, id, updater) }
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

// Exported so app/create/page.tsx can build the "Location" dropdown
// (id + full nested path like "Chapter 1 > Section A") for the card modal.
export function buildLocationPaths(
  nodes: SubsectionNode[],
  parentPath = ""
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const label = parentPath ? `${parentPath} > ${n.title.trim() || "Untitled"}` : n.title.trim() || "Untitled";
    out.push({ id: n.id, label });
    out.push(...buildLocationPaths(n.children, label));
  }
  return out;
}

// --- component ---

export default function SubsectionBuilder({
  nodes,
  onChange,
}: {
  nodes: SubsectionNode[];
  onChange: (nodes: SubsectionNode[]) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  const flat = flatten(nodes);

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
    const descendantIds = collectDescendantIds(draggedNode);
    return !descendantIds.has(targetId);
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
    const updated = insertAsChild(without, targetId, removedNode);
    onChange(updated);
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
    onChange([...without, removedNode]);
    handleDragEnd();
  }

  function addRootSubsection() {
    onChange([...nodes, emptySubsectionNode()]);
  }

  function removeSubsection(id: string) {
    onChange(removeNode(nodes, id));
  }

  function updateTitle(id: string, title: string) {
    onChange(updateNode(nodes, id, (n) => ({ ...n, title })));
  }

  return (
    <div>
      {flat.length > 0 && (
        <p className="text-xs text-muted mb-3">
          Drag a subsection onto another to nest it inside. Drag it down to the
          bottom zone to make it top-level again.
        </p>
      )}

      <div className="space-y-2">
        {flat.map(({ node, depth }) => {
          const isDragging = draggedId === node.id;
          const isDragOver = dragOverId === node.id && canDropOnto(node.id);

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
                onChange={(e) => updateTitle(node.id, e.target.value)}
                placeholder="Subsection name"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeSubsection(node.id)}
                className="text-xs text-muted hover:text-margin transition-colors focus-ring"
                aria-label="Remove subsection"
              >
                ✕
              </button>
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
          Drop here to make top-level
        </div>
      )}

      <button
        type="button"
        onClick={addRootSubsection}
        className="text-sm text-rule hover:text-ink transition-colors focus-ring mt-3"
      >
        + Add subsection
      </button>
    </div>
  );
}