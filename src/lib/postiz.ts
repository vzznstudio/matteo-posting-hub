import { filePath } from "./storage";

const base = () => (process.env.POSTIZ_API_URL || "").replace(/\/$/, "");
const key = () => process.env.POSTIZ_API_KEY || "";

async function call<T>(p: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(base() + p, {
    ...init,
    headers: { Authorization: key(), ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Postiz ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export type PostizIntegration = {
  id: string; name: string; identifier: string; picture: string; disabled: boolean; profile: string;
};

export const postiz = {
  integrations: () => call<PostizIntegration[]>("/integrations"),

  async upload(fileName: string, originalName: string, mime: string) {
    const { openAsBlob } = await import("node:fs");
    const blob = await openAsBlob(filePath(fileName), { type: mime });
    const form = new FormData();
    form.append("file", blob, originalName);
    return call<{ id: string; path: string }>("/upload", { method: "POST", body: form });
  },

  createPost: (body: unknown) =>
    call<{ postId: string; integration: string }[]>("/posts", { method: "POST", body: JSON.stringify(body) }),

  deletePost: (id: string) => call(`/posts/${id}`, { method: "DELETE" }),

  listPosts: (startDate: Date, endDate: Date) =>
    call<{ posts: { id: string; state: string; releaseURL: string | null; error: string | null; integration: { id: string } }[] }>(
      `/posts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    ),

  audioSearch: (integrationId: string, q: string) =>
    call<{ output?: unknown; msg?: string }>(`/integration-trigger/${integrationId}`, {
      method: "POST",
      body: JSON.stringify({ methodName: "audioSearch", data: { q, type: "music" } }),
    }),
};
