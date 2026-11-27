"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clapperboard, RotateCcw, Trash2, Upload, X } from "lucide-react";
import type { MediaDTO } from "@/lib/types";
import { api, Button, formatBytes, PageHeader, useToast } from "./ui";
import { ACCEPT, uploadFile } from "./upload";

const DAY = 864e5;

export function GalleryClient({ library, bin, autoTrashDays, purgeDays }: { library: MediaDTO[]; bin: MediaDTO[]; autoTrashDays: number; purgeDays: number }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"library" | "bin">("library");
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewing, setViewing] = useState<MediaDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<{ key: string; name: string; pct: number }[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setSelected([]), [tab, kind]);

  const list = (tab === "library" ? library : bin).filter((m) => kind === "all" || m.mime.startsWith(kind));
  const totalSize = library.reduce((s, m) => s + m.size, 0);

  function daysLeft(m: MediaDTO) {
    if (tab === "bin") return Math.max(0, Math.ceil((new Date(m.trashedAt!).getTime() + purgeDays * DAY - Date.now()) / DAY));
    if (!autoTrashDays) return null;
    return Math.max(0, Math.ceil((new Date(m.createdAt).getTime() + autoTrashDays * DAY - Date.now()) / DAY));
  }

  async function bulk(action: "trash" | "restore" | "purge", ids = selected) {
    if (!ids.length) return;
    if (action === "purge" && !confirm(`Delete ${ids.length} file${ids.length > 1 ? "s" : ""} forever? This can't be undone.`)) return;
    setBusy(true);
    let failed = 0;
    for (const id of ids) {
      try {
        if (action === "purge") await api(`/api/media/${id}`, { method: "DELETE" });
        else await api(`/api/media/${id}`, { method: "PATCH", json: { action } });
      } catch (e) {
        failed++;
        if (failed === 1) toast((e as Error).message, "error");
      }
    }
    setBusy(false);
    setSelected([]);
    const done = ids.length - failed;
    if (done) toast(action === "trash" ? `${done} moved to the bin. You can restore them for ${purgeDays} days` : action === "restore" ? `${done} restored` : `${done} deleted forever`);
    router.refresh();
  }

  async function onFiles(files: FileList) {
    for (const file of Array.from(files)) {
      const key = `${file.name}-${Math.random()}`;
      setUploads((u) => [...u, { key, name: file.name, pct: 0 }]);
      try {
        await uploadFile(file, (pct) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, pct } : x))));
      } catch (e) {
        toast(`${file.name}: ${(e as Error).message}`, "error");
      } finally {
        setUploads((u) => u.filter((x) => x.key !== key));
      }
    }
    router.refresh();
  }

  return (
    <div
      className="mx-auto max-w-[1180px] px-4 py-8 md:px-10 md:py-12"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
    >
      <PageHeader
        title="Gallery"
        sub={
          <>
            <span className="tabular">{library.length}</span> files · <span className="tabular">{formatBytes(totalSize)}</span>.{" "}
            {autoTrashDays ? `Files move to the bin after ${autoTrashDays} days` : "Files never auto-expire"}; the bin empties after {purgeDays} days.
          </>
        }
        actions={
          <>
            <Button variant="primary" size="sm" onClick={() => input.current?.click()}><Upload className="size-3.5" /> Upload</Button>
            <input ref={input} type="file" hidden multiple accept={ACCEPT} onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-elev p-1">
          {(["library", "bin"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative rounded-lg px-4 py-1.5 text-[13px] font-semibold ${tab === t ? "text-ink" : "text-muted"}`}>
              {tab === t && <motion.span layoutId="gal-tab" className="absolute inset-0 rounded-lg bg-elev2" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <span className="relative">{t === "library" ? "Library" : "Recycle bin"} <span className="tabular text-faint">{t === "library" ? library.length : bin.length}</span></span>
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "image", "video"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${kind === k ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
              {k === "all" ? "All" : k === "image" ? "Photos" : "Videos"}
            </button>
          ))}
        </div>
      </div>

      {uploads.map((u) => (
        <div key={u.key} className="mb-2 rounded-xl bg-elev px-3 py-2.5 text-[12.5px]">
          <div className="flex justify-between"><span className="truncate">{u.name}</span><span className="tabular text-muted">{u.pct}%</span></div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-elev2"><div className="h-full bg-accent transition-[width]" style={{ width: `${u.pct}%` }} /></div>
        </div>
      ))}

      {list.length === 0 ? (
        <div className="rounded-[24px] border border-line px-6 py-16 text-center">
          <p className="font-display text-[26px] italic">{tab === "bin" ? "The bin is empty" : "No files yet"}</p>
          <p className="mt-1 text-muted">{tab === "bin" ? "Deleted files wait here before they're gone for good." : "Drop photos and videos anywhere on this page."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {list.map((m) => {
            const on = selected.includes(m.id);
            const left = daysLeft(m);
            return (
              <div key={m.id} className={`group relative aspect-[4/5] overflow-hidden rounded-lg bg-elev ring-2 transition ${on ? "ring-accent" : "ring-transparent"}`}>
                <button onClick={() => setViewing(m)} className="size-full" aria-label={`View ${m.originalName}`}>
                  {m.mime.startsWith("video/") ? (
                    <video src={`${m.url}#t=0.1`} className="size-full object-cover" muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  )}
                </button>
                <button
                  onClick={() => setSelected((s) => (on ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                  aria-label={on ? "Deselect" : "Select"}
                  className={`absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full border-2 transition ${on ? "border-accent bg-accent" : "border-white/80 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100"}`}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                {m.mime.startsWith("video/") && <Clapperboard className="pointer-events-none absolute top-2 right-2 size-4 drop-shadow" />}
                {left !== null && (left <= 7 || tab === "bin") && (
                  <span className={`tabular pointer-events-none absolute right-1.5 bottom-1.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${tab === "bin" ? "bg-danger/90" : "bg-black/70"}`}>
                    {tab === "bin" ? `Deletes in ${left}d` : `Bin in ${left}d`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selection bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-lg items-center gap-2 rounded-2xl border border-line bg-elev2 p-2 pl-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] md:bottom-8"
          >
            <span className="tabular flex-1 text-[13px] font-semibold">{selected.length} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            {tab === "library" ? (
              <Button size="sm" variant="danger" loading={busy} onClick={() => bulk("trash")}><Trash2 className="size-3.5" /> Move to bin</Button>
            ) : (
              <>
                <Button size="sm" loading={busy} onClick={() => bulk("restore")}><RotateCcw className="size-3.5" /> Restore</Button>
                <Button size="sm" variant="danger" loading={busy} onClick={() => bulk("purge")}>Delete forever</Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {viewing && (
          <motion.div className="fixed inset-0 z-50 flex flex-col bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{viewing.originalName}</div>
                <div className="tabular text-[12px] text-muted">
                  {formatBytes(viewing.size)}
                  {viewing.width ? ` · ${viewing.width}×${viewing.height}` : ""}
                  {viewing.duration ? ` · ${Math.round(viewing.duration)}s` : ""}
                  {" · "}{new Date(viewing.createdAt).toLocaleDateString()}
                </div>
              </div>
              {tab === "library" ? (
                <Button size="sm" variant="danger" onClick={() => { bulk("trash", [viewing.id]); setViewing(null); }}><Trash2 className="size-3.5" /> Move to bin</Button>
              ) : (
                <Button size="sm" onClick={() => { bulk("restore", [viewing.id]); setViewing(null); }}><RotateCcw className="size-3.5" /> Restore</Button>
              )}
              <button onClick={() => setViewing(null)} aria-label="Close" className="rounded-full p-2 hover:bg-elev"><X className="size-5" /></button>
            </div>
            <motion.div className="flex min-h-0 flex-1 items-center justify-center p-4" initial={{ scale: 0.96 }} animate={{ scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              {viewing.mime.startsWith("video/") ? (
                <video src={viewing.url} className="max-h-full max-w-full rounded-lg" controls autoPlay playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewing.url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
