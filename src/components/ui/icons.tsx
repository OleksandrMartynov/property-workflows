import type { ReactNode } from "react";
import { cn, hasSizeClass } from "@/lib/utils";

// Лінійні іконки 16×16, штрих 1.5, колір — currentColor. Лише декор: `aria-hidden`, підпис завжди поруч.
function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", !hasSizeClass(className) && "size-4", className)}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const HomeIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M2.5 7.5 8 3l5.5 4.5V13H9.8V9.7H6.2V13H2.5z" />
  </Icon>
);
export const TemplateIcon = ({ className }: P) => (
  <Icon className={className}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    <path d="M5.5 6h5M5.5 8.5h5M5.5 11h2.5" />
  </Icon>
);
export const RunsIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M3 4.5h10M3 8h10M3 11.5h6" />
  </Icon>
);
export const UsersIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="6" cy="5.5" r="2.2" />
    <path d="M2.2 13c.3-2.2 1.9-3.5 3.8-3.5s3.5 1.3 3.8 3.5" />
    <path d="M10.6 3.6a2.2 2.2 0 0 1 0 4.2M11.5 9.8c1.5.3 2.5 1.4 2.8 3.2" />
  </Icon>
);
export const ProgressIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="8" cy="8" r="5.5" opacity="0.35" />
    <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" />
  </Icon>
);
export const CommandIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M6 6V4.5A1.5 1.5 0 1 0 4.5 6H6zm0 0h4m-4 0v4m4-4V4.5A1.5 1.5 0 1 1 11.5 6H10zm0 0v4m0 0h1.5A1.5 1.5 0 1 1 10 11.5V10zm0 0H6m0 0v1.5A1.5 1.5 0 1 1 4.5 10H6z" />
  </Icon>
);
export const SearchIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="7" cy="7" r="4.2" />
    <path d="m10.2 10.2 3 3" />
  </Icon>
);
export const ClipboardCheckIcon = ({ className }: P) => (
  <Icon className={className}>
    <rect x="3" y="3" width="10" height="10.5" rx="2" />
    <path d="M6 3V2.2h4V3M5.8 8.4l1.6 1.6 3-3.3" />
  </Icon>
);
export const GaugeIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0" />
    <path d="M8 11.5 10.2 7.4" />
  </Icon>
);
export const FileSignIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M4 2.5h5l3 3v8H4z" />
    <path d="M9 2.5v3h3M6 10.8c.8-1.2 1.4-1.2 1.8 0s1 1 1.7-.2" />
  </Icon>
);
export const KeyIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="5.2" cy="10.8" r="2.4" />
    <path d="m7 9 5.5-5.5M10.5 5.5l1.5 1.5M12 4l1 1" />
  </Icon>
);
export const ArrowRightIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Icon>
);
export const RotateIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v2.8H10.2" />
  </Icon>
);
export const PlayIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M5 3.2v9.6l7.5-4.8z" fill="currentColor" />
  </Icon>
);
export const PauseIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M5 3.5v9M11 3.5v9" strokeWidth="2" />
  </Icon>
);
export const SparkleIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8 6.7 6.7z" />
  </Icon>
);

export const PanelLeftIcon = ({ className }: P) => (
  <Icon className={className}>
    <rect x="2.5" y="3" width="11" height="10" rx="2" />
    <path d="M6.2 3v10" />
  </Icon>
);
export const ShieldIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M8 2.2 13 4v3.6c0 3-2 5-5 6.2-3-1.2-5-3.2-5-6.2V4z" />
    <path d="m5.9 8.1 1.5 1.5 2.8-3" />
  </Icon>
);
export const UserIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="8" cy="5.6" r="2.4" />
    <path d="M3.2 13.2c.4-2.3 2.3-3.7 4.8-3.7s4.4 1.4 4.8 3.7" />
  </Icon>
);
export const LogOutIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M6.5 3H4.2A1.7 1.7 0 0 0 2.5 4.7v6.6A1.7 1.7 0 0 0 4.2 13h2.3" />
    <path d="M9.5 5.2 12.3 8 9.5 10.8M12.3 8H6.2" />
  </Icon>
);
export const ChevronsUpDownIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="m5.5 6.2 2.5-2.5 2.5 2.5M5.5 9.8 8 12.3l2.5-2.5" />
  </Icon>
);
export const ClockIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v3.2l2 1.2" />
  </Icon>
);
export const CheckIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="m3.5 8.4 3 3 6-6.4" />
  </Icon>
);
export const LockIcon = ({ className }: P) => (
  <Icon className={className}>
    <rect x="3.5" y="7" width="9" height="6.2" rx="1.6" />
    <path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7" />
  </Icon>
);
export const PlusIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M8 3.5v9M3.5 8h9" />
  </Icon>
);
export const ArrowUpIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7" />
  </Icon>
);
export const ArrowDownIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M8 3.5v9M4.5 9 8 12.5 11.5 9" />
  </Icon>
);
export const TrashIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M3 4.5h10M6.5 4.5V3.2h3v1.3M4.5 4.5l.6 8.3h5.8l.6-8.3M6.8 7v3.6M9.2 7v3.6" />
  </Icon>
);
export const MoreIcon = ({ className }: P) => (
  <Icon className={className}>
    <circle cx="3.75" cy="8" r=".6" fill="currentColor" />
    <circle cx="8" cy="8" r=".6" fill="currentColor" />
    <circle cx="12.25" cy="8" r=".6" fill="currentColor" />
  </Icon>
);
export const PencilIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M10.2 3.3 12.7 5.8 6 12.5H3.5V10z" />
    <path d="m9 4.5 2.5 2.5" />
  </Icon>
);
export const HistoryIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M2.8 8a5.2 5.2 0 1 0 1.5-3.7" />
    <path d="M2.6 2.8v2.4H5" />
    <path d="M8 5.3v2.9l2 1.2" />
  </Icon>
);
export const MoveToIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M4 3.5v4.2a1.8 1.8 0 0 0 1.8 1.8h6.7" />
    <path d="m9.7 6.8 2.8 2.7-2.8 2.7" />
  </Icon>
);
export const LayersIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="m8 2.8 5.5 2.9L8 8.6 2.5 5.7z" />
    <path d="m2.5 8.3 5.5 2.9 5.5-2.9M2.5 10.9 8 13.8l5.5-2.9" />
  </Icon>
);
export const EyeIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="M1.8 8s2.3-4.3 6.2-4.3S14.2 8 14.2 8s-2.3 4.3-6.2 4.3S1.8 8 1.8 8z" />
    <circle cx="8" cy="8" r="1.8" />
  </Icon>
);
export const ChevronRightIcon = ({ className }: P) => (
  <Icon className={className}>
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </Icon>
);
