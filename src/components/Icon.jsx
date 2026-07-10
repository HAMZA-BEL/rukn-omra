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
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
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
  MoreHorizontal,
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

const RUKN_LOGO_SRC = `${process.env.PUBLIC_URL || ""}/branding/rukn-logo.png`;

function BrandLogoIcon({
  size = 18,
  color,
  strokeWidth,
  style,
  ...props
}) {
  void color;
  void strokeWidth;

  return (
    <img
      src={RUKN_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export const ICONS = {
  activity: ClipboardList,
  alert: AlertCircle,
  archive: Archive,
  archivedFolder: FolderArchive,
  banknote: Banknote,
  brand: BrandLogoIcon,
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
  copy: Copy,
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
  filter: Filter,
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
  moreHorizontal: MoreHorizontal,
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
  const isBrand = name === "brand";
  const brandStyle = isBrand ? {
    background: "transparent",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
  } : null;

  return (
    <span
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: isBrand ? 0 : 12,
        background: isBrand ? "transparent" : bg,
        backgroundColor: isBrand ? "transparent" : undefined,
        border: isBrand ? "none" : `1px solid ${border}`,
        boxShadow: isBrand ? "none" : undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
        ...brandStyle,
      }}
      {...props}
    >
      <AppIcon name={name} icon={icon} size={iconSize || size} color={color} />
    </span>
  );
}
