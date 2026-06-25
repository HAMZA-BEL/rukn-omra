import React from "react";
import { Button, EmptyState, GlassCard } from "../UI";
import ProgramCard from "./ProgramCard";

export default function ProgramsListResults({
  activePrograms,
  programMetricsReady,
  totalProgramsCount,
  programSelectionMode,
  selectedProgramsCount,
  visiblePrograms,
  clientsByProgramId,
  programSummaryById,
  clientsReady,
  selectedProgramIds,
  travelGroupCountsByProgramId,
  highlightProgramId,
  totalProgramsPages,
  safeProgramsPage,
  onBulkArchivePrograms,
  onOpenBulkTrashProgramsPrompt,
  onClearProgramSelection,
  onProgramCardRef,
  onOpenProgramDetail,
  onEditProgram,
  onDuplicateProgram,
  onArchiveProgram,
  onDeleteProgram,
  onToggleProgramNusukUpload,
  nusukUploadToggleEnabled = false,
  nusukUploadLaunchLabel = "رفع لنسك — قيد الإطلاق",
  nusukUploadLaunchHelper = "هذه الميزة قيد الإطلاق حاليا وستتوفر قريبا.",
  onToggleProgramSelection,
  onPreviousProgramsPage,
  onNextProgramsPage,
  lang,
  dir,
  formatCurrencyForLang,
  t,
  tr,
  tc,
}) {
  if (activePrograms.length === 0) {
    return <EmptyState icon="program" title={t.noProgramsTitle} sub={t.noProgramsSub} />;
  }

  if (!programMetricsReady) {
    return (
      <GlassCard style={{ padding: 18, textAlign: "center", color: tc.grey, fontSize: 13 }}>
        {t.loading || "Loading..."}
      </GlassCard>
    );
  }

  if (totalProgramsCount === 0) {
    return <EmptyState icon="search" title={t.noResultsTitle} sub={t.noResultsSub} />;
  }

  return (
    <div>
      {programSelectionMode && selectedProgramsCount > 0 && (
        <GlassCard style={{ padding: "12px 16px", marginBottom: 14 }}>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            direction: dir,
          }}>
            <span style={{ fontSize: 13, color: tc.gold, fontWeight: 800 }}>
              {tr("programBulkSelectedCount", { count: selectedProgramsCount })}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                icon="archive"
                onClick={onBulkArchivePrograms}
              >
                {t.programArchiveSelected}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={onOpenBulkTrashProgramsPrompt}
                style={{
                  border: "1px solid rgba(239,68,68,.28)",
                  color: tc.danger,
                  background: "rgba(239,68,68,.06)",
                }}
              >
                {t.programTrashSelected}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearProgramSelection}
              >
                {t.programClearSelection}
              </Button>
            </div>
          </div>
        </GlassCard>
      )}
      <div className="cards-grid program-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
        {visiblePrograms.map((program, index) => {
          const programClients = clientsByProgramId.get(String(program.id)) || [];
          const summary = programSummaryById.get(String(program.id)) || {};
          const deletePromptClients = clientsReady
            ? programClients
            : Array.from({ length: summary.registeredCount || 0 });
          const selected = selectedProgramIds.has(String(program.id));
          return (
            <div
              key={program.id}
              ref={(node) => onProgramCardRef(program.id, node)}
            >
              <ProgramCard
                program={program}
                registered={summary.registeredCount || 0}
                pct={summary.capacityPct || 0}
                totalPaid={summary.totalPaid || 0}
                totalRemaining={summary.remainingTotal || 0}
                cleared={summary.clearedCount || 0}
                unpaid={summary.unpaidCount || 0}
                delay={index * 0.06}
                travelGroupCount={travelGroupCountsByProgramId[String(program.id)] || 0}
                programSummary={summary}
                highlighted={String(highlightProgramId) === String(program.id)}
                selected={programSelectionMode && selected}
                selectionLabel={t.programSelectVisible}
                onSelectionChange={programSelectionMode ? (checked) => onToggleProgramSelection(program.id, checked) : undefined}
                onClick={() => {
                  if (programSelectionMode) return;
                  onOpenProgramDetail(program.id);
                }}
                onEdit={(event) => {
                  event.stopPropagation();
                  onEditProgram(program);
                }}
                onDuplicate={(event) => {
                  event.stopPropagation();
                  onDuplicateProgram(program);
                }}
                onArchive={(event) => {
                  event.stopPropagation();
                  onArchiveProgram(program);
                }}
                onDelete={(event) => {
                  event.stopPropagation();
                  onDeleteProgram(program, deletePromptClients);
                }}
                onToggleNusukUpload={(event) => {
                  event.stopPropagation();
                  onToggleProgramNusukUpload?.(program);
                }}
                nusukUploadToggleEnabled={nusukUploadToggleEnabled}
                nusukUploadLaunchLabel={nusukUploadLaunchLabel}
                nusukUploadLaunchHelper={nusukUploadLaunchHelper}
                lang={lang}
                formatCurrencyForLang={formatCurrencyForLang}
              />
            </div>
          );
        })}
      </div>
      {totalProgramsPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          marginTop: 20,
          flexWrap: "wrap",
        }}>
          <Button
            variant="ghost"
            size="sm"
            disabled={safeProgramsPage <= 1}
            onClick={onPreviousProgramsPage}
          >
            {t.programPagePrevious}
          </Button>
          <span style={{ color: "var(--rukn-text-muted)", fontSize: 12, fontWeight: 800 }}>
            {tr("programPageIndicator", { page: safeProgramsPage, total: totalProgramsPages })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safeProgramsPage >= totalProgramsPages}
            onClick={onNextProgramsPage}
          >
            {t.programPageNext}
          </Button>
        </div>
      )}
    </div>
  );
}
