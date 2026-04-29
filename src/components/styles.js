export const theme = {
  colors: {
    bg: "var(--rukn-bg)",
    bgCard: "var(--rukn-bg-card)",
    bgGlass: "var(--rukn-bg-glass)",
    border: "var(--rukn-border)",
    borderHover: "rgba(212,175,55,0.5)",
    gold: "#d4af37",
    goldLight: "#f0d060",
    goldDim: "rgba(212,175,55,0.15)",
    green: "#1a6b3a",
    greenLight: "#22c55e",
    greenDim: "rgba(34,197,94,0.15)",
    greenDark: "#0f3d22",
    white: "var(--rukn-text)",
    grey: "var(--rukn-text-muted)",
    greyDim: "rgba(148,163,184,0.1)",
    danger: "#ef4444",
    dangerDim: "rgba(239,68,68,0.15)",
    warning: "#f59e0b",
    warningDim: "rgba(245,158,11,0.15)",
    success: "#22c55e",
    successDim: "rgba(34,197,94,0.15)",
  },
};

export const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html {
    font-size: 16px;
    color-scheme: dark;
    --rukn-bg: #060d1a;
    --rukn-bg-page: #060d1a;
    --rukn-bg-card: rgba(10,22,45,0.85);
    --rukn-bg-glass: rgba(255,255,255,0.04);
    --rukn-bg-soft: rgba(255,255,255,0.03);
    --rukn-bg-input: rgba(255,255,255,0.04);
    --rukn-bg-select: #0d1f3c;
    --rukn-bg-modal: linear-gradient(145deg,#0d1f3c,#060d1a);
    --rukn-bg-sidebar: linear-gradient(180deg,#0d1f3c 0%,#060d1a 100%);
    --rukn-text: #f8fafc;
    --rukn-text-muted: #94a3b8;
    --rukn-text-strong: #f8fafc;
    --rukn-border: rgba(212,175,55,0.2);
    --rukn-border-soft: rgba(255,255,255,0.07);
    --rukn-border-input: rgba(255,255,255,0.1);
    --rukn-shadow-card: 0 4px 24px rgba(0,0,0,.3);
    --rukn-shadow-card-hover: 0 20px 60px rgba(0,0,0,.4), 0 0 30px rgba(212,175,55,.1);
    --rukn-row-bg: rgba(255,255,255,.025);
    --rukn-row-hover: rgba(212,175,55,.05);
    --rukn-row-border: rgba(255,255,255,.06);
    --rukn-row-border-hover: rgba(212,175,55,.24);
    --rukn-section-bg: rgba(255,255,255,.03);
    --rukn-section-border: rgba(255,255,255,.08);
    --rukn-table-head-bg: rgba(212,175,55,.07);
    --rukn-overlay: rgba(0,0,0,.75);
    --rukn-gold: #d4af37;
    --rukn-gold-light: #f0d060;
    --rukn-gold-dim: rgba(212,175,55,0.15);
  }
  html[data-theme="light"] {
    color-scheme: light;
    --rukn-bg: #f7f3ea;
    --rukn-bg-page: #f7f3ea;
    --rukn-bg-card: rgba(255,255,255,0.96);
    --rukn-bg-glass: rgba(255,255,255,0.88);
    --rukn-bg-soft: rgba(255,255,255,0.9);
    --rukn-bg-input: rgba(255,255,255,0.98);
    --rukn-bg-select: #ffffff;
    --rukn-bg-modal: linear-gradient(145deg,#ffffff,#f7f3ea);
    --rukn-bg-sidebar: linear-gradient(180deg,#fffaf0 0%,#f0e8d8 100%);
    --rukn-text: #142133;
    --rukn-text-muted: #4f6175;
    --rukn-text-strong: #0f172a;
    --rukn-border: rgba(184,148,30,0.28);
    --rukn-border-soft: rgba(15,23,42,0.14);
    --rukn-border-input: rgba(15,23,42,0.16);
    --rukn-shadow-card: 0 10px 34px rgba(15,23,42,.1);
    --rukn-shadow-card-hover: 0 18px 52px rgba(15,23,42,.14), 0 0 0 1px rgba(212,175,55,.1);
    --rukn-row-bg: rgba(255,255,255,.96);
    --rukn-row-hover: rgba(184,148,30,.08);
    --rukn-row-border: rgba(15,23,42,.11);
    --rukn-row-border-hover: rgba(184,148,30,.28);
    --rukn-section-bg: rgba(255,255,255,.84);
    --rukn-section-border: rgba(15,23,42,.1);
    --rukn-table-head-bg: rgba(184,148,30,.11);
    --rukn-overlay: rgba(15,23,42,.42);
    --rukn-gold: #b8941e;
    --rukn-gold-light: #d4af37;
    --rukn-gold-dim: rgba(184,148,30,0.12);
  }
  body {
    font-family: 'Cairo', sans-serif;
    background: var(--rukn-bg);
    color: var(--rukn-text);
    direction: rtl;
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
  ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(212,175,55,0.6); }

  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pulse {
    0%,100% { opacity:1; } 50% { opacity:.5; }
  }
  @keyframes float {
    0%,100% { transform:translateY(0px); }
    50%     { transform:translateY(-6px); }
  }
  @keyframes spin {
    from { transform:rotate(0deg); }
    to   { transform:rotate(360deg); }
  }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 20px rgba(212,175,55,0.2); }
    50%     { box-shadow: 0 0 40px rgba(212,175,55,0.5); }
  }
  @keyframes slideInRight {
    from { opacity:0; transform:translateX(40px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity:0; transform:scale(0.9); }
    to   { opacity:1; transform:scale(1); }
  }

  .animate-fadeInUp  { animation: fadeInUp .5s ease both; }
  .animate-fadeIn    { animation: fadeIn .3s ease both; }
  .animate-slideIn   { animation: slideInRight .4s ease both; }
  .animate-scaleIn   { animation: scaleIn .3s ease both; }

  input, select, textarea {
    font-family: 'Cairo', sans-serif;
    direction: rtl;
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--rukn-text-muted);
    opacity: .78;
  }
  button { font-family: 'Cairo', sans-serif; cursor: pointer; }
  .app-main {
    background: var(--rukn-bg-page);
    color: var(--rukn-text);
    transition: background .2s ease, color .2s ease;
  }
  .page-body,
  .programs-page {
    color: var(--rukn-text);
  }
  html[data-theme="light"] .page-header h1,
  html[data-theme="light"] .page-body h1,
  html[data-theme="light"] .page-body h2,
  html[data-theme="light"] .page-body h3 {
    color: var(--rukn-text-strong) !important;
  }
  html[data-theme="light"] .react-flow__renderer,
  html[data-theme="light"] .react-flow__pane {
    background: #fff;
  }
  html[data-theme="light"] .filter-chip {
    background: var(--rukn-bg-card);
    border-color: var(--rukn-border-soft);
    color: var(--rukn-text-muted);
    box-shadow: 0 2px 8px rgba(15,23,42,.03);
  }
  html[data-theme="light"] .filter-chip.is-active {
    background: rgba(184,148,30,.12);
    border-color: rgba(184,148,30,.38);
    color: var(--rukn-gold);
    box-shadow: 0 6px 18px rgba(184,148,30,.08);
  }
  html[data-theme="light"] .clearance-empty-card,
  html[data-theme="light"] .clearance-card-summary,
  html[data-theme="light"] .clear-card,
  html[data-theme="light"] .clear-card-info-item,
  html[data-theme="light"] .clear-card-field,
  html[data-theme="light"] .clear-card-status-block,
  html[data-theme="light"] .client-card-mobile,
  html[data-theme="light"] .client-card-mobile-finance div {
    background: var(--rukn-bg-card);
    border-color: var(--rukn-border-soft);
    box-shadow: 0 8px 24px rgba(15,23,42,.06);
  }
  html[data-theme="light"] .clear-card-name,
  html[data-theme="light"] .clear-card-field-value,
  html[data-theme="light"] .client-card-mobile-name-text,
  html[data-theme="light"] .clearance-card-summary .summary-grid strong {
    color: var(--rukn-text-strong);
  }
  html[data-theme="light"] .clear-card-meta,
  html[data-theme="light"] .clear-card-phone,
  html[data-theme="light"] .clear-card-contact,
  html[data-theme="light"] .clear-card-info-item span,
  html[data-theme="light"] .clear-card-field-label,
  html[data-theme="light"] .clearance-card-summary .summary-row,
  html[data-theme="light"] .clearance-card-summary .summary-grid p,
  html[data-theme="light"] .client-card-mobile-phone,
  html[data-theme="light"] .client-card-mobile-subinfo,
  html[data-theme="light"] .client-card-mobile-finance span,
  html[data-theme="light"] .client-card-mobile-tags {
    color: var(--rukn-text-muted);
  }
  html[data-theme="light"] .clear-card-kebab,
  html[data-theme="light"] .client-card-mobile-kebab {
    background: var(--rukn-bg-soft);
    border-color: var(--rukn-border-soft);
    color: var(--rukn-text-muted);
  }
  html[data-theme="light"] .clear-card-menu {
    background: rgba(255,255,255,.98);
    border-color: var(--rukn-border-soft);
    box-shadow: 0 18px 40px rgba(15,23,42,.12);
  }
  html[data-theme="light"] .clear-card-menu button {
    color: var(--rukn-text-strong);
  }
  html[data-theme="light"] .clear-card-menu button:hover {
    background: rgba(184,148,30,.08);
  }
  html[data-theme="light"] .invoice-btn {
    background: rgba(184,148,30,.1);
    border-color: rgba(184,148,30,.3);
    color: var(--rukn-gold);
  }
  html[data-theme="light"] .invoice-btn:hover,
  html[data-theme="light"] .invoice-btn:focus-visible {
    background: rgba(184,148,30,.16);
    box-shadow: 0 0 0 3px rgba(184,148,30,.08);
  }

  .stagger-1 { animation-delay: .05s; }
  .stagger-2 { animation-delay: .10s; }
  .stagger-3 { animation-delay: .15s; }
  .stagger-4 { animation-delay: .20s; }
  .stagger-5 { animation-delay: .25s; }
  .stagger-6 { animation-delay: .30s; }

  .lang-switcher {
    display: flex;
    gap: 10px;
    padding: 0;
    align-items: center;
    flex-wrap: nowrap;
  }
  .lang-switcher--rtl,
  .lang-switcher--ltr {
    flex-direction: row;
  }
  .lang-switcher-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    background: linear-gradient(135deg, rgba(15,45,74,0.85), rgba(6,13,26,0.9));
    color: #f8fafc;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.5px;
    box-shadow: inset 0 1px 4px rgba(255,255,255,0.18), 0 6px 14px rgba(0,0,0,0.4);
    transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    cursor: pointer;
  }
  .lang-switcher-btn:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: inset 0 2px 6px rgba(255,255,255,0.2), 0 12px 22px rgba(0,0,0,0.55);
  }
  .lang-switcher-btn.is-active {
    border: 1px solid rgba(212,175,55,0.8);
    box-shadow: inset 0 2px 8px rgba(212,175,55,0.45), 0 12px 28px rgba(212,175,55,0.25);
    background: linear-gradient(135deg, rgba(212,175,55,0.35), rgba(13,31,60,0.85));
    color: #f0d060;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .header-actions--ltr { justify-content: flex-end; }
  .header-actions--rtl { justify-content: flex-start; }
  .header-actions__lang {
    flex: 0 0 auto;
    display: flex;
    gap: 10px;
  }
  .header-actions--compact {
    gap: 8px;
  }
  .header-actions--compact .lang-switcher-btn {
    width: 34px;
    height: 34px;
    font-size: 12px;
  }
  .header-actions--compact .header-actions__lang {
    gap: 8px;
  }
  .notification-bell {
    position: relative;
    flex-shrink: 0;
    z-index: 1300;
  }
  .notification-bell--rtl,
  .notification-bell--ltr {
    direction: ltr;
  }
  .notification-bell__button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(135deg, rgba(13,31,60,0.95), rgba(6,13,26,0.95));
    box-shadow: inset 0 1px 5px rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .2s ease, border-color .2s ease;
  }
  .notification-bell__button:hover {
    transform: translateY(-2px);
    border-color: rgba(212,175,55,0.5);
  }
  .notification-bell__badge {
    position: absolute;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: radial-gradient(circle at 30% 30%, #ffd580, #d97706);
    border: 1px solid rgba(255,255,255,0.15);
    color: #060d1a;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .notification-dropdown {
    position: absolute;
    top: calc(100% + 14px);
    width: min(320px, calc(100vw - 32px));
    background: linear-gradient(135deg, rgba(6,13,26,0.97), rgba(12,24,46,0.97));
    border: 1px solid rgba(212,175,55,0.45);
    border-radius: 18px;
    box-shadow: 0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(10,16,32,0.7);
    padding: 18px;
    backdrop-filter: blur(22px);
    z-index: 1400;
  }
  .notification-dropdown__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 340px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .notification-dropdown__item {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    text-align: inherit;
    transition: border-color .2s ease, background .2s ease, transform .15s ease;
    font-family: inherit;
    color: inherit;
    appearance: none;
    outline: none;
  }
  .notification-dropdown__item:focus-visible {
    outline: 2px solid rgba(212,175,55,0.6);
    outline-offset: 3px;
  }
  .notification-dropdown__item:hover {
    border-color: rgba(212,175,55,0.35);
    background: rgba(255,255,255,0.06);
    transform: translateY(-1px);
  }
  .notification-dropdown__item.is-unread {
    border-color: rgba(212,175,55,0.45);
    background: rgba(212,175,55,0.08);
  }
  .notification-dropdown__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .notification-dropdown__title {
    font-size: 13px;
    font-weight: 700;
    color: #f8fafc;
    margin: 0;
    flex: 1;
  }
  .notification-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fbbf24;
    flex-shrink: 0;
  }
  .notification-dropdown__message {
    font-size: 12px;
    color: rgba(248,250,252,0.9);
    margin: 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .notification-dropdown__time {
    font-size: 11px;
    color: rgba(148,163,184,0.8);
  }
  .notification-dropdown__actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .notification-dropdown__cta {
    flex: 1;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(212,175,55,0.45);
    background: rgba(212,175,55,0.15);
    color: #f8fafc;
    font-weight: 700;
    font-size: 12px;
    transition: transform .15s ease, border-color .15s ease;
  }
  .notification-dropdown__cta:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.6);
  }
  .notification-dropdown__cta--ghost {
    border-color: rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.08);
  }
  .notification-dropdown__cta:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
  .page-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    margin-bottom: 14px;
  }
  .filters-chips {
    margin-bottom: 8px;
  }
  .filter-chip {
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #94a3b8;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.2px;
    cursor: pointer;
    transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease;
  }
  .filter-chip.is-active {
    background: rgba(212,175,55,0.15);
    border-color: #d4af37;
    color: #d4af37;
    font-weight: 700;
    transform: translateY(-1px);
  }
  .clearance-search {
    margin-bottom: 18px;
    display: flex;
    justify-content: flex-end;
  }
  .clearance-search > div {
    width: 100%;
    max-width: 320px;
  }
  .clearance-table {
    margin-bottom: 18px;
  }
  .clearance-card-list {
    display: none;
    flex-direction: column;
    gap: 12px;
  }
  .clearance-empty-card {
    padding: 24px;
    text-align: center;
    color: #94a3b8;
    border: 1px dashed rgba(255,255,255,0.12);
    border-radius: 14px;
    font-size: 13px;
  }
  .clearance-card-summary {
    display: none;
    flex-direction: column;
    gap: 12px;
    margin-top: 4px;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid rgba(212,175,55,0.2);
    background: rgba(212,175,55,0.08);
  }
  .clearance-card-summary .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #94a3b8;
  }
  .clearance-card-summary .summary-row strong {
    color: #d4af37;
    font-size: 14px;
  }
  .clearance-card-summary .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .clearance-card-summary .summary-grid div {
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .clearance-card-summary .summary-grid p {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .clearance-card-summary .summary-grid strong {
    font-size: 14px;
    color: #f8fafc;
  }
  .clearance-card-summary .summary-grid strong.is-success { color: #22c55e; }
  .clearance-card-summary .summary-grid strong.is-warning { color: #f59e0b; }
  .clearance-card-summary .summary-grid strong.is-danger  { color: #ef4444; }
  .clear-card {
    padding: 16px;
    border-radius: 18px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 12px 30px rgba(0,0,0,0.35);
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .clear-card-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }
  .clear-card-title {
    flex: 1;
    min-width: 0;
  }
  .clear-card-status {
    flex-shrink: 0;
  }
  .clear-card-name {
    font-size: 16px;
    font-weight: 800;
    color: #f8fafc;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .clear-card-meta {
    font-size: 12px;
    color: #94a3b8;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    word-break: break-word;
  }
  .clear-card-contact {
    font-size: 11px;
    color: rgba(148,163,184,0.8);
    margin-top: 6px;
  }
  .clear-card-phone {
    font-size: 12px;
    color: rgba(148,163,184,0.85);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .clear-card-info-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
  }
  .clear-card-info-item {
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
    padding: 10px 12px;
  }
  .clear-card-info-item span {
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 4px;
    display: block;
  }
  .clear-card-info-item strong {
    font-size: 14px;
    color: #f8fafc;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .clear-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }
  .clear-card-field {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.02);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .clear-card-field-label {
    font-size: 11px;
    color: #94a3b8;
  }
  .clear-card-field-value {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    word-break: break-word;
  }
  .clear-card-field-value.is-gold { color: #d4af37; }
  .clear-card-field-value.is-success { color: #22c55e; }
  .clear-card-field-value.is-warning { color: #f59e0b; }
  .clear-card-field-value.is-danger { color: #ef4444; }
  .clear-card-finance {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }
  .clear-card-status-block {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.02);
    padding: 10px 12px;
  }
  .clear-card-status-block .clear-card-field-label {
    margin-bottom: 6px;
  }
  .clear-card-status-badge {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .clear-card-status-badge span {
    width: 100%;
    justify-content: center;
  }
  .clear-card-actions {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    position: relative;
  }
  .clear-card-kebab {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.2);
    color: #f8fafc;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .2s ease, border-color .2s ease;
  }
  .clear-card-kebab:hover,
  .clear-card-kebab:focus-visible,
  .clear-card-kebab.is-open {
    border-color: rgba(212,175,55,0.45);
    background: rgba(212,175,55,0.15);
  }
  .clear-card-menu {
    position: absolute;
    top: 42px;
    right: 0;
    min-width: 150px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(6,13,26,0.95);
    box-shadow: 0 18px 40px rgba(0,0,0,0.55);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 20;
  }
  body[dir="rtl"] .clear-card-menu {
    right: auto;
    left: 0;
  }
  .clear-card-menu button {
    width: 100%;
    text-align: start;
    padding: 8px 10px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #f8fafc;
    font-size: 13px;
  }
  .clear-card-menu button:hover {
    background: rgba(255,255,255,0.06);
  }
  .clear-card-footer {
    display: flex;
    gap: 10px;
  }
  .client-card-mobile-wrapper { width: 100%; }
  .client-card-mobile {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(8,16,32,0.85);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 12px 28px rgba(0,0,0,0.35);
  }
  .client-card-mobile.is-selected {
    border-color: rgba(212,175,55,0.45);
    background: rgba(212,175,55,0.08);
  }
  .client-card-mobile-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .client-card-mobile-main {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
    flex: 1;
  }
  .client-card-mobile-index {
    width: 22px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    font-weight: 700;
  }
  .client-card-mobile-avatar {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08));
    border: 1px solid rgba(212,175,55,0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d4af37;
    font-weight: 800;
    flex-shrink: 0;
  }
  .client-card-mobile-texts { min-width: 0; }
  .client-card-mobile-name-text {
    font-size: 15px;
    font-weight: 800;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .client-card-mobile-phone {
    font-size: 12px;
    color: rgba(148,163,184,0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .client-card-mobile-action {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .client-card-mobile-kebab {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #94a3b8;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background .2s ease, border-color .2s ease, color .2s ease;
  }
  .client-card-mobile-kebab:hover,
  .client-card-mobile-kebab:focus-visible,
  .client-card-mobile-kebab.is-open {
    background: rgba(212,175,55,0.18);
    border-color: rgba(212,175,55,0.4);
    color: #d4af37;
  }
  .client-card-mobile-subinfo {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
  }
  .client-card-mobile-finance {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .client-card-mobile-finance div {
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.02);
    padding: 10px 12px;
    text-align: center;
  }
  .client-card-mobile-finance span {
    font-size: 11px;
    color: #94a3b8;
  }
  .client-card-mobile-finance strong {
    font-size: 14px;
    color: #f8fafc;
    margin-top: 4px;
    display: block;
  }
  .client-card-mobile-finance strong.is-success { color: #22c55e; }
  .client-card-mobile-finance strong.is-warning { color: #f59e0b; }
  .client-card-mobile-status {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .client-card-mobile-status span {
    width: 100%;
    justify-content: center;
  }
  .client-card-mobile-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
    color: #94a3b8;
  }
  .form-grid {
    display: grid;
    gap: 12px;
  }
  .form-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .form-grid--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .invoice-btn {
    width: 100%;
    min-width: 0;
    padding: 6px 12px;
    border-radius: 10px;
    border: 1px solid rgba(212,175,55,0.35);
    background: rgba(212,175,55,0.12);
    color: #d4af37;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
    transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
  }
  .invoice-btn:hover,
  .invoice-btn:focus-visible {
    background: rgba(212,175,55,0.2);
    border-color: rgba(212,175,55,0.6);
    box-shadow: 0 0 12px rgba(212,175,55,0.25);
  }
  .mobile-nav {
    position: fixed;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    width: 230px;
    height: 260px;
    pointer-events: none;
    display: none;
    z-index: 800;
  }
  .mobile-nav--rtl { right: 18px; }
  .mobile-nav--ltr { left: 18px; }
  .mobile-nav-items {
    position: absolute;
    bottom: 20px;
    right: 16px;
  }
  .mobile-nav--ltr .mobile-nav-items { left: 16px; right: auto; }
  .mobile-nav-item {
    position: absolute;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    background: none;
    border: none;
    color: #f8fafc;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    pointer-events: auto;
    text-transform: none;
    transform-origin: bottom;
    transition: transform .38s cubic-bezier(0.18,0.89,0.32,1.28), opacity .25s ease;
  }
  .mobile-nav--ltr .mobile-nav-item {
    left: 0;
    right: auto;
    flex-direction: row;
    text-align: left;
  }
  .mobile-nav--rtl .mobile-nav-item {
    flex-direction: row-reverse;
    text-align: right;
  }
  .mobile-nav-bubble {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(145deg, rgba(15,35,66,0.95), rgba(6,13,26,0.92));
    border: 1px solid rgba(212,175,55,0.25);
    box-shadow: inset 0 2px 6px rgba(255,255,255,0.08), 0 6px 18px rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mobile-nav-item.is-active .mobile-nav-bubble {
    border-color: rgba(212,175,55,0.8);
    box-shadow: inset 0 2px 8px rgba(212,175,55,0.35), 0 10px 20px rgba(212,175,55,0.25);
  }
  .mobile-nav-label {
    white-space: nowrap;
    letter-spacing: 0.2px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(248,250,252,0.92);
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(6,13,26,0.82);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 6px 18px rgba(0,0,0,0.45);
    backdrop-filter: blur(18px);
  }
  .mobile-nav-label--secondary {
    font-size: 10px;
    opacity: 0.85;
    padding: 2px 9px;
  }
  .mobile-nav-badge {
    position: absolute;
    top: -6px;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #d4af37;
    color: #060d1a;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
  .mobile-nav-bubble--secondary {
    width: 36px;
    height: 36px;
    background: linear-gradient(145deg, rgba(12,28,50,0.9), rgba(5,10,20,0.92));
    border-color: rgba(255,255,255,0.12);
  }
  .mobile-nav-item--secondary .mobile-nav-label {
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  }
  .mobile-nav-bubble--more {
    background: linear-gradient(145deg, rgba(212,175,55,0.22), rgba(8,18,32,0.92));
    border-color: rgba(212,175,55,0.4);
  }
  .mobile-nav-bubble--more.is-open {
    border-color: rgba(212,175,55,0.8);
    box-shadow: inset 0 2px 8px rgba(212,175,55,0.4), 0 12px 24px rgba(212,175,55,0.25);
  }
  .mobile-nav-toggle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 1px solid rgba(212,175,55,0.35);
    background: linear-gradient(145deg, rgba(212,175,55,0.28), rgba(15,45,74,0.9));
    box-shadow: inset 0 2px 8px rgba(255,255,255,0.12), 0 14px 28px rgba(0,0,0,0.45);
    backdrop-filter: blur(10px);
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .mobile-nav--ltr .mobile-nav-toggle { left: 0; right: auto; }
  .mobile-nav-toggle:hover { transform: scale(1.05); }
  .mobile-nav-toggle.is-open {
    box-shadow: inset 0 2px 10px rgba(212,175,55,0.4), 0 18px 36px rgba(0,0,0,0.55);
  }

  @media (max-width: 900px) {
    .app-shell { flex-direction: column !important; min-height: auto !important; }
    .app-sidebar {
      display: none !important;
    }
    .app-main { min-height: auto !important; height: auto !important; }
    .page-hero { padding: 20px 18px 18px !important; }
    .page-body { padding: 18px 16px 24px !important; }
    .page-header,
    .page-actions,
    .page-tabs,
    .page-filters {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }
    .page-header > * { width: 100% !important; }
    .page-tabs { width: 100% !important; flex-wrap: wrap; }
    .page-tabs button,
    .page-filters button,
    .page-actions button {
      width: 100% !important;
    }
    .kpi-grid,
    .program-grid,
    .cards-grid {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 14px !important;
    }
    .list-stack { gap: 10px !important; }
    .button-row { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
    .form-grid--two,
    .form-grid--three { grid-template-columns: 1fr !important; }
    .table-scroll { overflow-x: hidden; padding-bottom: 8px; width: 100%; }
    .table-scroll .table-grid,
    .table-scroll .table-grid-row {
      min-width: 0;
      width: 100%;
    }
    .table-scroll::-webkit-scrollbar { height: 4px; }
    .mobile-nav { display: block; }
    input, select, textarea {
      font-size: 16px !important;
      line-height: 1.35 !important;
    }
    .clearance-page { padding-top: 0 !important; }
    .invoice-btn { font-size: 10px; padding: 5px 10px; }
    .filters-chips {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .filters-chips::-webkit-scrollbar { height: 3px; }
    .filter-chip { flex: 0 0 auto; }
    .clearance-search {
      justify-content: stretch;
      margin-bottom: 16px;
    }
    .clearance-search > div { max-width: none; }
    .clearance-table { display: none !important; }
    .clearance-card-list { display: flex; }
    .clearance-card-summary { display: flex; }
    .clear-card { padding: 14px; }
    .clear-card-grid { grid-template-columns: minmax(0, 1fr); }
    .app-main { padding-bottom: 200px !important; }
    .mobile-nav {
      display: block;
      width: 220px;
      height: 230px;
      right: 12px;
      left: auto;
    }
    .mobile-nav--ltr { left: 12px; right: auto; }
    .mobile-nav-items { bottom: 10px; }
    .mobile-nav-toggle { bottom: 0; }
    .clearance-header {
      position: sticky !important;
      top: 0;
      background: rgba(6,13,26,0.96);
      backdrop-filter: blur(12px);
      padding-top: 12px !important;
      padding-bottom: 12px !important;
      margin-bottom: 12px !important;
      z-index: 30;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
  }

  @media (max-width: 520px) {
    .page-hero { padding: 18px 14px 16px !important; }
    .page-body { padding: 16px 12px 20px !important; }
    .page-header h1 { font-size: 18px !important; }
    .page-tabs button,
    .page-filters button,
    .page-actions button {
      font-size: 13px !important;
    }
    .lang-switcher-btn { width: 36px; height: 36px; }
    .clearance-page { padding-top: 0 !important; }
    .invoice-btn { font-size: 10px; padding: 5px 8px; }
    .clear-card-grid { grid-template-columns: minmax(0, 1fr); }
    .mobile-nav { width: 210px; height: 220px; }
    .mobile-nav-bubble { width: 38px; height: 38px; }
  }
`;
