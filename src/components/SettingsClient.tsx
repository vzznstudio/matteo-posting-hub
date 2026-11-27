"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, PageHeader, useToast } from "./ui";

type S = { autoTrashDays: number; purgeDays: number; youtubePrivacy: string; tiktokPrivacy: string; defaultPostTime: string };

export function SettingsClient({ settings, stats }: { settings: S; stats: { accounts: number; groups: number; media: number; posts: number } }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PATCH", json: s });
      toast("Settings saved");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function cleanup() {
    setCleaning(true);
    try {
      const r = await api<{ trashed: number; purged: number }>("/api/cleanup", { method: "POST" });
      toast(`${r.trashed} moved to the bin, ${r.purged} deleted forever`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 md:px-10 md:py-12">
      <PageHeader title="Settings" />

      <Block title="Storage & recycle bin" note="Files used by a post that hasn't published yet are never moved or deleted.">
        <Row label="Move files to the bin after" hint="0 keeps files forever">
          <NumberField value={s.autoTrashDays} min={0} onChange={(v) => set("autoTrashDays", v)} suffix="days" />
        </Row>
        <Row label="Empty the bin after" hint="Files can be restored until then">
          <NumberField value={s.purgeDays} min={1} onChange={(v) => set("purgeDays", v)} suffix="days" />
        </Row>
        <Row label="Run cleanup now" hint="Runs automatically every hour">
          <Button size="sm" onClick={cleanup} loading={cleaning}>Run now</Button>
        </Row>
      </Block>

      <Block title="Posting defaults">
        <Row label="Default publish time" hint="Pre-filled on new posts">
          <input type="time" value={s.defaultPostTime} onChange={(e) => set("defaultPostTime", e.target.value)} className="field tabular w-[130px]" aria-label="Default publish time" />
        </Row>
        <Row label="YouTube visibility">
          <Select value={s.youtubePrivacy} onChange={(v) => set("youtubePrivacy", v)} options={["public", "unlisted", "private"]} label="YouTube visibility" />
        </Row>
        <Row label="TikTok visibility">
          <Select value={s.tiktokPrivacy} onChange={(v) => set("tiktokPrivacy", v)} options={["public", "followers", "friends", "private"]} label="TikTok visibility" />
        </Row>
      </Block>

      <Block title="Overview">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-3">
              <dt className="text-[12px] text-muted capitalize">{k}</dt>
              <dd className="tabular mt-0.5 font-display text-[26px]">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <div className="sticky bottom-20 mt-8 flex justify-end md:bottom-6">
        <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>Save changes</Button>
      </div>
    </div>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-[22px] italic">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
      {note && <p className="mt-2 text-[12.5px] text-faint">{note}</p>}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <div className="font-semibold">{label}</div>
        {hint && <div className="text-[12.5px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function NumberField({ value, onChange, min, suffix }: { value: number; onChange: (v: number) => void; min: number; suffix: string }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={3650}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="field tabular w-[90px] text-right"
      />
      <span className="text-[13px] text-muted">{suffix}</span>
    </label>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field w-[150px] capitalize" aria-label={label}>
      {options.map((o) => (
        <option key={o} value={o} className="bg-elev capitalize">{o}</option>
      ))}
    </select>
  );
}
