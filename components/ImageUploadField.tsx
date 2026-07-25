"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

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
    e.target.value = "";
  }

  return (
    <div className="mt-2">
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="max-h-32 rounded-sm border border-border"
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
        <label className="inline-block text-xs text-rule hover:text-ink transition-colors focus-ring cursor-pointer">
          {uploading ? "Uploading..." : `+ Add ${label.toLowerCase()} image`}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-xs text-margin mt-1">{error}</p>}
    </div>
  );
}