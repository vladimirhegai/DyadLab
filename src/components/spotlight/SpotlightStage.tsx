"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";
import { SPOTLIGHT_OBJECTS, SPOTLIGHT_OBJECT_BY_ID } from "@/lib/spotlight-sync/rounds";
import type {
  SpotlightContextMode,
  SpotlightPoint,
} from "@/lib/spotlight-sync/types";
import { ObjectGlyph } from "./ObjectGlyph";
import { SceneArt, SceneDefs } from "./SceneArt";

/**
 * The playfield.
 *
 * The scene is drawn three times and composited by mask:
 *   dim    — blurred and darkened, the whole room as peripheral vision sees it
 *   sharp  — revealed inside the union of the two spotlights
 *   bloom  — revealed only inside their intersection, so joint focus is the one
 *            place the room is fully legible
 *
 * Objects live inside those layers rather than above them, so an object outside
 * the light is a blurred shape you have to move a spotlight onto to identify.
 * A canvas on top carries short-lived success and rejection effects.
 *
 * Per-frame updates are pushed through the imperative handle instead of React
 * state: the parent already runs one animation loop for the game engine, and
 * re-rendering ~400 SVG nodes at 60fps would be pointless work.
 */

const P01_RGB = [239, 93, 168] as const;
const P02_RGB = [82, 207, 192] as const;

export interface StageFrame {
  p1: SpotlightPoint;
  p2: SpotlightPoint;
  /** Object currently under the player's own light, named on screen. */
  hoverId: string | null;
  lockId: string | null;
  lockProgress: number;
  distractorId: string | null;
  dt: number;
}

export interface StageHandle {
  apply(frame: StageFrame): void;
  celebrate(point: SpotlightPoint): void;
  reject(objectId: string): void;
  reset(): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rgb: readonly [number, number, number];
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  rgb: readonly [number, number, number];
  width: number;
}

function SceneLayer({
  variant,
  foundIds,
}: {
  variant: "dim" | "sharp" | "bloom";
  foundIds: string[];
}) {
  return (
    <div className={`sl-layer sl-layer-${variant}`} aria-hidden="true">
      <div className="sl-layer-inner">
        <SceneArt />
        <div className="sl-object-art">
          {SPOTLIGHT_OBJECTS.map((object) => (
            <span
              key={object.id}
              className={`sl-object-glyph${foundIds.includes(object.id) ? " is-found" : ""}`}
              style={{ left: `${object.x * 100}%`, top: `${object.y * 100}%` }}
            >
              <ObjectGlyph kind={object.kind} color={object.color} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SpotlightStage({
  ref,
  contextMode,
  interactive,
  foundIds,
  revealed = false,
  onMove,
  onSnap,
  ariaLabel,
}: {
  ref?: RefObject<StageHandle | null>;
  contextMode: SpotlightContextMode;
  interactive: boolean;
  foundIds: string[];
  /** Drops the spotlight masks so the finished room is seen whole. */
  revealed?: boolean;
  onMove?: (point: SpotlightPoint) => void;
  onSnap?: (objectId: string, point: SpotlightPoint) => void;
  ariaLabel: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const rejectRef = useRef<HTMLDivElement>(null);

  const fx = useRef({
    particles: [] as Particle[],
    rings: [] as Ring[],
    lockId: null as string | null,
    hoverId: null as string | null,
    distractorId: null as string | null,
    width: 0,
    height: 0,
    reducedMotion: false,
  });

  // Keep the canvas backing store matched to its box, in device pixels.
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    fx.current.reducedMotion = media.matches;
    const onMediaChange = () => {
      fx.current.reducedMotion = media.matches;
    };
    media.addEventListener("change", onMediaChange);

    const resize = () => {
      const rect = root.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const context = canvas.getContext("2d");
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.current.width = rect.width;
      fx.current.height = rect.height;
      // The light radius is a property of the scene, not the viewport.
      root.style.setProperty("--sl-beam", `${rect.width * 0.12}px`);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  const emitBurst = useCallback(
    (point: SpotlightPoint, rgb: readonly [number, number, number], count: number, speed: number) => {
      const { width, height } = fx.current;
      if (!width) return;
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.5;
        const velocity = speed * (0.35 + Math.random() * 0.9);
        fx.current.particles.push({
          x: point.x * width,
          y: point.y * height,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 12,
          life: 1,
          maxLife: 0.7 + Math.random() * 0.7,
          size: 1.2 + Math.random() * 2.6,
          rgb,
        });
      }
    },
    [],
  );

  useImperativeHandle(
    ref,
    (): StageHandle => ({
      apply({ p1, p2, hoverId, lockId, lockProgress, distractorId, dt }) {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        if (!root || !canvas) return;
        const state = fx.current;

        root.style.setProperty("--sl-p1x", `${p1.x * 100}%`);
        root.style.setProperty("--sl-p1y", `${p1.y * 100}%`);
        root.style.setProperty("--sl-p2x", `${p2.x * 100}%`);
        root.style.setProperty("--sl-p2y", `${p2.y * 100}%`);

        // Naming whatever the light is on keeps the WHAT clues answerable:
        // a blurred silhouette is a search problem, an unreadable one is not.
        const caption = captionRef.current;
        if (caption && state.hoverId !== hoverId) {
          state.hoverId = hoverId;
          const object = hoverId ? SPOTLIGHT_OBJECT_BY_ID.get(hoverId) : null;
          if (object) {
            caption.style.left = `${object.x * 100}%`;
            caption.style.top = `${object.y * 100}%`;
            caption.textContent = object.label;
            caption.classList.add("is-active");
          } else {
            caption.classList.remove("is-active");
          }
        }

        // Focus-lock ring.
        const lockElement = lockRef.current;
        if (lockElement) {
          if (lockId && lockProgress > 0.02) {
            const object = SPOTLIGHT_OBJECT_BY_ID.get(lockId);
            if (object) {
              lockElement.style.left = `${object.x * 100}%`;
              lockElement.style.top = `${object.y * 100}%`;
              lockElement.style.setProperty("--sl-lock", `${lockProgress}`);
              if (state.lockId !== lockId) {
                state.lockId = lockId;
                lockElement.classList.add("is-active");
              }
            }
          } else if (state.lockId !== null) {
            state.lockId = null;
            lockElement.classList.remove("is-active");
          }
        }

        // Salient onset.
        const glint = glintRef.current;
        if (glint && state.distractorId !== distractorId) {
          state.distractorId = distractorId;
          const object = distractorId ? SPOTLIGHT_OBJECT_BY_ID.get(distractorId) : null;
          if (object) {
            glint.style.left = `${object.x * 100}%`;
            glint.style.top = `${object.y * 100}%`;
            glint.classList.remove("is-active");
            // Force a reflow so the flash animation restarts on each onset.
            void glint.offsetWidth;
            glint.classList.add("is-active");
          } else {
            glint.classList.remove("is-active");
          }
        }

        const context = canvas.getContext("2d");
        const { width, height } = state;
        if (!context || !width) return;
        const seconds = Math.min(dt, 48) / 1000;

        // Effects are redrawn from a clean canvas so moving lights never leave
        // distracting paths behind them.
        context.clearRect(0, 0, width, height);
        context.globalCompositeOperation = "lighter";

        for (let index = state.rings.length - 1; index >= 0; index -= 1) {
          const ring = state.rings[index];
          ring.life -= seconds * 1.5;
          ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, seconds * 4.5);
          if (ring.life <= 0) {
            state.rings.splice(index, 1);
            continue;
          }
          context.strokeStyle = `rgba(${ring.rgb.join(",")},${ring.life * 0.55})`;
          context.lineWidth = ring.width * ring.life;
          context.beginPath();
          context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
          context.stroke();
        }

        for (let index = state.particles.length - 1; index >= 0; index -= 1) {
          const particle = state.particles[index];
          particle.life -= seconds / particle.maxLife;
          if (particle.life <= 0) {
            state.particles.splice(index, 1);
            continue;
          }
          particle.vy += 58 * seconds;
          particle.vx *= 0.985;
          particle.x += particle.vx * seconds;
          particle.y += particle.vy * seconds;
          context.fillStyle = `rgba(${particle.rgb.join(",")},${particle.life * 0.85})`;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
          context.fill();
        }

        context.globalCompositeOperation = "source-over";
      },

      celebrate(point) {
        const { width, height, reducedMotion } = fx.current;
        if (!width || reducedMotion) return;
        emitBurst(point, [255, 240, 250], 34, 150);
        emitBurst(point, P01_RGB, 22, 110);
        emitBurst(point, P02_RGB, 22, 110);
        fx.current.rings.push({
          x: point.x * width,
          y: point.y * height,
          radius: 8,
          maxRadius: Math.min(width, height) * 0.42,
          life: 1,
          rgb: [255, 245, 252],
          width: 5,
        });
      },

      reject(objectId) {
        const object = SPOTLIGHT_OBJECT_BY_ID.get(objectId);
        const marker = rejectRef.current;
        if (object && marker) {
          marker.style.left = `${object.x * 100}%`;
          marker.style.top = `${object.y * 100}%`;
          marker.classList.remove("is-active");
          // Restart the animation on a repeat rejection of the same object.
          void marker.offsetWidth;
          marker.classList.add("is-active");
        }
        const { width, height, reducedMotion } = fx.current;
        if (!object || !width || reducedMotion) return;
        fx.current.rings.push({
          x: object.x * width,
          y: object.y * height,
          radius: 6,
          maxRadius: 96,
          life: 1,
          rgb: [255, 116, 140],
          width: 4,
        });
      },

      reset() {
        fx.current.particles = [];
        fx.current.rings = [];
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (canvas && context) {
          context.clearRect(0, 0, fx.current.width, fx.current.height);
        }
        lockRef.current?.classList.remove("is-active");
        glintRef.current?.classList.remove("is-active");
        captionRef.current?.classList.remove("is-active");
        rejectRef.current?.classList.remove("is-active");
      },
    }),
    [emitBurst],
  );

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onMove) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onMove({
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    });
  };

  return (
    <div
      ref={rootRef}
      className={`sl-stage sl-context-${contextMode}${revealed ? " is-revealed" : ""}`}
      onPointerMove={handlePointerMove}
      data-lit={Math.min(6, foundIds.length)}
      data-testid="spotlight-scene"
      role="group"
      aria-label={ariaLabel}
    >
      <SceneDefs />

      <SceneLayer variant="dim" foundIds={foundIds} />
      <SceneLayer variant="sharp" foundIds={foundIds} />
      <SceneLayer variant="bloom" foundIds={foundIds} />

      <div className="sl-gel sl-gel-p01" aria-hidden="true" />
      <div className="sl-gel sl-gel-p02" aria-hidden="true" />

      <canvas ref={canvasRef} className="sl-fx" aria-hidden="true" />

      <div ref={glintRef} className="sl-glint" aria-hidden="true">
        <i />
        <i />
      </div>
      <div ref={lockRef} className="sl-lock" aria-hidden="true">
        <span className="sl-lock-ring" />
      </div>
      <div ref={captionRef} className="sl-caption" aria-hidden="true" />
      <div ref={rejectRef} className="sl-reject" aria-hidden="true" />

      {/* Keyboard and assistive path: focusing an object moves your spotlight
          onto it, which is the same input a pointer provides. */}
      <div className="sl-hit-layer">
        {SPOTLIGHT_OBJECTS.map((object) => (
          <button
            key={object.id}
            type="button"
            className="sl-hit"
            style={{ left: `${object.x * 100}%`, top: `${object.y * 100}%` }}
            disabled={!interactive}
            onFocus={() => onSnap?.(object.id, { x: object.x, y: object.y })}
            onClick={() => onSnap?.(object.id, { x: object.x, y: object.y })}
            aria-label={`Move your spotlight to the ${object.label.toLowerCase()}`}
            data-testid={`spotlight-${object.id}`}
          />
        ))}
      </div>
    </div>
  );
}
