"use client";

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
  const ratioText = `${props.progress.currentCount}/${props.progress.targetCount}`;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-14">
      <section className="flex w-full max-w-xl flex-col items-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center text-white">
          <p className="text-xs font-medium tracking-[0.35em] text-white/60">
            DAILY
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-2">
            <p className="text-6xl font-semibold tracking-tight">{ratioText}</p>
            <p className="text-sm text-white/60">days</p>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={props.onCheckToday}
              disabled={
                props.isPending ||
                !props.progress.canCheckToday ||
                props.isComplete
              }
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-30"
            >
              {props.isComplete
                ? "Completed"
                : props.isPending
                  ? "Saving..."
                  : props.progress.canCheckToday
                    ? "Check today"
                    : "Already checked today"}
            </button>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-transparent px-3 py-2">
              <input
                type="number"
                min={1}
                max={365}
                value={props.targetInput}
                onChange={(event) =>
                  props.onTargetInputChange(event.target.value)
                }
                className="w-20 bg-transparent text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={props.onUpdateTarget}
                disabled={props.isPending}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-30"
              >
                Set target
              </button>
            </div>
          </div>

          {props.status ? (
            <p className="mt-5 text-sm text-white/60">{props.status}</p>
          ) : null}
          {props.error ? (
            <p className="mt-2 text-sm text-white/70">{props.error}</p>
          ) : null}
        </div>

        <div className="mt-8 text-center text-sm leading-6 text-white/70">
          <p className="text-white/90">How it works:</p>
          <p>1) Set a target number of days (e.g. 180).</p>
          <p>2) Once per day, click “Check today”.</p>
          <p>3) The server saves it and prevents double-checking on the same day.</p>
        </div>
      </section>
    </main>
  );
}
