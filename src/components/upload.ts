"use client";

import type { MediaDTO } from "@/lib/types";

async function measure(file: File): Promise<{ w?: number; h?: number; d?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { w: img.naturalWidth, h: img.naturalHeight };
    }
    return await new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
      v.onerror = () => resolve({});
      v.src = url;
    });
  } catch {
    return {};
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Stream one file to /api/media with progress. Resolves to the stored media. */
export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<MediaDTO> {
  const dims = await measure(file);
  const q = new URLSearchParams({ name: file.name, type: file.type });
  if (dims.w) q.set("w", String(dims.w));
  if (dims.h) q.set("h", String(dims.h));
  if (dims.d) q.set("d", String(dims.d));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/media?${q}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 300) return reject(new Error(data.error || "Upload failed"));
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
      resolve({
        id: data.id, url: `/media/${data.id}${ext}`, mime: data.mime, originalName: data.originalName, size: Number(data.size),
        width: data.width, height: data.height, duration: data.duration, createdAt: data.createdAt, trashedAt: null,
      });
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
