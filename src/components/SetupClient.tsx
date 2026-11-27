"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Link2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { AccountDTO, GroupDTO } from "@/lib/types";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "@/lib/types";
import { api, Avatar, Button, PageHeader, useEscape, useToast } from "./ui";

export function SetupClient({ groups, accounts }: { groups: GroupDTO[]; accounts: AccountDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<GroupDTO | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const membership = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const g of groups) for (const a of g.accounts) m.set(a.id, [...(m.get(a.id) ?? []), g.name]);
    return m;
  }, [groups]);

  async function refresh() {
    setBusy("refresh");
    try {
      const r = await api<{ count: number; errors: string[] }>("/api/accounts", { method: "POST" });
      if (r.errors.length) toast(`Refreshed with problems: ${r.errors[0]}`, "error");
      else toast(`${r.count} accounts up to date`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function connectTikTok() {
    setBusy("connect");
    try {
      const { url } = await api<{ url: string }>("/api/accounts?connect=tiktok", { method: "POST" });
      window.open(url, "_blank", "noopener");
      toast("Finish the TikTok login in the new tab, then press Refresh");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy("create");
    try {
      const g = await api<{ id: string; name: string }>("/api/groups", { method: "POST", json: { name: newName } });
      setNewName("");
      router.refresh();
      setEditing({ id: g.id, name: g.name, accounts: [] });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 md:px-10 md:py-12">
      <PageHeader title="Setup" sub="Put each brand's channels in one group. A post sent to a group goes out on every channel in it." />

      <section aria-labelledby="groups-h">
        <h2 id="groups-h" className="mb-4 text-[13px] font-semibold text-muted">Groups</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g, i) => (
            <GroupBox key={g.id} group={g} index={i} onOpen={() => setEditing(g)} />
          ))}
          <form
            onSubmit={createGroup}
            className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-line-strong p-6"
          >
            <span className="font-display text-[26px] italic text-muted">New group</span>
            <div className="flex w-full max-w-sm gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. GTA Dreamin"
                className="field"
                aria-label="New group name"
              />
              <Button variant="primary" loading={busy === "create"} disabled={!newName.trim()}>
                <Plus className="size-4" /> Create
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section aria-labelledby="accounts-h" className="mt-16">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="accounts-h" className="text-[13px] font-semibold text-muted">
            Connected accounts <span className="tabular text-faint">· {accounts.length}</span>
          </h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={connectTikTok} loading={busy === "connect"}>
              <Link2 className="size-3.5" /> Connect TikTok
            </Button>
            <Button size="sm" onClick={refresh} loading={busy === "refresh"}>
              {busy !== "refresh" && <RefreshCw className="size-3.5" />} Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line">
          {accounts.length === 0 && (
            <p className="px-5 py-10 text-center text-muted">No accounts yet. Press Refresh to pull them from your connectors.</p>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0 md:px-5">
              <Avatar account={a} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{a.name}</div>
                <div className="truncate text-[12.5px] text-muted">
                  {PLATFORM_LABEL[a.platform] ?? a.platform}
                  {a.handle ? ` · ${a.handle}` : ""}
                  {membership.get(a.id) ? ` · in ${membership.get(a.id)!.join(", ")}` : ""}
                </div>
              </div>
              {a.status === "connected" ? (
                <span className="hidden text-[12px] text-ok sm:inline">Connected</span>
              ) : (
                <span className="rounded-full bg-danger/12 px-2.5 py-1 text-[12px] text-danger">Reconnect needed</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-faint">
          Instagram, Facebook and YouTube channels are managed by your admin. New ones appear here after a refresh.
        </p>
      </section>

      <AnimatePresence>
        {editing && (
          <GroupEditor
            key={editing.id}
            group={groups.find((g) => g.id === editing.id) ?? editing}
            accounts={accounts}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* The group box: overlapping profile circles over a name plate. Hover fans the circles apart. */
function GroupBox({ group, index, onOpen }: { group: GroupDTO; index: number; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const shown = group.accounts.slice(0, 5);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex min-h-[260px] flex-col items-center justify-center gap-7 overflow-hidden rounded-[28px] border border-line bg-surface px-5 py-8 text-left transition-colors hover:border-line-strong"
      aria-label={`Edit group ${group.name}`}
    >
      <div className="flex items-center justify-center">
        {shown.length === 0 && (
          <div className="flex">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="-ml-4 size-[76px] rounded-full border border-dashed border-line-strong bg-bg first:ml-0" />
            ))}
          </div>
        )}
        {shown.map((a, i) => (
          <motion.span
            key={a.id}
            className="relative"
            style={{ zIndex: shown.length - i }}
            animate={{ marginLeft: i === 0 ? 0 : hover ? 10 : -22, y: hover ? (i % 2 ? -6 : 4) : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: hover ? i * 0.025 : 0 }}
          >
            <Avatar account={a} size={76} />
          </motion.span>
        ))}
        {group.accounts.length > 5 && (
          <span className="-ml-3 flex size-[48px] items-center justify-center rounded-full bg-elev2 text-[13px] font-semibold text-muted">
            +{group.accounts.length - 5}
          </span>
        )}
      </div>
      <span className="rounded-full border border-line bg-elev px-7 py-2.5 font-display text-[24px] leading-none italic transition-colors group-hover:bg-elev2">
        {group.name}
      </span>
    </motion.button>
  );
}

function GroupEditor({ group, accounts, onClose }: { group: GroupDTO; accounts: AccountDTO[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(group.name);
  const [members, setMembers] = useState<AccountDTO[]>(group.accounts);
  const [saving, setSaving] = useState(false);
  const available = accounts.filter((a) => !members.some((m) => m.id === a.id));
  useEscape(onClose);

  function move(i: number, d: number) {
    setMembers((m) => {
      const next = [...m];
      const j = i + d;
      if (j < 0 || j >= next.length) return m;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await api(`/api/groups/${group.id}`, { method: "PATCH", json: { name, accountIds: members.map((m) => m.id) } });
      toast(`${name} saved`);
      router.refresh();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete the group "${group.name}"? Posts already scheduled stay scheduled.`)) return;
    await api(`/api/groups/${group.id}`, { method: "DELETE" });
    toast("Group deleted");
    router.refresh();
    onClose();
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-label={`Edit ${group.name}`}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[28px] border border-line bg-surface md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[460px] md:rounded-none md:rounded-l-[28px]"
        initial={{ y: "100%", x: 0 }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <span className="font-display text-[24px] italic">Edit group</span>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-elev">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-[13px] text-muted">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </label>

          <div>
            <span className="mb-2 block text-[13px] text-muted">In this group · {members.length}</span>
            {members.length === 0 && <p className="rounded-xl bg-elev px-4 py-5 text-center text-[13px] text-muted">Add accounts from the list below.</p>}
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {members.map((a, i) => (
                  <motion.li
                    layout
                    key={a.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex items-center gap-3 rounded-xl bg-elev px-3 py-2"
                  >
                    <Avatar account={a} size={36} />
                    <span className="min-w-0 flex-1 truncate">
                      {a.name} <span className="text-[12px] text-muted">· {PLATFORM_LABEL[a.platform]}</span>
                    </span>
                    <button aria-label="Move up" onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-muted hover:bg-elev2 hover:text-ink">
                      <ArrowUp className="size-4" />
                    </button>
                    <button aria-label="Move down" onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-muted hover:bg-elev2 hover:text-ink">
                      <ArrowDown className="size-4" />
                    </button>
                    <button
                      aria-label={`Remove ${a.name}`}
                      onClick={() => setMembers((m) => m.filter((x) => x.id !== a.id))}
                      className="rounded-lg p-1.5 text-muted hover:bg-elev2 hover:text-danger"
                    >
                      <X className="size-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>

          <div>
            <span className="mb-2 block text-[13px] text-muted">Add accounts</span>
            {PLATFORM_ORDER.map((p) => {
              const list = available.filter((a) => a.platform === p);
              if (!list.length) return null;
              return (
                <div key={p} className="mb-4">
                  <div className="mb-1.5 text-[12px] font-semibold text-faint">{PLATFORM_LABEL[p]}</div>
                  <div className="space-y-1">
                    {list.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setMembers((m) => [...m, a])}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-elev"
                      >
                        <Avatar account={a} size={32} badge={false} />
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <Plus className="size-4 text-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <Button variant="danger" onClick={remove}>
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!name.trim()}>
            Save group
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
