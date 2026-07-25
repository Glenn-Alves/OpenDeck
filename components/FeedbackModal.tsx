"use client";

import { useState } from "react";

type Category = "improve" | "broken";

const CATEGORY_META: Record<Category, { label: string; description: string; subject: string }> = {
  improve: {
    label: "Help us improve OpenDeck",
    description: "Suggest a feature or share an idea.",
    subject: "OpenDeck feedback: Suggestion",
  },
  broken: {
    label: "Something went wrong",
    description: "Let us know about a broken feature.",
    subject: "OpenDeck feedback: Bug report",
  },
};

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");

  function handleSend() {
    if (!category) return;
    const meta = CATEGORY_META[category];
    const body = encodeURIComponent(message);
    const subject = encodeURIComponent(meta.subject);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=earlpubudemy@gmail.com&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
    onClose();
  }
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-ink text-lg">
            {category ? CATEGORY_META[category].label : "Give feedback"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-margin transition-colors focus-ring text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {!category ? (
          <div className="space-y-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((key) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-sm border border-border hover:border-rule transition-colors focus-ring"
              >
                <span className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center shrink-0 text-sm">
                  {key === "improve" ? "★" : "!"}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">
                    {CATEGORY_META[key].label}
                  </span>
                  <span className="block text-xs text-muted mt-0.5">
                    {CATEGORY_META[key].description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more..."
              rows={5}
              className="w-full bg-paper border-2 border-border rounded-sm px-4 py-3 text-sm text-ink placeholder:text-muted focus-ring mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={() => setCategory(null)}
                className="text-sm text-muted hover:text-ink transition-colors focus-ring"
              >
                ← Back
              </button>
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}