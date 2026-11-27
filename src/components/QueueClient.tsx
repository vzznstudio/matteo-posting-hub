"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";
import type { GroupDTO, PostDTO } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/types";
import { reassignSlots } from "@/lib/rules";
import { api, Avatar, Button, formatWhen, PageHeader, STATUS_STYLE, Toggle, toLocalInput, useEscape, useToast } from "./ui";
import { PhonePreview } from "./PhonePreview";

export function QueueClient({ posts: initial, groups }: { posts: PostDTO[]; groups: GroupDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [posts, setPosts] = useState(initial);
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => setPosts(initial), [initial]);

  async function sync(silent = false) {
    setSyncing(true);
    try {
      const r = await api<{ updated: number }>("/api/sync", { method: "POST" });
      if (r.updated) router.refresh();
      if (!silent) toast(r.updated ? `${r.updated} posts updated` : "Everything is up to date");
    } catch (e) {
      if (!silent) toast((e as Error).message, "error");
    } finally {
      setSyncing(false);
    }
  }
  useEffect(() => { sync(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = posts.filter((p) => filter === "all" || p.groupId === filter);
  const isDone = (p: PostDTO) => p.status === "published" || p.status === "failed" || (p.status === "partial" && !!p.scheduledAt && new Date(p.scheduledAt) < new Date());
  const upcoming = visible.filter((p) => !isDone(p));
  const history = visible.filter(isDone).reverse();
  const open = posts.find((p) => p.id === openId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = upcoming.findIndex((p) => p.id === e.active.id);
    const to = upcoming.findIndex((p) => p.id === e.over!.id);
    const reordered = arrayMove(upcoming, from, to);
    const timed = reordered.filter((p) => p.scheduledAt);
    const slots = new Map(reassignSlots(timed.map((p) => ({ id: p.id, at: new Date(p.scheduledAt!).getTime() }))).map((s) => [s.id, s.at]));
    setPosts((all) => all.map((p) => (slots.has(p.id) ? { ...p, scheduledAt: new Date(slots.get(p.id)!).toISOString() } : p)));
    try {
      const r = await api<{ errors: string[] }>("/api/posts/reorder", { method: "POST", json: { ids: timed.map((p) => p.id) } });
      toast(r.errors.length ? `Reordered, but: ${r.errors[0]}` : "Queue reordered on every platform", r.errors.length ? "error" : "ok");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
      setPosts(initial);
    }
  }

  async function toggle(p: PostDTO, enabled: boolean) {
    setPosts((all) => all.map((x) => (x.id === p.id ? { ...x, enabled } : x)));
    try {
      await api(`/api/posts/${p.id}`, { method: "PATCH", json: { enabled } });
      toast(enabled ? "Back on the schedule everywhere" : "Paused and pulled from every platform");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
      setPosts((all) => all.map((x) => (x.id === p.id ? { ...x, enabled: !enabled } : x)));
    }
  }

  // Upcoming list sorted by time; undated drafts last.
  const sortedUpcoming = useMemo(
    () => [...upcoming].sort((a, b) => (a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity)),
    [upcoming],
  );

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title="Queue"
        sub="Drag to swap time slots. Switch a post off to pull it from every platform without deleting it."
        actions={
          <>
            <Button size="sm" onClick={() => sync()} loading={syncing}>{!syncing && <RefreshCw className="size-3.5" />} Check status</Button>
            <Button size="sm" variant="primary" onClick={() => router.push("/")}><Plus className="size-3.5" /> New post</Button>
          </>
        }
      />

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        {[{ id: "all", name: "All groups" }, ...groups].map((g) => (
          <button
            key={g.id}
            onClick={() => setFilter(g.id)}
            className={`relative shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${filter === g.id ? "text-bg" : "text-muted hover:text-ink"}`}
          >
            {filter === g.id && <motion.span layoutId="queue-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative">{g.name}</span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-[13px] font-semibold text-muted">Up next <span className="tabular text-faint">· {sortedUpcoming.length}</span></h2>
      {sortedUpcoming.length === 0 ? (
        <div className="rounded-[24px] border border-line px-6 py-14 text-center">
          <p className="font-display text-[26px] italic">Nothing queued</p>
          <p className="mt-1 text-muted">Scheduled posts line up here.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sortedUpcoming.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {sortedUpcoming.map((p) => (
                <Row key={p.id} post={p} draggable={!!p.scheduledAt} onOpen={() => setOpenId(p.id)} onToggle={(v) => toggle(p, v)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {history.length > 0 && (
        <>
          <h2 className="mt-14 mb-3 text-[13px] font-semibold text-muted">History <span className="tabular text-faint">· {history.length}</span></h2>
          <ul className="space-y-2">
            {history.map((p) => (
              <Row key={p.id} post={p} draggable={false} onOpen={() => setOpenId(p.id)} />
            ))}
          </ul>
        </>
      )}

      <AnimatePresence>{open && <Detail key={open.id} post={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </div>
  );
}

function Row({ post: p, draggable, onOpen, onToggle }: { post: PostDTO; draggable: boolean; onOpen: () => void; onToggle?: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !draggable });
  const cover = p.media[0];
  const st = STATUS_STYLE[p.enabled ? p.status : "draft"] ?? STATUS_STYLE.draft;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-3 rounded-2xl border bg-surface p-2.5 pr-4 transition-[border-color,box-shadow,opacity] md:gap-4 ${
        isDragging ? "relative z-10 border-line-strong shadow-[0_24px_48px_-12px_rgba(0,0,0,0.9)]" : "border-line hover:border-line-strong"
      } ${!p.enabled && onToggle ? "opacity-55" : ""}`}
    >
      {onToggle && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          disabled={!draggable}
          className="cursor-grab touch-none rounded-lg p-1 text-faint hover:text-ink active:cursor-grabbing disabled:invisible"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left md:gap-4">
        <span className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-lg bg-elev">
          {cover && (cover.mime.startsWith("video/") ? (
            <video src={`${cover.url}#t=0.1`} className="size-full object-cover" muted preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt="" className="size-full object-cover" loading="lazy" />
          ))}
          {p.format === "carousel" && <span className="tabular absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px]">{p.media.length}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{p.caption.split("\n")[0] || "No caption"}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">
            <span className="tabular">{formatWhen(p.scheduledAt)}</span>
            {" · "}{p.format === "reel" ? "Reel" : "Carousel"}
            {p.groupName ? ` · ${p.groupName}` : ""}
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="flex">
              {p.targets.filter((t) => t.status !== "skipped").map((t, i) => (
                <span key={t.accountId} className={`${i ? "-ml-1.5" : ""} ${t.enabled ? "" : "opacity-30"}`}>
                  <Avatar account={t.account} size={22} ring={false} badge={false} />
                </span>
              ))}
            </span>
            <span className={`flex items-center gap-1.5 text-[12px] ${st.text}`}>
              <span className={`size-1.5 rounded-full ${st.dot}`} /> {p.enabled || !onToggle ? st.label : "Paused"}
            </span>
          </span>
        </span>
      </button>
      {onToggle && <Toggle label={p.enabled ? "Pause post" : "Resume post"} checked={p.enabled} onChange={onToggle} />}
    </li>
  );
}

function Detail({ post, onClose }: { post: PostDTO; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [when, setWhen] = useState(post.scheduledAt ? toLocalInput(new Date(post.scheduledAt)) : "");
  const [busy, setBusy] = useState<string | null>(null);
  const editable = post.status !== "published";
  const preview = post.targets.find((t) => t.account.platform === "instagram")?.account ?? post.targets[0]?.account;
  useEscape(onClose);

  async function run(label: string, fn: () => Promise<unknown>, ok: string, close = false) {
    setBusy(label);
    try {
      await fn();
      toast(ok);
      router.refresh();
      if (close) onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog"
        aria-label="Post details"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] border border-line bg-surface md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[520px] md:rounded-none md:rounded-l-[28px]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <span className="font-display text-[24px] italic">{post.format === "reel" ? "Reel" : "Carousel"}{post.groupName ? ` · ${post.groupName}` : ""}</span>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-elev"><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <div className="max-w-[280px] mx-auto">
            <PhonePreview format={post.format} media={post.media} account={preview} caption={post.caption} music={post.music} />
          </div>

          {editable && (
            <div>
              <span className="mb-2 block text-[13px] text-muted">Publish time</span>
              <div className="flex gap-2">
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="field tabular" aria-label="Publish time" />
                <Button
                  variant="primary"
                  disabled={!when || busy !== null}
                  loading={busy === "time"}
                  onClick={() => run("time", () => api(`/api/posts/${post.id}`, { method: "PATCH", json: { scheduledAt: new Date(when).toISOString(), enabled: true } }), "Updated on every platform")}
                >
                  Update
                </Button>
              </div>
              <p className="mt-2 text-[12px] text-faint">Changing the time moves this post on every channel.</p>
            </div>
          )}

          <div>
            <span className="mb-2 block text-[13px] text-muted">Channels</span>
            <div className="overflow-hidden rounded-2xl border border-line">
              {post.targets.map((t) => {
                const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.pending;
                return (
                  <div key={t.accountId} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <Avatar account={t.account} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{t.account.name}</div>
                      <div className={`flex items-center gap-1.5 text-[12px] ${st.text}`}>
                        <span className={`size-1.5 rounded-full ${st.dot}`} /> {st.label} · <span className="text-muted">{PLATFORM_LABEL[t.account.platform]}</span>
                      </div>
                      {t.error && <p className="mt-1 text-[12px] break-words text-warn">{t.error}</p>}
                    </div>
                    {t.url && (
                      <a href={t.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:bg-elev hover:text-ink" aria-label="Open published post">
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    {editable && t.status !== "published" && t.status !== "skipped" && (
                      <Toggle
                        label={`Post to ${t.account.name}`}
                        checked={t.enabled}
                        disabled={busy !== null}
                        onChange={(v) => run("target", () => api(`/api/posts/${post.id}`, { method: "PATCH", json: { targets: [{ accountId: t.accountId, enabled: v }] } }), v ? `${t.account.name} back on` : `${t.account.name} removed from this post`)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {post.caption && (
            <div>
              <span className="mb-2 block text-[13px] text-muted">Caption</span>
              <p className="rounded-2xl bg-elev px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-line">{post.caption}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <Button
            variant="danger"
            disabled={busy !== null}
            loading={busy === "delete"}
            onClick={() => confirm("Delete this post from the hub and every platform it's scheduled on?") && run("delete", () => api(`/api/posts/${post.id}`, { method: "DELETE" }), "Post deleted", true)}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          {editable && (
            <Button
              disabled={busy !== null}
              loading={busy === "now"}
              onClick={() => confirm("Publish this post now on every channel?") && run("now", () => api(`/api/posts/${post.id}`, { method: "POST" }), "Publishing now")}
            >
              <Send className="size-4" /> Post now
            </Button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
