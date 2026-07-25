"use client";

import { useState } from "react";
import Link from "next/link";
import type { SubsectionNode } from "@/lib/getSubsectionTree";

function TreeNode({ node, depth }: { node: SubsectionNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 group"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted hover:text-ink transition-colors focus-ring w-4 text-xs shrink-0"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Link
          href={`/deck/${node.id}`}
          className="text-sm text-ink hover:text-rule transition-colors focus-ring flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {node.title}
        </Link>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubsectionTree({ nodes }: { nodes: SubsectionNode[] }) {
  if (nodes.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-sm px-3 py-2">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}