"use client";

import type { CSSProperties, PointerEvent } from "react";
import type {
  SpotlightContextMode,
  SpotlightObject,
  SpotlightObjectKind,
  SpotlightPoint,
  SpotlightPositions,
} from "@/lib/spotlight-sync/types";

function SceneObjectGlyph({
  kind,
  color,
}: {
  kind: SpotlightObjectKind;
  color: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="rgba(17, 7, 26, .38)" />
      <circle cx="24" cy="24" r="17" fill={color} opacity=".16" />
      {kind === "mug" && (
        <g {...common}>
          <path d="M15 18h19v15a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5z" fill={color} opacity=".78" />
          <path d="M34 22h3.2a4.8 4.8 0 0 1 0 9.6H34" />
          <path d="M19 14c0 2 2 2 2 4M27 14c0 2 2 2 2 4" />
        </g>
      )}
      {kind === "key" && (
        <g {...common}>
          <circle cx="18" cy="22" r="6" fill={color} opacity=".75" />
          <path d="m23 26 12 12M29 32l4-4M33 36l4-4" />
        </g>
      )}
      {kind === "flask" && (
        <g {...common}>
          <path d="M20 11h8M22 11v10l-9 15a2 2 0 0 0 1.8 3h18.4a2 2 0 0 0 1.8-3l-9-15V11" />
          <path d="M17 31h14" stroke={color} strokeWidth="5" opacity=".72" />
          <circle cx="24" cy="34" r="1.7" fill="white" stroke="none" />
        </g>
      )}
      {kind === "moth" && (
        <g {...common}>
          <path d="M23 22C17 13 8 13 9 22c1 6 8 8 14 5" fill={color} opacity=".65" />
          <path d="M25 22c6-9 15-9 14 0-1 6-8 8-14 5" fill={color} opacity=".65" />
          <path d="M24 19v17M21 15l3 4 3-4" />
        </g>
      )}
      {kind === "plant" && (
        <g {...common}>
          <path d="M18 29h13l-2 10h-9z" fill={color} opacity=".65" />
          <path d="M24 29V13M24 20c-8 0-9-7-9-7 7-1 9 3 9 7ZM24 24c8 0 9-7 9-7-7-1-9 3-9 7Z" />
        </g>
      )}
      {kind === "clock" && (
        <g {...common}>
          <circle cx="24" cy="24" r="13" fill={color} opacity=".28" />
          <path d="M24 16v9l6 3" />
        </g>
      )}
      {kind === "camera" && (
        <g {...common}>
          <path d="M12 19h8l3-4h7l3 4h4v18H12z" fill={color} opacity=".25" />
          <circle cx="25" cy="28" r="6" />
        </g>
      )}
      {kind === "notebook" && (
        <g {...common}>
          <path d="M15 12h20v27H15z" fill={color} opacity=".58" />
          <path d="M20 12v27M24 19h7M24 25h7M24 31h5" />
        </g>
      )}
      {kind === "star" && (
        <path
          d="m24 10 4.3 9 9.7 1.4-7 6.9 1.7 9.7-8.7-4.6-8.7 4.6 1.7-9.7-7-6.9 9.7-1.4z"
          fill={color}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {kind === "specimen" && (
        <g {...common}>
          <path d="M16 14h16M18 14v5l-2 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V22l-2-3v-5" />
          <path d="M18 27h12v9H18z" fill={color} opacity=".65" />
          <path d="M22 32c3-4 5-4 6-1" />
        </g>
      )}
      {kind === "glasses" && (
        <g {...common}>
          <circle cx="17" cy="27" r="7" />
          <circle cx="33" cy="27" r="7" />
          <path d="M24 27h2M10 25l-3-2M40 25l3-2" />
        </g>
      )}
      {kind === "headphones" && (
        <g {...common}>
          <path d="M13 27v-4a11 11 0 0 1 22 0v4" />
          <path d="M12 26h6v11h-3a3 3 0 0 1-3-3zM36 26h-6v11h3a3 3 0 0 0 3-3z" fill={color} opacity=".55" />
        </g>
      )}
    </svg>
  );
}

function SpotlightBeam({
  point,
  participant,
}: {
  point: SpotlightPoint | null;
  participant: "P01" | "P02";
}) {
  if (!point) return null;
  return (
    <span
      aria-hidden="true"
      className={`spotlight-beam spotlight-beam-${participant.toLowerCase()}`}
      style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
    />
  );
}

export function SpotlightScene({
  objects,
  positions,
  contextMode,
  selected,
  partnerSelected,
  revealedTargetId,
  interactive,
  onMove,
  onSelect,
}: {
  objects: SpotlightObject[];
  positions: SpotlightPositions;
  contextMode: SpotlightContextMode;
  selected?: string | null;
  partnerSelected?: string | null;
  revealedTargetId?: string | null;
  interactive: boolean;
  onMove?: (point: SpotlightPoint) => void;
  onSelect?: (objectId: string) => void;
}) {
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
      className={`spotlight-scene spotlight-context-${contextMode}`}
      onPointerMove={handlePointerMove}
      data-testid="spotlight-scene"
    >
      <svg
        className="spotlight-room"
        viewBox="0 0 1000 620"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="An illustrated attention laboratory with shelves, a workbench, a desk, and a moonlit window"
      >
        <defs>
          <linearGradient id="spotlight-wall" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#332141" />
            <stop offset=".58" stopColor="#25142f" />
            <stop offset="1" stopColor="#170b21" />
          </linearGradient>
          <linearGradient id="spotlight-floor" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#351c3d" />
            <stop offset="1" stopColor="#160b1c" />
          </linearGradient>
          <linearGradient id="window-night" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#171638" />
            <stop offset="1" stopColor="#4a2557" />
          </linearGradient>
          <radialGradient id="window-moon">
            <stop stopColor="#fff6cf" />
            <stop offset="1" stopColor="#d9c9ef" />
          </radialGradient>
        </defs>
        <rect width="1000" height="620" fill="url(#spotlight-wall)" />
        <path d="M0 458 1000 420v200H0z" fill="url(#spotlight-floor)" />
        <g className="spotlight-scene-context">
          <path d="M0 456 1000 418" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
          <path d="M76 70h233v366H76z" fill="#1b1023" stroke="#6f4e78" strokeWidth="5" />
          <path d="M91 174h203M91 286h203M91 397h203" stroke="#6f4e78" strokeWidth="9" />
          <path d="M110 132h54v39h-54zM185 108h34v63h-34zM235 124h42v47h-42z" fill="#70527d" opacity=".58" />
          <path d="M104 241h69v42h-69zM206 226h51v57h-51zM121 351h45v43h-45zM194 332h77v62h-77z" fill="#765280" opacity=".42" />
          <rect x="732" y="56" width="220" height="274" rx="8" fill="url(#window-night)" stroke="#795b83" strokeWidth="8" />
          <path d="M842 58v270M734 192h216" stroke="#795b83" strokeWidth="7" />
          <circle cx="895" cy="114" r="38" fill="url(#window-moon)" opacity=".9" />
          <circle cx="779" cy="101" r="3" fill="white" />
          <circle cx="821" cy="147" r="2.5" fill="white" />
          <circle cx="929" cy="237" r="3" fill="white" />
          <path d="M842 330c-35 66-46 83-102 111" fill="none" stroke="#6f4e78" strokeWidth="5" opacity=".48" />
          <path d="M355 166h162v17H355z" fill="#765180" />
          <path d="M377 184h118v82H377z" fill="#211129" stroke="#64496d" strokeWidth="4" />
          <path d="M398 205h76M398 223h55" stroke="#cc83af" strokeWidth="7" opacity=".38" />
          <path d="M309 431h392v25H309z" fill="#765180" />
          <path d="M343 456h22v145h-22zM647 456h22v145h-22z" fill="#49304f" />
          <path d="M703 471h260v25H703z" fill="#765180" />
          <path d="M729 496h22v105h-22zM922 496h22v105h-22z" fill="#49304f" />
          <path d="M758 427v-61c0-35 52-35 52 0v61" fill="none" stroke="#d19a6d" strokeWidth="12" />
          <path d="M746 428h76" stroke="#f0b178" strokeWidth="12" strokeLinecap="round" />
          <ellipse cx="784" cy="437" rx="69" ry="18" fill="#e7a56f" opacity=".13" />
          <path d="M518 430c8-40 7-79-6-120M524 430c31-49 57-66 88-78" fill="none" stroke="#5ca181" strokeWidth="7" />
          <path d="M503 349c-36-4-44-27-44-27 32-9 47 3 44 27ZM551 389c40-4 52-28 52-28-34-10-53 4-52 28Z" fill="#5ca181" opacity=".74" />
          <path d="M484 415h72l-10 43h-52z" fill="#945c83" />
          <path d="M0 84c162 32 245-15 383 18 128 31 246 11 338-20 105-36 184-24 279 5" fill="none" stroke="#d96da5" strokeWidth="4" opacity=".12" />
        </g>
        <rect width="1000" height="620" fill="rgba(12,5,18,.38)" />
      </svg>

      <div className="spotlight-ambient" aria-hidden="true" />
      <SpotlightBeam point={positions.P01} participant="P01" />
      <SpotlightBeam point={positions.P02} participant="P02" />

      <div className="spotlight-object-layer">
        {objects.map((object) => {
          const isSelected = selected === object.id;
          const isPartnerSelected = partnerSelected === object.id;
          const isRevealed = revealedTargetId === object.id;
          const style = {
            left: `${object.x * 100}%`,
            top: `${object.y * 100}%`,
            "--spotlight-object-color": object.color,
          } as CSSProperties;

          return (
            <button
              key={object.id}
              type="button"
              className={`spotlight-object ${isSelected ? "is-selected" : ""} ${
                isPartnerSelected ? "is-partner-selected" : ""
              } ${isRevealed ? "is-revealed" : ""}`}
              style={style}
              disabled={!interactive || Boolean(selected)}
              onFocus={() => onMove?.({ x: object.x, y: object.y })}
              onClick={() => onSelect?.(object.id)}
              aria-label={`Focus ${object.label}`}
              data-testid={`spotlight-${object.id}`}
            >
              <SceneObjectGlyph kind={object.kind} color={object.color} />
              {isSelected && <span className="spotlight-object-tag">You</span>}
              {isPartnerSelected && <span className="spotlight-object-tag partner">Partner</span>}
            </button>
          );
        })}
      </div>

      <div className="spotlight-legend" aria-hidden="true">
        <span><i className="p01" /> P01</span>
        <span><i className="p02" /> P02</span>
        <span><i className="joint" /> Shared focus</span>
      </div>
    </div>
  );
}

