import { Button } from "../UI";
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
  onAddClient,
  addClientLabel,
}) {
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
