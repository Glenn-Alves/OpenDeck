"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarCropModal from "./AvatarCropModal";

export default function AvatarUploadField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setRawImage(previewUrl);
    e.target.value = "";
  }

  async function handleCropped(blob: Blob) {
    setRawImage(null);
    setUploading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setUploading(false);
      setError("You need to be logged in.");
      return;
    }

    const path = `${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(`${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        {value ? (
          <img
            src={value}
            alt="Profile picture"
            className="w-16 h-16 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center text-xl font-display font-bold border border-border">
            ?
          </div>
        )}
        <label className="text-sm text-rule hover:text-ink transition-colors focus-ring cursor-pointer">
          {uploading ? "Uploading..." : "Change photo"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-xs text-margin mt-1">{error}</p>}

      {rawImage && (
        <AvatarCropModal
          imageSrc={rawImage}
          onCancel={() => setRawImage(null)}
          onCropped={handleCropped}
        />
      )}
    </div>
  );
}