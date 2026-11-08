import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Timbangan hukum — logo aplikasi. */
export function IconLogo(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5.5v14" />
      <path d="M7.5 19.5h9" />
      <path d="M5 8h14" />
      <circle cx="12" cy="5" r="1.4" />
      <path d="M5 8l-2.6 5.6a2.9 2.9 0 0 0 5.2 0z" />
      <path d="M19 8l-2.6 5.6a2.9 2.9 0 0 0 5.2 0z" />
    </svg>
  );
}

export function IconPlus(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSearch(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconSend(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

export function IconChat(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12Z" />
    </svg>
  );
}

export function IconDoc(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function IconClock(props: Props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function IconCopy(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}
