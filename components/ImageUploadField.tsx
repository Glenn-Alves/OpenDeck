"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { extractImageFromClipboard } from "@/lib/clipboardImage";
import { compressImage } from "@/lib/compressImage";
import ResizableImage from "@/components/ResizableImage";

export default function ImageUploadField({
  label,
  value,
  width,
  onChange,
  onWidthChange,
}: {
  label: string;
  value: string | null;
  width?: number | null;
  onChange: (url: string | null) => void;
  onWidthChange?: (width: number) => void;
}) {
  const supabase = createClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(rawFile: File) {
    setUploading(true);
    setError(null);

    const file = await compressImage(rawFile);

    if (file.size > 5 * 1024 * 1024) {
      setUploading(false);
      setError("Image must be under 5MB, even after compression.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setUploading(false);
      setError("You need to be logged in.");
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("card-images")
      .upload(path, file);

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("card-images").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const file = extractImageFromClipboard(e);
    e.preventDefault(); // keep the textarea empty either way
    if (!file) {
      setError("No image found on clipboard.");
      return;
    }
    await uploadFile(file);
  }

  return (
    <div className="mt-2">
      {value ? (
        <div className="relative inline-block">
          <ResizableImage
            src={value}
            width={width ?? null}
            editable={!!onWidthChange}
            onResize={onWidthChange}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 bg-margin text-paper rounded-full w-5 h-5 text-xs flex items-center justify-center focus-ring"
            aria-label="Remove image"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => textareaRef.current?.focus()}
          className="relative inline-flex flex-col items-start gap-1 border border-dashed border-border rounded-sm px-3 py-2 focus-within:border-rule cursor-text"
        >
          <textarea
            ref={textareaRef}
            value=""
            onChange={() => {}}
            onPaste={handlePaste}
            rows={1}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 opacity-0 resize-none cursor-text"
          />
          <label
            onClick={(e) => e.stopPropagation()}
            className="relative text-xs text-rule hover:text-ink transition-colors cursor-pointer"
          >
            {uploading ? "Uploading..." : `+ Add ${label.toLowerCase()} image`}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <span className="relative text-[10px] text-muted">
            or click here and paste (Ctrl+V)
          </span>
        </div>
      )}
      {error && <p className="text-xs text-margin mt-1">{error}</p>}
    </div>
  );
}