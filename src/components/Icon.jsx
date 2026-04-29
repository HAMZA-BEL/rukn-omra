import React from "react";
import {
  AlertCircle,
  Archive,
  BadgeCheck,
  BadgePercent,
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronsUpDown,
  Circle,
  CircleDollarSign,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Coins,
  Contact,
  CreditCard,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  FolderArchive,
  FolderKanban,
  Gift,
  Globe2,
  HelpCircle,
  Home,
  Hotel,
  Hourglass,
  Import,
  Landmark,
  Languages,
  ListChecks,
  LoaderCircle,
  Mail,
  MapPin,
  NotebookText,
  Plane,
  PlaneLanding,
  Plus,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wallet,
  WalletCards,
  Ticket,
  X,
  XCircle,
} from "lucide-react";

function BrandKaabaIcon({
  size = 18,
  color = "currentColor",
  strokeWidth = 1.9,
  style,
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M6.5 8.5L12 5.5L17.5 8.5V16L12 19L6.5 16V8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8.5L12 11.5L17.5 8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M9 10.25H15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M11.15 12.35H12.85V16.1H11.15V12.35Z"
        fill={color}
      />
    </svg>
  );
}

export const ICONS = {
  activity: ClipboardList,
  alert: AlertCircle,
  archive: Archive,
  archivedFolder: FolderArchive,
  banknote: Banknote,
  brand: BrandKaabaIcon,
  briefcase: Briefcase,
  building: Building2,
  camera: Camera,
  check: Check,
  checked: CheckCircle2,
  chevronBack: ChevronLeft,
  clearance: BarChart3,
  clock: Clock3,
  coins: Coins,
  contact: Contact,
  creditCard: CreditCard,
  discount: BadgePercent,
  docs: FileText,
  documents: FileText,
  download: Download,
  edit: Edit3,
  empty: HelpCircle,
  error: XCircle,
  eye: Eye,
  eyeOff: EyeOff,
  file: FileText,
  gift: Gift,
  globe: Globe2,
  home: Home,
  hotel: Hotel,
  hourglass: Hourglass,
  idCard: Contact,
  import: Import,
  language: Languages,
  list: ListChecks,
  loading: LoaderCircle,
  mail: Mail,
  location: MapPin,
  partial: CircleDollarSign,
  passport: Contact,
  payment: Wallet,
  phone: Phone,
  plane: Plane,
  planeLanding: PlaneLanding,
  plus: Plus,
  print: Printer,
  program: FolderKanban,
  receipt: Receipt,
  refresh: RefreshCw,
  restore: RotateCcw,
  save: Save,
  search: Search,
  settings: Settings,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  status: Circle,
  success: BadgeCheck,
  ticket: Ticket,
  trash: Trash2,
  unpaid: CircleX,
  upload: Upload,
  user: UserRound,
  users: Users,
  walletCards: WalletCards,
  bank: Landmark,
  notes: NotebookText,
  x: X,
};

export function AppIcon({
  name,
  icon,
  size = 18,
  iconSize,
  color = "currentColor",
  strokeWidth = 1.9,
  style,
  ...props
}) {
  const Icon = icon || ICONS[name] || HelpCircle;
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function IconBubble({
  name,
  icon,
  size = 18,
  iconSize,
  color = "#d4af37",
  bg = "rgba(212,175,55,.12)",
  border = "rgba(212,175,55,.22)",
  boxSize = 38,
  style,
  ...props
}) {
  return (
    <span
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      <AppIcon name={name} icon={icon} size={iconSize || size} color={color} />
    </span>
  );
}
