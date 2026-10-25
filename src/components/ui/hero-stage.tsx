"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { CompletionGlow } from "./completion-glow";
import { HeroShader } from "./hero-shader";
import {
  ClipboardCheckIcon,
  CommandIcon,
  FileSignIcon,
  GaugeIcon,
  KeyIcon,
  PauseIcon,
  PlayIcon,
  ProgressIcon,
  RotateIcon,
  TemplateIcon,
  UsersIcon,
} from "./icons";
import { StatusIcon } from "./status-badge";

// Hero сторінки входу: шейдер-тло, «ехо» даху з логотипу, заголовок із серифним акцентом, чипи можливостей і скляна
// картка, в якій чекліст «Tenant move-in» спершу виконується сам, а далі — за кліком користувача.
// Рух лише тут; поважає prefers-reduced-motion (статичний кадр «3 з 4»), має кнопку Pause (WCAG 2.2.2).

const TASKS: { name: string; who: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { name: "Inspect the apartment", who: "ana@example.test", Icon: ClipboardCheckIcon },
  { name: "Read the meters", who: "oleh@example.test", Icon: GaugeIcon },
  { name: "Sign the lease agreement", who: "ana@example.test", Icon: FileSignIcon },
  { name: "Hand over the keys", who: "ira@example.test", Icon: KeyIcon },
];

// Лише те, що продукт уже вміє.
const FEATURES = [
  { id: "templates", label: "Templates", Icon: TemplateIcon },
  { id: "owners", label: "Owners", Icon: UsersIcon },
  { id: "progress", label: "Progress", Icon: ProgressIcon },
  { id: "search", label: "Search", Icon: CommandIcon },
] as const;

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

function TaskCheck({ done }: { done: boolean }) {
  return (
    <span className={cn("relative grid size-[18px] shrink-0 place-items-center", done && "animate-ui-pop")}>
      <svg viewBox="0 0 18 18" fill="none" aria-hidden="true" className="size-full">
        <circle cx="9" cy="9" r="7.5" strokeWidth="1.5" className={cn("transition-ui stroke-current", done ? "text-status-done-mark" : "text-stage-muted/60")} />
        <circle
          cx="9"
          cy="9"
          r="7.5"
          className={cn(
            "origin-center fill-status-done-mark transition-transform duration-(--duration-base) ease-standard [transform-box:fill-box]",
            done ? "scale-100" : "scale-0",
          )}
        />
        <path
          d="M5.4 9.3l2.4 2.4 4.8-5"
          pathLength={1}
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-stage transition-[stroke-dashoffset] duration-(--duration-base) delay-100 ease-standard"
          style={{ strokeDasharray: 1, strokeDashoffset: done ? 0 : 1 }}
        />
      </svg>
    </span>
  );
}

function StoryCard({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  const [autoDone, setAutoDone] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // null — іде автопоказ; масив — користувач узяв керування на себе.
  const [manual, setManual] = useState<boolean[] | null>(null);

  // Автопоказ ~13 с: рядки з'являються, задачі виконуються по одній, запуск завершується, картка згасає й починає знову.
  useEffect(() => {
    if (!playing || manual) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const run = () => {
      setLeaving(false);
      setAutoDone(0);
      setCycle((c) => c + 1);
      for (let i = 1; i <= TASKS.length; i++) at(1500 + i * 1250, () => setAutoDone(i));
      const end = 1500 + TASKS.length * 1250;
      at(end + 3200, () => setLeaving(true));
      at(end + 3900, run);
    };
    at(0, run);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [playing, manual]);

  // Reduced motion: статичний кадр «3 з 4», без циклу.
  const flags = manual ?? TASKS.map((_, i) => i < (reduced ? 3 : autoDone));
  const done = flags.filter(Boolean).length;
  const total = TASKS.length;
  const complete = done === total;

  const toggle = (index: number) => {
    setLeaving(false);
    setManual((prev) => {
      const base = prev ?? TASKS.map((_, i) => i < (reduced ? 3 : autoDone));
      return base.map((value, i) => (i === index ? !value : value));
    });
  };

  const moveSpotlight = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <div className="flex flex-col gap-3">
      <CompletionGlow complete={complete} rounded="rounded-xl" burst burstOrigin="right-9 top-6" burstColors={["bg-status-done-mark", "bg-stage-accent", "bg-stage-glow-3"]}>
        <div
          role="group"
          aria-label="Interactive demo: tenant move-in checklist"
          onPointerMove={moveSpotlight}
          className={cn(
            "group/card relative flex flex-col gap-4 overflow-hidden rounded-xl border border-stage-border bg-stage-card p-4 shadow-lg backdrop-blur-xl transition-[opacity,filter] duration-500 ease-standard",
            leaving && !manual && "opacity-0 blur-[3px]",
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
            style={{ background: "radial-gradient(220px circle at var(--mx, 50%) var(--my, 0%), color-mix(in oklab, var(--stage-foreground) 11%, transparent), transparent 70%)" }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-heading text-stage-foreground">Apartment 12, move-in</span>
              <span className="text-label font-normal text-stage-muted">Tenant move-in</span>
            </div>
            <span
              className={cn(
                "inline-flex h-5 items-center gap-1.5 rounded-full pl-1.5 pr-2 text-meta font-medium whitespace-nowrap text-stage-foreground transition-ui",
                complete ? "bg-status-done-mark/25" : "bg-stage-foreground/10",
              )}
            >
              <StatusIcon status={complete ? "done" : "progress"} />
              {complete ? "completed" : "in progress"}
            </span>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <span className="tabular text-label text-stage-muted">
              {done} of {total} done
            </span>
            <div className="h-1 overflow-hidden rounded-full bg-stage-foreground/10" aria-hidden="true">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-(--duration-slow) ease-in-out-soft",
                  complete ? "bg-status-done-mark" : "bg-linear-to-r from-stage-accent to-stage-glow-3",
                )}
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>

          <ul
            onFocus={() => !manual && setManual(flags)}
            className="relative flex flex-col divide-y divide-stage-border overflow-hidden rounded-lg border border-stage-border"
          >
            {TASKS.map((task, i) => (
              <li
                key={`${cycle}-${task.name}`}
                style={{ "--i": i, "--reveal-delay": "250ms" } as CSSProperties}
                className="animate-ui-reveal"
              >
                <button
                  type="button"
                  aria-pressed={flags[i]}
                  onClick={() => toggle(i)}
                  className="group/task flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-ui hover:bg-stage-foreground/5 focus-visible:outline-offset-[-2px]"
                >
                  <TaskCheck done={flags[i]} />
                  <task.Icon className="size-3.5 text-stage-muted/70 transition-transform duration-(--duration-base) ease-standard group-hover/task:scale-110 group-hover/task:text-stage-foreground" />
                  <span className={cn("flex-1 text-body transition-ui", flags[i] ? "text-stage-muted" : "text-stage-foreground")}>{task.name}</span>
                  <Avatar email={task.who} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </CompletionGlow>

      <div className="flex min-h-6 items-center justify-end px-1 text-label text-stage-muted">
        {manual ? (
          <button
            type="button"
            onClick={() => setManual(null)}
            className="animate-ui-fade inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-stage-foreground transition-ui hover:bg-stage-foreground/10"
          >
            <RotateIcon className="size-3.5" />
            Start over
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EchoRoofs({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  const copies = reduced ? [0] : [0, 1, 2, 3, 4];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-[8%] -right-[10%] w-[82%] text-stage-foreground transition-transform duration-700 ease-standard"
      style={{ transform: "translate(calc(var(--px, 0) * -22px), calc(var(--py, 0) * -14px))" }}
    >
      {copies.map((i) => (
        <g
          key={i}
          className={cn("animate-ui-echo", !playing && "[animation-play-state:paused]")}
          style={{ transformOrigin: "12px 22px", transformBox: "view-box", animationDelay: `${-i * 1.8}s` }}
        >
          <path d="M3 22V12L12 3L21 12V22" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path d="M7 22V13.66L12 8.66L17 13.66V22" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}

const reveal = (i: number, delay = 150) => ({ "--i": i, "--reveal-delay": `${delay}ms` }) as CSSProperties;

export function HeroStage() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [calm, setCalm] = useState(false);
  const playing = !reduced && !paused;
  const root = useRef<HTMLDivElement>(null);
  const grainId = useId();

  // Поки користувач вводить у поле форми, тканина сповільнюється: рух не конкурує з друком.
  useEffect(() => {
    const onIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      setCalm(Boolean(target) && !root.current?.contains(target) && /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? ""));
    };
    const onOut = () => setCalm(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  return (
    <div
      ref={root}
      className="group/stage relative isolate h-full min-h-dvh w-full overflow-hidden bg-stage text-stage-foreground"
      onPointerMove={(event) => {
        if (reduced || !root.current) return;
        const rect = root.current.getBoundingClientRect();
        root.current.style.setProperty("--px", String(((event.clientX - rect.left) / rect.width) * 2 - 1));
        root.current.style.setProperty("--py", String(((event.clientY - rect.top) / rect.height) * 2 - 1));
      }}
    >
      <HeroShader playing={playing} speed={calm ? 0.25 : 1} />
      <EchoRoofs playing={playing} reduced={reduced} />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-[0.14] mix-blend-soft-light">
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>

      <div className="relative flex min-h-dvh flex-col justify-center gap-8 px-12 py-14 xl:px-20">
        <div className="flex flex-col gap-5">
          <p style={reveal(0)} className="animate-ui-reveal flex items-center gap-2.5 font-mono text-eyebrow uppercase text-stage-muted">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-done-mark opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-status-done-mark" />
            </span>
            Move-ins · Inspections · Hand-overs
          </p>

          <h2 className="max-w-3xl text-hero">
            {["The", "same", "process."].map((word, i) => (
              <span key={word} style={reveal(i + 1)} className="animate-ui-reveal inline-block pr-[0.22em]">
                {word}
              </span>
            ))}
            <br />
            <span style={reveal(4)} className="animate-ui-reveal inline-block pr-[0.22em]">
              Run
            </span>
            <span style={reveal(5)} className="animate-ui-reveal inline-block pr-[0.2em] font-display text-[1.14em] font-normal italic tracking-[-0.02em]">
              <span className="animate-ui-shine bg-linear-to-r from-stage-accent via-stage-foreground to-stage-accent bg-clip-text pr-[0.06em] text-transparent">properly,</span>
            </span>
            {["every", "time."].map((word, i) => (
              <span key={word} style={reveal(i + 6)} className="animate-ui-reveal inline-block pr-[0.22em]">
                {word}
              </span>
            ))}
          </h2>

          <ul style={reveal(8)} className="animate-ui-reveal flex flex-wrap gap-2" aria-label="What it does">
            {FEATURES.map(({ id, label, Icon }) => (
              <li
                key={id}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stage-border bg-stage-foreground/5 px-3 text-label text-stage-muted"
              >
                <Icon className="size-3.5" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-md transition-transform duration-500 ease-standard" style={{ transform: "translate(calc(var(--px, 0) * 8px), calc(var(--py, 0) * 6px))" }}>
          <div className="animate-ui-float">
            <StoryCard playing={playing} reduced={reduced} />
          </div>
        </div>
      </div>

      {/* Кнопка паузи (WCAG 2.2.2): видно під курсором над сценою, на сенсорних екранах, у фокусі з клавіатури й на паузі. */}
      {reduced ? null : (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="absolute right-5 top-5 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-stage-border bg-stage-card px-3 text-label text-stage-foreground opacity-0 backdrop-blur-md transition-ui group-hover/stage:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100 pointer-coarse:opacity-100"
        >
          {paused ? <PlayIcon className="size-3" /> : <PauseIcon className="size-3" />}
          {paused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
