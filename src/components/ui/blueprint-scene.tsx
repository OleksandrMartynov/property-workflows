"use client";

// 3D-сцена hero сторінки входу — «креслення, що оживає»: аркуш-креслення шаблону з сіткою промальовується лініями,
// піднімається й складається у скляну картку запуску «Flat 7, handover». У кінці (INTRO_END) сцена лежить рівно перед
// глядачем і збігається з живою карткою HeroStage рядок у рядок: одиниці сцени нижче — заміри тієї картки (1 одиниця =
// 26 px при висоті полотна HERO_SCENE_HEIGHT), тож передача слова не дає стрибка. Кольори — з токенів теми (--stage*),
// тож світла й темна теми підхоплюються самі. Сцена декоративна (aria-hidden у HeroStage); без WebGL і за reduced motion
// її немає взагалі.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const INTRO_END = 4.9; // аркуш склався в картку

// Назви вигадані, як у картці HeroStage: відвідувач без входу не бачить вмісту шаблонів бази (AC-EDITOR-09).
const CASE_NAME = "Flat 7, handover";
const TEMPLATE_NAME = "Unit handover";
const SECTIONS = [
  { name: "Before handover", tasks: ["Walk through the unit", "Photograph the meters", "Book the cleaners"] },
  { name: "Handover day", tasks: ["Sign the handover form", "Pass on the keys"] },
];
const TASK_COUNT = SECTIONS.reduce((n, s) => n + s.tasks.length, 0);

// Розмітка живої картки (26rem × ~23rem) в одиницях сцени, від центра картки.
const W = 4;
const H = 3.53;
const LEFT = -W / 2 + 0.164;
const RIGHT = W / 2 - 0.164;
const CHECK_X = -1.606;
const TEXT_X = -1.215;
const CASE_Y = 1.505;
const TEMPLATE_Y = 1.322;
const COUNTER_Y = 0.995;
const BAR_Y = 0.832;
const LIST_PAD = 0.173; // від центра рядка до краю списку
const SECTION_TO_TASK = 0.298;
const TASK_STEP = 0.356;
const SECTION_GAP = 0.336;

type Row = { kind: "section" | "task"; label: string; y: number };
const ROWS: Row[] = (() => {
  const rows: Row[] = [];
  let y = 0.582;
  for (const section of SECTIONS) {
    rows.push({ kind: "section", label: section.name, y });
    y -= SECTION_TO_TASK;
    section.tasks.forEach((task, i) => {
      rows.push({ kind: "task", label: task, y });
      if (i < section.tasks.length - 1) y -= TASK_STEP;
    });
    y -= SECTION_GAP;
  }
  return rows;
})();

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// ── Кольори з токенів: CSS-значення (oklch) → sRGB через canvas 2D ─────────────────────────────────────────────────
type Palette = { ink: THREE.Color; accent: THREE.Color; card: THREE.Color; muted: THREE.Color };

function cssColor(name: string, probe: CanvasRenderingContext2D): THREE.Color {
  const root = getComputedStyle(document.documentElement);
  const raw = root.getPropertyValue(name).trim();
  // Запасний колір — колір тексту кореня (теж з теми), не сталий hex. Перше присвоєння скидає стан полотна:
  // невалідне значення canvas ігнорує й лишає попередній колір.
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = root.color;
  probe.fillStyle = raw || root.color;
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

const circle = (x: number, y: number, r: number) =>
  Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const b = ((i + 1) / 16) * Math.PI * 2;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(b) * r, y + Math.sin(b) * r];
  });

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
type Beat = { draw: number; fold: number };
const beatAt = (t: number): Beat => ({ draw: clamp01(t / 2.6), fold: ease((t - 2.6) / 2.2) });

/** Частина сцени: власні об'єкти й оновлення за ритмом. */
type Part = { objects: THREE.Object3D[]; update: (beat: Beat) => void };
const opacityOf = (obj: THREE.Object3D) => (obj as THREE.Mesh).material as THREE.Material & { opacity: number };
const ordered = <T extends THREE.Object3D>(obj: T, order: number) => {
  obj.renderOrder = order;
  return obj;
};

// Порядок прозорих шарів задаємо явно: сітка → тіло картки → лінії → тексти (інакше сортування за відстанню малювало б
// тіло поверх верхніх написів картки).
function gridPart(palette: Palette): Part {
  const segments: number[][] = [];
  for (let x = -3.5; x <= 3.5001; x += 0.25) segments.push([x, -2.75, x, 2.75]);
  for (let y = -2.75; y <= 2.7501; y += 0.25) segments.push([-3.5, y, 3.5, y]);
  const grid = ordered(inkLines(segments, palette.accent, 0.14), -1);
  grid.position.z = -0.06;
  return { objects: [grid], update: (b) => void (opacityOf(grid).opacity = 0.14 * b.draw * (1 - b.fold)) };
}

function cardPart(palette: Palette): Part {
  const body = ordered(
    new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W, H, 0.115)), new THREE.MeshBasicMaterial({ color: palette.card, transparent: true, opacity: 0, depthWrite: false })),
    1,
  );
  body.position.z = -0.01;
  // Прозорість --stage-card: скло живої картки, щоб передача не міняла світлоту.
  return { objects: [body], update: (b) => void (opacityOf(body).opacity = 0.62 * b.fold) };
}

// Каркас (рамка, доріжка прогресу, списки, кола задач) лишається на картці; заготовки тексту (лінії на місці назв)
// згасають, коли з'являються самі назви. Малюються одним рухом «пера»: спершу каркас, потім заготовки.
function blueprintSegments() {
  const outline = roundedRectShape(W, H, 0.115).getPoints(6);
  const frame: number[][] = [...outline.slice(0, -1).map((p, i) => [p.x, p.y, outline[i + 1].x, outline[i + 1].y]), [LEFT, BAR_Y, RIGHT, BAR_Y]];
  const placeholders: number[][] = [
    [LEFT, CASE_Y, LEFT + 1.07, CASE_Y],
    [LEFT, TEMPLATE_Y, LEFT + 0.9, TEMPLATE_Y],
    [RIGHT - 0.85, CASE_Y, RIGHT, CASE_Y],
    [LEFT, COUNTER_Y, LEFT + 0.75, COUNTER_Y],
  ];
  let task = 0;
  ROWS.forEach((row, i) => {
    if (row.kind === "section") {
      placeholders.push([LEFT, row.y, LEFT + 1, row.y]);
      return;
    }
    const first = ROWS[i - 1].kind === "section";
    const last = ROWS[i + 1]?.kind !== "task";
    // Кожен список — рамка з роздільниками, як у живій картці.
    frame.push([LEFT, row.y - LIST_PAD, RIGHT, row.y - LIST_PAD], [LEFT, row.y - LIST_PAD, LEFT, row.y + LIST_PAD], [RIGHT, row.y - LIST_PAD, RIGHT, row.y + LIST_PAD]);
    if (first) frame.push([LEFT, row.y + LIST_PAD, RIGHT, row.y + LIST_PAD]);
    if (last) frame.push([LEFT, row.y - LIST_PAD, RIGHT, row.y - LIST_PAD]);
    frame.push(...circle(CHECK_X, row.y, 0.072));
    placeholders.push([TEXT_X, row.y, TEXT_X + 0.95 + ((task++ * 37) % 10) / 12, row.y]);
  });
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
      const drawn = ease(b.draw) * total;
      frameLines.geometry.setDrawRange(0, even(Math.min(drawn, frameCount)));
      placeholderLines.geometry.setDrawRange(0, even(Math.max(0, drawn - frameCount)));
      opacityOf(frameLines).opacity = 0.9 - b.fold * 0.72;
      opacityOf(placeholderLines).opacity = 0.9 * (1 - b.fold);
    },
  };
}

const placeLeft = (mesh: THREE.Mesh, x: number, y: number) => {
  mesh.position.set(x + mesh.userData.width / 2, y, 0.01);
  return ordered(mesh, 3);
};
const placeRight = (mesh: THREE.Mesh, y: number) => {
  mesh.position.set(RIGHT - mesh.userData.width / 2, y, 0.012);
  return ordered(mesh, 3);
};
const rowLabel = (palette: Palette, row: Row) =>
  row.kind === "section"
    ? placeLeft(textPlane(row.label, { size: 0.115, color: palette.muted, weight: 600 }), LEFT, row.y)
    : placeLeft(textPlane(row.label, { size: 0.135, color: palette.ink, weight: 400 }), TEXT_X, row.y);

// Тексти картки проявляються під кінець складання — у тих самих місцях, що й у живій картці.
function labelsPart(palette: Palette): Part {
  const labels = [
    placeLeft(textPlane(CASE_NAME, { size: 0.144, color: palette.ink, weight: 600 }), LEFT, CASE_Y),
    placeLeft(textPlane(TEMPLATE_NAME, { size: 0.125, color: palette.muted, weight: 400 }), LEFT, TEMPLATE_Y),
    placeLeft(textPlane(`0 of ${TASK_COUNT} done`, { size: 0.125, color: palette.muted, weight: 400 }), LEFT, COUNTER_Y),
    placeRight(textPlane("in progress", { size: 0.115, color: palette.ink, pill: palette.ink, pillAlpha: 0.1, padX: 0.09 }), CASE_Y),
    ...ROWS.map((row) => rowLabel(palette, row)),
  ];
  return { objects: labels, update: (b) => labels.forEach((mesh) => void (opacityOf(mesh).opacity = clamp01((b.fold - 0.45) / 0.55))) };
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
  const parts = [gridPart(palette), cardPart(palette), blueprintPart(palette), labelsPart(palette)];
  for (const part of parts) sheet.add(...part.objects);

  /** Стан сцени в момент t (с): усе обчислюється з t, тож пауза — просто незмінний t. Повертає складання 0…1. */
  const apply = (t: number) => {
    const beat = beatAt(t);
    for (const part of parts) part.update(beat);
    // Аркуш лежить під кутом, як на столі, піднімається дугою й завмирає рівно перед глядачем — там, де жива картка.
    const { fold } = beat;
    sheet.rotation.set(THREE.MathUtils.lerp(-1.02, 0, fold), Math.sin(fold * Math.PI) * -0.18, THREE.MathUtils.lerp(0.16, 0, fold));
    sheet.position.set(0, THREE.MathUtils.lerp(-0.25, 0, fold), THREE.MathUtils.lerp(-0.6, 0, fold));
    return fold;
  };

  return { root, apply, dispose: () => disposeTree(root) };
}

function Story({ palette, playing, replay, onIntroEnd }: { palette: Palette; playing: boolean; replay: number; onIntroEnd: () => void }) {
  const scene = useMemo(() => buildScene(palette), [palette]);
  const time = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const tilt = useRef({ x: 0, y: 0 });
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => () => scene.dispose(), [scene]);
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  // Повтор — та сама сцена з нуля: без нового WebGL-контексту й текстур, тож без ривка на старті.
  useEffect(() => {
    time.current = 0;
    invalidate();
  }, [replay, invalidate]);
  // Зміна теми дає нову сцену: час той самий, лише перемальовуємо кадр.
  useEffect(() => invalidate(), [scene, invalidate]);

  useFrame((_, delta) => {
    // Знімки для дизайн-рев'ю (docs/img): window.__blueprintT = 3.5 зупиняє сцену на цьому моменті.
    const pinned = (window as { __blueprintT?: unknown }).__blueprintT;
    if (typeof pinned === "number") time.current = Math.min(pinned, INTRO_END);
    else if (playing && time.current < INTRO_END) {
      time.current = Math.min(time.current + Math.min(delta, 0.05), INTRO_END);
      if (time.current === INTRO_END) onIntroEnd();
    }
    const fold = scene.apply(time.current);
    // Курсор злегка нахиляє креслення; складена картка стоїть рівно, щоб збігтися з живою.
    tilt.current.x += (pointer.current.y * 0.1 - tilt.current.x) * 0.06;
    tilt.current.y += (pointer.current.x * 0.18 - tilt.current.y) * 0.06;
    scene.root.rotation.set(tilt.current.x * (1 - fold), tilt.current.y * (1 - fold), 0);
  });

  return <primitive object={scene.root} />;
}

export default function BlueprintScene({ playing, replay, onIntroEnd }: { playing: boolean; replay: number; onIntroEnd: () => void }) {
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
    <Canvas className="size-full" dpr={[1, 2]} frameloop={playing ? "always" : "demand"} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ position: [0, 0, 6.2], fov: 38 }}>
      <Story palette={palette} playing={playing} replay={replay} onIntroEnd={onIntroEnd} />
    </Canvas>
  );
}
