"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

type ProgressState = {
  targetCount: number;
  currentCount: number;
  lastCheckedDateKey: string | null;
  completedAt: string | null;
  todayKey: string;
  canCheckToday: boolean;
};

type DailyCheckerLayoutProps = {
  progress: ProgressState;
  targetInput: string;
  status: string;
  error: string | null;
  isPending: boolean;
  progressPercent: number;
  remaining: number;
  isComplete: boolean;
  onTargetInputChange: (value: string) => void;
  onCheckToday: () => void;
  onUpdateTarget: () => void;
};

export function DailyCheckerLayout(props: DailyCheckerLayoutProps) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-6 py-10 text-white sm:px-10 lg:px-12">
      <DecorativeBackground />

      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
          <StatusChips />

          <div className="mt-8 space-y-5">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--accent-strong)]">
              Day Checker
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Mark your progress once per day until you reach the target you
              set.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Your progress is stored on the server and tied to an anonymous
              identifier. You do not need an account, and the data is still
              there when you come back tomorrow.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Target"
              value={`${props.progress.targetCount} days`}
            />
            <MetricCard
              label="Completed"
              value={`${props.progress.currentCount} days`}
            />
            <MetricCard label="Remaining" value={`${props.remaining} days`} />
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
              <span>Progress</span>
              <span>{props.progressPercent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-indigo-400 to-emerald-300 transition-all duration-500"
                style={{ width: `${props.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={props.onCheckToday}
              disabled={
                props.isPending ||
                !props.progress.canCheckToday ||
                props.isComplete
              }
              className={cn(
                "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition",
                props.isPending ||
                  !props.progress.canCheckToday ||
                  props.isComplete
                  ? "cursor-not-allowed bg-white/10 text-white/40"
                  : "bg-white text-slate-950 hover:scale-[1.01]",
              )}
            >
              {props.isComplete
                ? "Target completed"
                : props.isPending
                  ? "Saving..."
                  : props.progress.canCheckToday
                    ? "Check today"
                    : "Already checked today"}
            </button>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-2">
              <input
                type="number"
                min={1}
                max={365}
                value={props.targetInput}
                onChange={(event) =>
                  props.onTargetInputChange(event.target.value)
                }
                className="w-28 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={props.onUpdateTarget}
                disabled={props.isPending}
                className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Update target
              </button>
            </div>
          </div>

          {props.status ? <InlineStatus text={props.status} /> : null}
          {props.error ? <InlineError text={props.error} /> : null}
        </div>

        <aside className="grid gap-6">
          <InfoCard title="How it works" tone="default">
            <p>The browser gets a signed, persistent anonymous cookie.</p>
            <p>The progress counter is stored in PostgreSQL through Prisma.</p>
            <p>The server blocks duplicate checks on the same day.</p>
            <p>The target can be changed without creating an account.</p>
          </InfoCard>

          <InfoCard title="Current state" tone="success">
            <p className="text-2xl font-semibold text-white">
              {props.isComplete
                ? "Target completed"
                : props.progress.canCheckToday
                  ? "Ready for today’s check"
                  : "You already checked today"}
            </p>
            <p className="text-sm leading-6 text-emerald-50/80">
              Last check:{" "}
              {props.progress.lastCheckedDateKey ?? "not checked yet"}
            </p>
          </InfoCard>

          <InfoCard title="Daily target" tone="accent">
            <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
              <p>Keep the action simple: one check per day.</p>
              <p>Track consistency, not just volume.</p>
              <p>The server enforces the rules, not the client.</p>
            </div>
          </InfoCard>
        </aside>
      </section>
    </main>
  );
}

function DecorativeBackground() {
  return (
    <div className="absolute inset-0 -z-10 opacity-70">
      <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-16 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
    </div>
  );
}

function StatusChips() {
  const chips = ["No login", "Durable storage", "Daily check"];

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InlineStatus({ text }: { text: string }) {
  return <p className="mt-5 text-sm text-[var(--muted)]">{text}</p>;
}

function InlineError({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-red-300">{text}</p>;
}

function InfoCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "default" | "success" | "accent";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10"
      : tone === "accent"
        ? "border-cyan-400/20 bg-cyan-400/10"
        : "border-white/10 bg-[var(--panel)]";

  return (
    <div
      className={cn(
        "rounded-[2rem] border p-6 shadow-xl shadow-black/20 backdrop-blur-xl",
        toneClasses,
      )}
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--muted)]">
        {children}
      </div>
    </div>
  );
}
