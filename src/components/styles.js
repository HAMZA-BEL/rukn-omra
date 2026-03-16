export const theme = {
  colors: {
    bg: "#060d1a",
    bgCard: "rgba(10,22,45,0.85)",
    bgGlass: "rgba(255,255,255,0.04)",
    border: "rgba(212,175,55,0.2)",
    borderHover: "rgba(212,175,55,0.5)",
    gold: "#d4af37",
    goldLight: "#f0d060",
    goldDim: "rgba(212,175,55,0.15)",
    green: "#1a6b3a",
    greenLight: "#22c55e",
    greenDim: "rgba(34,197,94,0.15)",
    greenDark: "#0f3d22",
    white: "#f8fafc",
    grey: "#94a3b8",
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
  html { font-size: 16px; }
  body {
    font-family: 'Cairo', sans-serif;
    background: #060d1a;
    color: #f8fafc;
    direction: rtl;
    min-height: 100vh;
    overflow-x: hidden;
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
  button { font-family: 'Cairo', sans-serif; cursor: pointer; }

  .stagger-1 { animation-delay: .05s; }
  .stagger-2 { animation-delay: .10s; }
  .stagger-3 { animation-delay: .15s; }
  .stagger-4 { animation-delay: .20s; }
  .stagger-5 { animation-delay: .25s; }
  .stagger-6 { animation-delay: .30s; }

  @media (max-width: 900px) {
    .app-shell { flex-direction: column !important; min-height: auto !important; }
    .app-sidebar {
      width: 100% !important;
      min-height: auto !important;
      height: auto !important;
      position: relative !important;
      border-left: none !important;
      border-right: none !important;
      border-bottom: 1px solid rgba(212,175,55,.15) !important;
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
    .form-grid { grid-template-columns: 1fr !important; }
    .table-scroll { overflow-x: auto; padding-bottom: 8px; }
    .table-scroll .table-grid,
    .table-scroll .table-grid-row {
      min-width: 640px;
    }
    .table-scroll::-webkit-scrollbar { height: 4px; }
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
  }
`;
