"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = (selectedFile: File) => {
    setError(null);
    setSuccess(null);

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP, AVIF).");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    if (!alt) {
      setAlt(selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", productId);
      formData.append("alt", alt);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess("Picture uploaded and attached!");
      setFile(null);
      setPreview(null);
      setAlt("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-accent bg-accent/10"
            : "border-line bg-surface-sunken hover:border-accent/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleChange}
          className="hidden"
        />

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-line bg-surface">
              <Image
                src={preview}
                alt="Upload preview"
                fill
                className="object-contain p-1"
              />
            </div>
            <p className="text-xs font-medium text-strong">{file?.name}</p>
            <p className="text-[0.7rem] text-muted">Click or drag another to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised border border-line text-strong">
              <svg
                className="h-5 w-5 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-strong">
                Drop picture here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted">
                JPEG, PNG, WebP or AVIF up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-strong">
              Alt description (for accessibility)
            </span>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. 500ml jar of Lemon Blast soap"
              className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-body focus:border-accent focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-paper transition-all hover:bg-forest/90 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & Save Picture"}
          </button>
        </div>
      )}

      {error && <p className="text-xs font-medium text-[var(--blocked)]">{error}</p>}
      {success && <p className="text-xs font-medium text-[var(--live)]">{success}</p>}
    </div>
  );
}
