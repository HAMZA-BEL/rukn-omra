import { Button } from "../UI";
import { AppIcon } from "../Icon";
import { theme } from "../styles";
import ProgramActionsMenu from "./ProgramActionsMenu";

const tc = theme.colors;

export default function ProgramDetailHeader({
  program,
  t,
  lang,
  onBack,
  headerActionsRef,
  headerActionsLabel,
  headerActionsOpen,
  onToggleHeaderActions,
  headerActions,
  hoveredHeaderAction,
  setHoveredHeaderAction,
  nusukUploadToggleEnabled = false,
  onAddClient,
  addClientLabel,
}) {
  const nusukUploadEnabled = Boolean(nusukUploadToggleEnabled && (program?.nusukUploadEnabled ?? program?.nusuk_upload_enabled));

  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24, flexWrap:"wrap" }}>
      {typeof onBack === "function" && (
        <Button variant="ghost" icon="chevronBack" onClick={onBack}>
          {t.back}
        </Button>
      )}
      <div style={{ flex:"1 1 320px", minWidth:0 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:tc.white }}>{program.name}</h1>
        <p style={{ fontSize:12, color:tc.grey, marginTop:3 }}>
          {t.departure}: {program.departure || "—"} &nbsp;•&nbsp;
          {t.returnDate}: {program.returnDate || "—"} &nbsp;•&nbsp;
          {t.hotelMecca}: {program.hotelMecca || "—"} &nbsp;•&nbsp;
          {t.hotelMadina}: {program.hotelMadina || "—"}
        </p>
        {nusukUploadEnabled && (
          <span style={{
            display:"inline-flex",
            alignItems:"center",
            gap:5,
            marginTop:8,
            padding:"3px 10px",
            borderRadius:20,
            border:"1px solid rgba(34,197,94,.24)",
            background:"rgba(34,197,94,.1)",
            color:tc.greenLight,
            fontSize:11,
            fontWeight:800,
          }}>
            <AppIcon name="upload" size={12} color={tc.greenLight} />
            مفعل لنسك
          </span>
        )}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", direction:"ltr" }}>
        <ProgramActionsMenu
          actionMenuRef={headerActionsRef}
          lang={lang}
          label={headerActionsLabel}
          open={headerActionsOpen}
          onToggle={onToggleHeaderActions}
          actions={headerActions}
          hoveredAction={hoveredHeaderAction}
          onHoverAction={setHoveredHeaderAction}
        />
        <Button variant="primary" icon="plus" onClick={onAddClient}>
          {addClientLabel}
        </Button>
      </div>
    </div>
  );
}
