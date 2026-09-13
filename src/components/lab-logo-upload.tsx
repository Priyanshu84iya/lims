"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPT = "image/jpeg,image/png,image/webp";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function LabLogoUpload({ value, onChange }: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/labs/logo", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to upload logo.");
      onChange(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload logo.");
    } finally {
      setIsUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Lab logo preview"
            className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => galleryInputRef.current?.click()}>
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Replace
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => onChange("")}>
              <Trash2 size={14} /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => cameraInputRef.current?.click()}>
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Take photo
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => galleryInputRef.current?.click()}>
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Choose from gallery
          </Button>
        </div>
      )}

      {isUploading && <p className="mt-2 text-xs text-slate-500">Uploading logo...</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">JPG, JPEG, PNG or WEBP. Max 5 MB.</p>
    </div>
  );
}
