import React from "react";
import { StatusBadge, Button, GlassCard, Divider } from "./UI";
import { theme } from "./styles";
import { useLang } from "../hooks/useLang";
import PaymentForm from "./PaymentForm";
import { printReceipt, printClientCard, printInvoice } from "./PrintTemplates";
import { AppIcon } from "./Icon";
import { getRoomTypeLabel } from "../utils/programPackages";
import { getClientDisplayName } from "../utils/clientNames";

const tc = theme.colors;

export default function ClientDetail({ client, store, onClose, onEdit, onDelete, onArchive, onRestore, onToast }) {
  const { t, lang } = useLang();
  const { getProgramById, getClientPayments, getClientTotalPaid, getClientStatus,
          deletePayment, agency } = store;
  const [showPayForm, setShowPayForm] = React.useState(false);

  const program     = getProgramById(client.programId);
  const payments    = getClientPayments(client.id);
  const totalPaid   = getClientTotalPaid(client.id);
  const salePrice   = client.salePrice   || client.price || 0;
  const offPrice    = client.officialPrice || salePrice;
  const remaining   = Math.max(0, salePrice - totalPaid);
  const discount    = Math.max(0, offPrice - salePrice);
  const status      = getClientStatus(client);
  const pct         = salePrice > 0 ? Math.min((totalPaid / salePrice) * 100, 100) : 0;
  const lastPmt     = [...payments].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
  const p           = client.passport || {};
  const docs        = client.docs || {};
  const displayName = getClientDisplayName(client);

  // Passport expiry warning
  const passExpiry  = p.expiry ? new Date(p.expiry) : null;
  const daysToExp   = passExpiry ? Math.ceil((passExpiry - new Date())/(1000*60*60*24)) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20,
        padding:"16px 18px",
        background:"linear-gradient(135deg,rgba(26,107,58,.2),rgba(212,175,55,.08))",
        borderRadius:14, border:"1px solid rgba(212,175,55,.15)" }}>
        <div style={{ width:56, height:56, borderRadius:12, flexShrink:0,
          background:"linear-gradient(135deg,#d4af37,#b8941e)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, fontWeight:900, color:"#060d1a",
          boxShadow:"0 8px 24px rgba(212,175,55,.3)" }}>
          {(displayName || "?")[0]}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
            <h2 style={{ fontSize:18, fontWeight:800, color:tc.white }}>{displayName}</h2>
            {client.archived && (
              <span style={{
                fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:20,
                background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.3)",
                color:tc.warning,
              }}><AppIcon name="archive" size={12} color={tc.warning} /> {t.archivedBadge}</span>
            )}
          </div>
          {/* Amadeus format */}
          {(client.nom || client.prenom) && (
            <p style={{ fontSize:12, color:tc.gold, marginBottom:4, fontFamily:"monospace" }}>
              {client.nom && client.prenom ? `${client.nom}/${client.prenom}` : (client.nom || client.prenom)}
            </p>
          )}
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="phone" size={13} color={tc.grey} /> {client.phone}</span>
            <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="location" size={13} color={tc.grey} /> {client.city}</span>
            <span style={{ fontSize:12, color:tc.grey, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="archive" size={13} color={tc.grey} /> {client.id}</span>
            {client.ticketNo && <span style={{ fontSize:12, color:tc.gold, display:"inline-flex", alignItems:"center", gap:4 }}><AppIcon name="ticket" size={13} color={tc.gold} /> {client.ticketNo}</span>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Print buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {payments.map && payments.length > 0 && lastPmt && (
          <Button variant="secondary" size="sm" icon="print"
            onClick={() => printReceipt({ payment:lastPmt, client, program, agency, lang })}>
            {t.printReceipt}
          </Button>
        )}
        <Button variant="secondary" size="sm" icon="passport"
          onClick={() => printClientCard({ client, program, agency, lang })}>
          {t.printCard}
        </Button>
        <Button variant="secondary" size="sm" icon="file"
          onClick={() => printInvoice({ client, program, payments, agency, lang })}>
          {t.printInvoice}
        </Button>
      </div>

      {/* Program */}
      {program && (
        <GlassCard gold style={{ padding:14, marginBottom:14 }}>
          <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="program" size={14} color={tc.gold} /> {t.program}</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              [t.program,     program.name],
              ["المستوى",  client.packageLevel || client.hotelLevel || "—"],
              [t.hotelMecca,  client.hotelMecca||"—"],
              [t.hotelMadina, client.hotelMadina||"—"],
              [t.roomType,    client.roomTypeLabel || getRoomTypeLabel(client.roomType) || "—"],
              [t.transport,   program.transport||"—"],
              [t.departure,   program.departure||"—"],
              [t.returnDate,  program.returnDate||"—"],
            ].map(([k,v]) => (
              <div key={k}>
                <p style={{ fontSize:10, color:tc.grey }}>{k}</p>
                <p style={{ fontSize:12, fontWeight:600, color:"#f8fafc" }}>{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Financials */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { label:t.officialPrice, val:offPrice,   color:tc.grey },
          { label:t.salePrice,     val:salePrice,  color:tc.gold },
          { label:t.paid,          val:totalPaid,  color:tc.greenLight },
          { label:t.remaining,     val:remaining,  color:remaining>0?tc.warning:tc.greenLight },
        ].map(({label,val,color}) => (
          <div key={label} style={{ background:"rgba(255,255,255,.03)",
            border:"1px solid rgba(255,255,255,.07)",
            borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
            <p style={{ fontSize:10, color:tc.grey, marginBottom:4 }}>{label}</p>
            <p style={{ fontSize:15, fontWeight:800, color, fontFamily:"'Amiri',serif" }}>
              {val.toLocaleString("ar-MA")}
            </p>
            <p style={{ fontSize:10, color:tc.grey }}>د.م</p>
          </div>
        ))}
      </div>

      {discount > 0 && (
        <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.18)",
          borderRadius:10, padding:"8px 14px", marginBottom:12,
          display:"flex", alignItems:"center", gap:8 }}>
          <AppIcon name="discount" size={16} color={tc.danger} />
          <span style={{ fontSize:13, color:tc.danger, fontWeight:600 }}>
            {t.discount}: {discount.toLocaleString("ar-MA")} د.م ({Math.round((discount/offPrice)*100)}%)
          </span>
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:12 }}>
          <span style={{ color:tc.grey }}>{t.paymentProgress}</span>
          <span style={{ color:tc.gold, fontWeight:700 }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height:7, background:"rgba(255,255,255,.06)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:4, transition:"width 1.2s",
            background:pct>=100?"linear-gradient(90deg,#22c55e,#16a34a)":pct>50?"linear-gradient(90deg,#f59e0b,#d4af37)":"linear-gradient(90deg,#ef4444,#f97316)" }} />
        </div>
      </div>

      {/* Passport */}
      <GlassCard style={{ padding:14, marginBottom:14 }}>
        <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="passport" size={14} color={tc.gold} /> {t.passport}</p>
        {daysToExp !== null && daysToExp < 180 && (
          <div style={{ background:daysToExp<90?"rgba(239,68,68,.1)":"rgba(245,158,11,.1)",
            border:`1px solid ${daysToExp<90?tc.danger:tc.warning}`,
            borderRadius:8, padding:"6px 12px", marginBottom:10, fontSize:12,
            color:daysToExp<90?tc.danger:tc.warning, fontWeight:600 }}>
            {tr(t.passportExpiryWarning, { days: daysToExp, expiry: p.expiry })}
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            [t.passportNo,    p.number||"—"],
            [t.nationality,   p.nationality||"—"],
            [t.gender,        p.gender==="M"?t.male:p.gender==="F"?t.female:"—"],
            [t.birthDate,     p.birthDate||"—"],
            [t.expiry,        p.expiry||"—"],
            [t.issueDate,     p.issueDate||"—"],
          ].map(([k,v]) => (
            <div key={k}>
              <p style={{ fontSize:10, color:tc.grey }}>{k}</p>
              <p style={{ fontSize:12, fontWeight:600, color:"#f8fafc" }}>{v}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Documents */}
      <GlassCard style={{ padding:14, marginBottom:14 }}>
        <p style={{ fontSize:11, color:tc.grey, fontWeight:700, marginBottom:10, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="documents" size={14} color={tc.gold} /> {t.documents}</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            ["passportCopy", t.passportCopy],
            ["photo",        t.photo],
            ["vaccine",      t.vaccine],
            ["contract",     t.contract],
          ].map(([key, label]) => (
            <span key={key} style={{
              padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700,
              background:docs[key]?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)",
              border:`1px solid ${docs[key]?tc.greenLight:tc.danger}`,
              color:docs[key]?tc.greenLight:tc.danger,
            }}>
              <AppIcon name={docs[key] ? "success" : "error"} size={13} color={docs[key]?tc.greenLight:tc.danger} /> {label}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Notes */}
      {client.notes && (
        <div style={{ background:"rgba(212,175,55,.06)", border:"1px solid rgba(212,175,55,.15)",
          borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <p style={{ fontSize:11, color:tc.grey, marginBottom:3, display:"inline-flex", alignItems:"center", gap:6 }}><AppIcon name="notes" size={13} color={tc.gold} /> {t.notes}</p>
          <p style={{ fontSize:13, color:"#f8fafc" }}>{client.notes}</p>
        </div>
      )}

      <Divider label={t.paymentRecord} />

      {/* Add payment */}
      {status !== "cleared" && !showPayForm && (
        <Button variant="success" icon="plus" onClick={() => setShowPayForm(true)}
          style={{ marginBottom:12 }}>
          {t.addPayment}
        </Button>
      )}
      {showPayForm && (
        <PaymentForm clientId={client.id} clientName={client.name} store={store}
          onSave={() => { setShowPayForm(false); onToast(t.addSuccess, "success"); }}
          onCancel={() => setShowPayForm(false)} />
      )}

      {/* Payments */}
      {payments.length === 0 ? (
        <div style={{ textAlign:"center", padding:20, color:tc.grey, fontSize:13 }}>
          {t.noPayments}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {[...payments].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(pmt => (
            <PaymentRow key={pmt.id} payment={pmt}
              onPrint={() => printReceipt({ payment:pmt, client, program, agency, lang })}
              onDelete={() => {
                if (window.confirm(t.confirmDeletePayment)) {
                  deletePayment(pmt.id);
                  onToast(t.deleteSuccess, "info");
                }
              }} />
          ))}
        </div>
      )}

      {lastPmt && (
        <div style={{ marginTop:10, display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:tc.grey }}>{t.lastPayment}: <strong style={{color:"#f8fafc"}}>{lastPmt.date}</strong></span>
          <span style={{ fontSize:12, color:tc.grey }}>{t.lastReceipt}: <strong style={{color:tc.gold}}>{lastPmt.receiptNo}</strong></span>
          <span style={{ fontSize:12, color:tc.grey }}>{t.paymentCount}: <strong style={{color:"#f8fafc"}}>{payments.length}</strong></span>
        </div>
      )}

      <Divider style={{ marginTop:18 }} />
      <div style={{ display:"flex", gap:8, justifyContent:"space-between", flexWrap:"wrap", alignItems:"center" }}>
        {/* Left: destructive actions */}
        <div style={{ display:"flex", gap:8 }}>
          {onDelete && (
            <Button variant="danger" icon="trash" onClick={onDelete}>
              {t.deleteClient || "حذف"}
            </Button>
          )}
          {!client.archived && onArchive && (
            <Button variant="warning" icon="archive" onClick={onArchive}>
              {t.archiveClient}
            </Button>
          )}
          {client.archived && onRestore && (
            <Button variant="success" icon="restore" onClick={onRestore}>
              {t.restoreClient}
            </Button>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Button variant="ghost" onClick={onClose}>{t.cancel}</Button>
          {!client.archived && (
            <Button variant="secondary" icon="edit" onClick={() => onEdit(client)}>{t.edit}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment, onPrint, onDelete }) {
  const { t } = useLang();
  const [hov, setHov] = React.useState(false);
  const icons = {"نقدًا":"banknote","تحويل بنكي":"bank","شيك":"file","بطاقة بنكية":"payment","وقفة بنك":"bank"};
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px",
        background:hov?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",
        border:"1px solid rgba(255,255,255,.06)", borderRadius:10, transition:"all .2s" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <AppIcon name={icons[payment.method] || "payment"} size={18} color={theme.colors.gold} />
        <div>
          <p style={{ fontWeight:700, color:theme.colors.greenLight, fontSize:14 }}>
            {payment.amount.toLocaleString("ar-MA")} د.م
          </p>
          <p style={{ fontSize:11, color:theme.colors.grey }}>
            {payment.method} • {payment.date} • <strong style={{color:theme.colors.gold}}>{payment.receiptNo}</strong>
          </p>
          {payment.note && <p style={{ fontSize:11, color:theme.colors.grey }}>{payment.note}</p>}
        </div>
      </div>
      {hov && (
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={onPrint} style={{ background:"rgba(212,175,55,.1)",
            border:"1px solid rgba(212,175,55,.2)", color:theme.colors.gold,
            borderRadius:8, padding:"4px 10px", fontSize:11,
            cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}><AppIcon name="print" size={13} color={theme.colors.gold} /></button>
          <button onClick={onDelete} style={{ background:"rgba(239,68,68,.1)",
            border:"1px solid rgba(239,68,68,.2)", color:"#ef4444",
            borderRadius:8, padding:"4px 10px", fontSize:11,
            cursor:"pointer", fontFamily:"'Cairo',sans-serif" }}>{t.delete}</button>
        </div>
      )}
    </div>
  );
}
