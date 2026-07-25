"use client";

import { useState } from "react";

export default function ExpandableField({
  label,
  value,
  onChange,
  placeholder,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Compact preview - click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`w-full text-left bg-card border-2 border-border rounded-sm px-4 focus-ring relative group ${
          compact ? "py-3 text-sm" : "py-3 min-h-[84px]"
        }`}
      >
        {value ? (
          <span className={`text-ink ${compact ? "block truncate pr-16" : "line-clamp-3"}`}>
            {value}
          </span>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <span className="absolute top-2 right-3 text-[11px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          ⤢ Expand
        </span>
      </button>

      {/* Modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-display text-xs text-ink uppercase tracking-wide">
                {label}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="text-muted hover:text-margin transition-colors focus-ring text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={10}
              className="w-full bg-paper border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring"
            />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}