"use client";

import { useState } from "react";

export default function ResizableImage({
  src,
  alt,
  width,
  editable,
  onResize,
  className = "max-h-32",
}: {
  src: string;
  alt?: string;
  width?: number | null;
  editable?: boolean;
  onResize?: (width: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt ?? ""}
        onDoubleClick={() => setOpen(true)}
        className={`${className} rounded-sm border border-border cursor-zoom-in`}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6 cursor-zoom-out"
        >
          <img src={src} alt={alt ?? ""} className="max-w-full max-h-full rounded-sm" />
        </div>
      )}
    </>
  );
}