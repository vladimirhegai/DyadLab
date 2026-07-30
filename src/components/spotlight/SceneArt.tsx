/**
 * The Spotlight Sync room, authored as vector art in a 1000 x 620 box.
 *
 * The scene is drawn three times by SpotlightStage — dim, sharp, and bloomed —
 * with different masks, so this component stays purely declarative and holds no
 * state. Gradients live in <SceneDefs>, which is mounted once per stage; SVG
 * paint references resolve document-wide, so all three copies share them.
 *
 * Structure follows the Surface Guidance Framework: an upper band of wall
 * shelving, pegboard, pendant and window; a mid band of bench and desk; a lower
 * band of floor. Everything drawn here is scenery — the searchable objects are
 * rendered above it by SpotlightStage.
 */

export function SceneDefs() {
  return (
    <svg className="sl-defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sl-wall" x1="0" x2="0.7" y1="0" y2="1">
          <stop offset="0" stopColor="#412a58" />
          <stop offset="0.55" stopColor="#2e1745" />
          <stop offset="1" stopColor="#1d0d2c" />
        </linearGradient>
        <linearGradient id="sl-floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3c1f4a" />
          <stop offset="1" stopColor="#150819" />
        </linearGradient>
        <linearGradient id="sl-night" x1="0.1" x2="0.9" y1="0" y2="1">
          <stop offset="0" stopColor="#101033" />
          <stop offset="0.6" stopColor="#2b1747" />
          <stop offset="1" stopColor="#4a2456" />
        </linearGradient>
        <radialGradient id="sl-moon">
          <stop offset="0" stopColor="#fff8de" />
          <stop offset="0.7" stopColor="#f3e2c0" />
          <stop offset="1" stopColor="#d9c9ef" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sl-wood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8a5f3c" />
          <stop offset="1" stopColor="#5a3a26" />
        </linearGradient>
        <linearGradient id="sl-wood-front" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4c3020" />
          <stop offset="1" stopColor="#2e1c16" />
        </linearGradient>
        <linearGradient id="sl-rug" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5a1c48" />
          <stop offset="0.5" stopColor="#75235a" />
          <stop offset="1" stopColor="#4a1740" />
        </linearGradient>
        <radialGradient id="sl-lamp-glow">
          <stop offset="0" stopColor="#ffd489" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb765" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sl-shelf-glow">
          <stop offset="0" stopColor="#7fe0d4" stopOpacity="0.6" />
          <stop offset="1" stopColor="#7fe0d4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sl-aurora" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#52cfc0" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#a989e8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ef5da8" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SceneArt({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`sl-art ${className}`}
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* ---------- shell ---------- */}
      <rect width="1000" height="620" fill="url(#sl-wall)" />

      {/* ---------- upper band: window ---------- */}
      <g className="sl-window">
        <rect x="716" y="34" width="272" height="214" rx="10" fill="url(#sl-night)" />
        <circle cx="892" cy="88" r="34" fill="url(#sl-moon)" />
        <g fill="#ffffff">
          <circle cx="758" cy="72" r="2.4" opacity="0.9" />
          <circle cx="806" cy="118" r="1.8" opacity="0.7" />
          <circle cx="770" cy="176" r="2" opacity="0.6" />
          <circle cx="946" cy="150" r="2.2" opacity="0.75" />
          <circle cx="856" cy="60" r="1.6" opacity="0.55" />
          <circle cx="930" cy="216" r="1.9" opacity="0.5" />
        </g>
        {/* Distant treeline so the glass reads as a view, not a panel. */}
        <path
          className="sl-detail"
          d="M716 248v-34l24-22 18 20 20-30 26 32 22-18 26 26 24-14 22 20 26-24 20 22 24-16 20 18v20z"
          fill="#150b26"
          opacity="0.85"
        />
        <path
          className="sl-aurora"
          d="M722 60c70 34 150 6 210 44 30 19 44 46 50 76-72-22-140 2-198-30-34-19-52-52-62-90z"
          fill="url(#sl-aurora)"
        />
        <g stroke="#7d5f88" strokeWidth="7" fill="none">
          <rect x="716" y="34" width="272" height="214" rx="10" />
          <path d="M852 36v210M718 141h268" />
        </g>
        {/* Curtain */}
        <path className="sl-detail" d="M988 30c22 44 20 130 4 226l-36-10c14-72 16-146 6-214z" fill="#6a2a58" opacity="0.85" />
        <path d="M974 32c10 60 10 138 0 210" stroke="#8c3a72" strokeWidth="4" fill="none" opacity="0.7" />
        <rect x="700" y="248" width="300" height="12" rx="4" fill="#6f4e78" />
      </g>

      {/* ---------- upper band: wall shelving ---------- */}
      <g className="sl-shelf">
        <rect x="26" y="52" width="312" height="216" rx="6" fill="#2a1739" />
        <g fill="#6f4e78">
          <rect x="26" y="52" width="312" height="9" rx="4" />
          <rect x="26" y="140" width="312" height="11" rx="4" />
          <rect x="26" y="232" width="312" height="11" rx="4" />
          <rect x="26" y="52" width="10" height="191" />
          <rect x="328" y="52" width="10" height="191" />
        </g>
        {/* Low-contrast filler so the searchable objects sit in a real context. */}
        <g className="sl-detail" opacity="0.42">
          <rect x="128" y="98" width="46" height="42" rx="3" fill="#5f4470" />
          <rect x="252" y="86" width="30" height="54" rx="3" fill="#6b4a75" />
          <rect x="286" y="104" width="24" height="36" rx="3" fill="#553d63" />
          <rect x="52" y="196" width="52" height="36" rx="3" fill="#5f4470" />
          <rect x="216" y="188" width="72" height="44" rx="4" fill="#66486f" />
          <path d="M196 232v-30h14v30z" fill="#6b4a75" />
        </g>
        <rect className="sl-shelf-strip" x="40" y="146" width="284" height="4" rx="2" fill="#7fe0d4" />
        <ellipse className="sl-shelf-halo" cx="182" cy="176" rx="170" ry="52" fill="url(#sl-shelf-glow)" />
      </g>

      {/* ---------- upper band: pegboard + pendant ---------- */}
      <g className="sl-pegboard">
        <rect x="356" y="46" width="180" height="130" rx="6" fill="#2c1a3c" stroke="#5d4269" strokeWidth="4" />
        <g className="sl-detail" fill="#4a3457" opacity="0.55">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4, 5].map((col) => (
              <circle key={`${row}-${col}`} cx={378 + col * 28} cy={68 + row * 24} r="2.4" />
            )),
          )}
        </g>
        <rect x="452" y="72" width="66" height="46" rx="3" fill="#e6d6c4" opacity="0.5" transform="rotate(-4 485 95)" />
        <rect x="462" y="122" width="52" height="38" rx="3" fill="#d5a7c6" opacity="0.35" transform="rotate(5 488 141)" />
        <path d="M366 154h56M366 164h34" stroke="#6b4a75" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      </g>

      <g className="sl-pendant">
        <path d="M598 0v88" stroke="#6f4e78" strokeWidth="3" />
        <path d="M572 88h52l-10 22h-32z" fill="#8a6091" />
        <ellipse className="sl-lamp-halo" cx="598" cy="150" rx="120" ry="86" fill="url(#sl-lamp-glow)" />
      </g>

      {/* ---------- mid band: bench and desk ---------- */}
      <g className="sl-bench">
        {/* Bench (left + centre), top edge at y=384 */}
        <rect x="34" y="384" width="580" height="15" rx="5" fill="url(#sl-wood)" />
        <rect x="34" y="399" width="580" height="12" fill="url(#sl-wood-front)" />
        <rect x="66" y="411" width="16" height="52" fill="#3a2419" />
        <rect x="562" y="411" width="16" height="52" fill="#3a2419" />
        <rect x="112" y="411" width="180" height="46" rx="4" fill="#2f1d24" />
        <path d="M136 434h60M212 434h56" stroke="#6f4e78" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
        {/* Bench clutter */}
        <g className="sl-detail" opacity="0.5">
          <rect x="222" y="366" width="52" height="18" rx="2" fill="#e6d6c4" transform="rotate(-2 248 375)" />
          <rect x="452" y="364" width="44" height="20" rx="3" fill="#5f4470" />
          <path d="M336 384v-26h10v26z" fill="#6b4a75" />
        </g>

        {/* Desk (right), raised top edge at y=340 */}
        <rect x="632" y="340" width="336" height="14" rx="5" fill="url(#sl-wood)" />
        <rect x="632" y="354" width="336" height="11" fill="url(#sl-wood-front)" />
        <rect x="652" y="365" width="15" height="98" fill="#3a2419" />
        <rect x="936" y="365" width="15" height="98" fill="#3a2419" />
        <rect x="706" y="365" width="150" height="70" rx="4" fill="#2f1d24" />
        <path d="M730 388h48M730 412h72" stroke="#6f4e78" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
        {/* Monitor, so the desk reads as a workstation */}
        <g className="sl-monitor sl-detail">
          <rect x="588" y="238" width="124" height="86" rx="6" fill="#160c22" stroke="#5d4269" strokeWidth="4" />
          <rect className="sl-monitor-screen" x="598" y="248" width="104" height="66" rx="3" fill="#2a1740" />
          <path d="M642 324h16v14h-16z" fill="#4a3457" />
          <path d="M620 338h60" stroke="#4a3457" strokeWidth="7" strokeLinecap="round" />
        </g>
        {/* Chair silhouette */}
        <path
          className="sl-detail"
          d="M760 470v-58a26 26 0 0 1 26-26h44a26 26 0 0 1 26 26v58"
          fill="none"
          stroke="#3d2748"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      {/* ---------- lower band: floor ---------- */}
      <g className="sl-floor">
        <path d="M0 452h1000v168H0z" fill="url(#sl-floor)" />
        <path d="M0 452h1000" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <ellipse className="sl-detail" cx="520" cy="548" rx="330" ry="62" fill="url(#sl-rug)" opacity="0.5" />
      </g>

      {/* Ambient floor pool from the pendant, revealed as the room lights up. */}
      <ellipse className="sl-room-pool" cx="520" cy="500" rx="380" ry="96" fill="url(#sl-lamp-glow)" />
    </svg>
  );
}
