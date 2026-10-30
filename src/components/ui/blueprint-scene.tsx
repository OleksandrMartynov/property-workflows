"use client";

// 3D-сцена hero сторінки входу — «креслення, що оживає»: аркуш-креслення шаблону з сіткою промальовується лініями,
// піднімається й складається у скляну картку запуску «Apartment 12, move-in», задачі виконуються по одній, запуск
// стає «completed», картка відпливає — і цикл знову (≈12 с). Кольори — з токенів теми (--stage*, --status-done-mark),
// тож світла й темна теми підхоплюються самі. Рух — лише коли playing; reduced motion — статичний кадр «3 of 5 done».
// Сцена декоративна (aria-hidden у HeroStage): той самий зміст продукт показує словами в заголовку hero.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const CYCLE = 12;
const REDUCED_FRAME = 7.3; // три задачі з п'яти вже «done»

const CASE_NAME = "Apartment 12, move-in";
const TEMPLATE_NAME = "Tenant move-in";
const SECTIONS = [
  { name: "Before move-in", tasks: ["Sign the lease agreement", "Inspect the apartment", "Order cleaning"] },
  { name: "Move-in day", tasks: ["Hand over the keys", "Record meter readings"] },
];
const TASK_COUNT = SECTIONS.reduce((n, s) => n + s.tasks.length, 0);

// Розмітка картки в одиницях сцени: ширина 4, висота 3.4.
const W = 4;
const H = 3.4;
const LEFT = -W / 2 + 0.22;
const ROWS: { kind: "section" | "task"; label: string; y: number; index?: number }[] = (() => {
  const rows: { kind: "section" | "task"; label: string; y: number; index?: number }[] = [];
  let y = 0.68;
  let index = 0;
  for (const section of SECTIONS) {
    rows.push({ kind: "section", label: section.name, y });
    y -= 0.3;
    for (const task of section.tasks) {
      rows.push({ kind: "task", label: task, y, index: index++ });
      y -= 0.32;
    }
    y -= 0.02;
  }
  return rows;
})();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// ── Кольори з токенів: CSS-значення (oklch) → sRGB через canvas 2D ─────────────────────────────────────────────────
type Palette = { ink: THREE.Color; accent: THREE.Color; card: THREE.Color; muted: THREE.Color; done: THREE.Color; doneBg: THREE.Color };

function cssColor(name: string, probe: CanvasRenderingContext2D): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#808080";
  probe.fillStyle = raw || "#808080";
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

function readPalette(): Palette {
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  return {
    ink: cssColor("--stage-foreground", probe),
    accent: cssColor("--stage-accent", probe),
    card: cssColor("--stage-card", probe),
    muted: cssColor("--stage-muted", probe),
    done: cssColor("--status-done-mark", probe),
    doneBg: cssColor("--status-done", probe),
  };
}

/** Палітра, що оновлюється зі зміною теми (data-theme на <html> або вигляд пристрою). */
function usePalette() {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);
  return palette;
}

// ── Текст як текстура (шрифт сторінки — Inter з next/font) ────────────────────────────────────────────────────────
const PX_PER_UNIT = 220;
function textPlane(text: string, opts: { size: number; color: THREE.Color; weight?: number; pill?: THREE.Color; pillAlpha?: number; padX?: number }) {
  const font = getComputedStyle(document.body).fontFamily;
  const px = opts.size * PX_PER_UNIT;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${opts.weight ?? 500} ${px}px ${font}`;
  const padX = (opts.padX ?? 0) * PX_PER_UNIT;
  const width = Math.ceil(measure.measureText(text).width + padX * 2 + 4);
  const height = Math.ceil(px * 1.6);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (opts.pill) {
    ctx.fillStyle = `#${opts.pill.getHexString(THREE.SRGBColorSpace)}`;
    ctx.globalAlpha = opts.pillAlpha ?? 1;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, height / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.font = measure.font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = `#${opts.color.getHexString(THREE.SRGBColorSpace)}`;
  ctx.fillText(text, padX + 2, height / 2 + px * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width / PX_PER_UNIT, height / PX_PER_UNIT), material);
  mesh.userData.width = width / PX_PER_UNIT;
  return mesh;
}

/** Лінії креслення одним буфером: drawRange відкриває їх по черзі — «малюється рукою». */
function inkLines(segments: number[][], color: THREE.Color, opacity: number) {
  const positions = new Float32Array(segments.flatMap(([x1, y1, x2, y2]) => [x1, y1, 0.002, x2, y2, 0.002]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineSegments(geometry, material);
}

const rect = (x1: number, y1: number, x2: number, y2: number) => [
  [x1, y1, x2, y1],
  [x2, y1, x2, y2],
  [x2, y2, x1, y2],
  [x1, y2, x1, y1],
];

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Стан хореографії в момент t (с) — одна шкала для всіх частин сцени. */
type Beat = { t: number; draw: number; fold: number; leave: number; done: number; complete: boolean; visible: number };

function beatAt(t: number): Beat {
  const fold = ease((t - 2.8) / 2);
  const leave = ease((t - 10.4) / 1.5);
  let done = 0;
  for (let i = 0; i < TASK_COUNT; i++) if (t >= 5 + i * 0.8 + 0.45) done++;
  return { t, draw: clamp01(t / 2.6), fold, leave, done, complete: done === TASK_COUNT, visible: fold * (1 - leave) };
}

/** Частина сцени: власні об'єкти й оновлення за ритмом. */
type Part = { objects: THREE.Object3D[]; update: (beat: Beat) => void };
const opacityOf = (obj: THREE.Object3D) => (obj as THREE.Mesh).material as THREE.Material & { opacity: number };
const ordered = <T extends THREE.Object3D>(obj: T, order: number) => {
  obj.renderOrder = order;
  return obj;
};

// Порядок прозорих шарів задаємо явно: спалах → сітка → ребро й тіло картки → лінії → тексти → галочки (інакше
// сортування за відстанню малювало б тіло поверх верхніх написів картки).
function gridPart(palette: Palette): Part {
  const segments: number[][] = [];
  for (let x = -3.5; x <= 3.5001; x += 0.25) segments.push([x, -2.6, x, 2.6]);
  for (let y = -2.6; y <= 2.6001; y += 0.25) segments.push([-3.5, y, 3.5, y]);
  const grid = ordered(inkLines(segments, palette.accent, 0.16), -1);
  grid.position.z = -0.06;
  return { objects: [grid], update: (b) => void (opacityOf(grid).opacity = 0.16 * (1 - b.fold) * (1 - b.leave)) };
}

const COMPLETED_AT = 5 + (TASK_COUNT - 1) * 0.8 + 0.45;

function cardPart(palette: Palette): Part {
  const body = ordered(
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(W, H, 0.18), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 10 }),
      new THREE.MeshBasicMaterial({ color: palette.card, transparent: true, opacity: 0 }),
    ),
    1,
  );
  body.position.z = -0.1;
  // Ребро картки — акцентний відтінок під лицем, щоб на повороті було видно товщину.
  const edge = ordered(
    new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W + 0.05, H + 0.05, 0.2)), new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0, depthWrite: false })),
    0,
  );
  edge.position.z = -0.115;
  // М'який спалах «completed» по краю картки.
  const glow = ordered(
    new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W + 0.3, H + 0.3, 0.3)), new THREE.MeshBasicMaterial({ color: palette.done, transparent: true, opacity: 0, depthWrite: false })),
    -2,
  );
  glow.position.z = -0.14;
  return {
    objects: [glow, edge, body],
    update: (b) => {
      opacityOf(body).opacity = 0.9 * b.visible;
      opacityOf(edge).opacity = 0.18 * b.visible;
      opacityOf(glow).opacity = b.complete ? Math.max(0, 0.35 * Math.exp(-(b.t - COMPLETED_AT) * 1.6)) * (1 - b.leave) : 0;
    },
  };
}

// Каркас (рамка, доріжка прогресу, квадратики задач) лишається на картці; заготовки тексту (лінії на місці назв)
// згасають, коли з'являються самі назви. Малюються одним рухом «пера»: спершу каркас, потім заготовки.
function blueprintSegments() {
  const frame: number[][] = [...rect(-W / 2, -H / 2, W / 2, H / 2), [LEFT, 1.0, W / 2 - 0.22, 1.0]];
  const placeholders: number[][] = [
    [LEFT, 1.42, LEFT + 1.9, 1.42],
    [LEFT, 1.2, LEFT + 1.1, 1.2],
    [W / 2 - 0.85, 1.42, W / 2 - 0.22, 1.42],
  ];
  for (const row of ROWS) {
    if (row.kind === "section") placeholders.push([LEFT, row.y, LEFT + 1.1, row.y]);
    else {
      frame.push(...rect(LEFT, row.y - 0.09, LEFT + 0.18, row.y + 0.09));
      placeholders.push([LEFT + 0.32, row.y, LEFT + 0.32 + 0.9 + ((row.index! * 37) % 10) / 10, row.y]);
    }
  }
  return { frame, placeholders };
}

function blueprintPart(palette: Palette): Part {
  const { frame, placeholders } = blueprintSegments();
  const frameLines = ordered(inkLines(frame, palette.accent, 0.9), 2);
  const placeholderLines = ordered(inkLines(placeholders, palette.accent, 0.9), 2);
  const frameCount = frame.length * 2;
  const total = frameCount + placeholders.length * 2;
  const even = (n: number) => Math.floor(n / 2) * 2;
  return {
    objects: [frameLines, placeholderLines],
    update: (b) => {
      const drawn = b.draw * total;
      frameLines.geometry.setDrawRange(0, even(Math.min(drawn, frameCount)));
      placeholderLines.geometry.setDrawRange(0, even(Math.max(0, drawn - frameCount)));
      opacityOf(frameLines).opacity = (0.9 - b.fold * 0.5) * (1 - b.leave);
      opacityOf(placeholderLines).opacity = 0.9 * (1 - b.fold) * (1 - b.leave);
    },
  };
}

// Галочки — окремий буфер на кожну задачу, щоб домальовувати по одній (дві риски: коротка, потім довга).
function checkLine(palette: Palette, y: number) {
  const line = ordered(
    inkLines(
      [
        [LEFT + 0.035, y, LEFT + 0.075, y - 0.05],
        [LEFT + 0.075, y - 0.05, LEFT + 0.15, y + 0.055],
      ],
      palette.done,
      1,
    ),
    4,
  );
  line.geometry.setDrawRange(0, 0);
  return line;
}

function checksPart(palette: Palette): Part {
  const checks = ROWS.filter((r) => r.kind === "task").map((row) => checkLine(palette, row.y));
  const segmentsAt = (p: number) => (p <= 0 ? 0 : p < 0.5 ? 2 : 4);
  return {
    objects: checks,
    update: (b) =>
      checks.forEach((check, i) => {
        const p = clamp01((b.t - 5 - i * 0.8) / 0.45);
        check.geometry.setDrawRange(0, segmentsAt(p));
        opacityOf(check).opacity = p > 0 ? 1 - b.leave : 0;
      }),
  };
}

const placeLeft = (mesh: THREE.Mesh, x: number, y: number) => {
  mesh.position.set(x + mesh.userData.width / 2, y, 0.01);
  return ordered(mesh, 3);
};
const placeRight = (mesh: THREE.Mesh, y: number) => {
  mesh.position.set(W / 2 - 0.22 - mesh.userData.width / 2, y, 0.012);
  return ordered(mesh, 3);
};
const rowLabel = (palette: Palette, row: (typeof ROWS)[number]) =>
  row.kind === "section"
    ? placeLeft(textPlane(row.label, { size: 0.12, color: palette.muted, weight: 600 }), LEFT, row.y)
    : placeLeft(textPlane(row.label, { size: 0.125, color: palette.ink }), LEFT + 0.32, row.y);

// Тексти картки: назва випадку, шаблон, секції, задачі; статус і лічильник — по варіанту на стан.
function labelsPart(palette: Palette): Part {
  const fixed = [
    placeLeft(textPlane(CASE_NAME, { size: 0.17, color: palette.ink, weight: 600 }), LEFT, 1.42),
    placeLeft(textPlane(TEMPLATE_NAME, { size: 0.12, color: palette.muted }), LEFT, 1.2),
    ...ROWS.map((row) => rowLabel(palette, row)),
  ];
  const inProgress = placeRight(textPlane("in progress", { size: 0.11, color: palette.accent, pill: palette.accent, pillAlpha: 0.14, padX: 0.08 }), 1.42);
  const completed = placeRight(textPlane("completed", { size: 0.11, color: palette.done, pill: palette.doneBg, padX: 0.08 }), 1.42);
  const counters = Array.from({ length: TASK_COUNT + 1 }, (_, n) => placeRight(textPlane(`${n} of ${TASK_COUNT} done`, { size: 0.11, color: palette.muted }), 1.16));
  return {
    objects: [...fixed, inProgress, completed, ...counters],
    update: (b) => {
      fixed.forEach((mesh) => void (opacityOf(mesh).opacity = b.visible));
      opacityOf(inProgress).opacity = b.complete ? 0 : b.visible;
      opacityOf(completed).opacity = b.complete ? b.visible : 0;
      counters.forEach((mesh, n) => void (opacityOf(mesh).opacity = n === b.done ? b.visible : 0));
    },
  };
}

// Заповнення смуги прогресу — з часу, як і галочки: кожна задача додає свою частку за ті ж 0.45 с, тож будь-який
// кадр (зокрема статичний за reduced motion) показує точну частку.
function progressPart(palette: Palette): Part {
  const fill = ordered(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.44, 0.045), new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true })), 3);
  fill.geometry.translate((W - 0.44) / 2, 0, 0);
  fill.position.set(LEFT, 1.0, 0.012);
  return {
    objects: [fill],
    update: (b) => {
      let share = 0;
      for (let i = 0; i < TASK_COUNT; i++) share += ease((b.t - 5 - i * 0.8) / 0.45) / TASK_COUNT;
      fill.scale.x = Math.max(share, 0.0001);
      opacityOf(fill).opacity = b.visible;
    },
  };
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material & { map?: THREE.Texture };
    material?.map?.dispose();
    material?.dispose?.();
  });
}

function buildScene(palette: Palette) {
  const root = new THREE.Group();
  const sheet = new THREE.Group(); // аркуш: обертається з «лежить» у «до глядача»
  root.add(sheet);
  const parts = [gridPart(palette), cardPart(palette), blueprintPart(palette), checksPart(palette), labelsPart(palette), progressPart(palette)];
  for (const part of parts) sheet.add(...part.objects);

  /** Стан сцени в момент t (с): усе обчислюється з t, тож пауза й reduced motion — просто незмінний t. */
  const apply = (t: number) => {
    const beat = beatAt(t);
    for (const part of parts) part.update(beat);
    // Аркуш лежить під кутом, як на столі, потім піднімається до глядача; на виході — відпливає вгору.
    const { fold, leave } = beat;
    sheet.rotation.set(THREE.MathUtils.lerp(-1.02, -0.08, fold) + leave * 0.25, THREE.MathUtils.lerp(0, -0.2, fold) - leave * 0.15, THREE.MathUtils.lerp(0.16, 0, fold));
    sheet.position.set(0, THREE.MathUtils.lerp(-0.25, 0, fold) + leave * 0.7, THREE.MathUtils.lerp(-0.6, 0, fold) - leave * 0.8);
  };

  return { root, apply, dispose: () => disposeTree(root) };
}

function Story({ palette, playing, reduced }: { palette: Palette; playing: boolean; reduced: boolean }) {
  const scene = useMemo(() => buildScene(palette), [palette]);
  const time = useRef(reduced ? REDUCED_FRAME : 0);
  const pointer = useRef({ x: 0, y: 0 });
  const tilt = useRef({ x: 0, y: 0 });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => () => scene.dispose(), [scene]);
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
      if (!playing) invalidate();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [playing, invalidate]);
  useEffect(() => {
    if (reduced) time.current = REDUCED_FRAME;
    invalidate();
  }, [reduced, invalidate, scene]);

  useFrame((_, delta) => {
    // Знімки для дизайн-рев'ю (docs/img): window.__blueprintT = 7.3 зупиняє сцену на цьому моменті циклу.
    const pinned = (window as { __blueprintT?: unknown }).__blueprintT;
    if (typeof pinned === "number") time.current = pinned % CYCLE;
    else if (playing) {
      time.current = (time.current + Math.min(delta, 0.25)) % CYCLE;
    }
    scene.apply(time.current);
    // Курсор злегка нахиляє сцену (без руху за reduced motion).
    const k = reduced ? 0 : 1;
    tilt.current.x += (pointer.current.y * 0.12 * k - tilt.current.x) * 0.06;
    tilt.current.y += (pointer.current.x * 0.22 * k - tilt.current.y) * 0.06;
    scene.root.rotation.set(tilt.current.x, tilt.current.y, 0);
  });

  return <primitive object={scene.root} />;
}

export default function BlueprintScene({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  const palette = usePalette();
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!palette || !fontsReady) return null;
  return (
    <Canvas
      className="size-full"
      dpr={[1, 2]}
      frameloop={playing ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0.15, 6.2], fov: 38 }}
    >
      <Story palette={palette} playing={playing} reduced={reduced} />
    </Canvas>
  );
}
