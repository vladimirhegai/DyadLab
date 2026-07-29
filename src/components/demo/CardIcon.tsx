import type { AbstractCard } from "@/lib/demo/types";

function ShapePath({ shape }: { shape: AbstractCard["shape"] }) {
  switch (shape) {
    case "circle":
      return <circle cx="12" cy="12" r="8" />;
    case "square":
      return <rect x="5" y="5" width="14" height="14" rx="2" />;
    case "diamond":
      return <rect x="6" y="6" width="12" height="12" rx="1.5" transform="rotate(45 12 12)" />;
    case "triangle":
      return <path d="M12 4 L20 19 L4 19 Z" />;
    case "hexagon":
      return <path d="M12 3 L20 8 V16 L12 21 L4 16 V8 Z" />;
    case "star":
      return (
        <path d="M12 3 L14.6 9.2 L21.3 9.6 L16.1 13.9 L18 20.4 L12 16.7 L6 20.4 L7.9 13.9 L2.7 9.6 L9.4 9.2 Z" />
      );
  }
}

export function CardIcon({ card, size = 22 }: { card: AbstractCard; size?: number }) {
  const patternId = `pattern-${card.id}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {card.pattern === "striped" && (
        <defs>
          <pattern id={patternId} width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill={card.color} />
          </pattern>
        </defs>
      )}
      {card.pattern === "dotted" && (
        <defs>
          <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={card.color} />
          </pattern>
        </defs>
      )}
      <g fill={card.pattern === "solid" ? card.color : `url(#${patternId})`} stroke={card.color} strokeWidth="1">
        <ShapePath shape={card.shape} />
      </g>
    </svg>
  );
}
