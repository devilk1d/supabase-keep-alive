interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="6.5"
        className="fill-bg-secondary stroke-border-strong"
        strokeWidth="1.25"
      />
      <path
        d="M9 10.5C9 9.12 12.13 8 16 8C19.87 8 23 9.12 23 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        d="M9 21.5C9 22.88 12.13 24 16 24C19.87 24 23 22.88 23 21.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        d="M6.5 16H10.5L13.2 11.5L17.2 20.5L19.8 16H23.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25.5" cy="16" r="1.75" fill="#16A34A" />
    </svg>
  );
}
