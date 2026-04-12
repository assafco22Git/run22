"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";

interface ProfilePictureProps {
  currentImage?: string | null;
  name: string;
}

function Initials({ name, size }: { name: string; size: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xl select-none"
    >
      {initials}
    </div>
  );
}

export function ProfilePicture({ currentImage, name }: ProfilePictureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview ?? currentImage;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB");
      return;
    }

    // Show local preview immediately
    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setPreview(null);
      } else {
        setPreview(data.url); // use CDN URL
      }
    } catch {
      setError("Upload failed — please try again");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar */}
      <div className="relative shrink-0">
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
            unoptimized={displayUrl.startsWith("blob:")}
          />
        ) : (
          <Initials name={name} size={80} />
        )}

        {/* Upload overlay button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity disabled:opacity-60 cursor-pointer"
          aria-label="Change photo"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Text + trigger */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG or WebP · max 2 MB</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // allow re-selecting same file
        }}
      />
    </div>
  );
}
