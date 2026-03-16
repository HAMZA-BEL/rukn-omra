import React from "react";
import { globalCSS } from "./components/styles";
import { useStore } from "./hooks/useStore";
import { useAuth } from "./hooks/useAuth";
import { isSupabaseEnabled } from "./lib/supabase";
import { LangProvider, useLang } from "./hooks/useLang";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ClientsPage from "./components/ClientsPage";
import ProgramsPage from "./components/ProgramsPage";
import ClearancePage from "./components/ClearancePage";
import SettingsPage from "./components/SettingsPage";
import LoginPage from "./components/LoginPage";
import SetPasswordPage from "./components/SetPasswordPage";
import { Modal, Toast } from "./components/UI";
import ClientDetail from "./components/ClientDetail";
import ClientForm from "./components/ClientForm";
import ErrorBoundary from "./components/ErrorBoundary";

function AppInner({ agencyId, onLogout }) {
  const { t, lang, dir } = useLang();
  const [toast,          setToast]          = React.useState(null);
  const showToast = React.useCallback((msg, type="success") => setToast({ message: msg, type, id: Date.now() }), []);
  const store = useStore(agencyId, showToast);
  const [page,           setPage]           = React.useState("dashboard");
  const [pageHistory,    setPageHistory]    = React.useState([]);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [editingClient,  setEditingClient]  = React.useState(null);

  const navigate = (target) => {
    setPageHistory(h => [...h, page]);
    setPage(target);
  };
  const goBack = () => {
    setPageHistory(h => {
      const prev = [...h];
      const last = prev.pop() || "dashboard";
      setPage(last);
      return prev;
    });
  };

  const isRTL = lang === "ar";

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        background:"radial-gradient(ellipse 80% 50% at 50% -20%,rgba(26,107,58,.3),transparent)",
        pointerEvents:"none" }} />
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        background:"radial-gradient(ellipse 60% 40% at 80% 80%,rgba(212,175,55,.06),transparent)",
        pointerEvents:"none" }} />
      <div style={{ position:"fixed", inset:0, zIndex:-1,
        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30Z' fill='none' stroke='rgba(212,175,55,0.03)' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundRepeat:"repeat", pointerEvents:"none" }} />

      <div className="app-shell" style={{ display:"flex", direction:dir, minHeight:"100vh" }}>
        <Sidebar active={page} onNavigate={navigate} stats={store.stats}
          syncStatus={store.syncStatus}
          onExport={() => { store.exportData(); showToast(t.exportSuccess, "success"); }}
          onImport={async(f)=>{ try{ await store.importData(f); showToast(t.importSuccess, "success"); }catch{ showToast(t.importError, "error"); } }}
          onLogout={onLogout} />

        <main className="app-main" style={{ flex:1, overflowY:"auto", minHeight:"100vh" }}>
          {/* DB loading skeleton */}
          {store.dbLoading && <AppSkeleton />}
          {/* Syncing indicator (top bar) */}
          {store.dbSyncing && !store.dbLoading && (
            <div style={{
              position:"fixed", top:12,
              [lang === "ar" ? "left" : "right"]: 12,
              zIndex:9997,
              background:"rgba(212,175,55,.12)",
              border:"1px solid rgba(212,175,55,.3)",
              borderRadius:20, padding:"4px 14px",
              display:"flex", alignItems:"center", gap:8,
              fontSize:11, color:"#d4af37",
              fontFamily:"'Cairo',sans-serif",
            }}>
              <div style={{
                width:10, height:10, border:"2px solid rgba(212,175,55,.3)",
                borderTop:"2px solid #d4af37", borderRadius:"50%",
                animation:"spin 1s linear infinite", flexShrink:0,
              }} />
              {lang === "fr" ? "Synchronisation..." : "جاري المزامنة..."}
            </div>
          )}
          {page !== "dashboard" && <BackBar onBack={goBack} label={t.back} dir={dir}
            pageName={{ clients:t.clients, programs:t.programs, clearance:t.clearance, settings:t.settings }[page]} />}

          {page==="dashboard"  && <ErrorBoundary><Dashboard store={store} onNavigate={navigate} onSelectClient={setSelectedClient} /></ErrorBoundary>}
          {page==="clients"    && <ErrorBoundary><ClientsPage store={store} onToast={showToast} /></ErrorBoundary>}
          {page==="programs"   && <ErrorBoundary><ProgramsPage store={store} onToast={showToast} /></ErrorBoundary>}
          {page==="clearance"  && <ErrorBoundary><ClearancePage store={store} /></ErrorBoundary>}
          {page==="settings"   && <ErrorBoundary><SettingsPage store={store} onToast={showToast} /></ErrorBoundary>}
        </main>
      </div>

      <Modal open={!!selectedClient} onClose={()=>setSelectedClient(null)} title={t.clientFile} width={680}>
        {selectedClient && <ClientDetail client={selectedClient} store={store}
          onClose={()=>setSelectedClient(null)}
          onEdit={c=>{ setSelectedClient(null); setEditingClient(c); }}
          onToast={showToast} />}
      </Modal>

      <Modal open={!!editingClient} onClose={()=>setEditingClient(null)} title={t.edit+" — "+t.fullName} width={680}>
        {editingClient && <ClientForm client={editingClient} store={store}
          onSave={()=>{ setEditingClient(null); showToast(t.updateSuccess, "success"); }}
          onCancel={()=>setEditingClient(null)} />}
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </>
  );
}

function BackBar({ onBack, label, pageName, dir }) {
  const separator = dir === "rtl" ? "‹" : "›";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 28px",
      background:"rgba(6,13,26,.85)", borderBottom:"1px solid rgba(212,175,55,.1)",
      backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:50 }}>
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6,
        background:"rgba(212,175,55,.1)", border:"1px solid rgba(212,175,55,.25)",
        borderRadius:10, padding:"6px 14px", color:"#d4af37",
        fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Cairo',sans-serif",
        transition:"all .2s" }}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(212,175,55,.2)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(212,175,55,.1)"}>
        {label}
      </button>
      <span style={{ fontSize:12, color:"rgba(148,163,184,.4)" }}>{separator}</span>
      <span style={{ fontSize:13, color:"#f8fafc", fontWeight:600 }}>{pageName}</span>
    </div>
  );
}

// ── App skeleton shown while Supabase performs initial data fetch ─────────────
function SkeletonBox({ w = "100%", h = 20, r = 8, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "linear-gradient(90deg,rgba(212,175,55,.06) 25%,rgba(212,175,55,.12) 50%,rgba(212,175,55,.06) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s infinite",
      flexShrink: 0,
      ...style,
    }} />
  );
}

function AppSkeleton() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "#060d1a", display: "flex",
    }}>
      {/* Sidebar skeleton */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "rgba(10,22,45,.9)",
        borderInlineEnd: "1px solid rgba(212,175,55,.1)",
        padding: "24px 16px", display: "flex", flexDirection: "column", gap: 10,
      }}>
        <SkeletonBox h={38} r={10} style={{ marginBottom: 16 }} />
        {[1,2,3,4,5].map(i => <SkeletonBox key={i} h={44} r={10} />)}
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, padding: "32px 32px", display: "flex", flexDirection: "column", gap: 18, overflowY: "hidden" }}>
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonBox w={260} h={34} r={8} />
          <SkeletonBox w={420} h={44} r={12} />
        </div>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonBox key={i} h={88} r={16} />)}
        </div>
        {/* List rows */}
        <SkeletonBox w={160} h={20} r={6} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4].map(i => <SkeletonBox key={i} h={62} r={12} />)}
        </div>
      </div>
    </div>
  );
}

// Extracts invite/recovery auth data from the URL hash.
// Returns { type, accessToken, refreshToken } or null.
// All three fields must be present to avoid false positives.
function detectAuthFromURL() {
  try {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const params        = new URLSearchParams(hash.substring(1));
    const type          = params.get("type");
    const accessToken   = params.get("access_token");
    const refreshToken  = params.get("refresh_token");
    if (!type || !accessToken || !refreshToken) return null;
    if (type !== "recovery" && type !== "invite") return null;
    return { type, accessToken, refreshToken };
  } catch { return null; }
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate() {
  // Captured synchronously on first render — all three tokens must be present.
  const [authFromURL] = React.useState(() => detectAuthFromURL());

  const { user, agencyId, loading, login, logout, needsPasswordSet, profileError } = useAuth();

  // Local-only mode: bypass auth entirely
  if (!isSupabaseEnabled) {
    return <AppInner agencyId={null} onLogout={null} />;
  }

  // Real Supabase invite/recovery link → SetPasswordPage handles its own session
  if (authFromURL || needsPasswordSet) {
    return <SetPasswordPage authData={authFromURL} />;
  }

  if (loading) return <AppLoadingScreen />;

  // Logged in but no row in public.users → show actionable error
  if (user && profileError === "no_profile") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#060d1a", color: "#f8fafc", fontFamily: "'Cairo', sans-serif",
        padding: 24, textAlign: "center",
      }}>
        <div style={{
          maxWidth: 480, background: "rgba(10,22,45,.9)",
          border: "1px solid rgba(212,175,55,.3)", borderRadius: 20, padding: 40,
        }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>⚠️</p>
          <h2 style={{ color: "#d4af37", marginBottom: 12 }}>الحساب غير مرتبط بوكالة</h2>
          <p style={{ color: "rgba(148,163,184,.8)", fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
            تم تسجيل الدخول بنجاح لكن لا يوجد ملف تعريف لهذا المستخدم في قاعدة البيانات.
            <br />شغّل هذا في Supabase SQL Editor:
          </p>
          <pre style={{
            background: "rgba(0,0,0,.4)", border: "1px solid rgba(212,175,55,.2)",
            borderRadius: 10, padding: 16, fontSize: 11, textAlign: "left",
            color: "#4ade80", overflowX: "auto", marginBottom: 24,
            whiteSpace: "pre-wrap", direction: "ltr",
          }}>{`INSERT INTO public.users (id, agency_id, role, full_name)\nSELECT au.id,\n  (SELECT id FROM public.agencies LIMIT 1),\n  'owner', split_part(au.email,'@',1)\nFROM auth.users au\nWHERE au.email = '${user.email}';`}</pre>
          <button
            onClick={async () => { await logout(); window.location.reload(); }}
            style={{
              padding: "10px 28px", borderRadius: 10, border: "1px solid rgba(212,175,55,.3)",
              background: "rgba(212,175,55,.1)", color: "#d4af37", fontSize: 14,
              fontFamily: "'Cairo', sans-serif", cursor: "pointer",
            }}
          >تسجيل الخروج والمحاولة مجدداً</button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user || !agencyId) {
    return <LoginPage onLogin={login} />;
  }

  return <AppInner agencyId={agencyId} onLogout={logout} />;
}

// Minimal full-screen loader shown only during session restore (< 1 sec normally)
function AppLoadingScreen() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#060d1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <span style={{ fontSize: 40, animation: "float 4s ease-in-out infinite" }}>🕋</span>
      <div style={{
        width: 32, height: 32, border: "3px solid rgba(212,175,55,.2)",
        borderTop: "3px solid #d4af37", borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthGate />
    </LangProvider>
  );
}
