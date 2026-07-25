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
          <span aria-hidden="true">📁</span>
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