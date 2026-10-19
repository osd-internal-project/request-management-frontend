import { useId } from "react";

/**
 * The ผู้ช่วย AI mark: a robot speech bubble on a rounded tile. Drawn in
 * `currentColor` with the bubble cut out, so it follows the button's colour —
 * brand blue on a plain button, white on a primary one.
 */
export function AssistantIcon({ className }: { className?: string }) {
  // Unique per instance: the header can render the button twice (desktop + drawer).
  const id = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const maskId = `assistant-icon-mask-${id}`;
  const glossId = `assistant-icon-gloss-${id}`;

  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="#fff" />
          {/* Antenna and bubble: holes the button background shows through. */}
          <circle cx="12" cy="5.4" r="1.35" fill="#000" />
          <rect x="11.45" y="6.4" width="1.1" height="2.6" rx="0.55" fill="#000" />
          <rect x="10.5" y="8.4" width="3" height="1.4" rx="0.7" fill="#000" />
          <path
            fill="#000"
            d="M9.4 9.6h5.2a4.1 4.1 0 0 1 0 8.2H9.9l-2.9 1.7a.45.45 0 0 1-.66-.52l.73-2.2A4.1 4.1 0 0 1 9.4 9.6Z"
          />
          {/* Face, back in the tile colour. */}
          <circle cx="9.9" cy="12.9" r="0.95" fill="#fff" />
          <circle cx="14.1" cy="12.9" r="0.95" fill="#fff" />
          <path
            d="M10.6 15.1q1.4 1.2 2.8 0"
            fill="none"
            stroke="#fff"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </mask>
        <linearGradient id={glossId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g mask={`url(#${maskId})`}>
        <rect x="1" y="1" width="22" height="22" rx="6.5" />
        {/* The source art's light top-left; invisible when the icon is white. */}
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#${glossId})`} />
      </g>
    </svg>
  );
}
