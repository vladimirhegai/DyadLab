import type { SpotlightObjectKind } from "@/lib/spotlight-sync/types";

/**
 * Searchable objects. Each glyph is drawn in a 48 x 48 box standing on an
 * implied surface at y = 43, so objects sit on the bench, shelf, or floor
 * rather than floating. Colour comes from the object definition, which is what
 * the WHAT clues refer to, so the fills carry task meaning and are not decorative.
 */

const OUTLINE = "rgba(20, 8, 30, 0.55)";

function shade(color: string) {
  return { fill: color, stroke: OUTLINE, strokeWidth: 1.4, strokeLinejoin: "round" as const };
}

export function ObjectGlyph({
  kind,
  color,
}: {
  kind: SpotlightObjectKind;
  color: string;
}) {
  const s = shade(color);
  const line = {
    fill: "none",
    stroke: OUTLINE,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {/* Contact shadow keeps every object grounded on its surface. */}
      <ellipse cx="24" cy="44" rx="13" ry="3.2" fill="rgba(8,3,14,0.5)" />

      {kind === "mug" && (
        <g>
          <path d="M13 20h20v15a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8z" {...s} />
          <path d="M33 24h4a5 5 0 0 1 0 10h-4" fill="none" stroke={color} strokeWidth="3.4" />
          <path d="M16 24h14" stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      {kind === "key" && (
        <g>
          <circle cx="16" cy="21" r="7.5" fill="none" stroke={color} strokeWidth="4" />
          <path d="M21 26 36 41M30 35l4-4M34 39l3.5-3.5" {...line} stroke={color} strokeWidth="4" />
          <circle cx="16" cy="21" r="2.6" fill="rgba(12,5,20,0.75)" />
        </g>
      )}

      {kind === "flask" && (
        <g>
          <path d="M19 8h10v13l10 17a3 3 0 0 1-2.6 4.6H11.6A3 3 0 0 1 9 38l10-17z" fill="rgba(255,255,255,0.14)" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M14.5 30h19l5.5 8a3 3 0 0 1-2.6 4.6H11.6A3 3 0 0 1 9 38z" fill={color} />
          <path d="M17 8h14" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="21" cy="36" r="1.6" fill="rgba(255,255,255,0.7)" />
          <circle cx="27" cy="39" r="1.1" fill="rgba(255,255,255,0.5)" />
        </g>
      )}

      {kind === "moth" && (
        <g>
          <path d="M23 26C16 15 5 15 6 25c1 7 9 10 17 6z" {...s} />
          <path d="M25 26c7-11 18-11 17-1-1 7-9 10-17 6z" {...s} />
          <path d="M23 32c-5 6-11 6-11 1 0-4 5-6 11-4zM25 32c5 6 11 6 11 1 0-4-5-6-11-4z" fill={color} opacity="0.7" />
          <path d="M24 18v18" stroke="rgba(20,8,30,0.7)" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M21 14l3 4 3-4" {...line} />
        </g>
      )}

      {kind === "plant" && (
        <g>
          <path d="M15 30h18l-2.4 13H17.4z" fill="#b46a4a" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M24 30V12" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M24 20c-9 0-11-8-11-8 8-2 11 3 11 8ZM24 26c9 0 11-8 11-8-8-2-11 3-11 8ZM24 14c-6-1-7-7-7-7 5-1 7 3 7 7Z" {...s} />
          <path d="M13 30h22" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        </g>
      )}

      {kind === "ivy" && (
        <g>
          <path d="M15 10h18l-2 9H17z" fill="#8a6091" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M20 19c-3 8-1 14-6 20M26 19c2 9 6 12 6 20" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <g fill={color}>
            <ellipse cx="16" cy="28" rx="3.4" ry="2.4" transform="rotate(-25 16 28)" />
            <ellipse cx="14" cy="36" rx="3.2" ry="2.2" transform="rotate(-15 14 36)" />
            <ellipse cx="31" cy="29" rx="3.4" ry="2.4" transform="rotate(25 31 29)" />
            <ellipse cx="33" cy="37" rx="3" ry="2.1" transform="rotate(15 33 37)" />
            <ellipse cx="23" cy="24" rx="3" ry="2.2" />
          </g>
        </g>
      )}

      {kind === "clock" && (
        <g>
          <circle cx="24" cy="24" r="15" fill="#241436" stroke={color} strokeWidth="3.4" />
          <circle cx="24" cy="24" r="10" fill="rgba(255,255,255,0.08)" />
          <path d="M24 16v9l6 3.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="24" cy="24" r="1.8" fill={color} />
        </g>
      )}

      {kind === "camera" && (
        <g>
          <path d="M8 18h9l3-4h8l3 4h9v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" {...s} />
          <circle cx="24" cy="28" r="8" fill="#1c1028" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
          <circle cx="24" cy="28" r="3.4" fill="rgba(255,255,255,0.24)" />
          <circle cx="35" cy="22" r="1.6" fill="rgba(255,255,255,0.5)" />
        </g>
      )}

      {kind === "notebook" && (
        <g>
          <path d="M12 9h24v34H12z" {...s} />
          <path d="M12 9h5v34h-5z" fill="rgba(12,5,20,0.35)" />
          <path d="M22 18h10M22 25h10M22 32h7" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {kind === "books" && (
        <g>
          <path d="M10 34h28v9H10z" fill={color} stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M12 25h24v9H12z" fill="#8a6091" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M14 16h21v9H14z" fill="#f3c96b" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M14 38h24M16 29h20M18 20h13" stroke="rgba(255,255,255,0.32)" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}

      {kind === "star" && (
        <g>
          <path d="M24 6v6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" />
          <path d="m24 11 4.6 9.6 10.4 1.5-7.5 7.4 1.8 10.5L24 35l-9.3 5 1.8-10.5-7.5-7.4 10.4-1.5z" {...s} />
        </g>
      )}

      {kind === "specimen" && (
        <g>
          <path d="M17 9h14v4l-2 3v20a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V16l-2-3z" fill="rgba(255,255,255,0.16)" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M19 24h10v12a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4z" fill={color} />
          <path d="M16 8h16" stroke="#8a6091" strokeWidth="4" strokeLinecap="round" />
          <path d="M21 32c2-4 4-4 5-1" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}

      {kind === "glasses" && (
        <g>
          <circle cx="15" cy="28" r="8" fill="rgba(255,255,255,0.12)" stroke={color} strokeWidth="2.6" />
          <circle cx="33" cy="28" r="8" fill="rgba(255,255,255,0.12)" stroke={color} strokeWidth="2.6" />
          <path d="M23 27h2M7 24l-4-3M41 24l4-3" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      {kind === "headphones" && (
        <g>
          <path d="M11 30v-6a13 13 0 0 1 26 0v6" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M8 28h7v14H11a3 3 0 0 1-3-3zM40 28h-7v14h4a3 3 0 0 0 3-3z" {...s} />
        </g>
      )}

      {kind === "bulb" && (
        <g>
          <path d="M24 4v6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.6" />
          <path d="M24 10a12 12 0 0 1 7 21.7V35H17v-3.3A12 12 0 0 1 24 10z" fill={color} opacity="0.85" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M17 35h14v4a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="#8a6091" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M21 30c0-5-2-6-2-9M27 30c0-5 2-6 2-9" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}

      {kind === "crate" && (
        <g>
          <path d="M9 18h30v25H9z" {...s} />
          <path d="M9 24h30M9 36h30M17 18v25M31 18v25" stroke="rgba(20,8,30,0.4)" strokeWidth="2" />
          <path d="M9 18h30v3H9z" fill="rgba(255,255,255,0.22)" />
        </g>
      )}

      {kind === "toolbox" && (
        <g>
          <path d="M8 24h32v19H8z" {...s} />
          <path d="M10 18h28v6H10z" fill="rgba(12,5,20,0.35)" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M18 18v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" fill="none" stroke={color} strokeWidth="2.6" />
          <path d="M8 32h32" stroke="rgba(20,8,30,0.4)" strokeWidth="2" />
        </g>
      )}

      {kind === "spool" && (
        <g>
          <path d="M13 16h22v26H13z" fill="#3a2748" stroke={OUTLINE} strokeWidth="1.4" />
          <path d="M9 13h30v6H9zM9 39h30v5H9z" {...s} />
          <path d="M15 22h18M15 27h18M15 32h18M15 37h18" stroke={color} strokeWidth="2.2" opacity="0.65" />
        </g>
      )}

      {kind === "boot" && (
        <g>
          <path d="M16 8h11v20c0 5 3 6 8 8 3 1.4 4 3 4 5v2H16z" {...s} />
          <path d="M16 39h23v4H16z" fill="rgba(12,5,20,0.5)" />
          <path d="M17 16h9" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4" />
        </g>
      )}

      {kind === "can" && (
        <g>
          <path d="M14 20h18v18a4 4 0 0 1-4 4h-10a4 4 0 0 1-4-4z" {...s} />
          <path d="M32 24 43 16l2 3-11 9z" fill={color} stroke={OUTLINE} strokeWidth="1.2" />
          <path d="M16 20c0-5 4-8 7-8s7 3 7 8" fill="none" stroke={color} strokeWidth="2.6" />
          <path d="M17 26h12" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
