import React from "react";
import { Button, Input, Modal } from "../../../components/UI";
import { useLang } from "../../../hooks/useLang";
import { formatCurrency } from "../../../utils/currency";
import { formatDateForExcel } from "../../../utils/hotelDates";
import {
  getPackageRoomPrice,
  normalizeProgramPackages,
} from "../../../utils/programPackages";
import { translateProgramType } from "../../../utils/i18nValues";
import { getProgramKind } from "../../../utils/participantTerminology";

const BULK_POSTER_ROOM_TYPES = ["double", "triple", "quad", "quint"];

const normalizeBulkPosterText = (value) => String(value || "")
  .normalize("NFKC")
  .trim()
  .replace(/\s+/g, " ")
  .toLocaleLowerCase("ar");

const normalizeBulkPosterPrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number.toFixed(2) : "";
};

const getBulkPosterProgramSignature = (program = {}) => {
  const rows = normalizeProgramPackages(program).map((pkg) => {
    const prices = {};
    BULK_POSTER_ROOM_TYPES.forEach((roomType) => {
      const price = normalizeBulkPosterPrice(getPackageRoomPrice(pkg, roomType));
      if (price) prices[roomType] = price;
    });
    return {
      makkah: normalizeBulkPosterText(pkg.hotelMecca),
      madinah: normalizeBulkPosterText(pkg.hotelMadina),
      prices,
    };
  });
  return JSON.stringify(rows);
};

const getBulkPosterStartingPrice = (program = {}) => {
  const prices = normalizeProgramPackages(program).flatMap((pkg) => (
    BULK_POSTER_ROOM_TYPES
      .map((roomType) => getPackageRoomPrice(pkg, roomType))
      .filter((price) => Number.isFinite(price) && price > 0)
  ));
  return prices.length ? Math.min(...prices) : 0;
};

export function BulkProgramPosterModal({ isOpen, onClose, programs = [], onDownloadRequest }) {
  const { t, tr, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const [referenceProgramId, setReferenceProgramId] = React.useState("");
  const [selectedProgramIds, setSelectedProgramIds] = React.useState(() => new Set());
  const [titleOverride, setTitleOverride] = React.useState("");
  const [showDates, setShowDates] = React.useState(true);

  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );

  const programList = React.useMemo(() => (
    Array.isArray(programs) ? programs : []
  ), [programs]);

  const programById = React.useMemo(() => (
    new Map(programList.map((program) => [String(program.id), program]))
  ), [programList]);

  const referenceSignature = React.useMemo(() => {
    const referenceProgram = programById.get(String(referenceProgramId || ""));
    return referenceProgram ? getBulkPosterProgramSignature(referenceProgram) : "";
  }, [programById, referenceProgramId]);

  const referenceProgram = React.useMemo(() => (
    programById.get(String(referenceProgramId || "")) || null
  ), [programById, referenceProgramId]);

  const selectedPrograms = React.useMemo(() => (
    Array.from(selectedProgramIds)
      .map((programId) => programById.get(String(programId)))
      .filter(Boolean)
  ), [programById, selectedProgramIds]);

  const visiblePrograms = React.useMemo(() => {
    if (!referenceSignature) return programList;
    return programList.filter((program) => (
      selectedProgramIds.has(String(program.id))
      || getBulkPosterProgramSignature(program) === referenceSignature
    ));
  }, [programList, referenceSignature, selectedProgramIds]);

  const resetSelection = React.useCallback(() => {
    setReferenceProgramId("");
    setSelectedProgramIds(new Set());
    setTitleOverride("");
    setShowDates(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) resetSelection();
  }, [isOpen, resetSelection]);

  const handleClose = React.useCallback(() => {
    resetSelection();
    onClose?.();
  }, [onClose, resetSelection]);

  const toggleProgramSelection = React.useCallback((program) => {
    const programId = String(program?.id || "");
    if (!programId) return;

    if (selectedProgramIds.has(programId)) {
      if (programId === referenceProgramId) {
        resetSelection();
        return;
      }
      const nextSelectedIds = new Set(selectedProgramIds);
      nextSelectedIds.delete(programId);
      if (!nextSelectedIds.size) {
        resetSelection();
        return;
      }
      setSelectedProgramIds(nextSelectedIds);
      return;
    }

    const nextSelectedIds = new Set(selectedProgramIds);
    nextSelectedIds.add(programId);
    if (!referenceProgramId || !selectedProgramIds.size) {
      setReferenceProgramId(programId);
      setTitleOverride(program?.name || "");
    }
    setSelectedProgramIds(nextSelectedIds);
  }, [
    referenceProgramId,
    resetSelection,
    selectedProgramIds,
  ]);

  const handleCreatePoster = React.useCallback(() => {
    if (!referenceProgram || selectedPrograms.length === 0) return;
    const selectedProgramIdsList = Array.from(selectedProgramIds);
    const cleanTitle = String(titleOverride || "").trim() || referenceProgram.name || "";

    const payload = {
      isBulkPoster: true,
      referenceProgramId: String(referenceProgram.id || ""),
      referenceProgram,
      selectedProgramIds: selectedProgramIdsList,
      selectedPrograms,
      titleOverride: cleanTitle,
      showDates,
      posterOptions: {
        titleOverride: cleanTitle,
        showDates,
        isBulkPoster: true,
      },
    };

    onDownloadRequest?.(payload);
  }, [onDownloadRequest, referenceProgram, selectedProgramIds, selectedPrograms, showDates, titleOverride]);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={t.bulkPosterCreate}
      width={640}
    >
      <div style={{
        display:"grid",
        gap:12,
        direction:dir,
        textAlign:isRTL ? "right" : "left",
      }}>
        <style>{`
          .bulk-poster-program-list {
            scrollbar-width: thin;
            scrollbar-color: rgba(212,175,55,.38) transparent;
          }
          .bulk-poster-program-list::-webkit-scrollbar {
            width: 8px;
          }
          .bulk-poster-program-list::-webkit-scrollbar-track {
            background: transparent;
          }
          .bulk-poster-program-list::-webkit-scrollbar-thumb {
            background: rgba(212,175,55,.32);
            border-radius: 999px;
          }
          .bulk-poster-program-row:hover {
            border-color: rgba(212,175,55,.46) !important;
            background: #FFFFFF !important;
            box-shadow: 0 12px 26px rgba(15,23,42,.105), 0 1px 0 rgba(255,255,255,.86) inset !important;
            transform: translateY(-1px);
          }
          @media (max-width: 720px) {
            .bulk-poster-settings-panel {
              grid-template-columns: 1fr !important;
            }
            .bulk-poster-footer {
              align-items: stretch !important;
            }
            .bulk-poster-footer-actions {
              justify-content: stretch !important;
            }
          }
        `}</style>
        <div style={{ display:"grid", gap:5 }}>
          <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:12.5, lineHeight:1.7 }}>
            {t.bulkPosterInstruction}
          </p>
          {referenceProgramId ? (
            <p style={{ margin:0, color:"var(--rukn-gold)", fontSize:11.5, fontWeight:800, lineHeight:1.6 }}>
              {t.bulkPosterMatchingOnly}
            </p>
          ) : (
            <span style={{ minHeight:18 }} />
          )}
        </div>
        <div style={{
          border:"1px solid rgba(148,163,184,.18)",
          borderRadius:14,
          background:"rgba(248,250,252,.46)",
          padding:7,
          boxShadow:"0 10px 24px rgba(15,23,42,.04) inset",
        }}>
          <div className="bulk-poster-program-list" style={{
            display:"grid",
            gap:6,
            maxHeight:"min(40vh, 350px)",
            overflowY:"auto",
            overscrollBehavior:"contain",
            scrollBehavior:"smooth",
            WebkitOverflowScrolling:"touch",
            padding:"2px 3px",
          }}>
            {visiblePrograms.length > 0 ? visiblePrograms.map((program) => {
              const programId = String(program.id || "");
              const selected = selectedProgramIds.has(programId);
              const departureDate = formatDateForExcel(program.departure || program.departureDate || program.departure_date);
              const returnDate = formatDateForExcel(program.returnDate || program.return_date || program.return);
              const startingPrice = getBulkPosterStartingPrice(program);
              const programType = translateProgramType(getProgramKind(program, null, {
                allowNameFallback: true,
                defaultKind: "umrah",
              }), lang);
              const metadataItems = [
                { label: t.bulkPosterType, value: programType || "—" },
                { label: t.bulkPosterDepartureDate, value: departureDate || "—" },
                { label: t.bulkPosterReturnDate, value: returnDate || "—" },
                { label: t.bulkPosterStartingFrom, value: startingPrice ? formatCurrencyForLang(startingPrice) : "—" },
              ];

              return (
                <label
                  key={programId}
                  className="bulk-poster-program-row"
                  style={{
                    display:"flex",
                    alignItems:"flex-start",
                    gap:10,
                    padding:"9px 10px",
                    borderRadius:12,
                    border:`1px solid ${selected ? "rgba(212,175,55,.7)" : "rgba(148,163,184,.34)"}`,
                    background:selected
                      ? "linear-gradient(135deg,rgba(212,175,55,.18),#FFFDF7)"
                      : "#FFFFFF",
                    boxShadow:selected
                      ? "0 12px 28px rgba(212,175,55,.16), 0 1px 0 rgba(255,255,255,.86) inset"
                      : "0 9px 22px rgba(15,23,42,.075), 0 1px 0 rgba(255,255,255,.88) inset",
                    cursor:"pointer",
                    transition:"border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease",
                  }}
                >
                  <span style={{
                    width:26,
                    height:26,
                    borderRadius:9,
                    display:"inline-flex",
                    alignItems:"center",
                    justifyContent:"center",
                    flex:"0 0 auto",
                    background:selected ? "rgba(212,175,55,.22)" : "rgba(241,245,249,.9)",
                    border:`1px solid ${selected ? "rgba(212,175,55,.52)" : "rgba(148,163,184,.32)"}`,
                    marginTop:1,
                  }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProgramSelection(program)}
                      style={{
                        width:14,
                        height:14,
                        accentColor:"var(--rukn-gold)",
                        cursor:"pointer",
                      }}
                    />
                  </span>
                  <span style={{ minWidth:0, flex:1, display:"grid", gap:6 }}>
                    <strong style={{
                      color:"var(--rukn-text-strong)",
                      fontSize:13.5,
                      fontWeight:900,
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                      whiteSpace:"nowrap",
                      lineHeight:1.35,
                    }}>
                      {program.name || t.bulkPosterUnnamedProgram}
                    </strong>
                    <span style={{
                      display:"flex",
                      alignItems:"center",
                      gap:5,
                      flexWrap:"wrap",
                      lineHeight:1.35,
                    }}>
                      {metadataItems.map((item) => (
                        <span key={item.label} style={{
                          display:"inline-flex",
                          alignItems:"center",
                          gap:4,
                          borderRadius:999,
                          padding:"2px 7px",
                          background:selected ? "rgba(255,255,255,.7)" : "rgba(248,250,252,.94)",
                          border:`1px solid ${selected ? "rgba(212,175,55,.18)" : "rgba(148,163,184,.2)"}`,
                          color:"var(--rukn-text)",
                          fontSize:10.5,
                          fontWeight:800,
                        }}>
                          <span style={{ color:"var(--rukn-text-muted)", fontSize:9.5, fontWeight:700 }}>
                            {item.label}:
                          </span>
                          <span>{item.value}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              );
            }) : (
              <div style={{
                padding:"16px 12px",
                borderRadius:11,
                border:"1px dashed var(--rukn-border-soft)",
                color:"var(--rukn-text-muted)",
                fontSize:12.5,
                textAlign:"center",
                lineHeight:1.7,
                background:"rgba(148,163,184,.06)",
              }}>
                {t.bulkPosterNoPrograms}
              </div>
            )}
          </div>
        </div>
        <div className="bulk-poster-settings-panel" style={{
          border:"1px solid rgba(148,163,184,.18)",
          background:"rgba(255,255,255,.62)",
          borderRadius:13,
          padding:11,
          display:"grid",
          gridTemplateColumns:"minmax(0,1fr) 168px",
          alignItems:"end",
          gap:12,
        }}>
          <Input
            label={t.bulkPosterTitle}
            value={titleOverride}
            onChange={(event) => setTitleOverride(event.target.value)}
            placeholder={referenceProgram?.name || t.bulkPosterTitle}
            disabled={!selectedProgramIds.size}
            inputStyle={{
              background:"#FFFFFF",
              borderColor:"rgba(148,163,184,.28)",
              color:"#111827",
              fontWeight:800,
              textAlign:isRTL ? "right" : "left",
              direction:dir,
            }}
          />
          <div style={{
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:10,
            minHeight:57,
            padding:"0 2px 2px",
          }}>
            <span style={{
              color:"var(--rukn-text-strong)",
              fontSize:12.5,
              fontWeight:800,
            }}>
              {t.bulkPosterShowDates}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showDates}
              aria-label={t.bulkPosterShowDates}
              onClick={() => setShowDates((value) => !value)}
              style={{
                width:50,
                height:28,
                border:0,
                borderRadius:999,
                padding:0,
                position:"relative",
                flex:"0 0 auto",
                background:showDates
                  ? "linear-gradient(135deg,var(--rukn-gold),#f5c857)"
                  : "rgba(148,163,184,.32)",
                boxShadow:showDates ? "0 7px 15px rgba(212,175,55,.22)" : "inset 0 0 0 1px rgba(148,163,184,.2)",
                cursor:"pointer",
                transition:"background .2s ease, box-shadow .2s ease",
              }}
            >
              <span style={{
                position:"absolute",
                top:3,
                left:showDates ? 25 : 3,
                width:22,
                height:22,
                borderRadius:999,
                background:"#fff",
                boxShadow:"0 3px 9px rgba(15,23,42,.22)",
                transition:"left .2s ease",
              }} />
            </button>
          </div>
        </div>
        <div className="bulk-poster-footer" style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          gap:12,
          flexWrap:"wrap",
          paddingTop:2,
        }}>
          <span style={{ minWidth:0, display:"grid", gap:2 }}>
            <span style={{ color:"var(--rukn-text-muted)", fontSize:12, fontWeight:800 }}>
              {tr("bulkPosterSelectedCount", { count: selectedProgramIds.size })}
            </span>
            {selectedProgramIds.size > 0 && (
              <span style={{ color:"var(--rukn-text-muted)", fontSize:10.5, lineHeight:1.45 }}>
                {t.bulkPosterReferenceHint}
              </span>
            )}
          </span>
          <span className="bulk-poster-footer-actions" style={{ display:"inline-flex", gap:9, alignItems:"center", flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={handleClose}>
              {t.cancel}
            </Button>
            <Button icon="download" onClick={handleCreatePoster} disabled={!selectedProgramIds.size}>
              {t.bulkPosterDownload}
            </Button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
