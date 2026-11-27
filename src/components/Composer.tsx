"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Clapperboard, GalleryHorizontalEnd, ImagePlus, Images, Music2, Search, Send, Upload, X } from "lucide-react";
import type { GroupDTO, MediaDTO, Track } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/types";
import { CAROUSEL_MAX, musicApplies, supports, type Format } from "@/lib/rules";
import { api, Avatar, Button, PageHeader, Toggle, toLocalInput, useToast } from "./ui";
import { PhonePreview } from "./PhonePreview";
import { ACCEPT, uploadFile } from "./upload";

type Uploading = { key: string; name: string; pct: number };

export function Composer({ groups, library, defaultTime }: { groups: GroupDTO[]; library: MediaDTO[]; defaultTime: string }) {
  const router = useRouter();
  const toast = useToast();
  const [groupId, setGroupId] = useState(groups.find((g) => g.accounts.length)?.id ?? "");
  const [format, setFormat] = useState<Format | null>(null);
  const [media, setMedia] = useState<MediaDTO[]>([]);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [music, setMusic] = useState<Track | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 864e5);
    const [h, m] = defaultTime.split(":").map(Number);
    d.setHours(h || 18, m || 0, 0, 0);
    return toLocalInput(d);
  });
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const fileInput = useRef<HTMLInputElement>(null);

  const group = groups.find((g) => g.id === groupId);
  const mimes = media.map((m) => m.mime);
  const previewAccount = group?.accounts.find((a) => a.platform === "instagram") ?? group?.accounts[0] ?? null;
  const igAccount = group?.accounts.find((a) => a.platform === "instagram" && a.provider === "postiz");
  const hasYouTube = group?.accounts.some((a) => a.platform === "youtube");
  const showMusic = format === "carousel" && !!igAccount;
  const maxItems = format === "reel" ? 1 : CAROUSEL_MAX;

  const targetFits = useMemo(
    () => (group?.accounts ?? []).map((a) => ({ account: a, fit: format && media.length ? supports(a.platform, format, mimes) : null })),
    [group, format, media.length, mimes.join()], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const liveTargets = targetFits.filter((t) => !excluded.has(t.account.id) && (t.fit?.ok ?? true) && t.account.status === "connected");

  // Switching format trims media that no longer fits.
  useEffect(() => {
    if (format === "reel" && (media.length > 1 || (media[0] && !media[0].mime.startsWith("video/")))) {
      const firstVideo = media.find((m) => m.mime.startsWith("video/"));
      setMedia(firstVideo ? [firstVideo] : []);
      toast("A reel holds one video, so extra items were removed");
    }
    if (format !== "carousel") setMusic(null);
  }, [format]); // eslint-disable-line react-hooks/exhaustive-deps

  function addMedia(items: MediaDTO[]) {
    setMedia((cur) => {
      let next = [...cur, ...items.filter((i) => !cur.some((c) => c.id === i.id))];
      if (format === "reel") next = next.filter((m) => m.mime.startsWith("video/")).slice(-1);
      if (next.length > maxItems) toast(`A carousel takes up to ${CAROUSEL_MAX} items`, "error");
      return next.slice(0, maxItems);
    });
  }

  async function onFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (format === "reel" && list.some((f) => !f.type.startsWith("video/"))) toast("Reels need a video file", "error");
    for (const file of list) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploading((u) => [...u, { key, name: file.name, pct: 0 }]);
      try {
        const m = await uploadFile(file, (pct) => setUploading((u) => u.map((x) => (x.key === key ? { ...x, pct } : x))));
        addMedia([m]);
      } catch (e) {
        toast(`${file.name}: ${(e as Error).message}`, "error");
      } finally {
        setUploading((u) => u.filter((x) => x.key !== key));
      }
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setMedia((m) => arrayMove(m, m.findIndex((x) => x.id === e.active.id), m.findIndex((x) => x.id === e.over!.id)));
  }

  const problem =
    !group ? "Pick a group" :
    !format ? "Choose Reel or Carousel" :
    !media.length ? "Add media" :
    uploading.length ? "Wait for uploads to finish" :
    format === "carousel" && media.length < 2 ? "A carousel needs at least 2 items" :
    !liveTargets.length ? "No channel in this group can take this post" : null;

  async function submit(mode: "schedule" | "now" | "draft") {
    if (problem) return toast(problem, "error");
    if (mode === "schedule" && new Date(when).getTime() < Date.now()) return toast("Pick a time in the future", "error");
    setBusy(mode);
    try {
      await api("/api/posts", {
        method: "POST",
        json: {
          groupId, format, caption, title, music: showMusic ? music : null,
          mediaIds: media.map((m) => m.id),
          scheduledAt: mode === "now" ? null : new Date(when).toISOString(),
          mode,
          excludedAccountIds: [...excluded],
        },
      });
      toast(mode === "now" ? `Publishing to ${liveTargets.length} channels` : mode === "draft" ? "Saved as draft" : `Scheduled on ${liveTargets.length} channels`);
      router.push("/queue");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  if (!groups.length) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-10 md:py-12">
        <PageHeader title="Create" />
        <div className="rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
          <p className="font-display text-[28px] italic">Start with a group</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-muted">Groups bundle a brand&rsquo;s Instagram, YouTube, Facebook and TikTok so one post reaches all of them.</p>
          <Button variant="primary" className="mt-6" onClick={() => router.push("/setup")}>Set up groups</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-10 md:py-12">
      <PageHeader title="Create" sub="One post, every channel in the group." />

      <div className="mb-6 grid grid-cols-2 rounded-xl bg-elev p-1 lg:hidden" role="tablist">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={mobileTab === t}
            onClick={() => setMobileTab(t)}
            className={`rounded-lg py-2 text-[13px] font-semibold capitalize transition-colors ${mobileTab === t ? "bg-elev2 text-ink" : "text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-16">
        <div className={`space-y-10 ${mobileTab === "preview" ? "hidden lg:block" : ""}`}>
          {/* Group */}
          <Section title="Send to">
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
              {groups.map((g) => {
                const on = g.id === groupId;
                return (
                  <button
                    key={g.id}
                    onClick={() => { setGroupId(g.id); setExcluded(new Set()); }}
                    disabled={!g.accounts.length}
                    className={`flex shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 pr-4 transition-[border-color,background] duration-200 disabled:opacity-40 ${
                      on ? "border-ink bg-elev" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span className="flex">
                      {g.accounts.slice(0, 4).map((a, i) => (
                        <span key={a.id} className={i ? "-ml-2.5" : ""} style={{ zIndex: 4 - i }}>
                          <Avatar account={a} size={30} badge={false} />
                        </span>
                      ))}
                    </span>
                    <span className="font-display text-[18px] italic">{g.name}</span>
                    {on && <Check className="size-4 text-accent" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Format: asked before anything else about the post */}
          <Section title="What are you posting?">
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "reel", icon: Clapperboard, label: "Reel", hint: "One vertical video" },
                { id: "carousel", icon: GalleryHorizontalEnd, label: "Carousel", hint: `2–${CAROUSEL_MAX} photos or videos` },
              ] as const).map(({ id, icon: Icon, label, hint }) => {
                const on = format === id;
                return (
                  <button
                    key={id}
                    onClick={() => setFormat(id)}
                    aria-pressed={on}
                    className={`relative flex flex-col items-start gap-6 overflow-hidden rounded-2xl border p-5 text-left transition-[border-color,background] duration-300 ${
                      on ? "border-ink bg-elev" : "border-line hover:border-line-strong hover:bg-surface"
                    }`}
                  >
                    <Icon className="size-7" strokeWidth={1.6} />
                    <span>
                      <span className="block font-display text-[26px] leading-none">{label}</span>
                      <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>
                    </span>
                    {on && (
                      <motion.span layoutId="format-check" className="absolute top-4 right-4 flex size-6 items-center justify-center rounded-full bg-accent">
                        <Check className="size-3.5" strokeWidth={3} />
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className={`space-y-10 transition-opacity duration-500 ${format ? "" : "pointer-events-none opacity-30"}`} aria-disabled={!format}>
            {/* Media */}
            <Section title={format === "reel" ? "Video" : "Media"} aside={format === "carousel" ? `${media.length}/${CAROUSEL_MAX}` : undefined}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (format) onFiles(e.dataTransfer.files); }}
                className="rounded-2xl border border-dashed border-line-strong p-4"
              >
                {media.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={media.map((m) => m.id)} strategy={horizontalListSortingStrategy}>
                      <div className="mb-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                        {media.map((m, i) => (
                          <Thumb key={m.id} m={m} index={i} showIndex={format === "carousel"} onRemove={() => setMedia((x) => x.filter((y) => y.id !== m.id))} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                {uploading.map((u) => (
                  <div key={u.key} className="mb-3 rounded-xl bg-elev px-3 py-2.5 text-[12.5px]">
                    <div className="flex justify-between"><span className="truncate">{u.name}</span><span className="tabular text-muted">{u.pct}%</span></div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-elev2">
                      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${u.pct}%` }} />
                    </div>
                  </div>
                ))}
                {media.length < maxItems && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-center">
                    <ImagePlus className="hidden size-6 text-faint sm:block" strokeWidth={1.5} />
                    <span className="text-[13px] text-muted">Drop files here or</span>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => fileInput.current?.click()}><Upload className="size-3.5" /> Upload</Button>
                      <Button size="sm" onClick={() => setPicker(true)}><Images className="size-3.5" /> From gallery</Button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  hidden
                  multiple={format === "carousel"}
                  accept={format === "reel" ? "video/mp4,video/quicktime,video/webm" : ACCEPT}
                  onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }}
                />
              </div>
              {format === "carousel" && media.length > 1 && <p className="mt-2 text-[12px] text-faint">Drag to reorder slides.</p>}
            </Section>

            {/* Caption */}
            <Section title="Caption" aside={<span className={`tabular ${caption.length > 2200 ? "text-danger" : ""}`}>{caption.length}/2200</span>}>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                placeholder="Write a caption… #hashtags work on every platform"
                className="field resize-y leading-relaxed"
              />
              {hasYouTube && format === "reel" && (
                <label className="mt-4 block">
                  <span className="mb-2 flex justify-between text-[13px] text-muted">
                    YouTube title <span className="tabular">{title.length}/100</span>
                  </span>
                  <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} placeholder="Defaults to the first line of the caption" className="field" />
                </label>
              )}
            </Section>

            {/* Music: Instagram carousels only */}
            <AnimatePresence initial={false}>
              {showMusic && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <Section title="Music" aside="Instagram only">
                    <MusicPicker accountId={igAccount!.id} value={music} onChange={setMusic} />
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Channels */}
            <Section title="Channels" aside={`${liveTargets.length} of ${targetFits.length} on`}>
              <div className="overflow-hidden rounded-2xl border border-line">
                {targetFits.map(({ account: a, fit }) => {
                  const off = a.status !== "connected";
                  const blocked = fit && !fit.ok;
                  return (
                    <div key={a.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                      <Avatar account={a} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{a.name}</div>
                        <div className={`truncate text-[12px] ${blocked || off ? "text-warn" : "text-muted"}`}>
                          {off ? "Reconnect needed, will be skipped" : blocked ? fit.reason : PLATFORM_LABEL[a.platform]}
                          {!off && !blocked && musicApplies(a.platform, format ?? "reel") && music ? " · with music" : ""}
                        </div>
                      </div>
                      <Toggle
                        label={`Post to ${a.name}`}
                        checked={!excluded.has(a.id) && !blocked && !off}
                        disabled={!!blocked || off}
                        onChange={(v) => setExcluded((s) => { const n = new Set(s); if (v) n.delete(a.id); else n.add(a.id); return n; })}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* When */}
            <Section title="When">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="field tabular sm:max-w-[260px]" aria-label="Publish date and time" />
                <div className="flex flex-1 flex-wrap gap-2">
                  <Button variant="primary" onClick={() => submit("schedule")} loading={busy === "schedule"} disabled={!!busy} className="flex-1 sm:flex-none">
                    Schedule
                  </Button>
                  <Button onClick={() => submit("now")} loading={busy === "now"} disabled={!!busy}>
                    <Send className="size-4" /> Post now
                  </Button>
                  <Button variant="ghost" onClick={() => submit("draft")} loading={busy === "draft"} disabled={!!busy}>
                    Save draft
                  </Button>
                </div>
              </div>
              {problem && <p className="mt-3 text-[12.5px] text-faint">{problem}.</p>}
            </Section>
          </div>
        </div>

        <aside className={`${mobileTab === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-10">
            <PhonePreview format={format ?? "reel"} media={media} account={previewAccount} caption={caption} music={showMusic ? music : null} />
            <p className="mt-4 text-center text-[12px] text-faint">Instagram preview{previewAccount ? ` · ${previewAccount.name}` : ""}</p>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {picker && (
          <GalleryPicker
            library={library}
            selected={media.map((m) => m.id)}
            filter={format === "reel" ? "video" : null}
            onClose={() => setPicker(false)}
            onPick={(items) => { addMedia(items); setPicker(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold text-muted">{title}</h2>
        {aside && <span className="text-[12px] text-faint">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Thumb({ m, index, showIndex, onRemove }: { m: MediaDTO; index: number; showIndex: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`relative h-[124px] w-[96px] shrink-0 cursor-grab touch-none overflow-hidden rounded-xl bg-elev active:cursor-grabbing ${isDragging ? "scale-105 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.9)]" : ""}`}
      {...attributes}
      {...listeners}
    >
      {m.mime.startsWith("video/") ? (
        <video src={`${m.url}#t=0.1`} className="size-full object-cover" muted preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.url} alt="" className="size-full object-cover" draggable={false} />
      )}
      {showIndex && <span className="tabular absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 text-[11px] font-semibold">{index + 1}</span>}
      {m.mime.startsWith("video/") && <Clapperboard className="absolute bottom-1.5 left-1.5 size-3.5 drop-shadow" />}
      <button
        aria-label="Remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/75 hover:bg-black"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function MusicPicker({ accountId, value, onChange }: { accountId: string; value: Track | null; onChange: (t: Track | null) => void }) {
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api<{ tracks: Track[] }>(`/api/music?accountId=${accountId}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        setTracks(r.tracks);
      } catch (e) {
        if (!ctrl.signal.aborted) setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, accountId]);

  return (
    <div className="rounded-2xl border border-line p-3">
      {value && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-elev px-3 py-2.5">
          <TrackArt t={value} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{value.title}</div>
            <div className="truncate text-[12px] text-muted">{value.artist}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search songs, or browse trending" className="field pl-10" aria-label="Search music" />
      </div>
      <div className="mt-2 max-h-[260px] overflow-y-auto">
        {loading && !tracks && <p className="px-2 py-4 text-[13px] text-muted">Loading music…</p>}
        {error && <p className="px-2 py-4 text-[13px] text-warn">Music unavailable: {error}</p>}
        {tracks?.length === 0 && !error && <p className="px-2 py-4 text-[13px] text-muted">No songs match “{q}”.</p>}
        {tracks?.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t)}
            className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-elev ${value?.id === t.id ? "bg-elev" : ""}`}
          >
            <TrackArt t={t} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t.title}</span>
              <span className="block truncate text-[12px] text-muted">{t.artist}</span>
            </span>
            {value?.id === t.id && <Check className="size-4 text-accent" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrackArt({ t }: { t: Track }) {
  return t.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elev2"><Music2 className="size-4 text-muted" /></span>
  );
}

function GalleryPicker({ library, selected, filter, onClose, onPick }: {
  library: MediaDTO[]; selected: string[]; filter: "video" | null; onClose: () => void; onPick: (m: MediaDTO[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const items = library.filter((m) => !selected.includes(m.id) && (!filter || m.mime.startsWith("video/")));
  const single = filter === "video";
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label="Choose from gallery"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[28px] border border-line bg-surface md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[760px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <span className="font-display text-[24px] italic">Gallery</span>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-elev"><X className="size-5" /></button>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-1.5 overflow-y-auto p-4 sm:grid-cols-4">
          {items.length === 0 && <p className="col-span-full py-12 text-center text-muted">Nothing here yet. Upload from the Create page or the Gallery.</p>}
          {items.map((m) => {
            const on = chosen.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => setChosen((c) => (single ? [m.id] : on ? c.filter((x) => x !== m.id) : [...c, m.id]))}
                className={`relative aspect-square overflow-hidden rounded-lg bg-elev ring-2 transition ${on ? "ring-accent" : "ring-transparent"}`}
              >
                {m.mime.startsWith("video/") ? (
                  <video src={`${m.url}#t=0.1`} className="size-full object-cover" muted preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="size-full object-cover" loading="lazy" />
                )}
                {on && (
                  <span className="tabular absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-accent text-[12px] font-bold">
                    {single ? <Check className="size-3.5" /> : chosen.indexOf(m.id) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!chosen.length} onClick={() => onPick(chosen.map((id) => library.find((m) => m.id === id)!))}>
            Add {chosen.length || ""}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
