import { EmptyState } from "../UI";
import { theme } from "../styles";

const tc = theme.colors;

export default function ProgramClientsTable({
  filteredCount,
  tableGridTemplate,
  selectMode,
  headerSelectControl,
  labels,
  emptyTitle,
  emptySub,
  rows,
  renderRow,
  totalsGridColumn,
  totalLabel,
  summaryLabel,
  paidTotalLabel,
  remainingTotalLabel,
}) {
  return (
    <>
      {filteredCount > 0 && (
        <div style={{
          width:"100%",
          display:"grid",
          gridTemplateColumns:tableGridTemplate,
          alignItems:"center",
          gap:12,
          padding:"10px 18px",
          background:"rgba(212,175,55,.06)",
          borderRadius:8,
          fontSize:11,
          fontWeight:700,
          color:tc.grey,
        }}>
          {selectMode && headerSelectControl}
          <span>#</span>
          <span>{labels.name}</span>
          <span style={{ textAlign:"center" }}>{labels.roomType}</span>
          <span style={{ textAlign:"center" }}>{labels.serviceType}</span>
          <span style={{ textAlign:"center" }}>{labels.ticketNo}</span>
          <span style={{ textAlign:"center" }}>{labels.paid}</span>
          <span style={{ textAlign:"center" }}>{labels.remaining}</span>
          <span style={{ textAlign:"center" }}>{labels.status}</span>
        </div>
      )}

      {filteredCount === 0 ? (
        <EmptyState icon="users" title={emptyTitle} sub={emptySub} />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {rows.map(renderRow)}
        </div>
      )}

      {filteredCount > 0 && (
        <div style={{
          display:"grid",
          gridTemplateColumns:tableGridTemplate,
          gap:12,
          padding:"12px 18px",
          marginTop:8,
          background:"rgba(212,175,55,.08)",
          border:"1px solid rgba(212,175,55,.2)",
          borderRadius:10,
          fontSize:12,
          fontWeight:700,
          alignItems:"center",
        }}>
          <div style={{
            gridColumn:totalsGridColumn,
            display:"flex",
            alignItems:"center",
            gap:10,
            minWidth:0,
            flexWrap:"nowrap",
          }}>
            <span style={{ color:tc.gold, whiteSpace:"nowrap", flexShrink:0 }}>
              {totalLabel}
            </span>
            <span style={{
              color:tc.grey,
              whiteSpace:"nowrap",
              flexShrink:1,
              overflow:"hidden",
              textOverflow:"ellipsis",
            }}>
              {summaryLabel}
            </span>
          </div>
          <span />
          <span />
          <span style={{ color:tc.greenLight, textAlign:"center" }}>
            {paidTotalLabel}
          </span>
          <span style={{ color:tc.warning, textAlign:"center" }}>
            {remainingTotalLabel}
          </span>
          <span />
        </div>
      )}
    </>
  );
}
