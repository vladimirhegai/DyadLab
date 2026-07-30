/**
 * The bot partner's camera feed.
 *
 * Authored flat vector art rather than a photo or a stock illustration: the
 * project has no real imagery, and a drawn face is honest about being a bot
 * while still giving the tile something human to look at. Blink and mouth
 * movement are CSS-driven so the tile reads as a live feed.
 */
export function BotFace({ speaking }: { speaking: boolean }) {
  return (
    <svg
      className={`bot-face${speaking ? " is-speaking" : ""}`}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Illustrated avatar of the bot partner"
    >
      <defs>
        <clipPath id="bot-face-clip">
          <circle cx="100" cy="100" r="100" />
        </clipPath>
      </defs>

      <g clipPath="url(#bot-face-clip)">
        <rect width="200" height="200" fill="#f6e3c8" />
        {/* Hair mass behind the head */}
        <path d="M14 200c-14-70 2-134 44-164 40-28 92-24 118 12 24 34 22 92 8 152z" fill="#3a2338" />

        {/* Shoulders */}
        <path d="M32 200c6-30 26-48 68-52 42 4 62 22 68 52z" fill="#a4557f" />
        <path d="M96 152h8c0 12 6 18 6 18h-20s6-6 6-18z" fill="#f0b08a" />

        {/* Face */}
        <path
          d="M62 74c0-24 18-40 40-40s38 16 38 40v22c0 28-18 46-38 46s-40-18-40-46z"
          fill="#f8c19b"
        />
        {/* Front hair sweep */}
        <path d="M56 78c-4-32 18-52 46-52 26 0 44 14 48 34-18-10-34-2-46 8-14 12-18 10-48 10z" fill="#3a2338" />
        <path d="M132 44c14 10 20 26 18 44-8-6-12-18-18-24z" fill="#4a2d46" />

        {/* Ear */}
        <path d="M60 92c-6-4-12 0-11 7 1 8 7 12 12 11z" fill="#f0b08a" />

        {/* Brows */}
        <g className="bot-brows" fill="#3a2338">
          <path d="M78 82c6-5 15-5 20-1l-1 5c-6-3-13-3-19 1z" />
          <path d="M112 81c6-4 15-3 20 2l-2 4c-5-4-12-5-18-2z" />
        </g>

        {/* Eyes */}
        <g className="bot-eyes" fill="#2c1a2b">
          <ellipse cx="88" cy="96" rx="5" ry="6" />
          <ellipse cx="122" cy="96" rx="5" ry="6" />
        </g>

        {/* Blush + nose */}
        <path d="M74 108c4-2 8-1 10 2" fill="none" stroke="#e69a76" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M104 98v8c0 3-3 4-6 4" fill="none" stroke="#e0916f" strokeWidth="2.5" strokeLinecap="round" />

        {/* Mouth: a closed smile that opens while speaking */}
        <path className="bot-mouth" d="M90 118c6 8 18 8 25 0" fill="none" stroke="#2c1a2b" strokeWidth="3.4" strokeLinecap="round" />
        <ellipse className="bot-mouth-open" cx="102" cy="120" rx="9" ry="6" fill="#2c1a2b" />
      </g>
    </svg>
  );
}
