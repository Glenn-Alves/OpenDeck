"use client";

import Link from "next/link";
import RatingStars from "./RatingStars";
import { estimateStudyTime } from "@/lib/estimateStudyTime";

export type DeckSummary = {
  id: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  cardCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  exportCount: number;
  saveCount: number;
  updatedAt: string;
};

export default function DeckCard({ deck }: { deck: DeckSummary }) {
  return (
    <div className="relative group focus-within:ring-0">
      <Link
        href={`/deck/${deck.id}`}
        className="absolute inset-0 z-0 rounded-sm focus-ring"
        aria-label={deck.title}
      />

<div className="ruled margin-rule bg-card border border-border rounded-sm p-5 pl-11 h-full transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[3px_4px_0_0_rgba(30,42,68,0.15)] relative pointer-events-none">        <p className="font-display text-xs text-muted uppercase tracking-wide mb-2">
          {deck.cardCount} cards · by{" "}
         <Link
            href={`/?author=${encodeURIComponent(deck.author)}`}
            className="relative z-10 hover:text-ink transition-colors focus-ring pointer-events-auto"
          >
            {deck.author}
          </Link>
        </p>
        <h3 className="font-display font-bold text-ink text-base leading-snug mb-2">
          {deck.title}
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
          {deck.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {deck.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-rule border border-rule/40 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted font-mono mb-3">
          <span
            className={`px-2 py-0.5 rounded-full border ${
              deck.difficulty === "Easy"
                ? "border-green-600 text-green-700"
                : deck.difficulty === "Hard"
                ? "border-margin text-margin"
                : "border-rule text-rule"
            }`}
          >
            {deck.difficulty}
          </span>
          <span>{estimateStudyTime(deck.cardCount)}</span>
          <span>⬇ {deck.exportCount}</span>
          <span>★ {deck.saveCount}</span>
        </div>

        <RatingStars rating={deck.rating} count={deck.ratingCount} />

        <p className="text-[11px] text-muted font-mono mt-2">
          Updated {new Date(deck.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}