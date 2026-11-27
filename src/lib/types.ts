// Client-safe shapes passed from server components to client components.
export type AccountDTO = {
  id: string;
  provider: string;
  platform: "instagram" | "facebook" | "youtube" | "tiktok" | string;
  name: string;
  handle: string | null;
  avatar: string | null;
  status: string;
};

export type GroupDTO = { id: string; name: string; accounts: AccountDTO[] };

export type MediaDTO = {
  id: string;
  url: string;
  mime: string;
  originalName: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
  trashedAt: string | null;
};

export type Track = { id: string; title: string; artist: string; image: string };

export type TargetDTO = {
  accountId: string;
  enabled: boolean;
  status: string;
  error: string | null;
  url: string | null;
  account: AccountDTO;
};

export type PostDTO = {
  id: string;
  groupId: string | null;
  groupName: string | null;
  format: "reel" | "carousel";
  caption: string;
  title: string;
  music: Track | null;
  scheduledAt: string | null;
  enabled: boolean;
  status: string;
  media: MediaDTO[];
  targets: TargetDTO[];
};

export const mediaUrl = (id: string, fileName: string) => {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  return `/media/${id}${ext}`;
};

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export const PLATFORM_ORDER = ["instagram", "youtube", "facebook", "tiktok"];
