// src/lib/media.ts
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const mediaUrl = (storagePath: string) => {
  // replaceAll yerine daha uyumlu:
  const normalized = storagePath.split("\\").join("/");
  return `${BASE}/media/${normalized}`;
};
