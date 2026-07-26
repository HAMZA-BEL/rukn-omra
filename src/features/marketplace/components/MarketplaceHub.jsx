import React from "react";
import {
  ArrowUpLeft,
  Boxes,
  CalendarDays,
  Clock3,
  EyeOff,
  FilePenLine,
  FolderKanban,
  MoreHorizontal,
  Radio,
  Search,
  Store,
  Ticket,
} from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import "../marketplaceHub.css";

export const MarketplaceHero = React.memo(function MarketplaceHero({
  agencyName,
  copy,
}) {
  return (
    <header className="marketplace-hero">
      <div className="marketplace-hero__pattern" aria-hidden="true" />
      <div className="marketplace-hero__content">
        <div className="marketplace-hero__eyebrow">
          <Store size={15} />
          <span>RUKN MARKETPLACE HUB</span>
        </div>
        <h1>{copy.marketplace}</h1>
        <p className="marketplace-hero__lead">{copy.heroLead}</p>
        <p className="marketplace-hero__description">{copy.heroDescription}</p>
      </div>
      <div className="marketplace-agency-status" aria-label={copy.marketEnabled}>
        <span className="marketplace-agency-status__dot" aria-hidden="true" />
        <span className="marketplace-agency-status__text">
          <strong>{copy.marketEnabled}</strong>
          <small>{agencyName}</small>
        </span>
      </div>
    </header>
  );
});

export const MarketplaceTabs = React.memo(function MarketplaceTabs({
  activeTab,
  onChange,
  copy,
}) {
  return (
    <nav className="marketplace-tabs" aria-label={copy.marketNavigation}>
      <button
        type="button"
        className={activeTab === "overview" ? "is-active" : ""}
        aria-current={activeTab === "overview" ? "page" : undefined}
        onClick={() => onChange("overview")}
      >
        <Boxes size={16} />
        {copy.overview}
      </button>
      <button
        type="button"
        className={activeTab === "programs" ? "is-active" : ""}
        aria-current={activeTab === "programs" ? "page" : undefined}
        onClick={() => onChange("programs")}
      >
        <FolderKanban size={16} />
        {copy.programs}
      </button>
      <button type="button" disabled aria-disabled="true">
        <Ticket size={16} />
        {copy.seatMarket}
        <span className="marketplace-tabs__soon">{copy.soon}</span>
      </button>
    </nav>
  );
});

const METRIC_ICONS = {
  published: Radio,
  draft: FilePenLine,
  hidden: EyeOff,
  total: FolderKanban,
};

export const MarketplaceMetric = React.memo(function MarketplaceMetric({
  kind,
  value,
  label,
  hint,
}) {
  const Icon = METRIC_ICONS[kind] || Boxes;
  return (
    <article className={`marketplace-metric marketplace-metric--${kind}`}>
      <span className="marketplace-metric__icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
});

export const MarketplaceModuleCard = React.memo(function MarketplaceModuleCard({
  icon: Icon,
  title,
  description,
  badge,
  available = false,
  actionLabel,
  onAction,
  disabled = false,
}) {
  return (
    <article className={`marketplace-module ${disabled ? "is-disabled" : ""}`}>
      <div className="marketplace-module__top">
        <span className="marketplace-module__icon" aria-hidden="true">
          <Icon size={21} />
        </span>
        <span className={`marketplace-module__badge ${available ? "is-available" : ""}`}>
          {badge}
        </span>
      </div>
      <div className="marketplace-module__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <button
        type="button"
        className="marketplace-module__action"
        onClick={onAction}
        disabled={disabled}
      >
        {actionLabel}
        {!disabled && <ArrowUpLeft size={15} aria-hidden="true" />}
      </button>
    </article>
  );
});

const STATUS_CLASSES = {
  published: "is-published",
  draft: "is-draft",
  hidden: "is-hidden",
  unpublished: "is-unpublished",
};

export const MarketplaceProgramRow = React.memo(function MarketplaceProgramRow({
  program,
  listing,
  status,
  copy,
  lang,
  formattedDate,
  busy,
  onOpen,
  onHide,
}) {
  const startingPrice = Number(listing?.publicData?.starting_price);
  const isPublished = status === "published";
  return (
    <article className="marketplace-program-row">
      <div className="marketplace-program-row__identity">
        <span className="marketplace-program-row__mark" aria-hidden="true">
          <FolderKanban size={18} />
        </span>
        <div className="marketplace-program-row__title">
          <h3 title={program.name || copy.unnamedProgram}>
            {program.name || copy.unnamedProgram}
          </h3>
          {isPublished && (
            <span className="marketplace-live-indicator">
              <span aria-hidden="true" />
              {copy.liveInMarket}
            </span>
          )}
        </div>
      </div>

      <div className="marketplace-program-row__facts">
        <span>
          <CalendarDays size={14} aria-hidden="true" />
          <small>{copy.travelDate}</small>
          <strong>{formattedDate}</strong>
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          <small>{copy.duration}</small>
          <strong>{program.duration ? `${program.duration} ${copy.day}` : "—"}</strong>
        </span>
        <span>
          <small>{copy.internalStatus}</small>
          <strong>{program.status === "archived" ? copy.archived : copy.active}</strong>
        </span>
        <span>
          <small>{copy.startingPrice}</small>
          <strong>{startingPrice > 0 ? formatCurrency(startingPrice, lang) : "—"}</strong>
        </span>
      </div>

      <div className="marketplace-program-row__status">
        <span className={`marketplace-status-badge ${STATUS_CLASSES[status]}`}>
          <span aria-hidden="true" />
          {copy.statuses[status]}
        </span>
      </div>

      <div className="marketplace-program-row__actions">
        <button type="button" className="marketplace-primary-action" onClick={() => onOpen(program)}>
          {copy.actions[status]}
        </button>
        {isPublished && (
          <details className="marketplace-more-menu">
            <summary aria-label={copy.moreActions}>
              <MoreHorizontal size={18} />
            </summary>
            <div className="marketplace-more-menu__popover">
              <button type="button" disabled={busy} onClick={() => onHide(program)}>
                <EyeOff size={15} />
                {busy ? copy.hiding : copy.hideFromMarket}
              </button>
            </div>
          </details>
        )}
      </div>
    </article>
  );
});

export function MarketplaceToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  resultCount,
  copy,
}) {
  return (
    <div className="marketplace-toolbar">
      <label className="marketplace-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{copy.searchPrograms}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.searchPrograms}
        />
      </label>
      <label className="marketplace-filter">
        <span className="sr-only">{copy.filterStatus}</span>
        <select value={filter} onChange={(event) => onFilterChange(event.target.value)}>
          {Object.entries(copy.filters).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <span className="marketplace-toolbar__count">
        {resultCount} {copy.results}
      </span>
    </div>
  );
}

export function MarketplaceSkeleton() {
  return (
    <div className="marketplace-skeleton" aria-label="Loading">
      <div className="marketplace-skeleton__metrics">
        {[0, 1, 2, 3].map((item) => <span key={item} />)}
      </div>
      <div className="marketplace-skeleton__rows">
        {[0, 1, 2].map((item) => <span key={item} />)}
      </div>
    </div>
  );
}

export function MarketplaceInlineState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  danger = false,
}) {
  return (
    <div className={`marketplace-inline-state ${danger ? "is-danger" : ""}`}>
      <span className="marketplace-inline-state__icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
