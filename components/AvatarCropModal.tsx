"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/cropImage";

export default function AvatarCropModal({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setProcessing(true);
    const blob = await getCroppedImageBlob(imageSrc, croppedArea);
    setProcessing(false);
    onCropped(blob);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card border-2 border-border rounded-sm shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display font-bold text-ink text-lg mb-4">
          Adjust photo
        </p>

        <div className="relative w-full h-72 bg-ink rounded-sm overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full mt-4 accent-ink"
          aria-label="Zoom"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="text-sm text-muted hover:text-ink transition-colors focus-ring px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-margin transition-colors focus-ring disabled:opacity-50"
          >
            {processing ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}