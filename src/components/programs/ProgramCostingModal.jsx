import React from "react";
import { Button, GlassCard, Input, Modal } from "../UI";
import { AppIcon } from "../Icon";
import { theme } from "../styles";
import { useLang } from "../../hooks/useLang";
import { formatCurrency } from "../../utils/currency";
import { printProgramCostingReport } from "../../utils/programCostingPdf";
import {
  applyCostingSellingPricesToProgram,
  attachProgramCostingDraft,
  calculateCostingResults,
  copyCostingNumbersFromPreviousLevel,
  createInitialCostingDraft,
  getProgramCostingLabels,
  getSharedCostTotal,
  isValidCostingExchangeRate,
  prepareCostingDraftForSave,
  sanitizeCostingNumberInput,
} from "./programCosting";

const tc = theme.colors;

const sectionStyle = {
  padding:16,
  borderRadius:14,
};

const inputGridStyle = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
  gap:12,
};

const updateLevelAt = (levels, index, updater) => (
  levels.map((level, levelIndex) => levelIndex === index ? updater(level) : level)
);

const serializeCostingDraft = (draft) => {
  const prepared = prepareCostingDraftForSave(draft);
  return JSON.stringify({
    ...prepared,
    createdAt: "",
    updatedAt: "",
  });
};

function NumberField({ label, value, onChange, step = "0.01" }) {
  return (
    <Input
      label={label}
      value={value ?? ""}
      onChange={(event) => onChange(sanitizeCostingNumberInput(event.target.value))}
      type="number"
      min={0}
      step={step}
    />
  );
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
      <span style={{
        width:34,
        height:34,
        borderRadius:10,
        background:"rgba(212,175,55,.12)",
        border:"1px solid rgba(212,175,55,.22)",
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
      }}>
        <AppIcon name={icon} size={17} color={tc.gold} />
      </span>
      <div>
        <p style={{ margin:0, color:tc.gold, fontSize:14, fontWeight:900 }}>{title}</p>
        {sub && <p style={{ margin:"2px 0 0", color:tc.grey, fontSize:11 }}>{sub}</p>}
      </div>
    </div>
  );
}

function ReadOnlyValue({ label, value }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <span style={{ fontSize:13, fontWeight:600, color:tc.grey }}>{label}</span>
      <span style={{
        minHeight:40,
        display:"flex",
        alignItems:"center",
        border:"1px solid rgba(212,175,55,.16)",
        background:"rgba(255,255,255,.035)",
        borderRadius:10,
        padding:"9px 12px",
        color:tc.white,
        fontSize:13,
        fontWeight:800,
      }}>
        {value}
      </span>
    </div>
  );
}

export default function ProgramCostingModal({
  open,
  onClose,
  program,
  agency,
  onUpdateProgram,
  onToast,
}) {
  const { lang } = useLang();
  const labels = React.useMemo(() => getProgramCostingLabels(lang), [lang]);
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState(() => createInitialCostingDraft({ program, lang }));
  const [error, setError] = React.useState("");
  const programRef = React.useRef(program);
  const savedDraftSnapshotRef = React.useRef(serializeCostingDraft(createInitialCostingDraft({ program, lang })));
  const programId = program?.id;
  const results = React.useMemo(() => calculateCostingResults(draft), [draft]);
  const sharedTotal = React.useMemo(() => getSharedCostTotal(draft), [draft]);
  const hasNightsWarning = React.useMemo(() => (
    (draft.levels || []).some((level) => level.nightsMissingSource)
  ), [draft.levels]);
  const money = React.useCallback((value) => formatCurrency(value || 0, lang), [lang]);

  React.useEffect(() => {
    programRef.current = program;
  }, [program]);

  React.useEffect(() => {
    if (!open) return;
    const initialDraft = createInitialCostingDraft({ program: programRef.current || {}, lang });
    setDraft(initialDraft);
    savedDraftSnapshotRef.current = serializeCostingDraft(initialDraft);
    setStep(0);
    setError("");
  }, [open, programId, lang]);

  const hasUnsavedChanges = React.useCallback(() => (
    serializeCostingDraft(draft) !== savedDraftSnapshotRef.current
  ), [draft]);

  const handleRequestClose = React.useCallback(() => {
    if (hasUnsavedChanges() && !window.confirm(labels.unsavedCloseConfirm)) return;
    onClose?.();
  }, [hasUnsavedChanges, labels.unsavedCloseConfirm, onClose]);

  const setSharedCost = React.useCallback((key, value) => {
    setDraft((prev) => ({
      ...prev,
      sharedCosts: { ...(prev.sharedCosts || {}), [key]: value },
    }));
  }, []);

  const setStandaloneSalePrice = React.useCallback((key, value) => {
    setDraft((prev) => ({
      ...prev,
      standaloneSalePrices: { ...(prev.standaloneSalePrices || {}), [key]: value },
    }));
  }, []);

  const setLevelField = React.useCallback((index, city, key, value) => {
    setDraft((prev) => ({
      ...prev,
      levels: updateLevelAt(prev.levels || [], index, (level) => ({
        ...level,
        [city]: { ...(level[city] || {}), [key]: value },
      })),
    }));
  }, []);

  const setSellingPrice = React.useCallback((index, roomKey, value) => {
    setDraft((prev) => ({
      ...prev,
      levels: updateLevelAt(prev.levels || [], index, (level) => ({
        ...level,
        sellingPrices: { ...(level.sellingPrices || {}), [roomKey]: value },
      })),
    }));
  }, []);

  const validateExchangeRate = React.useCallback(() => {
    if (isValidCostingExchangeRate(draft)) {
      setError("");
      return true;
    }
    setError(labels.exchangeError);
    return false;
  }, [draft, labels.exchangeError]);

  const handleNext = () => {
    if (step === 0 && !validateExchangeRate()) return;
    setStep((current) => Math.min(2, current + 1));
  };

  const handleSave = () => {
    if (!validateExchangeRate()) return;
    const nextProgram = attachProgramCostingDraft(programRef.current || program, draft);
    programRef.current = nextProgram;
    onUpdateProgram?.(nextProgram);
    savedDraftSnapshotRef.current = serializeCostingDraft(draft);
    onToast?.(labels.saved, "success");
  };

  const handleApplyPrices = () => {
    if (!validateExchangeRate()) return;
    if (!window.confirm(labels.applyConfirm)) return;
    const { appliedCount, program: nextProgram } = applyCostingSellingPricesToProgram(programRef.current || program, draft);
    if (!appliedCount) {
      onToast?.(labels.noPricesToApply, "info");
      return;
    }
    programRef.current = nextProgram;
    onUpdateProgram?.(nextProgram);
    savedDraftSnapshotRef.current = serializeCostingDraft(draft);
    onToast?.(labels.applied, "success");
  };

  const handlePrint = () => {
    if (!validateExchangeRate()) return;
    printProgramCostingReport({
      program: programRef.current || program,
      agency,
      draft: prepareCostingDraftForSave(draft),
      results,
      labels,
      lang,
    });
  };

  const copyPreviousLevel = (index) => {
    setDraft((prev) => copyCostingNumbersFromPreviousLevel(prev, index));
  };

  const hotelLabel = React.useCallback((value) => value || labels.notSpecified, [labels.notSpecified]);
  const nightLabel = React.useCallback((level, value) => (
    level.nightsMissingSource ? "—" : Number(value || 0).toLocaleString("fr-MA")
  ), []);

  const renderStepIndicator = () => (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:8, marginBottom:18 }}>
      {labels.steps.map((label, index) => {
        const active = step === index;
        const done = step > index;
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (index > 0 && !validateExchangeRate()) return;
              setStep(index);
            }}
            style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:8,
              border:"1px solid rgba(212,175,55,.2)",
              borderRadius:12,
              padding:"9px 10px",
              background:active ? "rgba(212,175,55,.16)" : done ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.03)",
              color:active ? tc.gold : done ? tc.greenLight : tc.grey,
              fontFamily:"'Cairo',sans-serif",
              fontSize:12,
              fontWeight:900,
              cursor:"pointer",
            }}
          >
            <span style={{
              width:22,
              height:22,
              borderRadius:999,
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              background:active ? "rgba(212,175,55,.18)" : "rgba(255,255,255,.05)",
              color:"currentColor",
              fontSize:11,
            }}>{done ? "✓" : index + 1}</span>
            {label}
          </button>
        );
      })}
    </div>
  );

  const renderSharedCostsStep = () => (
    <GlassCard gold style={sectionStyle}>
      <SectionHeader icon="coins" title={labels.sharedCosts} sub={labels.totalShared} />
      <div style={inputGridStyle}>
        <NumberField label={labels.exchangeRate} value={draft.exchangeRate} onChange={(value) => setDraft((prev) => ({ ...prev, exchangeRate: value }))} />
        <NumberField label={labels.flight} value={draft.sharedCosts?.flight} onChange={(value) => setSharedCost("flight", value)} />
        <NumberField label={labels.ticketOnlySalePrice} value={draft.standaloneSalePrices?.ticketOnly} onChange={(value) => setStandaloneSalePrice("ticketOnly", value)} />
        <NumberField label={labels.visa} value={draft.sharedCosts?.visa} onChange={(value) => setSharedCost("visa", value)} />
        <NumberField label={labels.visaOnlySalePrice} value={draft.standaloneSalePrices?.visaOnly} onChange={(value) => setStandaloneSalePrice("visaOnly", value)} />
        <NumberField label={labels.transport} value={draft.sharedCosts?.transport} onChange={(value) => setSharedCost("transport", value)} />
        <NumberField label={labels.guide} value={draft.sharedCosts?.guide} onChange={(value) => setSharedCost("guide", value)} />
        <NumberField label={labels.miscellaneous} value={draft.sharedCosts?.miscellaneous} onChange={(value) => setSharedCost("miscellaneous", value)} />
      </div>
      <p style={{ margin:"10px 0 0", color:tc.grey, fontSize:11, lineHeight:1.7 }}>
        {labels.standaloneSalePriceHint}
      </p>
      <div style={{
        marginTop:14,
        padding:"10px 12px",
        borderRadius:10,
        background:"rgba(255,255,255,.05)",
        border:"1px solid rgba(255,255,255,.08)",
        display:"flex",
        justifyContent:"space-between",
        gap:12,
        color:tc.grey,
        fontSize:13,
      }}>
        <span>{labels.totalShared}</span>
        <strong style={{ color:tc.gold }}>{money(sharedTotal)}</strong>
      </div>
    </GlassCard>
  );

  const renderHotelsStep = () => (
    <div style={{ display:"grid", gap:12 }}>
      {(draft.levels || []).map((level, index) => (
        <GlassCard key={level.levelId || index} gold style={sectionStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
            <SectionHeader icon="hotel" title={level.levelName || "—"} />
            {index > 0 && (
              <Button variant="secondary" size="sm" icon="copy" onClick={() => copyPreviousLevel(index)}>
                {labels.copyPrevious}
              </Button>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>
            <div style={{ display:"grid", gap:10 }}>
              <p style={{ margin:0, color:tc.gold, fontSize:12, fontWeight:900 }}>{labels.makkah}</p>
              <ReadOnlyValue label={labels.makkahHotel} value={hotelLabel(level.makkah?.hotelName)} />
              <ReadOnlyValue label={labels.makkahNights} value={nightLabel(level, level.makkah?.nights)} />
              <NumberField label={labels.makkahRoomPriceSar} value={level.makkah?.roomPriceSar} onChange={(value) => setLevelField(index, "makkah", "roomPriceSar", value)} />
            </div>
            <div style={{ display:"grid", gap:10 }}>
              <p style={{ margin:0, color:tc.gold, fontSize:12, fontWeight:900 }}>{labels.madinah}</p>
              <ReadOnlyValue label={labels.madinahHotel} value={hotelLabel(level.madinah?.hotelName)} />
              <ReadOnlyValue label={labels.madinahNights} value={nightLabel(level, level.madinah?.nights)} />
              <NumberField label={labels.madinahRoomPriceSar} value={level.madinah?.roomPriceSar} onChange={(value) => setLevelField(index, "madinah", "roomPriceSar", value)} />
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );

  const renderResultsStep = () => (
    <div style={{ display:"grid", gap:12 }}>
      {results.map((level, levelIndex) => (
        <GlassCard key={level.levelId || levelIndex} gold style={sectionStyle}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
            <SectionHeader icon="clearance" title={level.levelName || "—"} sub={`${hotelLabel(level.makkah?.hotelName)} / ${hotelLabel(level.madinah?.hotelName)}`} />
            <span style={{
              border:"1px solid rgba(212,175,55,.2)",
              background:"rgba(212,175,55,.08)",
              color:tc.gold,
              borderRadius:999,
              padding:"4px 10px",
              fontSize:11,
              fontWeight:900,
            }}>{labels.exchangeRate}: {draft.exchangeRate || "—"}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:10 }}>
            {level.rooms.map((room) => (
              <div key={room.key} style={{
                border:`1px solid ${room.isLoss ? "rgba(239,68,68,.38)" : "rgba(212,175,55,.16)"}`,
                background:room.isLoss ? "rgba(239,68,68,.08)" : "rgba(0,0,0,.13)",
                borderRadius:12,
                padding:12,
                display:"grid",
                gap:8,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center" }}>
                  <strong style={{ color:tc.white, fontSize:13 }}>{labels[room.key]}</strong>
                  {room.isLoss && <span style={{ color:tc.danger, fontSize:10, fontWeight:900 }}>{labels.sellingAtLoss}</span>}
                </div>
                <div style={{ display:"grid", gap:5, color:tc.grey, fontSize:11 }}>
                  <span style={{ display:"flex", justifyContent:"space-between", gap:8 }}><span>{labels.accommodation}</span><strong style={{ color:tc.white }}>{money(room.accommodationCost)}</strong></span>
                  <span style={{ display:"flex", justifyContent:"space-between", gap:8 }}><span>{labels.shared}</span><strong style={{ color:tc.white }}>{money(room.sharedCost)}</strong></span>
                  <span style={{ display:"flex", justifyContent:"space-between", gap:8 }}><span>{labels.costPerPerson}</span><strong style={{ color:tc.gold }}>{money(room.costPerPerson)}</strong></span>
                </div>
                <NumberField
                  label={labels.sellingPrice}
                  value={
                    draft.levels?.[levelIndex]?.sellingPrices?.[room.key] !== undefined
                      && draft.levels?.[levelIndex]?.sellingPrices?.[room.key] !== ""
                      ? draft.levels?.[levelIndex]?.sellingPrices?.[room.key]
                      : room.sellingPrice > 0 ? room.sellingPrice : ""
                  }
                  onChange={(value) => setSellingPrice(levelIndex, room.key, value)}
                />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div style={{ color:tc.grey, fontSize:11 }}>
                    <span>{labels.profit}</span>
                    <p style={{ margin:"3px 0 0", color:room.profitAmount < 0 ? tc.danger : tc.greenLight, fontWeight:900 }}>
                      {room.sellingPrice > 0 ? money(room.profitAmount) : "—"}
                    </p>
                  </div>
                  <div style={{ color:tc.grey, fontSize:11 }}>
                    <span>{labels.margin}</span>
                    <p style={{ margin:"3px 0 0", color:tc.greenLight, fontWeight:900 }}>
                      {room.margin === null ? "—" : `${room.margin}%`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleRequestClose}
      title={labels.title}
      width={1080}
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {renderStepIndicator()}
        {hasNightsWarning && (
          <div style={{
            border:"1px solid rgba(245,158,11,.34)",
            background:"rgba(245,158,11,.1)",
            color:tc.warning,
            borderRadius:10,
            padding:"9px 12px",
            marginBottom:12,
            fontSize:12,
            fontWeight:800,
            lineHeight:1.7,
          }}>
            {labels.nightsWarning}
          </div>
        )}
        {error && (
          <div style={{
            border:"1px solid rgba(239,68,68,.32)",
            background:"rgba(239,68,68,.1)",
            color:tc.danger,
            borderRadius:10,
            padding:"9px 12px",
            marginBottom:12,
            fontSize:12,
            fontWeight:800,
          }}>
            {error}
          </div>
        )}
        <div style={{ display:"grid", gap:12 }}>
          {step === 0 && renderSharedCostsStep()}
          {step === 1 && renderHotelsStep()}
          {step === 2 && renderResultsStep()}
        </div>
        <div style={{
          position:"sticky",
          bottom:-24,
          zIndex:5,
          margin:"18px -24px -24px",
          padding:"14px 24px",
          background:"var(--rukn-bg-modal)",
          borderTop:"1px solid rgba(212,175,55,.16)",
          display:"flex",
          justifyContent:"space-between",
          gap:10,
          flexWrap:"wrap",
        }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={handleRequestClose}>{labels.close}</Button>
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
              {labels.back}
            </Button>
            {step < 2 && (
              <Button variant="primary" onClick={handleNext}>
                {labels.next}
              </Button>
            )}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <Button variant="secondary" icon="save" onClick={handleSave}>
              {labels.saveCosting}
            </Button>
            {step === 2 && (
              <>
                <Button variant="success" icon="check" onClick={handleApplyPrices}>
                  {labels.applyPrices}
                </Button>
                <Button variant="secondary" icon="print" onClick={handlePrint}>
                  {labels.downloadPdf}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
