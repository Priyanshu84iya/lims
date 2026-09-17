"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCEPT = "image/png";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function LabSignatureUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError("");
    if (file.type !== "image/png") {
      setError("Only PNG images are allowed for signature.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Signature must be smaller than 5 MB.");
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/labs/signature", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to upload signature.");
      onChange(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload signature.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Lab signature preview"
            className="h-16 w-32 rounded-lg border border-slate-200 bg-white object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Replace
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => onChange("")}>
              <Trash2 size={14} /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Upload signature
        </Button>
      )}

      {isUploading && <p className="mt-2 text-xs text-slate-500">Uploading signature...</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">PNG only. Max 5 MB.</p>
    </div>
  );
}
