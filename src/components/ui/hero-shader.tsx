"use client";

import { useEffect, useRef } from "react";
import { THEME_EVENT } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Шовковий «сатин»-шейдер для hero на сторінці входу. Чистий WebGL без залежностей.
// Що він робить: викривлений шум дає складки тканини; з його градієнта рахується нормаль, тож світло ковзає по
// складках справжніми відблисками й ободом; курсор «гладить» тканину (рідинне зміщення за швидкістю), клік пускає
// хвилю, а перші півтори секунди сцена проявляється від центру.
// Бюджет: DPR ≤ 1.5 з додатковим зменшенням ×0.55 (градієнт добре масштабується), ≤ 30 кадрів/с, пауза поза екраном і у
// фоновій вкладці. Без WebGL лишається CSS-запасний фон.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uIntro;
uniform vec2 uPtr;
uniform vec2 uVel;
uniform vec3 uClick;
uniform float uLight;
uniform vec3 uBase;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm2(vec2 p) {
  float v = 0.5 * snoise(p);
  p = p * 2.02 + vec2(3.1, 1.7);
  return v + 0.25 * snoise(p);
}
float fbm3(vec2 p) {
  float v = 0.5 * snoise(p);
  p = p * 2.02 + vec2(3.1, 1.7);
  v += 0.25 * snoise(p);
  p = p * 2.02 + vec2(3.1, 1.7);
  return v + 0.125 * snoise(p);
}

// Висота тканини: подвійне викривлення шуму. q, r віддаємо назад — вони керують кольором.
float height(vec2 p, float t, out vec2 q, out vec2 r) {
  q = vec2(fbm2(p * 0.55 + vec2(0.0, t)), fbm2(p * 0.55 + vec2(5.2, 1.3) - t));
  r = vec2(fbm2(p * 0.7 + 1.1 * q + vec2(1.7, 9.2) + 0.9 * t), fbm2(p * 0.7 + 1.1 * q + vec2(8.3, 2.8) - 0.8 * t));
  return fbm3(p * 0.6 + 1.2 * r);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (uv - 0.5) * asp;
  float t = uTime * 0.035;

  // Курсор гладить тканину: зміщення за швидкістю поруч і легка лінза навколо
  vec2 d = (uv - uPtr) * asp;
  float near = exp(-dot(d, d) * 14.0);
  p += uVel * 0.55 * near;
  p += normalize(d + 1e-4) * 0.045 * exp(-dot(d, d) * 26.0);

  // Хвиля від кліку
  vec2 dc = (uv - uClick.xy) * asp;
  float rad = length(dc);
  float ring = exp(-pow((rad - uClick.z * 0.5) * 11.0, 2.0)) * exp(-uClick.z * 1.5);
  p += normalize(dc + 1e-4) * ring * 0.09;

  vec2 q, r, q2, r2;
  float f = height(p, t, q, r);
  float fx = height(p + vec2(0.012, 0.0), t, q2, r2);
  float fy = height(p + vec2(0.0, 0.012), t, q2, r2);

  // Нормаль із градієнта висоти й світло, що повільно кружляє
  vec3 n = normalize(vec3(-(fx - f) * 7.0, -(fy - f) * 7.0, 1.0));
  vec3 L = normalize(vec3(cos(uTime * 0.21) * 0.65, sin(uTime * 0.17) * 0.55, 0.75));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 26.0);
  float rim = pow(1.0 - n.z, 2.2);

  vec3 col = mix(uBase, uA, smoothstep(-0.25, 0.85, f) * 0.9);
  col = mix(col, uB, smoothstep(0.05, 0.95, r.x) * 0.5);
  col = mix(col, uC, smoothstep(0.35, 1.1, q.y) * 0.28);
  if (uLight > 0.5) {
    // Світла сцена: м'яка пастельна «шовкова» поверхня; тінь і відблиск ледь помітні, краї й ліва частина під текстом тануть до основи.
    col *= 0.84 + 0.22 * diff;
    col += vec3(1.0) * spec * 0.32;
    col += uB * rim * 0.12;
    col += (uA + uB) * 0.5 * 0.05 * smoothstep(0.55, 0.0, length(d));
    col += vec3(1.0) * ring * 0.25;
    float vigL = 1.0 - 0.55 * smoothstep(0.3, 1.1, length(uv - vec2(0.55, 0.5)));
    col = mix(uBase, col, vigL * mix(0.5, 1.0, smoothstep(0.0, 0.85, uv.x)));
    col = mix(uBase, col, smoothstep(0.0, 1.0, uIntro * 1.6 - length(uv - 0.5) * 1.1));
  } else {
    col *= 0.42 + 0.95 * diff;
    col += mix(uA, uC, 0.5) * spec * 0.55;
    col += uB * rim * 0.35;

    // Світіння курсора й хвилі
    col += (uA + uB) * 0.5 * 0.14 * smoothstep(0.55, 0.0, length(d));
    col += mix(uA, uC, 0.5) * ring * 0.55;

    // Віньєтка, затемнення під текстом і вступна поява від центру
    float vig = 1.0 - 0.62 * smoothstep(0.3, 1.1, length(uv - vec2(0.55, 0.5)));
    col *= vig * mix(0.7, 1.0, smoothstep(0.0, 0.85, uv.x));
    col *= smoothstep(0.0, 1.0, uIntro * 1.6 - length(uv - 0.5) * 1.1);

  }

  gl_FragColor = vec4(col, 1.0);
}
`;

type Rgb = [number, number, number];

/** Колір із CSS-токена в sRGB 0..1: канвас сам розбирає oklch() і віддає sRGB. */
function readToken(name: string, probe: CanvasRenderingContext2D): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000";
  probe.fillStyle = raw || "#000";
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("hero-shader: compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * `playing` — чи рухається сцена; `speed` — множник часу (1 — звичайний, менше — «заспокоєний» режим під час
 * введення в поля форми). Статичний кадр (playing=false) малюється один раз.
 */
export function HeroShader({ playing, speed = 1, className }: { playing: boolean; speed?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const controlRef = useRef<{ render: () => void; setActive: (on: boolean) => void } | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    playingRef.current = playing;
    controlRef.current?.setActive(playing);
    if (!playing) controlRef.current?.render();
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.visibility = "hidden"; // видимим стає лише після першого кадру; інакше лишається CSS-запасний фон
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("hero-shader: link failed", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uIntro = u("uIntro");
    const uPtr = u("uPtr");
    const uVel = u("uVel");
    const uClick = u("uClick");

    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    // Токени сцени читаємо з CSS: після зміни теми (вибір «Theme», вигляд пристрою) читаємо знову й малюємо кадр.
    const applyTokens = () => {
      if (!ctx) return;
      const base = readToken("--stage", ctx);
      gl.uniform1f(u("uLight"), 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2] > 0.5 ? 1 : 0);
      gl.uniform3fv(u("uBase"), base);
      gl.uniform3fv(u("uA"), readToken("--stage-glow-1", ctx));
      gl.uniform3fv(u("uB"), readToken("--stage-glow-2", ctx));
      gl.uniform3fv(u("uC"), readToken("--stage-glow-3", ctx));
    };
    applyTokens();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let time = 6; // старт із виразного кадру
    let intro = reduced ? 1 : 0;
    let clickAge = 99;
    let last = 0;
    let raf = 0;
    let visible = false;
    let active = playingRef.current;
    const pointer = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, vx: 0, vy: 0, px: 0.7, py: 0.6 };
    const click = { x: 0.5, y: 0.5 };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.55;
      const w = Math.max(2, Math.round(canvas.clientWidth * scale));
      const h = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = () => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uIntro, intro);
      gl.uniform2f(uPtr, pointer.x, 1 - pointer.y);
      gl.uniform2f(uVel, pointer.vx, -pointer.vy);
      gl.uniform3f(uClick, click.x, 1 - click.y, clickAge);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.style.visibility = "visible";
      canvas.style.opacity = "1";
    };

    const frame = (now: number) => {
      raf = 0;
      if (!active || !visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ≤ 30 кадрів/с
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      time += dt * speedRef.current;
      intro = Math.min(1, intro + dt / 1.6);
      clickAge += dt;
      // Швидкість курсора (у частках екрана за кадр), плавно згасає
      pointer.vx = pointer.vx * 0.86 + (pointer.x - pointer.px) * 0.9;
      pointer.vy = pointer.vy * 0.86 + (pointer.y - pointer.py) * 0.9;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      draw();
    };

    const start = () => {
      if (!raf && active && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    controlRef.current = {
      render: draw,
      setActive: (on) => {
        active = on;
        if (on) start();
      },
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        draw();
        start();
      }
    });
    observer.observe(canvas);

    const onVisibility = () => (document.hidden ? undefined : start());
    document.addEventListener("visibilitychange", onVisibility);
    const toUnit = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        inside: event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom,
      };
    };
    const onMove = (event: PointerEvent) => {
      const p = toUnit(event);
      pointer.tx = p.x;
      pointer.ty = p.y;
    };
    const onDown = (event: PointerEvent) => {
      const p = toUnit(event);
      if (!p.inside || reduced) return;
      click.x = p.x;
      click.y = p.y;
      clickAge = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    const onTheme = () => {
      applyTokens();
      draw();
    };
    const deviceTheme = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener(THEME_EVENT, onTheme);
    deviceTheme.addEventListener("change", onTheme);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(THEME_EVENT, onTheme);
      deviceTheme.removeEventListener("change", onTheme);
      controlRef.current = null;
      // Контекст не «губимо» примусово: у dev-режимі React запускає ефект двічі на тому самому канвасі.
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <>
      {/* Запасний фон, якщо WebGL недоступний: три світні плями на темній сцені */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-stage bg-[radial-gradient(60%_50%_at_20%_15%,var(--stage-glow-1),transparent),radial-gradient(55%_45%_at_85%_80%,var(--stage-glow-2),transparent),radial-gradient(40%_35%_at_70%_20%,var(--stage-glow-3),transparent)] opacity-70"
      />
      <canvas ref={canvasRef} aria-hidden="true" className={cn("absolute inset-0 size-full opacity-0 transition-opacity duration-1000 ease-standard", className)} />
    </>
  );
}
