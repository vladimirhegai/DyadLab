/**
 * Reproduces quadlab.ca's signature wavy seam between a gradient/deep-color
 * band and a white band. `flip` mirrors it for a wave-up transition.
 */
export function WaveDivider({
  color = "var(--color-bg)",
  flip = false,
  className = "",
}: {
  color?: string;
  flip?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1440 110"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block h-[56px] w-full md:h-[92px] ${flip ? "-scale-y-100" : ""} ${className}`}
    >
      <path
        d="M0,32 C 240,96 480,0 720,28 C 960,56 1200,104 1440,40 L1440,110 L0,110 Z"
        fill={color}
      />
    </svg>
  );
}
