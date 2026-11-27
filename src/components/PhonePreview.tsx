"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark, Camera, ChevronLeft, ChevronRight, Clapperboard, Heart, Home, ImageOff, MessageCircle,
  MoreHorizontal, Music2, PlusSquare, Search, Send,
} from "lucide-react";
import type { AccountDTO, MediaDTO, Track } from "@/lib/types";

type Props = {
  format: "reel" | "carousel";
  media: MediaDTO[];
  account?: AccountDTO | null;
  caption: string;
  music?: Track | null;
};

/** Instagram-style preview inside a phone at a real ~9:19.5 screen ratio. */
export function PhonePreview({ format, media, account, caption, music }: Props) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="relative rounded-[50px] bg-[#1b1b1b] p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),inset_0_0_0_1px_#2e2e2e]">
        <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[42px] bg-black">
          <StatusBar />
          {format === "reel" ? (
            <ReelScreen media={media[0]} account={account} caption={caption} music={music} />
          ) : (
            <FeedScreen media={media} account={account} caption={caption} music={music} />
          )}
          <BottomNav active={format === "reel" ? "reels" : "home"} />
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="relative z-20 flex h-[38px] shrink-0 items-center justify-between px-7 pt-1 text-[12px] font-semibold text-white">
      <span className="tabular">9:41</span>
      <span className="absolute top-[9px] left-1/2 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/5" />
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[1.5px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[2.5px] rounded-sm bg-white" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-white/60 p-[1.5px]">
          <span className="block h-full w-[75%] rounded-[1.5px] bg-white" />
        </span>
      </span>
    </div>
  );
}

function MediaView({ m, cover = true }: { m?: MediaDTO; cover?: boolean }) {
  if (!m) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-[#0e0e0e] text-[11px] text-faint">
        <ImageOff className="size-6" strokeWidth={1.5} />
        Your media shows here
      </div>
    );
  }
  const cls = `size-full ${cover ? "object-cover" : "object-contain"}`;
  return m.mime.startsWith("video/") ? (
    <video key={m.id} src={m.url} className={cls} autoPlay muted loop playsInline />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.url} alt="" className={cls} />
  );
}

function Handle({ account }: { account?: AccountDTO | null }) {
  return <>{account?.handle?.replace(/^@/, "") || account?.name || "your.account"}</>;
}

function MiniAvatar({ account, size = 28 }: { account?: AccountDTO | null; size?: number }) {
  return (
    <span className="block shrink-0 rounded-full p-[1.5px]" style={{ width: size, height: size, background: "var(--ring-ig)" }}>
      <span className="block size-full overflow-hidden rounded-full border-[1.5px] border-black bg-[#222]">
        {account?.avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.avatar} alt="" className="size-full object-cover" />
        )}
      </span>
    </span>
  );
}

function ReelScreen({ media, account, caption, music }: Omit<Props, "format" | "media"> & { media?: MediaDTO }) {
  return (
    <div className="relative -mt-[38px] flex flex-1 flex-col">
      {/* 9:16 reel area under the status bar */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-[#0e0e0e]">
        <MediaView m={media} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35)_0%,transparent_18%,transparent_60%,rgba(0,0,0,0.65)_100%)]" />
        <div className="absolute top-[44px] right-4 left-4 flex items-center justify-between text-white">
          <span className="text-[17px] font-bold tracking-tight">Reels</span>
          <Camera className="size-5" />
        </div>
        <div className="absolute right-3 bottom-4 flex flex-col items-center gap-4 text-white">
          {[Heart, MessageCircle, Send].map((I, i) => (
            <span key={i} className="flex flex-col items-center gap-0.5 text-[10px]">
              <I className="size-[22px]" strokeWidth={1.8} />
              {["1.2K", "84", "31"][i]}
            </span>
          ))}
          <MoreHorizontal className="size-5" />
          <span className="size-6 overflow-hidden rounded-md border-2 border-white bg-[#333]">
            {account?.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatar} alt="" className="size-full object-cover" />
            )}
          </span>
        </div>
        <div className="absolute right-14 bottom-4 left-3 text-white">
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            <MiniAvatar account={account} size={26} />
            <Handle account={account} />
            <span className="rounded-md border border-white/70 px-2 py-[1px] text-[11px]">Follow</span>
          </div>
          {caption && <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug whitespace-pre-line text-white/95">{caption}</p>}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/90">
            <Music2 className="size-3" />
            <span className="truncate">{music ? `${music.artist} · ${music.title}` : "Original audio"}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-black" />
    </div>
  );
}

function FeedScreen({ media, account, caption, music }: Omit<Props, "format">) {
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0]);
  const count = Math.max(media.length, 1);
  useEffect(() => {
    if (index > count - 1) setIndex([count - 1, -1]);
  }, [count, index]);
  const go = (d: number) => setIndex(([i]) => [Math.min(count - 1, Math.max(0, i + d)), d]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-white">
      <div className="flex h-11 shrink-0 items-center gap-3 px-3">
        <ChevronLeft className="size-6" />
        <span className="text-[15px] font-bold">Posts</span>
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <MiniAvatar account={account} size={30} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12.5px] font-semibold"><Handle account={account} /></div>
          {music && (
            <div className="flex items-center gap-1 truncate text-[10.5px] text-white/85">
              <Music2 className="size-2.5 shrink-0" />
              <span className="truncate">{music.artist} · {music.title}</span>
            </div>
          )}
        </div>
        <MoreHorizontal className="size-4" />
      </div>

      <div className="group relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-[#0e0e0e]">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={media[index]?.id ?? "empty"}
            custom={dir}
            className="absolute inset-0"
            initial={{ x: dir >= 0 ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: dir >= 0 ? "-100%" : "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <MediaView m={media[index]} />
          </motion.div>
        </AnimatePresence>
        {count > 1 && (
          <>
            <span className="tabular absolute top-2.5 right-2.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium">
              {index + 1}/{count}
            </span>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="absolute top-1/2 left-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition-opacity disabled:opacity-0"
            >
              <ChevronLeft className="size-4" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(1)}
              disabled={index === count - 1}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow transition-opacity disabled:opacity-0"
            >
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      <div className="relative flex items-center gap-3.5 px-3 pt-2.5">
        <Heart className="size-[21px]" strokeWidth={1.8} />
        <MessageCircle className="size-[21px]" strokeWidth={1.8} />
        <Send className="size-[21px]" strokeWidth={1.8} />
        {count > 1 && (
          <span className="absolute left-1/2 flex -translate-x-1/2 gap-1">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={`size-[5px] rounded-full transition-colors ${i === index ? "bg-accent" : "bg-white/35"}`} />
            ))}
          </span>
        )}
        <Bookmark className="ml-auto size-[21px]" strokeWidth={1.8} />
      </div>
      <div className="px-3 pt-2 text-[11.5px] leading-snug">
        <div className="font-semibold">1,248 likes</div>
        <p className="mt-0.5 line-clamp-2 whitespace-pre-line">
          <span className="font-semibold"><Handle account={account} /></span> {caption || <span className="text-white/50">Your caption</span>}
        </p>
        <div className="mt-1 text-[10px] text-white/50">Just now</div>
      </div>
    </div>
  );
}

function BottomNav({ active }: { active: "home" | "reels" }) {
  return (
    <div className="relative z-10 flex h-[50px] shrink-0 items-center justify-around border-t border-white/10 bg-black px-2 pb-1 text-white">
      <Home className="size-[22px]" strokeWidth={active === "home" ? 2.6 : 1.8} />
      <Search className="size-[22px]" strokeWidth={1.8} />
      <PlusSquare className="size-[22px]" strokeWidth={1.8} />
      <Clapperboard className="size-[22px]" strokeWidth={active === "reels" ? 2.6 : 1.8} />
      <span className="size-[22px] rounded-full bg-[#333] ring-1 ring-white/60" />
    </div>
  );
}
