const base = () => (process.env.POSTFORME_API_URL || "https://api.postforme.dev/v1").replace(/\/$/, "");

async function call<T>(p: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(base() + p, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.POSTFORME_API_KEY}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Postforme ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

// Never forward this whole object to the browser: it contains OAuth tokens.
export type PfmAccount = { id: string; platform: string; username: string | null; profile_photo_url: string | null; status: string };

export const postforme = {
  accounts: () => call<{ data: PfmAccount[] }>("/social-accounts?limit=100"),
  authUrl: (platform: string) =>
    call<{ url: string }>("/social-accounts/auth-url", { method: "POST", body: JSON.stringify({ platform }) }),
  createPost: (body: unknown) => call<{ id: string }>("/social-posts", { method: "POST", body: JSON.stringify(body) }),
  updatePost: (id: string, body: unknown) =>
    call<{ id: string }>(`/social-posts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePost: (id: string) => call(`/social-posts/${id}`, { method: "DELETE" }),
  getPost: (id: string) => call<{ id: string; status: string }>(`/social-posts/${id}`),
  results: (postId: string) =>
    call<{ data: { success: boolean; error: unknown; platform_data?: { url?: string } }[] }>(
      `/social-post-results?post_id=${encodeURIComponent(postId)}`,
    ),
};
