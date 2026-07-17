import React from "react";
import { createPortal } from "react-dom";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, GlassCard, Modal, Input, Select, EmptyState, preventNumberInputWheelChange } from "./UI";
import {
  NusukSettingsModal,
  hasCompleteNusukContactSettings,
} from "./NusukSettingsFields";
import { theme } from "./styles";
import DuplicateProgramModal from "./programs/DuplicateProgramModal";
import ProgramLifecycleModals from "./programs/ProgramLifecycleModals";
import NusukAssistantInstallModal from "./programs/NusukAssistantInstallModal";
import ProgramPackageLevelsPanel from "./programs/ProgramPackageLevelsPanel";
import ProgramsListResults from "./programs/ProgramsListResults";
import ProgramEditorModal from "./programs/ProgramEditorModal";
import ProgramDetailHeader from "./programs/ProgramDetailHeader";
import ProgramClientsToolbar from "./programs/ProgramClientsToolbar";
import BulkClientActionsBar from "./programs/BulkClientActionsBar";
import ProgramClientsTable from "./programs/ProgramClientsTable";
import ProgramClientRow from "./programs/ProgramClientRow";
import ProgramClientModals from "./programs/ProgramClientModals";
import ProgramDetailOverview from "./programs/ProgramDetailOverview";
import ProgramCostingModal from "./programs/ProgramCostingModal";
import ProgramActionScopeDialog from "./programs/ProgramActionScopeDialog";
import {
  getProgramCostingLabels,
} from "./programs/programCosting";
import { useLang } from "../hooks/useLang";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatCurrency } from "../utils/currency";
import { downloadAmadeusExcel } from "../utils/amadeus";
import { escapeHtml } from "../utils/escapeHtml";
import { printProgramPDF } from "../utils/exportPdf";
import { createCombinedRoomingSection, createRoomingPrintHtml, createUnifiedRoomingSection, downloadRoomingPdf } from "../utils/roomingPdf";
import { buildRoomingPrintModel, downloadRoomingExcel } from "../utils/roomingExport";
import {
  calculateHotelStayDates,
  formatDateForExcel,
} from "../utils/hotelDates";
import { useDropdownPosition } from "../hooks/useDropdownPosition";
import { db } from "../lib/db";
import { AppIcon } from "./Icon";
import {
  getPackageRoomPrice,
  getRoomTypeLabel,
  normalizeProgramPackages,
} from "../utils/programPackages";
import {
  doesServiceTypeNeedAccommodation,
  getClientServiceTypeLabel,
} from "../utils/clientServiceTypes";
import {
  buildDuplicateProgramName,
  createDuplicateProgramPayload,
  getProgramDepartureYear,
  getUsedProgramYears,
  isDuplicateProgramNameAvailable,
  normalizeDuplicateProgramName,
} from "../utils/programDuplicate";
import {
  getClientArabicName,
  getClientDisplayName as resolveClientDisplayName,
  getClientLatinName,
} from "../utils/clientNames";
import {
  translateHotelLevel,
  translateRoomCategory,
  translateRoomType,
  trKey,
} from "../utils/i18nValues";
import {
  INCOMPLETE_INFO_FILTER,
  getClientCompletionLabels,
  getClientCompletionTooltip,
  getClientProgramId,
} from "../utils/clientCompletionStatus";
import { getParticipantTerminology, getProgramKind } from "../utils/participantTerminology";
import { buildProgramListSummaryById } from "../utils/programListSummaries";
import {
  formatProgramCapacityValue,
  getProgramCapacityInfo,
  getProgramCapacityMessage,
} from "../utils/programCapacity";
import {
  downloadProgramBadgesPdf,
} from "../features/badges";
import {
  exportProgramWordContractsZip,
  getContractGenerationErrorMessage,
} from "../features/contracts";
import { resolveClientTravelContext } from "../features/contracts/utils/contractTravelContext";
import {
  fetchPosterTemplates,
  getPosterTemplateImageUrl,
} from "../features/posterTemplates/services/posterTemplatesApi";
import { BulkProgramPosterModal } from "../features/posterTemplates/components/BulkProgramPosterModal";
import {
  buildProgramPosterFilename,
  downloadPosterBlob,
  generateProgramPosterPng,
} from "../features/posterTemplates/services/programPosterGenerator";
import {
  loadCodePosterTemplate,
  OFFICIAL_RUKN_CODE_TEMPLATE_KEY,
  TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY,
} from "../features/posterTemplates/codeTemplates/registry";
import { useAgencyCodePosterTemplates } from "../hooks/useAgencyCodePosterTemplates";
import {
  getProgramPosterLevelsCount,
  resolvePosterAreaValue,
} from "../features/posterTemplates/utils/programPosterMapping";
import {
  normalizePosterTemplateLevelsCount,
  normalizePosterTemplateType,
} from "../features/posterTemplates/utils/posterTemplateData";
import { downloadPassportListWord } from "../features/programs/exports/passportListWordExport";
import {
  PROGRAM_ACTION_SCOPES,
  buildProgramActionScopeOptions,
  isTravelGroupScope,
  resolveProgramActionClients,
} from "../features/programs/utils/programActionScope";
import {
  getProgramsFiltersStorageKey,
  readProgramsFiltersFromStorage,
  writeProgramsFiltersToStorage,
} from "../features/programs/utils/programsFilterStorage";
import {
  checkNusukAssistant,
  disposeNusukAssistantBridge,
  initializeNusukAssistantBridge,
  isNusukAssistantReady,
  openNusukWithAssistant,
  warmupNusukAssistant,
} from "../services/nusukAssistantBridge";
import {
  getProgramClientDisplayStatus,
  getProgramClientOfficialPrice,
  getProgramClientOverpaidAmount,
  getProgramClientPaymentStatus,
  getProgramClientRemainingAmount,
  getProgramClientSalePrice,
  getProgramPricingReferenceCost,
  getProgramStandaloneSalePrice,
  sortProgramClientsNewestFirst,
  upsertProgramClientsNewestFirst,
} from "../features/programs/utils/programClientMetrics";
import {
  buildProgramClientPackageChips,
  buildProgramClientServiceTypeFilters,
  buildProgramClientStatusFilters,
  computeProgramClientPaymentTotals,
  computeProgramClientStatusCounts,
  computeProgramClientTotals,
  filterProgramClientsByTravelGroup,
  filterProgramClientsForList,
} from "../features/programs/utils/programClientListFilters";
import { getLocalizedAgencyName } from "../utils/agencyDisplay";
import {
  includesSearch,
  normalizeSearchText,
} from "../utils/searchUtils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Filter,
  FileText,
  FileSpreadsheet,
  Italic,
  LayoutGrid,
  Lock,
  Maximize2,
  Merge,
  Minimize2,
  MoreHorizontal,
  PaintBucket,
  PanelBottom,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  PanelRightOpen,
  PanelTop,
  Redo2,
  Search,
  Settings,
  Link2,
  Square,
  SquareSlash,
  TableCellsMerge,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Type,
  Undo2,
  Unlock,
  UserPlus,
  WrapText,
  Scan,
} from "lucide-react";

const tc = theme.colors;
const MENU_OFFSET_PX = 6;
const PROGRAM_DETAIL_DEFAULT_PAGE_SIZE = 10;
const PROGRAM_DETAIL_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const PROGRAMS_LIST_DEFAULT_PAGE_SIZE = 12;
const PROGRAMS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS = 250;
const PROGRAMS_LIST_PAGE_SIZE_OPTIONS = [12, 24, 48];
const SCOPED_PROGRAM_DETAIL_REFRESH_DEBOUNCE_MS = 75;
const OFFICIAL_RUKN_POSTER_CHOICE_ID = OFFICIAL_RUKN_CODE_TEMPLATE_KEY;
const PROGRAM_EXPORT_ACTIONS = Object.freeze({
  PDF: "program_pdf",
  PILGRIMS_LIST: "pilgrims_list",
  AMADEUS_EXCEL: "amadeus_excel",
  PASSPORT_LIST_WORD: "passport_list_word",
  CONTRACTS_EXCEL: "contracts_excel",
  WORD_CONTRACTS: "word_contracts",
});

const getDefaultPosterTitle = (program = {}, lang = "ar") => (
  String(resolvePosterAreaValue("program_name", program, { lang })
    || program.name
    || program.programName
    || program.title
    || "").trim()
);

const getPosterExportLabels = (lang = "ar", labels = {}) => ({
  action: lang === "fr" ? "Télécharger l’affiche du programme" : lang === "en" ? "Download program poster" : "تنزيل ملصق البرنامج",
  busy: lang === "fr" ? "Génération de l’affiche..." : lang === "en" ? "Generating poster..." : "جاري تجهيز الملصق...",
  chooseTitle: lang === "fr" ? "Choisir le modèle d’affiche" : lang === "en" ? "Choose poster template" : "اختيار قالب الملصق",
  chooseHint: lang === "fr"
    ? "Choisissez l’affiche officielle Rukn ou l’un des modèles de votre agence."
    : lang === "en"
      ? "Choose the official Rukn poster or one of your agency templates."
      : "اختر قالب ركن الرسمي أو أحد القوالب الخاصة بالوكالة.",
  officialName: lang === "fr" ? "Modèle officiel Rukn" : lang === "en" ? "Official Rukn template" : "قالب ركن الرسمي",
  officialHint: lang === "fr"
    ? "Affiche gratuite qui s’adapte automatiquement aux niveaux du programme."
    : lang === "en"
      ? "Free poster that adapts automatically to this program’s levels."
      : "ملصق مجاني يتكيف تلقائيًا مع مستويات هذا البرنامج.",
  codeGroup: lang === "fr" ? "Modèles signature par code" : lang === "en" ? "Signature code templates" : "قوالب خاصة بالوكالة",
  customGroup: lang === "fr" ? "Modèles importés par l’agence" : lang === "en" ? "Uploaded agency templates" : "قوالب مرفوعة من الوكالة",
  showDates: lang === "fr" ? "Afficher les dates" : lang === "en" ? "Show dates" : "إظهار التواريخ",
  titleOverride: lang === "fr" ? "Titre de l’affiche" : lang === "en" ? "Poster title" : "عنوان الملصق",
  download: lang === "fr" ? "Télécharger l’affiche" : lang === "en" ? "Download poster" : "تنزيل الملصق",
  cancel: labels.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"),
  noMatch: lang === "fr"
    ? "Aucun modèle d’affiche adapté à ce programme."
    : lang === "en"
      ? "No matching poster template found for this program."
      : "لا يوجد قالب ملصق مناسب لهذا البرنامج. أضف قالبًا من الإعدادات بنفس نوع البرنامج وعدد المستويات.",
  tooManyLevels: lang === "fr"
    ? "Les modèles d’affiche prennent en charge jusqu’à 5 niveaux."
    : lang === "en"
      ? "Poster templates support up to 5 levels."
      : "قوالب الملصقات تدعم حتى 5 مستويات فقط.",
  missingImage: lang === "fr"
    ? "L’image du modèle d’affiche n’est pas disponible."
    : lang === "en"
      ? "The poster template image is not available."
      : "صورة قالب الملصق غير متاحة.",
  success: lang === "fr" ? "Affiche du programme téléchargée." : lang === "en" ? "Program poster downloaded." : "تم تنزيل ملصق البرنامج.",
  error: lang === "fr" ? "Impossible de générer l’affiche du programme." : lang === "en" ? "Unable to generate the program poster." : "تعذر إنشاء ملصق البرنامج.",
  levelsBadge: (count) => {
    if (lang === "fr") return `${count} ${count === 1 ? "niveau" : "niveaux"}`;
    if (lang === "en") return `${count} ${count === 1 ? "level" : "levels"}`;
    return `${count} ${count === 1 ? "مستوى" : "مستويات"}`;
  },
});

const getBadgeExportProgressLabel = (progress = {}, lang = "ar") => {
  const step = progress?.step || "template";
  const current = Math.max(0, Number(progress?.current) || 0);
  const total = Math.max(0, Number(progress?.total) || 0);
  if (step === "render" && total > 0) {
    if (lang === "fr") return `Préparation du badge ${current} sur ${total}`;
    if (lang === "en") return `Preparing badge ${current} of ${total}`;
    return `جاري تجهيز الشارة ${current} من ${total}`;
  }
  if (step === "photos" && total > 0) {
    if (lang === "fr") return `Chargement des photos ${current} sur ${total}`;
    if (lang === "en") return `Loading photos ${current} of ${total}`;
    return `تحميل الصور ${current} من ${total}`;
  }
  if (step === "pdf") {
    if (lang === "fr") return "Création du PDF";
    if (lang === "en") return "Creating PDF";
    return "إنشاء PDF";
  }
  if (step === "done") {
    if (lang === "fr") return "PDF prêt";
    if (lang === "en") return "PDF ready";
    return "تم تجهيز PDF";
  }
  if (lang === "fr") return "Chargement du modèle";
  if (lang === "en") return "Loading template";
  return "تحميل القالب";
};

const getPosterTemplateProgramContext = (program = {}) => {
  const rawLevelsCount = getProgramPosterLevelsCount(program);
  const programType = normalizePosterTemplateType(getProgramKind(program, null, {
    allowNameFallback: true,
    defaultKind: "umrah",
  }));
  const levelsCount = normalizePosterTemplateLevelsCount(rawLevelsCount);
  return { rawLevelsCount, programType, levelsCount };
};

const resolveDefaultPosterTemplate = ({
  agency = {},
  availableCodeTemplates = [],
} = {}) => {
  const type = String(agency.defaultPosterTemplateType || agency.default_poster_template_type || "official").trim();
  const key = String(agency.defaultPosterTemplateKey || agency.default_poster_template_key || "").trim();

  if (type === "code" && key) {
    const assignedTemplate = availableCodeTemplates.find((template) => (
      String(template?.key || "") === key
    ));
    if (assignedTemplate) {
      return { type: "code", key: assignedTemplate.key };
    }
  }

  return { type: "official", key: OFFICIAL_RUKN_CODE_TEMPLATE_KEY };
};

const buildPosterTemplateChoiceForProgram = async ({
  program,
  programPostersEnabled,
  assignedCodePosterTemplates = [],
  agencyId,
  lang = "ar",
}) => {
  const { rawLevelsCount, programType, levelsCount } = getPosterTemplateProgramContext(program);
  let matches = [];

  if (programPostersEnabled && rawLevelsCount <= 5) {
    const { data, error } = await fetchPosterTemplates({ agencyId });
    if (error) throw error;

    matches = (Array.isArray(data) ? data : [])
      .filter((template) => (
        normalizePosterTemplateType(template.programType || template.program_type) === programType
        && normalizePosterTemplateLevelsCount(template.levelsCount ?? template.levels_count) === levelsCount
      ))
      .sort((a, b) => {
        const bTime = Date.parse(b.updatedAt || b.updated_at || "") || 0;
        const aTime = Date.parse(a.updatedAt || a.updated_at || "") || 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(a.name || "").localeCompare(String(b.name || ""), lang);
      });
  }

  return {
    rawLevelsCount,
    programType,
    levelsCount,
    choice: {
      codeTemplates: assignedCodePosterTemplates,
      templates: matches,
      programType,
      levelsCount,
    },
  };
};

function ProgramPosterTemplateChoiceModal({
  choice,
  selectedChoiceId,
  onSelectChoice,
  busy = false,
  onClose,
  onDownload,
  labels,
  lang,
  dir,
  posterOptionsVisible = false,
  titleOverride = "",
  onTitleOverrideChange,
  showDates = true,
  onToggleShowDates,
}) {
  return (
    <Modal
      open={Boolean(choice)}
      onClose={onClose}
      title={labels.chooseTitle}
      width={520}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
    >
      {choice && (
        <div style={{ display:"grid", gap:16, direction:dir }}>
          <p style={{ margin:0, color:"var(--rukn-text-muted)", fontSize:13, lineHeight:1.7 }}>
            {labels.chooseHint}
          </p>
          <div style={{ display:"grid", gap:8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelectChoice(OFFICIAL_RUKN_POSTER_CHOICE_ID)}
              style={{
                border:`1px solid ${selectedChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                background:selectedChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                borderRadius:12,
                padding:"11px 12px",
                color:"var(--rukn-text)",
                display:"flex",
                alignItems:"center",
                gap:11,
                textAlign:"start",
                cursor:busy ? "not-allowed" : "pointer",
                fontFamily:"'Cairo',sans-serif",
              }}
            >
              <span style={{
                width:16,
                height:16,
                borderRadius:999,
                border:`2px solid ${selectedChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"center",
                flex:"0 0 auto",
              }}>
                <span style={{
                  width:7,
                  height:7,
                  borderRadius:999,
                  background:selectedChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID ? "var(--rukn-gold)" : "transparent",
                }} />
              </span>
              <span style={{ minWidth:0, display:"grid", gap:3 }}>
                <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {labels.officialName}
                </strong>
                <span style={{ fontSize:11, color:"var(--rukn-text-muted)", lineHeight:1.5 }}>
                  {labels.officialHint}
                </span>
              </span>
            </button>

            {choice.codeTemplates?.length > 0 && (
              <div style={{
                marginTop:5,
                paddingTop:10,
                borderTop:"1px solid var(--rukn-border-soft)",
                display:"grid",
                gap:8,
              }}>
                <p style={{
                  margin:0,
                  color:"var(--rukn-text-muted)",
                  fontSize:11,
                  fontWeight:800,
                }}>
                  {labels.codeGroup}
                </p>
                {choice.codeTemplates.map((template) => {
                  const active = String(template.key || "") === String(selectedChoiceId || "");
                  const name = template.meta?.name?.[lang] || template.meta?.name?.ar || template.key;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      disabled={busy}
                      onClick={() => onSelectChoice(template.key)}
                      style={{
                        border:`1px solid ${active ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                        background:active ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                        borderRadius:12,
                        padding:"11px 12px",
                        color:"var(--rukn-text)",
                        display:"flex",
                        alignItems:"center",
                        gap:11,
                        textAlign:"start",
                        cursor:busy ? "not-allowed" : "pointer",
                        fontFamily:"'Cairo',sans-serif",
                      }}
                    >
                      <span style={{
                        width:16,
                        height:16,
                        borderRadius:999,
                        border:`2px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        flex:"0 0 auto",
                      }}>
                        <span style={{
                          width:7,
                          height:7,
                          borderRadius:999,
                          background:active ? "var(--rukn-gold)" : "transparent",
                        }} />
                      </span>
                      <span style={{ minWidth:0, display:"grid", gap:3 }}>
                        <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {name}
                        </strong>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {choice.templates?.length > 0 && (
              <div style={{
                marginTop:5,
                paddingTop:10,
                borderTop:"1px solid var(--rukn-border-soft)",
                display:"grid",
                gap:8,
              }}>
                <p style={{
                  margin:0,
                  color:"var(--rukn-text-muted)",
                  fontSize:11,
                  fontWeight:800,
                }}>
                  {labels.customGroup}
                </p>
                {choice.templates.map((template) => {
                  const active = String(template.id || "") === String(selectedChoiceId || "");
                  return (
                    <button
                      key={template.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onSelectChoice(template.id)}
                      style={{
                        border:`1px solid ${active ? "rgba(212,175,55,.55)" : "var(--rukn-border-soft)"}`,
                        background:active ? "rgba(212,175,55,.11)" : "var(--rukn-bg-soft)",
                        borderRadius:12,
                        padding:"11px 12px",
                        color:"var(--rukn-text)",
                        display:"flex",
                        alignItems:"center",
                        gap:11,
                        textAlign:"start",
                        cursor:busy ? "not-allowed" : "pointer",
                        fontFamily:"'Cairo',sans-serif",
                      }}
                    >
                      <span style={{
                        width:16,
                        height:16,
                        borderRadius:999,
                        border:`2px solid ${active ? "var(--rukn-gold)" : "rgba(148,163,184,.45)"}`,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        flex:"0 0 auto",
                      }}>
                        <span style={{
                          width:7,
                          height:7,
                          borderRadius:999,
                          background:active ? "var(--rukn-gold)" : "transparent",
                        }} />
                      </span>
                      <span style={{ minWidth:0, display:"grid", gap:3 }}>
                        <strong style={{ fontSize:13, color:"var(--rukn-text-strong)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {template.name || labels.action}
                        </strong>
                        <span style={{ fontSize:11, color:"var(--rukn-text-muted)" }}>
                          {labels.levelsBadge(normalizePosterTemplateLevelsCount(template.levelsCount ?? template.levels_count))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {posterOptionsVisible && (
            <div style={{
              border:"1px solid rgba(212,175,55,.28)",
              background:"linear-gradient(135deg,rgba(212,175,55,.10),rgba(255,255,255,.03))",
              borderRadius:12,
              padding:"12px",
              display:"grid",
              gap:12,
            }}>
              <Input
                label={labels.titleOverride}
                value={titleOverride}
                onChange={(event) => onTitleOverrideChange?.(event.target.value)}
                disabled={busy}
                inputStyle={{
                  background:"#FFFFFF",
                  borderColor:"rgba(212,175,55,.38)",
                  color:"#111827",
                  fontWeight:700,
                  textAlign:"right",
                }}
              />
              <div style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:12,
              }}>
                <span style={{
                  color:"var(--rukn-text-strong)",
                  fontSize:13,
                  fontWeight:800,
                }}>
                  {labels.showDates}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showDates}
                  aria-label={labels.showDates}
                  disabled={busy}
                  onClick={onToggleShowDates}
                  style={{
                    width:56,
                    height:30,
                    border:0,
                    borderRadius:999,
                    padding:0,
                    position:"relative",
                    flex:"0 0 auto",
                    background:showDates
                      ? "linear-gradient(135deg,var(--rukn-gold),#f5c857)"
                      : "rgba(148,163,184,.32)",
                    boxShadow:showDates ? "0 8px 18px rgba(212,175,55,.24)" : "inset 0 0 0 1px rgba(148,163,184,.2)",
                    cursor:busy ? "not-allowed" : "pointer",
                    opacity:busy ? .55 : 1,
                    transition:"background .2s ease, box-shadow .2s ease, opacity .2s ease",
                  }}
                >
                  <span style={{
                    position:"absolute",
                    top:3,
                    left:showDates ? 29 : 3,
                    width:24,
                    height:24,
                    borderRadius:999,
                    background:"#fff",
                    boxShadow:"0 3px 10px rgba(15,23,42,.24)",
                    transition:"left .2s ease",
                  }} />
                </button>
              </div>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              {labels.cancel}
            </Button>
            <Button
              icon="download"
              onClick={onDownload}
              disabled={busy || !selectedChoiceId}
            >
              {busy ? labels.busy : labels.download}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const isActiveTransferDestinationProgram = (program = {}) => (
  Boolean(program?.id)
  && program.deleted !== true
  && !program.deletedAt
  && !program.deleted_at
  && program.archived !== true
  && !program.archivedAt
  && !program.archived_at
  && String(program.status || "active").toLowerCase() !== "archived"
);

const isProgramNusukUploadEnabled = (program = {}) => (
  Boolean(program.nusukUploadEnabled ?? program.nusuk_upload_enabled)
);

const isPrivateLanIpv4 = (hostname = "") => {
  const match = String(hostname).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return false;
  const [first, second] = octets;
  return (
    first === 10
    || (first === 192 && second === 168)
    || (first === 172 && second >= 16 && second <= 31)
  );
};

const isLocalDevelopmentHost = () => {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location.hostname || "").trim().toLowerCase();
  return (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]"
    || isPrivateLanIpv4(hostname)
  );
};

const getNusukUploadAvailability = (
  program = {},
  { isLocalhost = isLocalDevelopmentHost(), agencyNusukUploadFeatureEnabled = false, debug = false } = {}
) => {
  const canUseNusukUpload = Boolean(isLocalhost || agencyNusukUploadFeatureEnabled === true);
  if (debug && process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    console.debug("[Nusuk Upload Availability]", {
      hostname: window.location.hostname,
      isLocalhost,
      programId: program?.id,
      agencyId: program?.agency_id,
      nusukUploadEnabled: program?.nusuk_upload_enabled,
      agencyNusukUploadFeatureEnabled,
      canUseNusukUpload,
    });
  }
  return canUseNusukUpload;
};

const NUSUK_UPLOAD_LAUNCH_LABEL = "رفع لنسك — قيد الإطلاق";
const NUSUK_UPLOAD_LAUNCH_HELPER = "هذه الميزة قيد الإطلاق حاليا وستتوفر قريبا.";
const NUSUK_UPLOAD_URL = "https://masar.nusuk.sa/pub/login";
const CHROME_WEB_STORE_URL = "https://chrome.google.com/webstore/detail/REPLACE_WITH_RUKN_ASSISTANT_EXTENSION_ID";
const EDGE_ADDONS_URL = "https://microsoftedge.microsoft.com/addons/detail/REPLACE_WITH_RUKN_ASSISTANT_ADDON_ID";
const NUSUK_UPLOAD_OPEN_DEBOUNCE_MS = 4000;
let lastNusukUploadOpen = { url: "", at: 0 };

const getNusukAssistantInstallUrl = () => {
  if (
    typeof navigator !== "undefined"
    && String(navigator.userAgent || "").includes("Edg/")
  ) {
    return EDGE_ADDONS_URL;
  }
  return CHROME_WEB_STORE_URL;
};

const openNusukUploadUrl = (programId = "") => {
  if (typeof window === "undefined") return false;
  const encodedProgramId = encodeURIComponent(String(programId || ""));
  if (!encodedProgramId) return false;
  const launchUrl = `${NUSUK_UPLOAD_URL}?ruknNusuk=1&programId=${encodedProgramId}`;
  const now = Date.now();
  if (
    lastNusukUploadOpen.url === launchUrl
    && now - lastNusukUploadOpen.at < NUSUK_UPLOAD_OPEN_DEBOUNCE_MS
  ) {
    return false;
  }
  lastNusukUploadOpen = { url: launchUrl, at: now };
  window.open(launchUrl, "_blank", "noopener,noreferrer");
  return true;
};

const ROOMING_ROWS = 60;
const ROOMING_COLS = 20;
const ROOMING_BASE_CELL_WIDTH = 132;
const ROOMING_BASE_FIRST_COL_WIDTH = 150;
const ROOMING_BASE_ROW_HEIGHT = 34;
const ROOMING_BASE_FONT_SIZE = 13;
const ROOMING_CITY_LABELS = {
  makkah: "تسكين مكة",
  madinah: "تسكين المدينة",
};
const getOppositeRoomingCity = (city) => (city === "madinah" ? "makkah" : "madinah");
const ROOMING_COLORS = ["#fef3c7", "#dcfce7", "#e0f2fe", "#fce7f3", "#ede9fe", "#fee2e2"];
const ROOMING_ROOM_OPTIONS = [
  { value: "single", label: "فردية", capacity: 1 },
  { value: "double", label: "ثنائية", capacity: 2 },
  { value: "triple", label: "ثلاثية", capacity: 3 },
  { value: "quad", label: "رباعية", capacity: 4 },
  { value: "quint", label: "خماسية", capacity: 5 },
];
const ROOMING_CATEGORY_OPTIONS = [
  { value: "male_only", label: "رجال فقط" },
  { value: "female_only", label: "نساء فقط" },
  { value: "family", label: "عائلة" },
];
const ROOMING_BLOCK_WIDTH = 4;
const ROOMING_NODE_WIDTH = 250;
const ROOMING_NODE_MIN_HEIGHT = 170;
const ROOMING_NODE_MIN_GAP = 28;
const ROOMING_NODE_COLLISION_GAP = 0;
const ROOMING_LAYOUT_START_X = 40;
const ROOMING_LAYOUT_START_Y = 48;
const ROOMING_LAYOUT_CARD_WIDTH = ROOMING_NODE_WIDTH;
const ROOMING_LAYOUT_CARD_HEIGHT = 292;
const ROOMING_LAYOUT_HORIZONTAL_GAP = 40;
const ROOMING_LAYOUT_VERTICAL_GAP = 36;
const ROOMING_LAYOUT_GROUP_VERTICAL_GAP = 96;
const ROOMING_LAYOUT_MAX_COLUMNS = 6;
const ROOMING_LARGE_GENERATION_THRESHOLD = 80;
const ROOMING_LAYOUT_TYPE_ORDER = ["double", "triple", "quad", "quint"];
const normalizeRoomingText = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .replace(/\s+/g, " ");

const normalizeRoomingHotel = (value) => normalizeRoomingText(value);

const isMissingRoomingValue = (value) => {
  const text = normalizeRoomingText(value);
  return !text
    || ["-", "—", "null", "undefined", "غير محدد", "غير محددة", "بدون", "aucun", "non défini", "non defini", "unspecified", "not specified", "n/a"].includes(text);
};

const normalizeRoomingGender = (value) => {
  const text = normalizeRoomingText(value);
  if (!text || isMissingRoomingValue(text)) return "";
  if (["male", "m", "man", "homme", "ذكر", "رجل", "رجال"].includes(text)) return "male";
  if (["female", "f", "woman", "femme", "أنثى", "انثى", "امرأة", "نساء"].includes(text)) return "female";
  return text;
};

const normalizeRoomingRoomType = (...values) => {
  for (const value of values) {
    const text = normalizeRoomingText(value);
    if (!text) continue;
    if (["single", "simple", "فردية", "فردي", "غرفة مفردة", "chambre simple", "single room"].includes(text)) return "single";
    if (["double", "twin", "ثنائية", "ثنائي", "غرفة ثنائية", "غرفة مزدوجة", "مزدوجة", "مزدوج", "chambre double", "double room"].includes(text)) return "double";
    if (["triple", "ثلاثية", "ثلاثي", "غرفة ثلاثية", "chambre triple", "triple room"].includes(text)) return "triple";
    if (["quad", "quadruple", "رباعية", "رباعي", "غرفة رباعية", "chambre quadruple", "quad room"].includes(text)) return "quad";
    if (["quint", "quintuple", "خماسية", "خماسي", "غرفة خماسية", "chambre quintuple", "quint room"].includes(text)) return "quint";
    const normalizedKey = getRoomTypeLabel(text) ? text : "";
    if (["single", "double", "triple", "quad", "quint"].includes(normalizedKey)) return normalizedKey;
  }
  return "";
};

const getColumnName = (index) => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const getCellName = (x, y) => `${getColumnName(x)}${y + 1}`;

const getCellCoords = (cell) => {
  const match = String(cell || "").match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const x = match[1].split("").reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const y = Number(match[2]) - 1;
  return { x, y };
};

const getRangeBounds = (range = [0, 0, 0, 0]) => {
  const [x1 = 0, y1 = 0, x2 = x1, y2 = y1] = range.map(value => Number(value) || 0);
  return {
    minX: Math.min(x1, x2),
    maxX: Math.max(x1, x2),
    minY: Math.min(y1, y2),
    maxY: Math.max(y1, y2),
  };
};

const forEachCellInBounds = (bounds, callback) => {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      callback(x, y, getCellName(x, y));
    }
  }
};

const ROOMING_BORDER = "2px solid #111827";
const ROOMING_FAMILY_KEYS = ["familyGroup", "familyId", "familyName", "groupId", "groupName"];

const getRoomingRoomLabel = (roomType) => {
  const key = normalizeRoomingRoomType(roomType) || roomType;
  return ROOMING_ROOM_OPTIONS.find((option) => option.value === key)?.label || getRoomTypeLabel(key) || "—";
};

const getRoomingCapacity = (roomType) => {
  const key = normalizeRoomingRoomType(roomType) || roomType;
  return ROOMING_ROOM_OPTIONS.find((option) => option.value === key)?.capacity || 1;
};

const getRoomingCategoryLabel = (category) => {
  return ROOMING_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || "رجال فقط";
};

const getRoomingFamilyKey = (client) => {
  for (const key of ROOMING_FAMILY_KEYS) {
    const value = String(client?.[key] || "").trim();
    if (value) return value;
  }
  return "";
};

const normalizeRoomingMeta = (meta) => ({
  insertedClients: meta?.insertedClients || {},
  rooms: meta?.rooms || {},
  freeCanvas: meta?.freeCanvas !== false,
  createdAt: meta?.createdAt || new Date().toISOString(),
});

const getProgramHotelsForCity = (program, packages, city) => {
  const values = [];
  const addHotel = (hotel) => {
    const value = String(hotel || "").trim();
    if (!value || isMissingRoomingValue(value)) return;
    if (values.some((item) => normalizeRoomingHotel(item) === normalizeRoomingHotel(value))) return;
    values.push(value);
  };
  packages.forEach((pkg) => {
    addHotel(city === "makkah"
      ? (pkg?.hotelMecca || pkg?.hotel_mecca)
      : (pkg?.hotelMadina || pkg?.hotel_madina));
  });
  addHotel(city === "makkah"
    ? (program?.hotelMecca || program?.hotel_mecca)
    : (program?.hotelMadina || program?.hotel_madina));
  return values;
};

const getVerifiedRoomingHotel = (hotel, verifiedHotels = []) => {
  const key = normalizeRoomingHotel(hotel);
  if (!key || isMissingRoomingValue(key)) return "";
  return verifiedHotels.find((value) => normalizeRoomingHotel(value) === key) || "";
};

const getRoomHotelName = (room = {}, program = {}, packages = [], location = "makkah") => {
  const city = location === "madinah" ? "madinah" : "makkah";
  const getPackageHotel = (pkg) => (city === "madinah"
    ? (pkg?.hotelMadina || pkg?.hotel_madina || "")
    : (pkg?.hotelMecca || pkg?.hotel_mecca || ""));
  const getPackageHotelId = (pkg) => (city === "madinah"
    ? (pkg?.hotelMadinaId || pkg?.hotel_madina_id || pkg?.madinahHotelId || pkg?.madinaHotelId || pkg?.medinaHotelId || "")
    : (pkg?.hotelMeccaId || pkg?.hotel_mecca_id || pkg?.makkahHotelId || pkg?.meccaHotelId || ""));
  const cityHotels = getProgramHotelsForCity(program, packages, city);
  const hotelId = String(room.hotel_id || room.hotelId || "").trim();
  if (hotelId) {
    const byPackageId = packages.find((pkg) => (
      String(pkg?.id || "") === hotelId
      || String(getPackageHotelId(pkg) || "") === hotelId
    ));
    const packageHotel = byPackageId ? String(getPackageHotel(byPackageId) || "").trim() : "";
    if (packageHotel) return packageHotel;

    const byHotelValue = cityHotels.find((hotel) => normalizeRoomingHotel(hotel) === normalizeRoomingHotel(hotelId));
    if (byHotelValue) return byHotelValue;
  }

  const explicitHotelName = String(room.hotel_name || room.hotelName || "").trim();
  if (!isMissingRoomingValue(explicitHotelName)) return explicitHotelName;

  const directHotel = String(room.hotel || "").trim();
  if (!isMissingRoomingValue(directHotel)) {
    const byPackageId = packages.find((pkg) => (
      String(pkg?.id || "") === directHotel
      || String(getPackageHotelId(pkg) || "") === directHotel
    ));
    const packageHotel = byPackageId ? String(getPackageHotel(byPackageId) || "").trim() : "";
    if (packageHotel) return packageHotel;

    const byHotelValue = cityHotels.find((hotel) => normalizeRoomingHotel(hotel) === normalizeRoomingHotel(directHotel));
    return byHotelValue || directHotel;
  }

  return "";
};

const createRoomId = () => `room-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getRoomingStorageKey = (programId, city, agencyId = null) => (
  agencyId
    ? `rukn_rooming_sheet_${agencyId}_${programId}_${city}`
    : `rukn_rooming_sheet_${programId}_${city}`
);

const getLegacyRoomingStorageKey = (programId, city) => `rukn_rooming_sheet_${programId}_${city}`;
const getRoomingDraftStorageKey = (programId, city, agencyId = null) => (
  `rukn_rooming_draft_${agencyId || "local"}_${programId}_${city}`
);

const ROOMING_AUTOSAVE_DELAY_MS = 750;
const ROOMING_LAYOUT_AUTOSAVE_DELAY_MS = 650;
const ROOMING_SLOW_MS = 8000;
const ROOMING_TIMEOUT_MS = 15000;
const ROOMING_EXPORT_TIMEOUT_MS = 15000;
const ROOMING_RETRY_COUNT = 1;
const ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED = "assignmentChanged";
const ROOMING_SAVE_REASON_LAYOUT_ONLY = "layoutOnly";

const normalizeRoomingSaveReason = (reason) => (
  reason === ROOMING_SAVE_REASON_LAYOUT_ONLY
    ? ROOMING_SAVE_REASON_LAYOUT_ONLY
    : ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED
);

const mergeRoomingSaveReason = (...reasons) => {
  const normalizedReasons = reasons.filter(Boolean).map(normalizeRoomingSaveReason);
  if (!normalizedReasons.length) return ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED;
  return normalizedReasons.includes(ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED)
    ? ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED
    : ROOMING_SAVE_REASON_LAYOUT_ONLY;
};

const areRoomingPositionsEqual = (first = {}, second = {}) => (
  Math.abs((Number(first?.x) || 0) - (Number(second?.x) || 0)) < 0.5
  && Math.abs((Number(first?.y) || 0) - (Number(second?.y) || 0)) < 0.5
);

const getRoomingPayloadSize = (payload) => {
  try {
    return JSON.stringify(payload || {}).length;
  } catch {
    return 0;
  }
};

const waitRoomingDelay = (delayMs) => new Promise((resolve) => {
  const setTimer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
  setTimer(resolve, delayMs);
});

const createRoomingTimeoutError = (action) => {
  const error = new Error(`${action || "rooming"} timed out`);
  error.code = "ROOMING_TIMEOUT";
  return error;
};

const runRoomingTimedOperation = (operation, {
  action = "rooming",
  timeoutMs = ROOMING_TIMEOUT_MS,
  slowMs = ROOMING_SLOW_MS,
  onSlow,
} = {}) => {
  let slowTimer = null;
  let timeoutTimer = null;
  let settled = false;
  const setTimer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
  const clearTimer = typeof window !== "undefined" ? window.clearTimeout : clearTimeout;

  return new Promise((resolve, reject) => {
    slowTimer = setTimer(() => {
      if (!settled) onSlow?.();
    }, slowMs);
    timeoutTimer = setTimer(() => {
      if (settled) return;
      settled = true;
      clearTimer(slowTimer);
      reject(createRoomingTimeoutError(action));
    }, timeoutMs);

    Promise.resolve()
      .then(operation)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimer(slowTimer);
        clearTimer(timeoutTimer);
        resolve(result);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimer(slowTimer);
        clearTimer(timeoutTimer);
        reject(error);
      });
  });
};

const retryRoomingOperation = async (operation, {
  retries = ROOMING_RETRY_COUNT,
  delayMs = 700,
  onRetry,
  shouldRetry = () => true,
} = {}) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error)) break;
      onRetry?.(error, attempt + 1);
      await waitRoomingDelay(delayMs);
    }
  }
  throw lastError;
};

const logRoomingDiagnostic = (action, details = {}) => {
  if (process.env.NODE_ENV === "production") return;
  try {
    console.info("[rooming]", { action, ...details });
  } catch {}
};

const ROOMING_PRINT_DEFAULT_SETTINGS = {
  showRegistrationSource: true,
  showBedNumbers: false,
  unifyMakkahMadinahRooming: true,
  density: "normal",
  layoutMode: "default",
  roomingNameFontSize: 13,
  roomingAutoShrinkLongNames: true,
};

const clampRoomingNameFontSize = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return ROOMING_PRINT_DEFAULT_SETTINGS.roomingNameFontSize;
  return Math.min(18, Math.max(9, Math.round(numeric)));
};

const normalizeRoomingPrintSettingsValue = (settings = {}) => {
  const mergedSettings = {
    ...ROOMING_PRINT_DEFAULT_SETTINGS,
    ...(settings && typeof settings === "object" ? settings : {}),
  };
  return {
    ...ROOMING_PRINT_DEFAULT_SETTINGS,
    showRegistrationSource: mergedSettings.showRegistrationSource !== false,
    showBedNumbers: mergedSettings.showBedNumbers === true,
    unifyMakkahMadinahRooming: mergedSettings.unifyMakkahMadinahRooming !== false,
    density: ["comfortable", "normal", "compact"].includes(mergedSettings.density)
      ? mergedSettings.density
      : ROOMING_PRINT_DEFAULT_SETTINGS.density,
    layoutMode: mergedSettings.layoutMode === "arranged"
      ? "arranged"
      : ROOMING_PRINT_DEFAULT_SETTINGS.layoutMode,
    roomingNameFontSize: clampRoomingNameFontSize(mergedSettings.roomingNameFontSize),
    roomingAutoShrinkLongNames: mergedSettings.roomingAutoShrinkLongNames !== false,
  };
};

const getRoomingPrintSettingsStorageKey = (agencyId = null) => (
  agencyId
    ? `rukn_rooming_print_settings_${agencyId}`
    : "rukn_rooming_print_settings"
);

const readRoomingPrintSettingsFromStorage = (agencyId = null) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...ROOMING_PRINT_DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(getRoomingPrintSettingsStorageKey(agencyId));
    if (!raw) return { ...ROOMING_PRINT_DEFAULT_SETTINGS };
    return normalizeRoomingPrintSettingsValue(JSON.parse(raw));
  } catch (error) {
    console.warn("[rooming] print settings read failed", error);
    return { ...ROOMING_PRINT_DEFAULT_SETTINGS };
  }
};

const writeRoomingPrintSettingsToStorage = (agencyId = null, settings = {}) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      getRoomingPrintSettingsStorageKey(agencyId),
      JSON.stringify(normalizeRoomingPrintSettingsValue(settings))
    );
  } catch (error) {
    console.warn("[rooming] print settings write failed", error);
  }
};

const createRoomLinkId = (sourceRoomId, targetRoomId) => {
  const [source, target] = [String(sourceRoomId || ""), String(targetRoomId || "")].sort();
  return source && target ? `room-link:${source}:${target}` : "";
};

const normalizeRoomingLinks = (links = [], rooms = []) => {
  const roomIds = new Set((rooms || []).map((room) => room?.id).filter(Boolean));
  const byKey = new Map();
  (Array.isArray(links) ? links : []).forEach((link) => {
    const sourceRoomId = String(link?.sourceRoomId || link?.source || "");
    const targetRoomId = String(link?.targetRoomId || link?.target || "");
    if (!sourceRoomId || !targetRoomId || sourceRoomId === targetRoomId) return;
    if (roomIds.size && (!roomIds.has(sourceRoomId) || !roomIds.has(targetRoomId))) return;
    const id = createRoomLinkId(sourceRoomId, targetRoomId);
    if (!id || byKey.has(id)) return;
    byKey.set(id, { id, sourceRoomId, targetRoomId });
  });
  return Array.from(byKey.values());
};

const normalizeRoomingCanvasState = (payload = {}, clients = []) => {
  const parsed = payload || {};
  if (parsed.kind === "rooming-canvas" || Array.isArray(parsed.rooms)) {
    const rooms = Array.isArray(parsed.rooms) ? parsed.rooms : [];
    return {
      rooms,
      unassigned: Array.isArray(parsed.unassigned) ? parsed.unassigned : [],
      roomLinks: normalizeRoomingLinks(Array.isArray(parsed.roomLinks) ? parsed.roomLinks : parsed.meta?.roomLinks, rooms),
      version: Number(parsed.version || parsed.canvasVersion || 4),
      updatedAt: parsed.updatedAt || parsed.meta?.payloadUpdatedAt || "",
    };
  }
  const legacyRooms = Object.values(parsed?.meta?.rooms || {});
  const legacyInserted = new Set(Object.keys(parsed?.meta?.insertedClients || {}));
  const rooms = legacyRooms.map((room, index) => ({
    ...room,
    id: room.id || createRoomId(),
    order: index,
    x: room.x ?? ((index % 3) * 280),
    y: room.y ?? (Math.floor(index / 3) * 190),
  }));
  return {
    rooms,
    unassigned: clients
      .filter((client) => !legacyInserted.has(client.id))
      .map((client) => ({ clientId: client.id, reason: "" })),
    roomLinks: normalizeRoomingLinks(parsed?.meta?.roomLinks, rooms),
    version: 4,
    updatedAt: parsed?.meta?.payloadUpdatedAt || "",
  };
};

const filterRoomingMapByClientIds = (source = {}, allowedClientIds = new Set()) => (
  Object.fromEntries(Object.entries(source || {}).filter(([clientId]) => allowedClientIds.has(clientId)))
);

const sanitizeRoomingStateForEligibleClients = (state = {}, eligibleClientIds = new Set()) => {
  const sourceRooms = Array.isArray(state.rooms) ? state.rooms : [];
  const sourceUnassigned = Array.isArray(state.unassigned) ? state.unassigned : [];
  let removedCount = 0;
  const rooms = sourceRooms.map((room) => {
    const originalOccupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
    const occupantIds = originalOccupantIds.filter((clientId) => eligibleClientIds.has(clientId));
    removedCount += originalOccupantIds.length - occupantIds.length;
    return {
      ...room,
      occupantIds,
      genderOverrides: filterRoomingMapByClientIds(room.genderOverrides, new Set(occupantIds)),
      priceOverrides: filterRoomingMapByClientIds(room.priceOverrides, new Set(occupantIds)),
    };
  });
  const assignedIds = new Set(rooms.flatMap((room) => room.occupantIds || []));
  const unassigned = sourceUnassigned.filter((item) => {
    const clientId = item?.clientId;
    return eligibleClientIds.has(clientId) && !assignedIds.has(clientId);
  });
  removedCount += sourceUnassigned.length - unassigned.length;
  const roomLinks = normalizeRoomingLinks(state.roomLinks, rooms);
  return {
    rooms,
    unassigned,
    roomLinks,
    version: Number(state.version || 4),
    updatedAt: state.updatedAt || "",
    removedCount,
  };
};

const getRoomBlockHeight = (capacity) => Math.max(1, Number(capacity) || 1) + 3;

const isCoordsInsideRoom = (room, x, y) => {
  if (!room) return false;
  const startX = Number(room.startX) || 0;
  const startY = Number(room.startY) || 0;
  const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
  const height = Number(room.height) || getRoomBlockHeight(room.capacity);
  return x >= startX && x < startX + width && y >= startY && y < startY + height;
};

const inferRoomCategoryFromClients = (clients = []) => {
  const genders = new Set(clients.map((client) => client.gender).filter(Boolean));
  if (genders.size <= 1) {
    const only = Array.from(genders)[0];
    if (only === "female") return "female_only";
    return "male_only";
  }
  return "family";
};

const buildRoomingGroupsFromClients = (clients, city) => {
  const grouped = new Map();
  clients.forEach((client) => {
    const key = client.roomingGroupId || `single:${client.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(client);
  });
  return Array.from(grouped.values()).map((groupClients, index) => {
    const first = groupClients[0] || {};
    const roomType = first.roomType || (groupClients.length >= 5 ? "quint" : groupClients.length === 4 ? "quad" : groupClients.length === 3 ? "triple" : groupClients.length === 2 ? "double" : "single");
    const capacity = Math.max(getRoomingCapacity(roomType), groupClients.length || 1);
    const hotel = city === "makkah" ? (first.hotelMecca || "") : (first.hotelMadina || "");
    return {
      id: createRoomId(),
      city,
      roomNumber: String(index + 1).padStart(2, "0"),
      roomType,
      category: first.roomCategory || inferRoomCategoryFromClients(groupClients),
      hotel,
      capacity,
      height: getRoomBlockHeight(capacity),
      width: ROOMING_BLOCK_WIDTH,
      occupantIds: groupClients.map((client) => client.id),
      roomingGroupId: first.roomingGroupId || "",
      roomingGroupName: first.roomingGroupName || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

const getRoomingRoomTypeFromCapacity = (capacity) => {
  const value = Math.max(1, Number(capacity) || 0);
  if (value >= 5) return "quint";
  if (value === 4) return "quad";
  if (value === 3) return "triple";
  if (value === 2) return "double";
  return "single";
};

const getExplicitClientHotelForRoomingCity = (client = {}, city = "makkah") => {
  const value = city === "madinah"
    ? (client.hotelMadina || client.hotel_madina || "")
    : (client.hotelMecca || client.hotel_mecca || "");
  return isMissingRoomingValue(value) ? "" : String(value).trim();
};

const clampRoomingContextMenuPoint = (x, y, width = 170, height = 132) => {
  if (typeof window === "undefined") return { x, y };
  const margin = 8;
  return {
    x: Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - width - margin)),
    y: Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - height - margin)),
  };
};

const getRoomingPackageHotel = (pkg, city) => (
  city === "madinah" ? (pkg?.hotelMadina || pkg?.hotel_madina) : (pkg?.hotelMecca || pkg?.hotel_mecca)
);

const findRoomingPackageFromRoom = (room = {}, packages = [], city = "makkah") => {
  const packageId = String(room.packageId || room.package_id || room.hotel_id || room.hotelId || "").trim();
  if (packageId) {
    const byId = packages.find((pkg) => String(pkg.id || "") === packageId);
    if (byId) return byId;
  }
  const explicitLevel = String(room.packageLevel || room.hotelLevel || room.level || room.levelName || "").trim();
  if (explicitLevel) {
    const byLevel = packages.find((pkg) => String(pkg.level || "").trim() === explicitLevel);
    if (byLevel) return byLevel;
  }
  const roomHotel = normalizeRoomingHotel(getRoomHotelName(room, {}, packages, city) || room.hotel);
  if (!roomHotel) return null;
  const matches = packages.filter((pkg) => normalizeRoomingHotel(getRoomingPackageHotel(pkg, city)) === roomHotel);
  const uniqueLevels = new Set(matches.map((pkg) => String(pkg.level || "").trim()).filter(Boolean));
  if (uniqueLevels.size === 1) return matches.find((pkg) => String(pkg.level || "").trim() === Array.from(uniqueLevels)[0]) || null;
  return null;
};

const getRoomingClientPackage = (client = {}, room = {}, packages = [], city = "makkah") => {
  const roomPackage = findRoomingPackageFromRoom(room, packages, city);
  if (roomPackage) return roomPackage;
  const packageId = String(client.packageId || client.package_id || "").trim();
  if (packageId) {
    const byId = packages.find((pkg) => String(pkg.id || "") === packageId);
    if (byId) return byId;
  }
  const level = String(client.packageLevel || client.hotelLevel || client.hotel_level || "").trim();
  if (!level) return null;
  return packages.find((pkg) => String(pkg.level || "").trim() === level) || null;
};

const getRoomingPriceNumber = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const getClientOfficialRoomingPrice = (client = {}) => getRoomingPriceNumber(
  client.officialPrice ?? client.official_price ?? client.price
);

const getClientSaleRoomingPrice = (client = {}) => getRoomingPriceNumber(
  client.salePrice ?? client.sale_price ?? client.price
);

const getRoomingPriceSync = ({ client, room, packages = [], city = "makkah", decision = null }) => {
  if (!client || !room) return null;
  const targetRoomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
  if (!targetRoomType) return null;
  const currentRoomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
  if (currentRoomType && currentRoomType === targetRoomType) return null;
  const pkg = getRoomingClientPackage(client, room, packages, city);
  const newOfficialPrice = getPackageRoomPrice(pkg, targetRoomType);
  if (!newOfficialPrice) return null;
  const oldOfficialPrice = getClientOfficialRoomingPrice(client);
  const oldSalePrice = getClientSaleRoomingPrice(client);
  const salePriceLooksManual = oldSalePrice > 0 && oldSalePrice !== oldOfficialPrice;
  if (salePriceLooksManual && !decision) {
    return {
      requiresConfirmation: true,
      oldOfficialPrice,
      oldSalePrice,
      newOfficialPrice,
      targetRoomType,
      packageId: pkg?.id || "",
      packageLevel: pkg?.level || "",
      patch: null,
    };
  }
  const keepPreviousSale = Boolean(decision?.keepPreviousSale);
  const decidedSalePrice = decision && !keepPreviousSale
    ? getRoomingPriceNumber(decision.salePrice)
    : null;
  return {
    requiresConfirmation: false,
    oldOfficialPrice,
    oldSalePrice,
    newOfficialPrice,
    targetRoomType,
    packageId: pkg?.id || "",
    packageLevel: pkg?.level || "",
    patch: {
      officialPrice: newOfficialPrice,
      salePrice: keepPreviousSale ? oldSalePrice : (decision ? decidedSalePrice : newOfficialPrice),
    },
  };
};

const buildRoomingClientFieldUpdates = ({ rooms = [], clients = [], program = {}, programId = "", city = "makkah", packages = [] }) => {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const verifiedCityHotels = getProgramHotelsForCity(program, packages, city);
  const seen = new Set();
  const updates = [];
  rooms.forEach((room) => {
    const validOccupantIds = (Array.isArray(room.occupantIds) ? room.occupantIds : [])
      .filter((clientId) => {
        const client = clientsById.get(clientId);
        return client && String(client.programId || "") === String(programId || "") && doesServiceTypeNeedAccommodation(client);
      });
    if (!validOccupantIds.length) return;
    const roomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
    const roomTypeLabel = getRoomTypeLabel(roomType) || getRoomingRoomLabel(roomType);
    const category = ["male_only", "female_only", "family"].includes(room.category) ? room.category : "";
    const categoryLabel = category ? getRoomingCategoryLabel(category) : "";
    const roomingGroupId = String(room.roomingGroupId || room.id || "").trim();
    const roomingGroupName = String(room.roomingGroupName || (room.roomNumber ? `غرفة ${room.roomNumber}` : "")).trim();
    const genderOverrides = room.genderOverrides && typeof room.genderOverrides === "object" ? room.genderOverrides : {};
    const roomHotel = getVerifiedRoomingHotel(
      getRoomHotelName(room, program, packages, city) || room.hotel,
      verifiedCityHotels
    );
    const roomPackage = findRoomingPackageFromRoom(room, packages, city);
    const roomLevel = String(roomPackage?.level || room.packageLevel || room.hotelLevel || room.level || room.levelName || "").trim();
    const priceOverrides = room.priceOverrides && typeof room.priceOverrides === "object" ? room.priceOverrides : {};
    const locationPatch = roomHotel
      ? (city === "madinah" ? { hotelMadina: roomHotel } : { hotelMecca: roomHotel })
      : {};
    const levelPatch = roomLevel
      ? { packageId: roomPackage?.id || room.packageId || room.package_id || "", hotelLevel: roomLevel, packageLevel: roomLevel }
      : {};
    validOccupantIds.forEach((clientId, index) => {
      if (seen.has(clientId)) return;
      seen.add(clientId);
      const client = clientsById.get(clientId);
      const confirmedGender = ["male", "female"].includes(genderOverrides[clientId]) ? genderOverrides[clientId] : "";
      const roomingPatch = {
        groupId: roomingGroupId,
        groupName: roomingGroupName,
        category,
        categoryLabel,
        groupSize: validOccupantIds.length,
        seatIndex: index + 1,
      };
      const priceSync = getRoomingPriceSync({
        client,
        room,
        packages,
        city,
        decision: priceOverrides[clientId] || null,
      });
      const pricePatch = priceSync?.patch || {};
      const unchanged = client.roomType === roomType
        && client.roomTypeLabel === roomTypeLabel
        && (client.roomCategory || "") === category
        && (client.roomCategoryLabel || "") === categoryLabel
        && (client.roomingGroupId || "") === roomingGroupId
        && (client.roomingGroupName || "") === roomingGroupName
        && Number(client.roomingGroupSize || 0) === validOccupantIds.length
        && Number(client.roomingSeatIndex || 0) === index + 1
        && (!locationPatch.hotelMecca || client.hotelMecca === locationPatch.hotelMecca)
        && (!locationPatch.hotelMadina || client.hotelMadina === locationPatch.hotelMadina)
        && (!levelPatch.packageLevel || client.packageLevel === levelPatch.packageLevel)
        && (!levelPatch.hotelLevel || client.hotelLevel === levelPatch.hotelLevel)
        && (!levelPatch.packageId || client.packageId === levelPatch.packageId)
        && (!confirmedGender || client.gender === confirmedGender)
        && (pricePatch.officialPrice === undefined || Number(client.officialPrice || 0) === Number(pricePatch.officialPrice || 0))
        && (pricePatch.salePrice === undefined || Number(client.salePrice || 0) === Number(pricePatch.salePrice || 0));
      if (unchanged) return;
      updates.push({
        id: clientId,
        patch: {
          roomType,
          roomTypeLabel,
          roomCategory: category,
          roomCategoryLabel: categoryLabel,
          roomingGroupId,
          roomingGroupName,
          roomingGroupSize: validOccupantIds.length,
          roomingSeatIndex: index + 1,
          ...locationPatch,
          ...levelPatch,
          ...pricePatch,
          ...(confirmedGender ? { gender: confirmedGender } : {}),
          docs: {
            ...(client.docs || {}),
            rooming: {
              ...((client.docs && client.docs.rooming) || {}),
              ...roomingPatch,
            },
          },
        },
      });
    });
  });
  return updates;
};

const getRoomingCategoryAccent = (category) => {
  if (category === "female_only") return { border: "#db2777", bg: "#fdf2f8", text: "#9d174d", darkBg: "rgba(219,39,119,.20)", darkText: "#f9a8d4", darkBorder: "rgba(244,114,182,.44)" };
  if (category === "family") return { border: "#16a34a", bg: "#f0fdf4", text: "#166534", darkBg: "rgba(22,163,74,.18)", darkText: "#86efac", darkBorder: "rgba(74,222,128,.38)" };
  return { border: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", darkBg: "rgba(37,99,235,.22)", darkText: "#93c5fd", darkBorder: "rgba(96,165,250,.42)" };
};

const getRoomingLayoutTypeKey = (room = {}) => {
  const capacity = Number(room.capacity);
  if (Number.isFinite(capacity) && capacity > 0) {
    if (capacity === 2) return "double";
    if (capacity === 3) return "triple";
    if (capacity === 4) return "quad";
    if (capacity === 5) return "quint";
    if (capacity === 1) return "single";
    return `capacity:${capacity}`;
  }
  return normalizeRoomingRoomType(room.roomType) || String(room.roomType || "other").trim() || "other";
};

const getRoomingLayoutTypeRank = (room = {}) => {
  const key = getRoomingLayoutTypeKey(room);
  const index = ROOMING_LAYOUT_TYPE_ORDER.indexOf(key);
  return index === -1 ? ROOMING_LAYOUT_TYPE_ORDER.length : index;
};

const autoLayoutRoomNodes = (rooms = []) => {
  const sorted = rooms.slice().sort((a, b) => {
    const typeRank = getRoomingLayoutTypeRank(a) - getRoomingLayoutTypeRank(b);
    if (typeRank) return typeRank;
    const type = String(getRoomingLayoutTypeKey(a)).localeCompare(String(getRoomingLayoutTypeKey(b)), "ar");
    if (type) return type;
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
    if (category) return category;
    return (a.order || 0) - (b.order || 0);
  });

  const groupOffsets = new Map();
  let currentTypeKey = "";
  let groupStartY = ROOMING_LAYOUT_START_Y;
  let groupRowCount = 0;

  return sorted.map((room, index) => {
    const typeKey = getRoomingLayoutTypeKey(room);
    if (typeKey !== currentTypeKey) {
      if (currentTypeKey) {
        groupStartY += (groupRowCount * (ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP)) + ROOMING_LAYOUT_GROUP_VERTICAL_GAP;
      }
      currentTypeKey = typeKey;
      groupRowCount = 0;
    }
    const localIndex = groupOffsets.get(typeKey) || 0;
    groupOffsets.set(typeKey, localIndex + 1);
    const columnIndex = localIndex % ROOMING_LAYOUT_MAX_COLUMNS;
    const rowIndex = Math.floor(localIndex / ROOMING_LAYOUT_MAX_COLUMNS);
    groupRowCount = Math.max(groupRowCount, rowIndex + 1);
    return {
      ...room,
      order: room.order ?? index,
      x: ROOMING_LAYOUT_START_X + (columnIndex * (ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP)),
      y: groupStartY + (rowIndex * (ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP)),
    };
  });
};

const getRoomingGeneratedLayoutSummary = (roomCount = 0) => {
  const count = Math.max(0, Number(roomCount) || 0);
  if (!count) return { count: 0, columns: 0, rows: 0 };
  const stepX = ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP;
  const stepY = ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count * (stepY / stepX))));
  return {
    count,
    columns,
    rows: Math.ceil(count / columns),
  };
};

const getRoomingGeneratedGridPosition = (index = 0, columns = 1, origin = {}) => {
  const stepX = ROOMING_LAYOUT_CARD_WIDTH + ROOMING_LAYOUT_HORIZONTAL_GAP;
  const stepY = ROOMING_LAYOUT_CARD_HEIGHT + ROOMING_LAYOUT_VERTICAL_GAP;
  const safeColumns = Math.max(1, Number(columns) || 1);
  const columnIndex = index % safeColumns;
  const rowIndex = Math.floor(index / safeColumns);
  return {
    x: Number(origin.x ?? ROOMING_LAYOUT_START_X) + (columnIndex * stepX),
    y: Number(origin.y ?? ROOMING_LAYOUT_START_Y) + (rowIndex * stepY),
  };
};

const autoLayoutGeneratedRoomNodes = (rooms = []) => {
  const sorted = rooms.slice().sort((a, b) => {
    const typeRank = getRoomingLayoutTypeRank(a) - getRoomingLayoutTypeRank(b);
    if (typeRank) return typeRank;
    const type = String(getRoomingLayoutTypeKey(a)).localeCompare(String(getRoomingLayoutTypeKey(b)), "ar");
    if (type) return type;
    const hotel = String(a.hotel || "").localeCompare(String(b.hotel || ""), "ar");
    if (hotel) return hotel;
    const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
    if (category) return category;
    return (a.order || 0) - (b.order || 0);
  });
  const roomCount = sorted.length;
  if (!roomCount) return [];

  const { columns } = getRoomingGeneratedLayoutSummary(roomCount);

  return sorted.map((room, index) => {
    const position = getRoomingGeneratedGridPosition(index, columns);
    return {
      ...room,
      order: room.order ?? index,
      x: position.x,
      y: position.y,
    };
  });
};

const getRoomingNodeRect = (node, position = node?.position || {}) => {
  const width = Number(node?.measured?.width || node?.width || ROOMING_NODE_WIDTH);
  const capacity = Number(node?.data?.room?.capacity || node?.data?.room?.occupantIds?.length || 2);
  const fallbackHeight = Math.max(ROOMING_NODE_MIN_HEIGHT, 134 + (Math.max(1, capacity) * 24));
  const height = Number(node?.measured?.height || node?.height || fallbackHeight);
  return {
    x: Number(position.x) || 0,
    y: Number(position.y) || 0,
    width,
    height,
  };
};

const doRoomingRectsOverlap = (a, b, gap = ROOMING_NODE_COLLISION_GAP) => {
  return a.x < b.x + b.width + gap
    && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap
    && a.y + a.height + gap > b.y;
};

const hasRoomingNodeCollision = (node, nodes, position = node?.position) => {
  if (!node) return false;
  const rect = getRoomingNodeRect(node, position);
  return nodes.some((other) => {
    if (!other || other.id === node.id) return false;
    return doRoomingRectsOverlap(rect, getRoomingNodeRect(other));
  });
};

const findNearestFreeRoomingPosition = (node, nodes, preferredPosition) => {
  if (!node) return preferredPosition || { x: 0, y: 0 };
  const origin = preferredPosition || node.position || { x: 0, y: 0 };
  if (!hasRoomingNodeCollision(node, nodes, origin)) return origin;
  const rect = getRoomingNodeRect(node, origin);
  const stepX = rect.width + ROOMING_NODE_MIN_GAP;
  const stepY = rect.height + ROOMING_NODE_MIN_GAP;
  const candidates = [];
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        candidates.push({
          x: Math.max(0, origin.x + (dx * stepX)),
          y: Math.max(0, origin.y + (dy * stepY)),
        });
      }
    }
  }
  candidates.sort((a, b) => {
    const da = Math.hypot(a.x - origin.x, a.y - origin.y);
    const db = Math.hypot(b.x - origin.x, b.y - origin.y);
    return da - db;
  });
  return candidates.find((candidate) => !hasRoomingNodeCollision(node, nodes, candidate)) || origin;
};

const cropSheetPayload = (payload, range) => {
  if (!payload || !range) return payload;
  const bounds = getRangeBounds(range);
  const data = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    data.push((payload.data?.[y] || []).slice(bounds.minX, bounds.maxX + 1));
  }
  const style = {};
  Object.entries(payload.style || {}).forEach(([cell, value]) => {
    const coords = getCellCoords(cell);
    if (!coords) return;
    if (coords.x < bounds.minX || coords.x > bounds.maxX || coords.y < bounds.minY || coords.y > bounds.maxY) return;
    style[getCellName(coords.x - bounds.minX, coords.y - bounds.minY)] = value;
  });
  const mergeCells = {};
  Object.entries(payload.mergeCells || {}).forEach(([cell, spans]) => {
    const coords = getCellCoords(cell);
    if (!coords) return;
    if (coords.x < bounds.minX || coords.x > bounds.maxX || coords.y < bounds.minY || coords.y > bounds.maxY) return;
    const maxColspan = bounds.maxX - coords.x + 1;
    const maxRowspan = bounds.maxY - coords.y + 1;
    mergeCells[getCellName(coords.x - bounds.minX, coords.y - bounds.minY)] = [
      Math.min(spans?.[0] || 1, maxColspan),
      Math.min(spans?.[1] || 1, maxRowspan),
    ];
  });
  return { ...payload, data, style, mergeCells };
};

const createBlankSheetData = (rows = ROOMING_ROWS, cols = ROOMING_COLS) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

const normalizeSheetData = (data, rows = ROOMING_ROWS, cols = ROOMING_COLS) => {
  const source = Array.isArray(data) ? data : [];
  const targetRows = Math.max(rows, source.length || 0);
  const targetCols = Math.max(cols, ...source.map(row => Array.isArray(row) ? row.length : 0), 0);
  return Array.from({ length: targetRows }, (_, y) =>
    Array.from({ length: targetCols }, (_, x) => source[y]?.[x] ?? "")
  );
};

const getClientDisplayName = (client, lang) => resolveClientDisplayName(client, trKey("pilgrimFallback", lang) || "معتمر", lang);
const getClientRegistrationSource = (client = {}) => pickFirstText(client, [
  "registrationSource",
  "registration_source",
  "sourceRegistration",
  "source",
]);
const getRoomCardRegistrationSource = (client = {}) => pickFirstText(client, [
  "registrationSource",
  "registration_source",
  "sourceRegistration",
]);

const normalizeRoomingSearchText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[ـًٌٍَُِّْ]/g, "")
  .trim()
  .toLowerCase();

const getRoomingClientSearchText = (client = {}, lang = "ar") => normalizeRoomingSearchText([
  getClientDisplayName(client, lang),
  getClientArabicName(client),
  getClientLatinName(client),
  client.name,
  client.firstName,
  client.lastName,
  client.nom,
  client.prenom,
  client.phone,
  client.passport?.number,
  client.passportNumber,
  client.passport_no,
  client.cin,
  client.nationalId,
  client.national_id,
  client.passport?.cin,
  client.passport?.nationalId,
  client.passport?.national_id,
].filter(Boolean).join(" "));

const normalizeRoomCreateCount = (value) => {
  const count = Math.floor(Number(value));
  if (!Number.isFinite(count)) return 1;
  return Math.min(100, Math.max(1, count));
};

const slugifyFilePart = (value) => String(value || "program")
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "")
  .slice(0, 80);

const CONTRACT_EXPORT_HEADERS = [
  "nom complet",
  "N de pass",
  "N CIN",
  "hotel a medine",
  "entree hotel med",
  "sortie hotel med",
  "hotel a la mecque",
  "entree hotel mec",
  "sortie hotel mec",
  "type de chambre",
  "adress",
  "compagnie",
  "depart",
  "retour",
];

const pickFirstText = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const safeCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
};

const compareText = (a, b, lang = "ar") => String(a || "").localeCompare(String(b || ""), lang === "ar" ? "ar" : lang);

const pushVerticalMerge = (merges, startRow, endRow, columnIndex) => {
  if (endRow > startRow) {
    merges.push({ s: { r: startRow, c: columnIndex }, e: { r: endRow, c: columnIndex } });
  }
};

const buildPilgrimsListSheet = (clients = [], lang = "ar", labels = {}) => {
  const rows = clients
    .map((client, index) => ({
      latinName: safeCellValue(getClientLatinName(client)),
      localName: safeCellValue(getClientArabicName(client) || resolveClientDisplayName(client, "")),
      phone: safeCellValue(client.phone),
      source: safeCellValue(getClientRegistrationSource(client)),
      serviceType: safeCellValue(getClientServiceTypeLabel(client, {}, lang)),
      index,
    }))
    .sort((a, b) => (
      compareText(a.source, b.source, lang)
      || compareText(a.phone, b.phone, lang)
      || compareText(a.localName, b.localName, lang)
      || compareText(a.latinName, b.latinName, lang)
      || a.index - b.index
    ));
  const data = [
    [
      "Nom complet",
      labels.localName,
      labels.phone,
      labels.registrationSource,
      labels.serviceType,
    ],
    ...rows.map((row) => [row.latinName, row.localName, row.phone, row.source, row.serviceType]),
  ];
  const merges = [];
  ["phone", "source"].forEach((field) => {
    const columnIndex = field === "phone" ? 2 : 3;
    let groupStart = 0;
    for (let index = 1; index <= rows.length; index += 1) {
      const current = rows[groupStart]?.[field] || "";
      const sameGroup = index < rows.length && rows[index]?.[field] === current;
      if (sameGroup) continue;
      if (current) pushVerticalMerge(merges, groupStart + 1, index, columnIndex);
      groupStart = index;
    }
  });
  return { data, merges };
};

const parseStyleValue = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  return String(value)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [prop, ...rest] = part.split(":");
      if (!prop || !rest.length) return acc;
      acc[prop.trim()] = rest.join(":").trim();
      return acc;
    }, {});
};

const createRoomingHeaderSheet = ({ program, clients, city, agency, lang = "ar" }) => {
  const data = createBlankSheetData();
  const cityName = city === "makkah" ? "مكة" : "المدينة";
  const agencyLabel = lang === "fr" ? "Agence" : lang === "en" ? "Agency" : "الوكالة";
  const hotel = city === "makkah" ? program.hotelMecca : program.hotelMadina;
  const style = {
    A1: "background-color:#0f172a;color:#d4af37;font-weight:bold;font-size:18px;text-align:center;",
    A2: "background-color:#111827;color:#f8fafc;font-weight:bold;text-align:center;",
    A3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    E3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    I3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    M3: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    A4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    E4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    I4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
    M4: "background-color:#1f2937;color:#e5e7eb;text-align:center;",
  };
  const mergeCells = {
    A1: [16, 1],
    A2: [16, 1],
    A3: [4, 1],
    E3: [4, 1],
    I3: [4, 1],
    M3: [4, 1],
    A4: [4, 1],
    E4: [4, 1],
    I4: [4, 1],
    M4: [4, 1],
  };
  data[0][0] = `ورقة التسكين - ${cityName}`;
  data[1][0] = program.name || "";
  data[2][0] = `تاريخ الذهاب: ${program.departure || "—"}`;
  data[2][4] = `تاريخ الرجوع: ${program.returnDate || "—"}`;
  data[2][8] = `عدد المعتمرين: ${clients.length}`;
  data[2][12] = `المقاعد: ${program.seats || "—"}`;
  data[3][0] = `الفندق: ${hotel || "—"}`;
  data[3][4] = `${agencyLabel}: ${getLocalizedAgencyName(agency, lang, "—")}`;
  data[3][8] = "ملاحظات:";
  data[3][12] = "";

  return {
    version: 2,
    data,
    style,
    mergeCells,
    meta: normalizeRoomingMeta({}),
  };
};

const writeRoomBlock = (sheet, startX, startY, roomNo = "") => {
  if (!sheet) return;
  const x = Math.max(0, Number(startX) || 0);
  const y = Math.max(0, Number(startY) || 0);
  const data = normalizeSheetData(sheet.getData?.(false, false));
  const rowCount = data.length;
  const colCount = data[0]?.length || ROOMING_COLS;
  if (x + 2 >= colCount) {
    try { sheet.insertColumn(x + 3 - colCount); } catch {}
  }
  if (y + 5 >= rowCount) {
    try { sheet.insertRow(y + 6 - rowCount); } catch {}
  }
  const titleCell = getCellName(x, y);
  try { sheet.setMerge(titleCell, 3, 1); } catch {}
  sheet.setValueFromCoords(x, y, roomNo ? `غرفة ${roomNo}` : "غرفة", true);
  sheet.setValueFromCoords(x, y + 1, "المستوى", true);
  sheet.setValueFromCoords(x + 1, y + 1, "نوع الغرفة", true);
  sheet.setValueFromCoords(x + 2, y + 1, "ملاحظات", true);
  for (let row = y + 2; row <= y + 5; row += 1) {
    sheet.setValueFromCoords(x, row, "", true);
    sheet.setValueFromCoords(x + 1, row, "", true);
    sheet.setValueFromCoords(x + 2, row, "", true);
  }
  sheet.setStyle(titleCell, "background-color", "#d4af37", true);
  sheet.setStyle(titleCell, "color", "#111827", true);
  sheet.setStyle(titleCell, "font-weight", "700", true);
  sheet.setStyle(titleCell, "text-align", "center", true);
  for (let col = x; col < x + 3; col += 1) {
    const header = getCellName(col, y + 1);
    sheet.setStyle(header, "background-color", "#334155", true);
    sheet.setStyle(header, "color", "#f8fafc", true);
    sheet.setStyle(header, "font-weight", "700", true);
    sheet.setStyle(header, "text-align", "center", true);
    for (let row = y + 2; row <= y + 5; row += 1) {
      const cell = getCellName(col, row);
      sheet.setStyle(cell, "background-color", "#111827", true);
      sheet.setStyle(cell, "color", "#e5e7eb", true);
    }
  }
};

const clearRoomBlockMerges = (sheet, room) => {
  if (!sheet || !room) return;
  const height = Number(room.height) || getRoomBlockHeight(room.capacity);
  for (let offsetY = 0; offsetY < height; offsetY += 1) {
    try { sheet.removeMerge(getCellName(room.startX, room.startY + offsetY)); } catch {}
  }
};

const renderStructuredRoomBlock = (sheet, room, clientsById = {}) => {
  if (!sheet || !room) return;
  const startX = Math.max(0, Number(room.startX) || 0);
  const startY = Math.max(0, Number(room.startY) || 0);
  const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
  const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
  const height = Number(room.height) || getRoomBlockHeight(capacity);
  const data = normalizeSheetData(sheet.getData?.(false, false));
  const rowCount = data.length;
  const colCount = data[0]?.length || ROOMING_COLS;
  if (startX + width >= colCount) {
    try { sheet.insertColumn(startX + width - colCount + 1); } catch {}
  }
  if (startY + height >= rowCount) {
    try { sheet.insertRow(startY + height - rowCount + 1); } catch {}
  }

  clearRoomBlockMerges(sheet, room);

  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      const cell = getCellName(x, y);
      sheet.setValueFromCoords(x, y, "", true);
      [
        "background-color",
        "color",
        "font-weight",
        "font-style",
        "text-align",
        "font-size",
        "white-space",
        "overflow-wrap",
        "word-break",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
      ].forEach((prop) => sheet.setStyle(cell, prop, "", true));
    }
  }

  const titleCell = getCellName(startX, startY);
  const hotelCell = getCellName(startX, startY + 1);
  const actionCell = getCellName(startX, startY + height - 1);

  try { sheet.setMerge(titleCell, width, 1); } catch {}
  try { sheet.setMerge(hotelCell, width, 1); } catch {}
  try { sheet.setMerge(actionCell, width, 1); } catch {}

  const occupants = Array.isArray(room.occupantIds) ? room.occupantIds : [];
  const roomTitle = `غرفة ${room.roomNumber || "—"} — ${getRoomingRoomLabel(room.roomType)} — ${getRoomingCategoryLabel(room.category)} — ${occupants.length}/${capacity}`;
  sheet.setValueFromCoords(startX, startY, roomTitle, true);
  sheet.setValueFromCoords(startX, startY + 1, `الفندق: ${room.hotel || "—"}`, true);
  sheet.setValueFromCoords(startX, startY + height - 1, "إضافة معتمر • تعديل الغرفة • حذف الغرفة", true);

  for (let slot = 0; slot < capacity; slot += 1) {
    const rowY = startY + 2 + slot;
    const rowCell = getCellName(startX, rowY);
    try { sheet.setMerge(rowCell, width, 1); } catch {}
    const occupantId = occupants[slot];
    const occupant = occupantId ? clientsById[occupantId] : null;
    sheet.setValueFromCoords(
      startX,
      rowY,
      occupant ? `${getClientDisplayName(occupant)}` : "مكان شاغر",
      true
    );
  }

  const applyBlockStyle = (rowY, styles) => {
    for (let x = startX; x < startX + width; x += 1) {
      const cell = getCellName(x, rowY);
      Object.entries(styles).forEach(([prop, value]) => sheet.setStyle(cell, prop, value, true));
      sheet.setStyle(cell, "border-top", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-right", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-bottom", ROOMING_BORDER, true);
      sheet.setStyle(cell, "border-left", ROOMING_BORDER, true);
    }
  };

  applyBlockStyle(startY, {
    "background-color": "#0f172a",
    color: "#f8fafc",
    "font-weight": "700",
    "text-align": "center",
    "font-size": "13px",
  });
  applyBlockStyle(startY + 1, {
    "background-color": "#f8fafc",
    color: "#334155",
    "font-weight": "700",
    "text-align": "right",
  });
  for (let slot = 0; slot < capacity; slot += 1) {
    applyBlockStyle(startY + 2 + slot, {
      "background-color": occupants[slot] ? "#ecfeff" : "#ffffff",
      color: "#0f172a",
      "font-weight": occupants[slot] ? "700" : "500",
      "text-align": "right",
      "white-space": "pre-wrap",
    });
  }
  applyBlockStyle(startY + height - 1, {
    "background-color": "#eff6ff",
    color: "#1d4ed8",
    "font-weight": "700",
    "text-align": "center",
    "font-size": "12px",
  });
};

// ═══════════════════════════════════════
// PROGRAMS LIST PAGE
// ═══════════════════════════════════════
export default function ProgramsPage({
  store,
  onToast,
  notificationFocus = null,
  badgesEnabled = true,
  contractsEnabled = true,
  programPostersEnabled = true,
  agencyNusukUploadFeatureEnabled = false,
}) {
  const { programs, clients, addProgram, updateProgram, archiveProgramRecord, trashProgramRecord, deleteProgram,
          getClientTotalPaid, ensureAgencyNusukSettings, saveAgencyNusukSettings, setProgramNusukUploadEnabled } = store;
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const tr = React.useCallback((key, vars = {}) => {
    const template = t?.[key] ?? key;
    if (typeof template === "function") return template(vars);
    return Object.entries(vars).reduce((text, [name, value]) => (
      String(text).replaceAll(`{${name}}`, String(value ?? ""))
    ), String(template));
  }, [t]);
  const formatCurrencyForLang = React.useCallback(
    (value) => formatCurrency(value, lang),
    [lang]
  );
  const isLocalhost = isLocalDevelopmentHost();
  const canUseNusukUploadForProgram = React.useCallback((program, options = {}) => (
    getNusukUploadAvailability(program, {
      isLocalhost,
      agencyNusukUploadFeatureEnabled,
      debug: options.debug,
    })
  ), [agencyNusukUploadFeatureEnabled, isLocalhost]);
  const { templates: bulkAssignedCodePosterTemplates } = useAgencyCodePosterTemplates(store.agencyId, { enabled: programPostersEnabled });
  const bulkPosterExportLabels = React.useMemo(() => getPosterExportLabels(lang, t), [lang, t]);
  const [showForm,      setShowForm]      = React.useState(false);
  const [showBulkPosterModal, setShowBulkPosterModal] = React.useState(false);
  const [pendingBulkPosterPayload, setPendingBulkPosterPayload] = React.useState(null);
  const [bulkPosterExportBusy, setBulkPosterExportBusy] = React.useState(false);
  const [bulkPosterTemplateChoice, setBulkPosterTemplateChoice] = React.useState(null);
  const [bulkPosterTemplateChoiceId, setBulkPosterTemplateChoiceId] = React.useState("");
  const [bulkPosterTitleOverride, setBulkPosterTitleOverride] = React.useState("");
  const [bulkPosterShowDates, setBulkPosterShowDates] = React.useState(true);
  const [editing,       setEditing]       = React.useState(null);
  const [editingProgramClients, setEditingProgramClients] = React.useState(null);
  const [activeProgram, setActiveProgram] = React.useState(null);
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const nextYear = currentYear + 1;
  const programsFiltersStorageKey = React.useMemo(
    () => getProgramsFiltersStorageKey(store.agencyId),
    [store.agencyId]
  );
  const initialProgramsFilters = React.useMemo(
    () => readProgramsFiltersFromStorage(programsFiltersStorageKey, currentYear),
    [programsFiltersStorageKey, currentYear]
  );
  const [search,        setSearch]        = React.useState(() => initialProgramsFilters.search);
  const debouncedProgramSearch = useDebouncedValue(search, 200);
  const [selectedYear, setSelectedYear] = React.useState(() => initialProgramsFilters.selectedYear);
  const [programTypeFilter, setProgramTypeFilter] = React.useState(() => initialProgramsFilters.programTypeFilter);
  const [programStatusFilter, setProgramStatusFilter] = React.useState(() => initialProgramsFilters.programStatusFilter);
  const [programsPageSize, setProgramsPageSize] = React.useState(PROGRAMS_LIST_DEFAULT_PAGE_SIZE);
  const [programsCurrentPage, setProgramsCurrentPage] = React.useState(1);
  const [programSelectionMode, setProgramSelectionMode] = React.useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = React.useState(() => new Set());
  const [programSearchOpen, setProgramSearchOpen] = React.useState(false);
  const [highlightProgramId, setHighlightProgramId] = React.useState("");
  const [programRealtimeRefreshKey, setProgramRealtimeRefreshKey] = React.useState(0);
  const [programDetailRefreshKey, setProgramDetailRefreshKey] = React.useState(0);
  const [travelGroupCountsRefreshKey, setTravelGroupCountsRefreshKey] = React.useState(0);
  const [remoteTravelGroupCountsByProgramId, setRemoteTravelGroupCountsByProgramId] = React.useState({});
  const [programTypeMenuOpen, setProgramTypeMenuOpen] = React.useState(false);
  const [programStatusMenuOpen, setProgramStatusMenuOpen] = React.useState(false);
  const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
  const [programPageSizeMenuOpen, setProgramPageSizeMenuOpen] = React.useState(false);
  const [hoveredYearOption, setHoveredYearOption] = React.useState(null);
  const [hoveredProgramPageSizeOption, setHoveredProgramPageSizeOption] = React.useState(null);
  const [deletePrompt,  setDeletePrompt]  = React.useState(null);
  const [archivePrompt, setArchivePrompt] = React.useState(null);
  const [bulkTrashPrompt, setBulkTrashPrompt] = React.useState(null);
  const [duplicatePrompt, setDuplicatePrompt] = React.useState(null);
  const [nusukSettingsPrompt, setNusukSettingsPrompt] = React.useState(null);
  const [nusukSettingsSaving, setNusukSettingsSaving] = React.useState(false);
  const [isNusukAssistantInstallOpen, setIsNusukAssistantInstallOpen] = React.useState(false);
  const [pendingNusukUploadProgram, setPendingNusukUploadProgram] = React.useState(null);
  const [serverProgramPage, setServerProgramPage] = React.useState({ status: "idle", data: null });
  const yearMenuRef = React.useRef(null);
  const yearButtonRef = React.useRef(null);
  const programTypeMenuRef = React.useRef(null);
  const programTypeButtonRef = React.useRef(null);
  const programStatusMenuRef = React.useRef(null);
  const programStatusButtonRef = React.useRef(null);
  const programPageSizeMenuRef = React.useRef(null);
  const programPageSizeButtonRef = React.useRef(null);
  const programSearchInputRef = React.useRef(null);
  const programCardRefs = React.useRef(new Map());
  const nusukAssistantCheckInFlightRef = React.useRef(false);
  const nusukOpenInFlightProgramIdsRef = React.useRef(new Set());
  const metricsHydrationRequestedRef = React.useRef(false);
  const programRealtimeSummaryTimerRef = React.useRef(null);
  const programsFiltersStorageKeyRef = React.useRef(programsFiltersStorageKey);
  const skipNextProgramsFilterPersistRef = React.useRef(false);
  const serverProgramPageData = store.isSupabaseEnabled && serverProgramPage.status === "ready" ? serverProgramPage.data : null;
  const serverProgramPageReady = Boolean(serverProgramPageData);
  const programMetricsReady = Boolean(serverProgramPageReady) || (clientsReady && paymentsReady);

  React.useEffect(() => () => {
    if (programRealtimeSummaryTimerRef.current !== null) {
      window.clearTimeout(programRealtimeSummaryTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    initializeNusukAssistantBridge();
    warmupNusukAssistant();
    return () => {
      disposeNusukAssistantBridge();
    };
  }, []);

  React.useEffect(() => {
    if (programsFiltersStorageKeyRef.current === programsFiltersStorageKey) return;
    programsFiltersStorageKeyRef.current = programsFiltersStorageKey;
    skipNextProgramsFilterPersistRef.current = true;
    const savedFilters = readProgramsFiltersFromStorage(programsFiltersStorageKey, currentYear);
    setSearch(savedFilters.search);
    setSelectedYear(savedFilters.selectedYear);
    setProgramTypeFilter(savedFilters.programTypeFilter);
    setProgramStatusFilter(savedFilters.programStatusFilter);
    setProgramsCurrentPage(1);
  }, [programsFiltersStorageKey, currentYear]);

  React.useEffect(() => {
    if (skipNextProgramsFilterPersistRef.current) {
      skipNextProgramsFilterPersistRef.current = false;
      return;
    }
    writeProgramsFiltersToStorage(
      programsFiltersStorageKey,
      {
        search,
        selectedYear,
        programTypeFilter,
        programStatusFilter,
      },
      currentYear
    );
  }, [
    currentYear,
    programStatusFilter,
    programTypeFilter,
    programsFiltersStorageKey,
    search,
    selectedYear,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (!store.latestProgramRealtimeEvent && !store.latestClientRealtimeEvent && !store.latestPaymentRealtimeEvent) return;
    if (programRealtimeSummaryTimerRef.current !== null) {
      window.clearTimeout(programRealtimeSummaryTimerRef.current);
    }
    programRealtimeSummaryTimerRef.current = window.setTimeout(() => {
      programRealtimeSummaryTimerRef.current = null;
      setProgramRealtimeRefreshKey((key) => key + 1);
    }, PROGRAMS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS);
  }, [
    store.isSupabaseEnabled,
    store.latestProgramRealtimeEvent,
    store.latestClientRealtimeEvent,
    store.latestPaymentRealtimeEvent,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) {
      setServerProgramPage({ status: "idle", data: null });
      return undefined;
    }

    let cancelled = false;
    const requestedPage = Math.max(1, Number(programsCurrentPage) || 1);
    const offset = (requestedPage - 1) * programsPageSize;
    const year = selectedYear === "all" ? null : Number(selectedYear);

    setServerProgramPage({ status: "loading", data: null });
    db.programs.fetchPageSummary({
      search: debouncedProgramSearch,
      year: Number.isFinite(year) ? year : null,
      type: programTypeFilter,
      status: programStatusFilter,
      limit: programsPageSize,
      offset,
    }).then((result) => {
      if (cancelled) return;
      if (result?.error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[ProgramsPage] Program summary RPC failed; using frontend summary fallback.", result.error);
        }
        setServerProgramPage({ status: "failed", data: null, error: result.error });
        return;
      }
      setServerProgramPage({ status: "ready", data: result.data });
    }).catch((error) => {
      if (cancelled) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[ProgramsPage] Program summary RPC failed; using frontend summary fallback.", error);
      }
      setServerProgramPage({ status: "failed", data: null, error });
    });

    return () => {
      cancelled = true;
    };
  }, [
    store.isSupabaseEnabled,
    debouncedProgramSearch,
    selectedYear,
    programTypeFilter,
    programStatusFilter,
    programsPageSize,
    programsCurrentPage,
    programs,
    programRealtimeRefreshKey,
    store.lastSynced,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (metricsHydrationRequestedRef.current) return;
    metricsHydrationRequestedRef.current = true;
    if (!clientsReady && !store.clientsLoading) store.ensureClientsLoaded?.();
    if (!paymentsReady && !store.paymentsLoading) store.ensurePaymentsLoaded?.();
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    store.clientsLoading,
    store.paymentsLoading,
    store.ensureClientsLoaded,
    store.ensurePaymentsLoaded,
  ]);

  const searchPlaceholder = React.useMemo(() => {
    if (lang === "fr") return "Rechercher un programme...";
    if (lang === "en") return "Search program name...";
    return "ابحث عن اسم البرنامج...";
  }, [lang]);

  const yearLabel = React.useMemo(() => {
    if (lang === "fr") return "Année";
    if (lang === "en") return "Year";
    return "السنة";
  }, [lang]);

  const allYearsLabel = React.useMemo(() => {
    if (lang === "fr") return "Toutes les années";
    if (lang === "en") return "All years";
    return "كل السنوات";
  }, [lang]);

  const programTypeLabels = React.useMemo(() => ({
    all: t.programTypeAll,
    umrah: t.programTypeUmrah,
    hajj: t.programTypeHajj,
  }), [t.programTypeAll, t.programTypeUmrah, t.programTypeHajj]);

  const programStatusLabels = React.useMemo(() => ({
    all: t.programStatusAll,
    cleared: t.programStatusCleared,
    not_cleared: t.programStatusNotCleared,
    full: t.programStatusFull,
    not_full: t.programStatusNotFull,
  }), [
    t.programStatusAll,
    t.programStatusCleared,
    t.programStatusNotCleared,
    t.programStatusFull,
    t.programStatusNotFull,
  ]);

  const activePrograms = React.useMemo(() => (
    programs.filter((program) => (
      program
      && !program.deleted
      && !program.deletedAt
      && String(program.status || "active").toLowerCase() !== "archived"
    ))
  ), [programs]);

  const yearOptions = React.useMemo(() => {
    const selectedNumericYear = Number(selectedYear);
    const primaryYears = [currentYear, nextYear];
    const extraYears = Array.from(new Set([
      ...getUsedProgramYears(activePrograms),
      Number.isFinite(selectedNumericYear) ? selectedNumericYear : null,
    ].filter(Number.isFinite)))
      .filter((year) => !primaryYears.includes(year))
      .sort((a, b) => b - a);
    return [
      { value: "all", label: allYearsLabel },
      ...Array.from(new Set([...primaryYears, ...extraYears]))
        .map((year) => ({ value: String(year), label: String(year) })),
    ];
  }, [activePrograms, allYearsLabel, currentYear, nextYear, selectedYear]);

  const selectedYearOption = React.useMemo(
    () => yearOptions.find((option) => option.value === selectedYear) || yearOptions[0],
    [yearOptions, selectedYear]
  );

  const activeProgramById = React.useMemo(() => (
    new Map(activePrograms.map((program) => [String(program.id), program]))
  ), [activePrograms]);

  const clientsByProgramId = React.useMemo(() => {
    const map = new Map();
    clients.forEach((client) => {
      if (!client?.programId) return;
      const programId = String(client.programId);
      const list = map.get(programId) || [];
      list.push(client);
      map.set(programId, list);
    });
    return map;
  }, [clients]);

  const activeClientsByProgramId = React.useMemo(() => {
    const sourceClients = Array.isArray(store.activeClients) ? store.activeClients : clients;
    const map = new Map();
    sourceClients.forEach((client) => {
      if (!client?.programId || client.deleted || client.deletedAt || client.archived) return;
      const programId = String(client.programId);
      const list = map.get(programId) || [];
      list.push(client);
      map.set(programId, list);
    });
    return map;
  }, [clients, store.activeClients]);

  const frontendProgramSummaryById = React.useMemo(() => (
    buildProgramListSummaryById({
      programs: activePrograms,
      clientsByProgramId,
      activeClientsByProgramId,
      getClientTotalPaid,
      getProgramClientRemainingAmount,
      getProgramClientPaymentStatus,
      getClientStatusRemainingAmount: (client, paid) => {
        const clientProgram = activeProgramById.get(String(client?.programId || client?.program_id || ""));
        return getProgramClientRemainingAmount(clientProgram, client, paid);
      },
      getProgramKind,
      getProgramDepartureYear,
    })
  ), [activePrograms, activeClientsByProgramId, activeProgramById, clientsByProgramId, getClientTotalPaid]);

  const serverProgramSummaryById = React.useMemo(() => {
    const map = new Map();
    if (!serverProgramPageReady) return map;
    (serverProgramPageData.items || []).forEach((program) => {
      if (program?.id && program.programSummary) {
        map.set(String(program.id), program.programSummary);
      }
    });
    return map;
  }, [serverProgramPageData, serverProgramPageReady]);

  const programSummaryById = React.useMemo(() => {
    if (!serverProgramPageReady) return frontendProgramSummaryById;
    const map = new Map(frontendProgramSummaryById);
    serverProgramSummaryById.forEach((summary, programId) => {
      map.set(programId, summary);
    });
    return map;
  }, [frontendProgramSummaryById, serverProgramPageReady, serverProgramSummaryById]);

  const serverVisiblePrograms = React.useMemo(() => {
    if (!serverProgramPageReady) return [];
    return (serverProgramPageData.items || []).map((program) => {
      const fullProgram = activeProgramById.get(String(program.id));
      return fullProgram
        ? { ...program, ...fullProgram, programSummary: program.programSummary }
        : program;
    });
  }, [activeProgramById, serverProgramPageData, serverProgramPageReady]);

  const baseFilteredPrograms = React.useMemo(() => {
    const q = normalizeSearchText(debouncedProgramSearch);
    return activePrograms.filter((program) => {
      const matchesSearch = !q || includesSearch(program.name, q);
      if (!matchesSearch) return false;
      if (selectedYear === "all") return true;
      const departureYear = programSummaryById.get(String(program.id))?.year ?? getProgramDepartureYear(program);
      return departureYear === Number(selectedYear);
    });
  }, [activePrograms, debouncedProgramSearch, programSummaryById, selectedYear]);

  const programTypeOptions = React.useMemo(() => ([
    { key: "all", label: programTypeLabels.all, count: baseFilteredPrograms.length },
    { key: "umrah", label: programTypeLabels.umrah, count: baseFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.typeKind === "umrah").length },
    { key: "hajj", label: programTypeLabels.hajj, count: baseFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.typeKind === "hajj").length },
  ]), [baseFilteredPrograms, programSummaryById, programTypeLabels]);

  const selectedProgramTypeOption = React.useMemo(
    () => programTypeOptions.find((option) => option.key === programTypeFilter) || programTypeOptions[0],
    [programTypeOptions, programTypeFilter]
  );

  const typeFilteredPrograms = React.useMemo(() => {
    if (programTypeFilter === "all") return baseFilteredPrograms;
    return baseFilteredPrograms.filter((program) => (
      programSummaryById.get(String(program.id))?.typeKind === programTypeFilter
    ));
  }, [baseFilteredPrograms, programSummaryById, programTypeFilter]);

  const getProgramStatusOptionCount = React.useCallback((key, fallbackCount) => (
    serverProgramPageReady && key === programStatusFilter
      ? serverProgramPageData.totalCount
      : fallbackCount
  ), [programStatusFilter, serverProgramPageData, serverProgramPageReady]);

  const programStatusOptions = React.useMemo(() => ([
    { key: "all", label: programStatusLabels.all, count: getProgramStatusOptionCount("all", typeFilteredPrograms.length) },
    {
      key: "cleared",
      label: programStatusLabels.cleared,
      count: getProgramStatusOptionCount("cleared", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isCleared).length),
    },
    {
      key: "not_cleared",
      label: programStatusLabels.not_cleared,
      count: getProgramStatusOptionCount("not_cleared", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isNotCleared).length),
    },
    {
      key: "full",
      label: programStatusLabels.full,
      count: getProgramStatusOptionCount("full", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isFull).length),
    },
    {
      key: "not_full",
      label: programStatusLabels.not_full,
      count: getProgramStatusOptionCount("not_full", typeFilteredPrograms.filter((program) => programSummaryById.get(String(program.id))?.isNotFull).length),
    },
  ]), [getProgramStatusOptionCount, programStatusLabels, programSummaryById, typeFilteredPrograms]);

  const selectedProgramStatusOption = React.useMemo(
    () => programStatusOptions.find((option) => option.key === programStatusFilter) || programStatusOptions[0],
    [programStatusOptions, programStatusFilter]
  );

  const filteredPrograms = React.useMemo(() => {
    if (programStatusFilter === "all") return typeFilteredPrograms;
    if (programStatusFilter === "cleared" || programStatusFilter === "not_cleared") {
      return typeFilteredPrograms.filter((program) => (
        programSummaryById.get(String(program.id))?.paymentStatus === programStatusFilter
      ));
    }
    return typeFilteredPrograms.filter((program) => (
      programSummaryById.get(String(program.id))?.capacityStatus === programStatusFilter
    ));
  }, [programStatusFilter, programSummaryById, typeFilteredPrograms]);

  const totalProgramsCount = serverProgramPageReady
    ? serverProgramPageData.totalCount
    : filteredPrograms.length;
  const totalProgramsPages = Math.max(1, Math.ceil(totalProgramsCount / programsPageSize));
  const safeProgramsPage = Math.min(Math.max(1, programsCurrentPage), totalProgramsPages);
  const visiblePrograms = React.useMemo(() => {
    if (serverProgramPageReady) return serverVisiblePrograms;
    const start = (safeProgramsPage - 1) * programsPageSize;
    return filteredPrograms.slice(start, start + programsPageSize);
  }, [filteredPrograms, programsPageSize, safeProgramsPage, serverProgramPageReady, serverVisiblePrograms]);

  const visibleHajjProgramIds = React.useMemo(() => (
    visiblePrograms
      .filter((program) => getProgramKind(program) === "hajj")
      .map((program) => String(program.id || ""))
      .filter(Boolean)
  ), [visiblePrograms]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled || !store.agencyId || !visibleHajjProgramIds.length) return undefined;
    let cancelled = false;
    db.programTravelGroups.fetchCountsForPrograms(store.agencyId, visibleHajjProgramIds)
      .then((result) => {
        if (cancelled) return;
        if (result?.error || !result?.data) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[ProgramsPage] Travel-group counts could not be loaded.", result?.error);
          }
          return;
        }
        setRemoteTravelGroupCountsByProgramId((current) => ({
          ...current,
          ...result.data,
        }));
      })
      .catch((error) => {
        if (!cancelled && process.env.NODE_ENV === "development") {
          console.warn("[ProgramsPage] Travel-group counts could not be loaded.", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    store.agencyId,
    store.isSupabaseEnabled,
    travelGroupCountsRefreshKey,
    visibleHajjProgramIds,
  ]);

  const localTravelGroupCountsByProgramId = React.useMemo(() => (
    (store.programTravelGroups || []).reduce((counts, group) => {
      const programId = String(group.programId || group.program_id || "");
      if (programId) counts[programId] = (counts[programId] || 0) + 1;
      return counts;
    }, {})
  ), [store.programTravelGroups]);

  const travelGroupCountsByProgramId = store.isSupabaseEnabled
    ? { ...localTravelGroupCountsByProgramId, ...remoteTravelGroupCountsByProgramId }
    : localTravelGroupCountsByProgramId;

  const visibleProgramIds = React.useMemo(() => (
    new Set(visiblePrograms.map((program) => String(program.id)))
  ), [visiblePrograms]);

  const selectedVisiblePrograms = React.useMemo(() => (
    visiblePrograms.filter((program) => selectedProgramIds.has(String(program.id)))
  ), [selectedProgramIds, visiblePrograms]);

  const selectedProgramsCount = selectedVisiblePrograms.length;
  const allVisibleProgramsSelected = visiblePrograms.length > 0 && selectedProgramsCount === visiblePrograms.length;
  const pageSizeSuffix = t.programPageSizeCompactLabel;
  const yearControlParts = selectedYear === "all"
    ? { label: selectedYearOption?.label, value: "" }
    : { label: yearLabel, value: selectedYearOption?.label };
  const programSearchExpanded = programSearchOpen || search.trim().length > 0;

  const clearProgramSelection = React.useCallback(() => {
    setSelectedProgramIds(new Set());
  }, []);

  const enterProgramSelectionMode = React.useCallback(() => {
    setProgramSelectionMode(true);
  }, []);

  const exitProgramSelectionMode = React.useCallback(() => {
    setProgramSelectionMode(false);
    clearProgramSelection();
  }, [clearProgramSelection]);

  const openProgramSearch = React.useCallback(() => {
    setProgramSearchOpen(true);
  }, []);

  const focusProgramSearch = React.useCallback(() => {
    setProgramSearchOpen(true);
    requestAnimationFrame(() => programSearchInputRef.current?.focus());
  }, []);

  const closeProgramSearchIfEmpty = React.useCallback(() => {
    if (!search.trim()) setProgramSearchOpen(false);
  }, [search]);

  const clearProgramSearch = React.useCallback(() => {
    setSearch("");
    requestAnimationFrame(() => programSearchInputRef.current?.focus());
  }, []);

  React.useEffect(() => {
    const targetId = notificationFocus?.targetId;
    if (!targetId) return undefined;
    const program = activePrograms.find((item) => String(item.id) === String(targetId));
    if (!program) {
      if (onToast) {
        const message = lang === "fr"
          ? "Le programme lié est indisponible."
          : lang === "en"
            ? "The linked program is unavailable."
            : "البرنامج المرتبط غير متاح.";
        onToast(message, "info");
      }
      return undefined;
    }
    setSearch("");
    setProgramTypeFilter("all");
    setProgramStatusFilter("all");
    exitProgramSelectionMode();
    const departureYear = getProgramDepartureYear(program);
    setSelectedYear(
      departureYear === currentYear || departureYear === nextYear
        ? String(departureYear)
        : "all"
    );
    setActiveProgram(null);
    setHighlightProgramId(String(targetId));
    const timer = window.setTimeout(() => {
      setHighlightProgramId((current) => current === String(targetId) ? "" : current);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [notificationFocus?.targetId, notificationFocus?.token, activePrograms, onToast, lang, currentYear, nextYear, exitProgramSelectionMode]);

  React.useEffect(() => {
    if (!highlightProgramId) return undefined;
    const timer = window.setTimeout(() => {
      const node = programCardRefs.current.get(String(highlightProgramId));
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [highlightProgramId, filteredPrograms]);

  const openProgramDetail = React.useCallback((programId) => {
    setActiveProgram(programId);
    if (typeof window === "undefined") return;
    const nextState = {
      ...(window.history.state || {}),
      page: "programs",
      programId,
    };
    window.history.pushState(nextState, "", window.location.href);
  }, []);

  const closeProgramDetail = React.useCallback((useHistory = true) => {
    if (!activeProgram) return;
    if (
      useHistory
      && typeof window !== "undefined"
      && window.history.state?.page === "programs"
      && window.history.state?.programId
    ) {
      window.history.back();
      return;
    }
    setActiveProgram(null);
  }, [activeProgram]);

  React.useEffect(() => {
    const syncProgramFromHistory = (state) => {
      if (state?.page !== "programs") return;
      setActiveProgram(state?.programId || null);
    };
    syncProgramFromHistory(typeof window !== "undefined" ? window.history.state : null);
    const handlePopState = (event) => {
      syncProgramFromHistory(event.state);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (!yearMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = yearMenuRef.current;
      const buttonNode = yearButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setYearMenuOpen(false);
      setHoveredYearOption(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [yearMenuOpen]);

  React.useEffect(() => {
    if (!programTypeMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programTypeMenuRef.current;
      const buttonNode = programTypeButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramTypeMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProgramTypeMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programTypeMenuOpen]);

  React.useEffect(() => {
    if (!programStatusMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programStatusMenuRef.current;
      const buttonNode = programStatusButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramStatusMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setProgramStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programStatusMenuOpen]);

  React.useEffect(() => {
    if (!programPageSizeMenuOpen) return;
    const handlePointerDown = (event) => {
      const menuNode = programPageSizeMenuRef.current;
      const buttonNode = programPageSizeButtonRef.current;
      if (menuNode?.contains(event.target) || buttonNode?.contains(event.target)) return;
      setProgramPageSizeMenuOpen(false);
      setHoveredProgramPageSizeOption(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProgramPageSizeMenuOpen(false);
        setHoveredProgramPageSizeOption(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [programPageSizeMenuOpen]);

  React.useEffect(() => {
    setProgramsCurrentPage(1);
  }, [search, selectedYear, programTypeFilter, programStatusFilter, programsPageSize]);

  React.useEffect(() => {
    if (programsCurrentPage > totalProgramsPages) setProgramsCurrentPage(totalProgramsPages);
  }, [programsCurrentPage, totalProgramsPages]);

  React.useEffect(() => {
    setSelectedProgramIds((current) => {
      let changed = false;
      const next = new Set();
      current.forEach((id) => {
        if (visibleProgramIds.has(String(id))) next.add(String(id));
        else changed = true;
      });
      return changed ? next : current;
    });
  }, [visibleProgramIds]);

  React.useEffect(() => {
    if (!highlightProgramId) return;
    const index = filteredPrograms.findIndex((program) => String(program.id) === String(highlightProgramId));
    if (index < 0) return;
    const targetPage = Math.floor(index / programsPageSize) + 1;
    setProgramsCurrentPage(targetPage);
  }, [filteredPrograms, highlightProgramId, programsPageSize]);

  const handleConfirmDeleteProgram = React.useCallback(() => {
    if (!deletePrompt) return;
    deleteProgram(deletePrompt.program.id);
    if (activeProgram === deletePrompt.program.id) setActiveProgram(null);
    setDeletePrompt(null);
    onToast(t.deleteSuccess, "info");
  }, [deletePrompt, deleteProgram, activeProgram, setActiveProgram, onToast, t.deleteSuccess]);
  const handleConfirmArchiveProgram = React.useCallback(async () => {
    if (!archivePrompt?.program) return;
    const result = await archiveProgramRecord?.(archivePrompt.program.id);
    if (result?.error) return;
    setArchivePrompt(null);
    onToast(t.programArchiveSuccess, "success");
  }, [archivePrompt, archiveProgramRecord, onToast, t.programArchiveSuccess]);

  const toggleProgramSelection = React.useCallback((programId, checked) => {
    setSelectedProgramIds((current) => {
      const next = new Set(current);
      const id = String(programId);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectVisiblePrograms = React.useCallback((checked) => {
    setSelectedProgramIds((current) => {
      const next = new Set(current);
      visiblePrograms.forEach((program) => {
        const id = String(program.id);
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, [visiblePrograms]);

  const handleBulkArchivePrograms = React.useCallback(async () => {
    if (!selectedVisiblePrograms.length) return;
    if (!window.confirm(t.programBulkArchiveConfirm)) return;
    const results = await Promise.all(selectedVisiblePrograms.map((program) => (
      archiveProgramRecord?.(program.id)
    )));
    const failedCount = results.filter((result) => result?.error).length;
    if (failedCount) {
      onToast?.(tr("programBulkArchivePartial", { count: selectedVisiblePrograms.length - failedCount }), "warning");
      return;
    }
    exitProgramSelectionMode();
    onToast?.(tr("programBulkArchiveSuccess", { count: selectedVisiblePrograms.length }), "success");
  }, [archiveProgramRecord, exitProgramSelectionMode, onToast, selectedVisiblePrograms, t.programBulkArchiveConfirm, tr]);

  const openBulkTrashProgramsPrompt = React.useCallback(() => {
    if (!selectedVisiblePrograms.length) return;
    setBulkTrashPrompt({ programs: selectedVisiblePrograms });
  }, [selectedVisiblePrograms]);

  const handleConfirmBulkTrashPrograms = React.useCallback(async () => {
    const programsToTrash = bulkTrashPrompt?.programs || [];
    if (!programsToTrash.length) return;
    const results = await Promise.all(programsToTrash.map((program) => (
      trashProgramRecord?.(program.id)
    )));
    const failedCount = results.filter((result) => result?.error).length;
    if (failedCount) {
      onToast?.(tr("programBulkTrashPartial", { count: programsToTrash.length - failedCount }), "warning");
      return;
    }
    setBulkTrashPrompt(null);
    exitProgramSelectionMode();
    onToast?.(tr("programBulkTrashSuccess", { count: programsToTrash.length }), "success");
  }, [bulkTrashPrompt, exitProgramSelectionMode, onToast, trashProgramRecord, tr]);
  const openBulkPosterModal = React.useCallback(() => {
    setShowBulkPosterModal(true);
  }, []);
  const closeBulkPosterModal = React.useCallback(() => {
    setShowBulkPosterModal(false);
  }, []);
  const resetBulkPosterTemplateChoice = React.useCallback(() => {
    setBulkPosterTemplateChoice(null);
    setBulkPosterTemplateChoiceId("");
    setPendingBulkPosterPayload(null);
    setBulkPosterTitleOverride("");
    setBulkPosterShowDates(true);
  }, []);
  const closeBulkPosterTemplateChoice = React.useCallback(() => {
    if (bulkPosterExportBusy) return;
    resetBulkPosterTemplateChoice();
  }, [bulkPosterExportBusy, resetBulkPosterTemplateChoice]);
  const getBulkPosterOptions = React.useCallback(() => {
    if (!pendingBulkPosterPayload?.referenceProgram) return null;
    const referenceProgram = pendingBulkPosterPayload.referenceProgram;
    const titleOverride = String(bulkPosterTitleOverride || "").trim()
      || getDefaultPosterTitle(referenceProgram, lang);

    return {
      isBulkPoster: true,
      referenceProgramId: pendingBulkPosterPayload.referenceProgramId,
      referenceProgram,
      selectedProgramIds: pendingBulkPosterPayload.selectedProgramIds,
      selectedPrograms: pendingBulkPosterPayload.selectedPrograms,
      titleOverride,
      showDates: bulkPosterShowDates !== false,
    };
  }, [bulkPosterShowDates, bulkPosterTitleOverride, lang, pendingBulkPosterPayload]);
  const generateBulkPosterFromTemplate = React.useCallback(async (template) => {
    const posterOptions = getBulkPosterOptions();
    const referenceProgram = posterOptions?.referenceProgram;
    if (!template || !referenceProgram) return;

    const imageUrl = await getPosterTemplateImageUrl(template);
    if (!imageUrl) throw new Error("missing-template-image");
    const blob = await generateProgramPosterPng({
      template,
      imageUrl,
      program: referenceProgram,
      lang,
      posterOptions,
    });
    downloadPosterBlob(
      blob,
      buildProgramPosterFilename({ ...referenceProgram, name: posterOptions.titleOverride || referenceProgram.name }, lang)
    );
  }, [getBulkPosterOptions, lang]);
  const generateBulkCodePoster = React.useCallback(async (
    templateKey = OFFICIAL_RUKN_CODE_TEMPLATE_KEY,
    explicitPosterOptions = null
  ) => {
    const posterOptions = explicitPosterOptions || getBulkPosterOptions();
    const referenceProgram = posterOptions?.referenceProgram;
    if (!referenceProgram) return;

    const codeTemplate = await loadCodePosterTemplate(templateKey, { program: referenceProgram });
    if (!codeTemplate?.renderPoster) throw new Error("missing-code-poster-template");
    const blob = await codeTemplate.renderPoster({
      program: referenceProgram,
      agency: store.agency,
      locale: lang,
      posterOptions,
    });
    downloadPosterBlob(
      blob,
      buildProgramPosterFilename({ ...referenceProgram, name: posterOptions.titleOverride || referenceProgram.name }, lang)
    );
  }, [getBulkPosterOptions, lang, store.agency]);
  const handleBulkPosterDownloadRequest = React.useCallback(async (payload) => {
    if (bulkPosterExportBusy) return;
    const referenceProgram = payload?.referenceProgram || payload?.selectedPrograms?.[0] || null;
    const selectedPrograms = Array.isArray(payload?.selectedPrograms)
      ? payload.selectedPrograms.filter(Boolean)
      : [];
    if (!referenceProgram || selectedPrograms.length === 0) return;

    const selectedProgramIdsList = Array.isArray(payload?.selectedProgramIds) && payload.selectedProgramIds.length
      ? payload.selectedProgramIds.map((programId) => String(programId))
      : selectedPrograms.map((program) => String(program.id || "")).filter(Boolean);
    const titleOverride = String(payload?.titleOverride || payload?.posterOptions?.titleOverride || "").trim()
      || getDefaultPosterTitle(referenceProgram, lang);
    const nextPayload = {
      isBulkPoster: true,
      referenceProgramId: String(payload?.referenceProgramId || referenceProgram.id || ""),
      referenceProgram,
      selectedProgramIds: selectedProgramIdsList,
      selectedPrograms,
      titleOverride,
      showDates: payload?.showDates !== false,
    };
    const defaultTemplate = resolveDefaultPosterTemplate({
      agency: store.agency,
      availableCodeTemplates: bulkAssignedCodePosterTemplates,
    });

    setPendingBulkPosterPayload(nextPayload);
    setBulkPosterTitleOverride(titleOverride);
    setBulkPosterShowDates(nextPayload.showDates);
    setShowBulkPosterModal(false);

    setBulkPosterExportBusy(true);
    try {
      await generateBulkCodePoster(defaultTemplate.key, nextPayload);
      resetBulkPosterTemplateChoice();
      onToast?.(bulkPosterExportLabels.success, "success");
    } catch (error) {
      console.error("[BulkProgramPoster] Default poster generation failed:", error);
      onToast?.(bulkPosterExportLabels.error, "error");
    } finally {
      setBulkPosterExportBusy(false);
    }
  }, [
    bulkAssignedCodePosterTemplates,
    bulkPosterExportBusy,
    bulkPosterExportLabels.error,
    bulkPosterExportLabels.success,
    generateBulkCodePoster,
    lang,
    onToast,
    resetBulkPosterTemplateChoice,
    store.agency,
  ]);
  const handleBulkPosterTemplateChoiceDownload = React.useCallback(async () => {
    if (!pendingBulkPosterPayload || bulkPosterExportBusy) return;

    setBulkPosterExportBusy(true);
    try {
      if (bulkPosterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID) {
        await generateBulkCodePoster(OFFICIAL_RUKN_CODE_TEMPLATE_KEY);
      } else {
        const selectedCodeTemplate = bulkPosterTemplateChoice?.codeTemplates?.find((template) => (
          template.key === bulkPosterTemplateChoiceId
        ));
        if (selectedCodeTemplate) {
          await generateBulkCodePoster(selectedCodeTemplate.key);
        } else {
          const selectedTemplate = bulkPosterTemplateChoice?.templates?.find((template) => (
            template.id === bulkPosterTemplateChoiceId
          )) || bulkPosterTemplateChoice?.templates?.[0];
          await generateBulkPosterFromTemplate(selectedTemplate);
        }
      }
      resetBulkPosterTemplateChoice();
      onToast?.(bulkPosterExportLabels.success, "success");
    } catch (error) {
      console.error("[BulkProgramPoster] Poster generation failed:", error);
      onToast?.(
        error?.message === "missing-template-image"
          ? bulkPosterExportLabels.missingImage
          : bulkPosterExportLabels.error,
        "error"
      );
    } finally {
      setBulkPosterExportBusy(false);
    }
  }, [
    bulkPosterExportBusy,
    bulkPosterExportLabels.error,
    bulkPosterExportLabels.missingImage,
    bulkPosterExportLabels.success,
    bulkPosterTemplateChoice,
    bulkPosterTemplateChoiceId,
    generateBulkCodePoster,
    generateBulkPosterFromTemplate,
    onToast,
    pendingBulkPosterPayload,
    resetBulkPosterTemplateChoice,
  ]);
  const openDuplicatePrompt = React.useCallback((program) => {
    if (!program || program.deleted || program.deletedAt || program.status === "archived") return;
    setDuplicatePrompt({
      program,
      name: buildDuplicateProgramName(program, programs, lang),
      error: "",
    });
  }, [programs, lang]);
  const closeDuplicatePrompt = React.useCallback(() => {
    setDuplicatePrompt(null);
  }, []);
  const handleDuplicateNameChange = React.useCallback((event) => {
    const value = event.target.value;
    setDuplicatePrompt((current) => current ? { ...current, name: value, error: "" } : current);
  }, []);
  const handleConfirmDuplicateProgram = React.useCallback(() => {
    if (!duplicatePrompt?.program) return;
    const cleanName = normalizeDuplicateProgramName(duplicatePrompt.name);
    if (!cleanName) {
      setDuplicatePrompt((current) => current ? {
        ...current,
        error: t.programDuplicateNameRequired || (lang === "fr" ? "Le nom du programme est obligatoire." : lang === "en" ? "Program name is required." : "اسم البرنامج مطلوب."),
      } : current);
      return;
    }
    if (!isDuplicateProgramNameAvailable(cleanName, programs)) {
      setDuplicatePrompt((current) => current ? {
        ...current,
        error: t.programDuplicateNameExists || (lang === "fr" ? "Un programme porte déjà ce nom." : lang === "en" ? "A program with this name already exists." : "يوجد برنامج بنفس الاسم."),
      } : current);
      return;
    }
    addProgram(createDuplicateProgramPayload(duplicatePrompt.program, cleanName));
    setDuplicatePrompt(null);
    onToast?.(t.programDuplicateSuccess || (lang === "fr" ? "Programme dupliqué" : lang === "en" ? "Program duplicated" : "تم إنشاء نسخة من البرنامج"), "success");
  }, [addProgram, duplicatePrompt, lang, onToast, programs, t.programDuplicateNameExists, t.programDuplicateNameRequired, t.programDuplicateSuccess]);
  const closeProgramForm = React.useCallback(() => {
    setShowForm(false);
    setEditing(null);
    setEditingProgramClients(null);
    setTravelGroupCountsRefreshKey((key) => key + 1);
  }, []);
  const handleProgramFormSaved = React.useCallback(() => {
    const wasEditing = Boolean(editing);
    closeProgramForm();
    onToast(wasEditing ? t.updateSuccess : t.addSuccess, "success");
  }, [closeProgramForm, editing, onToast, t.addSuccess, t.updateSuccess]);
  const handleProgramCardRef = React.useCallback((programId, node) => {
    if (node) programCardRefs.current.set(String(programId), node);
    else programCardRefs.current.delete(String(programId));
  }, []);
  const handleProgramCardEdit = React.useCallback((program) => {
    setEditing(program);
    setEditingProgramClients(clientsReady
      ? clients.filter((client) => String(client.programId || "") === String(program.id))
      : null);
  }, [clients, clientsReady]);
  const handleProgramCardArchive = React.useCallback((program) => {
    setArchivePrompt({ program });
  }, []);
  const handleProgramCardDelete = React.useCallback((program, programClients) => {
    setDeletePrompt({ program, clients: programClients });
  }, []);

  const enableProgramForNusukUploadAndOpen = React.useCallback(async (program) => {
    const programId = String(program?.id || "");
    if (!programId) return { error: new Error("missing-program-id") };
    if (nusukOpenInFlightProgramIdsRef.current.has(programId)) {
      return { error: null, skipped: true };
    }

    nusukOpenInFlightProgramIdsRef.current.add(programId);
    try {
      const result = typeof setProgramNusukUploadEnabled === "function"
        ? await setProgramNusukUploadEnabled(programId, true)
        : await updateProgram(programId, {
          nusukUploadEnabled: true,
          nusuk_upload_enabled: true,
        });

      if (result?.error) {
        if (typeof setProgramNusukUploadEnabled === "function") {
          await setProgramNusukUploadEnabled(programId, false);
        } else {
          updateProgram(programId, {
            nusukUploadEnabled: false,
            nusuk_upload_enabled: false,
          });
        }
        onToast("تعذر تفعيل البرنامج لنسك", "error");
        return result;
      }

      onToast("تم تفعيل البرنامج لنسك", "success");

      if (isNusukAssistantReady()) {
        const assistantOpenResult = await openNusukWithAssistant(programId);
        if (assistantOpenResult?.status === "accepted") {
          return result || { error: null };
        }
        if (assistantOpenResult?.status === "rejected") {
          onToast(
            assistantOpenResult.message || "توجد عملية رفع جارية. أكملها أو أوقفها قبل فتح برنامج آخر.",
            "warning"
          );
          return result || { error: null };
        }
      }

      openNusukUploadUrl(programId);
      return result || { error: null };
    } finally {
      nusukOpenInFlightProgramIdsRef.current.delete(programId);
    }
  }, [onToast, setProgramNusukUploadEnabled, updateProgram]);

  const handleCloseNusukAssistantInstallModal = React.useCallback(() => {
    setIsNusukAssistantInstallOpen(false);
    setPendingNusukUploadProgram(null);
  }, []);

  const handleInstallNusukAssistant = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.open(getNusukAssistantInstallUrl(), "_blank", "noopener,noreferrer");
  }, []);

  const handleProgramCardNusukUploadToggle = React.useCallback(async (program) => {
    const canUseNusukUpload = canUseNusukUploadForProgram(program, { debug: true });
    if (!canUseNusukUpload) return;
    if (!program?.id) return;
    const currentEnabled = isProgramNusukUploadEnabled(program);

    if (currentEnabled) {
      const result = typeof setProgramNusukUploadEnabled === "function"
        ? await setProgramNusukUploadEnabled(program.id, false)
        : await updateProgram(program.id, {
          nusukUploadEnabled: false,
          nusuk_upload_enabled: false,
        });
      if (result?.error) {
        onToast("تعذر إيقاف رفع البرنامج لنسك", "error");
        return;
      }
      onToast("تم إيقاف رفع البرنامج لنسك", "info");
      return;
    }

    let assistantReady = isNusukAssistantReady();
    if (!assistantReady) {
      if (nusukAssistantCheckInFlightRef.current) return;
      nusukAssistantCheckInFlightRef.current = true;
      try {
        assistantReady = await checkNusukAssistant();
      } catch {
        assistantReady = false;
      } finally {
        nusukAssistantCheckInFlightRef.current = false;
      }
    }

    if (!assistantReady) {
      setPendingNusukUploadProgram(program);
      setIsNusukAssistantInstallOpen(true);
      return;
    }

    const settingsResult = await ensureAgencyNusukSettings?.();
    if (settingsResult?.error) {
      console.error("[Nusuk] Unable to load agency settings:", settingsResult.error);
      onToast("تعذر تحميل إعدادات نسك", "error");
      return;
    }

    if (!hasCompleteNusukContactSettings(settingsResult?.data)) {
      setNusukSettingsPrompt({ program });
      return;
    }

    await enableProgramForNusukUploadAndOpen(program);
  }, [canUseNusukUploadForProgram, enableProgramForNusukUploadAndOpen, ensureAgencyNusukSettings, onToast, setProgramNusukUploadEnabled, updateProgram]);

  const handleCancelNusukSettingsPrompt = React.useCallback(() => {
    if (nusukSettingsSaving) return;
    setNusukSettingsPrompt(null);
  }, [nusukSettingsSaving]);

  const handleSaveNusukSettingsAndContinue = React.useCallback(async (settings) => {
    const program = nusukSettingsPrompt?.program;
    if (!canUseNusukUploadForProgram(program, { debug: true })) return { error: new Error("nusuk-upload-disabled") };
    if (!program?.id) return { error: new Error("missing-program-id") };

    setNusukSettingsSaving(true);
    try {
      if (typeof saveAgencyNusukSettings !== "function") {
        throw new Error("nusuk-settings-save-unavailable");
      }
      const settingsResult = await saveAgencyNusukSettings(settings);
      if (settingsResult?.error) throw settingsResult.error;
      const enableResult = await enableProgramForNusukUploadAndOpen(program);
      if (enableResult?.error) return enableResult;
      setNusukSettingsPrompt(null);
      return { data: settingsResult?.data || null, error: null };
    } catch (error) {
      console.error("[Nusuk] Unable to save agency settings:", error);
      onToast("تعذر حفظ إعدادات نسك", "error");
      return { error };
    } finally {
      setNusukSettingsSaving(false);
    }
  }, [canUseNusukUploadForProgram, enableProgramForNusukUploadAndOpen, nusukSettingsPrompt, onToast, saveAgencyNusukSettings]);
  const goToPreviousProgramsPage = React.useCallback(() => {
    setProgramsCurrentPage((page) => Math.max(1, page - 1));
  }, []);
  const goToNextProgramsPage = React.useCallback(() => {
    setProgramsCurrentPage((page) => Math.min(totalProgramsPages, page + 1));
  }, [totalProgramsPages]);

  const nusukAssistantInstallModal = (
    <NusukAssistantInstallModal
      isOpen={isNusukAssistantInstallOpen && Boolean(pendingNusukUploadProgram)}
      onClose={handleCloseNusukAssistantInstallModal}
      onInstall={handleInstallNusukAssistant}
    />
  );

  if (activeProgram) {
    const prog = programs.find(p => p.id === activeProgram);
    if (!prog) { setActiveProgram(null); return null; }
    return (
      <>
        <ProgramInner
          program={prog} store={store} onToast={onToast}
          externalRefreshKey={programDetailRefreshKey}
          programSummaryById={programSummaryById}
          badgesEnabled={badgesEnabled}
          contractsEnabled={contractsEnabled}
          programPostersEnabled={programPostersEnabled}
          agencyNusukUploadFeatureEnabled={agencyNusukUploadFeatureEnabled}
          onBack={() => closeProgramDetail(true)}
          onEditProgram={(programClients) => {
            setEditing(prog);
            setEditingProgramClients(programClients);
          }}
          onToggleProgramNusukUpload={handleProgramCardNusukUploadToggle}
        />
        <ProgramEditorModal
          open={!!editing}
          program={editing}
          store={store}
          title={t.editProgramTitle}
          badgesEnabled={badgesEnabled}
          onSaved={handleProgramFormSaved}
          onClose={closeProgramForm}
          programClients={editingProgramClients}
          onTravelGroupsChanged={() => {
            setTravelGroupCountsRefreshKey((key) => key + 1);
            setProgramDetailRefreshKey((key) => key + 1);
          }}
        />
        <NusukSettingsModal
          open={Boolean(nusukSettingsPrompt)}
          initialSettings={store.agencyNusukSettings}
          saving={nusukSettingsSaving}
          onCancel={handleCancelNusukSettingsPrompt}
          onSave={handleSaveNusukSettingsAndContinue}
        />
        {nusukAssistantInstallModal}
      </>
    );
  }

  return (
    <div className="page-body programs-page" style={{ padding:"28px 32px" }}>
      <div className="page-header" style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:tc.white }}>{t.availablePrograms}</h1>
            <p style={{ fontSize:13, color:tc.grey, marginTop:4 }}>
              {tr("programsSubtitle", { count: activePrograms.length })}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <Button
              variant="secondary"
              icon={<LayoutGrid size={15} />}
              onClick={openBulkPosterModal}
              style={{
                background:"rgba(212,175,55,.07)",
                border:"1px solid rgba(212,175,55,.28)",
                boxShadow:"none",
              }}
            >
              {t.bulkPosterCreate}
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>{t.addProgram}</Button>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", direction:dir }}>
          <div
            onMouseEnter={openProgramSearch}
            onMouseLeave={() => {
              if (document.activeElement !== programSearchInputRef.current) closeProgramSearchIfEmpty();
            }}
            style={{
              order:4,
              width:programSearchExpanded ? 286 : 42,
              height:42,
              maxWidth:"100%",
              display:"flex",
              alignItems:"center",
              gap:6,
              borderRadius:12,
              background:"var(--rukn-bg-input)",
              border:`1px solid ${programSearchExpanded ? "rgba(212,175,55,.32)" : "var(--rukn-border)"}`,
              padding:programSearchExpanded ? "0 9px" : 0,
              overflow:"hidden",
              opacity:activePrograms.length ? 1 : .55,
              transition:"width .22s ease, border-color .22s ease, padding .22s ease, box-shadow .22s ease",
              boxShadow:programSearchExpanded ? "0 10px 26px rgba(15,23,42,.08)" : "none",
              direction:dir,
            }}
          >
            <button
              type="button"
              aria-label={searchPlaceholder}
              disabled={!activePrograms.length}
              onClick={focusProgramSearch}
              onFocus={openProgramSearch}
              style={{
                width:40,
                height:40,
                flex:"0 0 40px",
                border:0,
                background:"transparent",
                color:tc.gold,
                display:"inline-flex",
                alignItems:"center",
                justifyContent:"center",
                cursor:activePrograms.length ? "pointer" : "not-allowed",
              }}
            >
              <Search size={17} />
            </button>
            {programSearchExpanded && (
              <>
                <input
                  ref={programSearchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={openProgramSearch}
                  onBlur={closeProgramSearchIfEmpty}
                  placeholder={searchPlaceholder}
                  disabled={!activePrograms.length}
                  style={{
                    flex:1,
                    minWidth:0,
                    border:0,
                    outline:0,
                    background:"transparent",
                    color:"var(--rukn-text)",
                    fontSize:13,
                    fontFamily:"'Cairo',sans-serif",
                    direction:dir,
                  }}
                />
                {search.trim() && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearProgramSearch}
                    style={{
                      width:24,
                      height:24,
                      border:0,
                      borderRadius:8,
                      background:"var(--rukn-bg-soft)",
                      display:"inline-flex",
                      alignItems:"center",
                      justifyContent:"center",
                      cursor:"pointer",
                    }}
                    aria-label={t.clear || "Clear"}
                  >
                    <AppIcon name="x" size={13} color="var(--rukn-text-muted)" />
                  </button>
                )}
              </>
            )}
          </div>
          <div style={{ order:2, position:"relative", flex:"0 0 150px", minWidth:138, maxWidth:170 }}>
            <button
              ref={programTypeButtonRef}
              type="button"
              aria-label={t.programType || (lang === "fr" ? "Type de programme" : lang === "en" ? "Program type" : "نوع البرنامج")}
              aria-haspopup="listbox"
              aria-expanded={programTypeMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setProgramTypeMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                background:programTypeFilter === "all" ? "var(--rukn-bg-input)" : "var(--rukn-gold-dim)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding:"0 12px",
                color:programTypeFilter === "all" ? "var(--rukn-text)" : "var(--rukn-gold)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                opacity:activePrograms.length ? 1 : 0.55,
                cursor:activePrograms.length ? "pointer" : "not-allowed",
                transition:"border-color .2s, box-shadow .2s, background .2s",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <Filter size={14} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selectedProgramTypeOption?.label}
                  <span style={{ color:"var(--rukn-text-muted)", fontWeight:700 }}> ({selectedProgramTypeOption?.count ?? 0})</span>
                </span>
              </span>
              <ChevronDown
                size={15}
                style={{ flexShrink:0, transform:programTypeMenuOpen ? "rotate(180deg)" : "none", transition:"transform .18s ease" }}
              />
            </button>
            {programTypeMenuOpen && (
              <div
                ref={programTypeMenuRef}
                role="listbox"
                aria-label={t.programType || (lang === "fr" ? "Type de programme" : lang === "en" ? "Program type" : "نوع البرنامج")}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  minWidth:180,
                  zIndex:35,
                  padding:6,
                  borderRadius:14,
                  border:"1px solid var(--rukn-border-soft)",
                  background:"var(--rukn-bg-select)",
                  boxShadow:"var(--rukn-shadow-card)",
                  backdropFilter:"blur(12px)",
                }}
              >
                {programTypeOptions.map((option) => {
                  const active = option.key === programTypeFilter;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setProgramTypeFilter(option.key);
                        setProgramTypeMenuOpen(false);
                      }}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:10,
                        border:0,
                        borderRadius:10,
                        padding:"9px 10px",
                        background:active ? "var(--rukn-gold-dim)" : "transparent",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                        fontSize:12,
                        fontWeight:active ? 900 : 700,
                        fontFamily:"'Cairo',sans-serif",
                        cursor:"pointer",
                        textAlign:"start",
                      }}
                    >
                      <span>{option.label}</span>
                      <span style={{
                        minWidth:22,
                        height:20,
                        borderRadius:999,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        padding:"0 7px",
                        background:active ? "rgba(212,175,55,.16)" : "var(--rukn-bg-soft)",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                        fontSize:10,
                        fontWeight:900,
                      }}>
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ order:3, position:"relative", flex:"0 0 174px", minWidth:154, maxWidth:198 }}>
            <button
              ref={programStatusButtonRef}
              type="button"
              aria-label={t.programStatusFilter}
              aria-haspopup="listbox"
              aria-expanded={programStatusMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setProgramStatusMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
                background:programStatusFilter === "all" ? "var(--rukn-bg-input)" : "var(--rukn-gold-dim)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding:"0 12px",
                color:programStatusFilter === "all" ? "var(--rukn-text)" : "var(--rukn-gold)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction:dir,
                opacity:activePrograms.length ? 1 : 0.55,
                cursor:activePrograms.length ? "pointer" : "not-allowed",
                transition:"border-color .2s, box-shadow .2s, background .2s",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"center", gap:7, minWidth:0 }}>
                <Filter size={14} />
                <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selectedProgramStatusOption?.label}
                  <span style={{ color:"var(--rukn-text-muted)", fontWeight:700 }}> ({selectedProgramStatusOption?.count ?? 0})</span>
                </span>
              </span>
              <ChevronDown
                size={15}
                style={{ flexShrink:0, transform:programStatusMenuOpen ? "rotate(180deg)" : "none", transition:"transform .18s ease" }}
              />
            </button>
            {programStatusMenuOpen && (
              <div
                ref={programStatusMenuRef}
                role="listbox"
                aria-label={t.programStatusFilter}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  minWidth:190,
                  zIndex:35,
                  padding:6,
                  borderRadius:14,
                  border:"1px solid var(--rukn-border-soft)",
                  background:"var(--rukn-bg-select)",
                  boxShadow:"var(--rukn-shadow-card)",
                  backdropFilter:"blur(12px)",
                }}
              >
                {programStatusOptions.map((option) => {
                  const active = option.key === programStatusFilter;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setProgramStatusFilter(option.key);
                        setProgramStatusMenuOpen(false);
                      }}
                      style={{
                        width:"100%",
                        display:"flex",
                        alignItems:"center",
                        justifyContent:"space-between",
                        gap:10,
                        border:0,
                        borderRadius:10,
                        padding:"9px 10px",
                        background:active ? "var(--rukn-gold-dim)" : "transparent",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                        fontSize:12,
                        fontWeight:active ? 900 : 700,
                        fontFamily:"'Cairo',sans-serif",
                        cursor:"pointer",
                        textAlign:"start",
                      }}
                    >
                      <span>{option.label}</span>
                      <span style={{
                        minWidth:22,
                        height:20,
                        borderRadius:999,
                        display:"inline-flex",
                        alignItems:"center",
                        justifyContent:"center",
                        padding:"0 7px",
                        background:active ? "rgba(212,175,55,.16)" : "var(--rukn-bg-soft)",
                        color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
                        fontSize:10,
                        fontWeight:900,
                      }}>
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ order:1, position:"relative", flex:"0 0 138px", minWidth:126, maxWidth:156 }}>
            <button
              ref={yearButtonRef}
              type="button"
              aria-label={yearLabel}
              aria-haspopup="listbox"
              aria-expanded={yearMenuOpen}
              disabled={!activePrograms.length}
              onClick={() => activePrograms.length && setYearMenuOpen((open) => !open)}
              style={{
                width:"100%",
                height:42,
                background:"var(--rukn-bg-input)",
                border:"1px solid var(--rukn-border)",
                borderRadius:12,
                padding: isRTL ? "12px 18px 12px 42px" : "12px 42px 12px 18px",
                color:"var(--rukn-text)",
                fontSize:13,
                fontWeight:800,
                fontFamily:"'Cairo',sans-serif",
                direction: dir,
                outline:"none",
                transition:"border-color .2s, box-shadow .2s",
                opacity: activePrograms.length ? 1 : 0.55,
                cursor: activePrograms.length ? "pointer" : "not-allowed",
                display:"flex",
                alignItems:"center",
                justifyContent:"flex-start",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <span style={{ display:"inline-flex", alignItems:"baseline", gap:6, minWidth:0 }}>
                <span style={{ color:"var(--rukn-text)", fontWeight:700 }}>{yearControlParts.label}</span>
                {yearControlParts.value && (
                  <span style={{ color:"var(--rukn-gold)", fontWeight:900 }}>{yearControlParts.value}</span>
                )}
              </span>
            </button>
            <span style={{
              position:"absolute",
              top:"50%",
              transform:"translateY(-50%) rotate(-90deg)",
              insetInlineEnd:14,
              color:"rgba(212,175,55,.72)",
              fontSize:13,
              fontWeight:700,
              pointerEvents:"none",
              lineHeight:1,
            }}>
              ‹
            </span>
            {yearMenuOpen ? (
              <div
                ref={yearMenuRef}
                role="listbox"
                aria-label={yearLabel}
                style={{
                  position:"absolute",
                  top:"calc(100% + 8px)",
                  insetInlineStart:0,
                  width:"100%",
                  background:"var(--rukn-bg-select)",
                  border:"1px solid var(--rukn-border-soft)",
                  borderRadius:14,
                  boxShadow:"var(--rukn-shadow-card)",
                  overflow:"hidden",
                  zIndex:30,
                  backdropFilter:"blur(12px)",
                }}
              >
                {yearOptions.map((option) => {
                  const active = option.value === selectedYear;
                  const hovered = hoveredYearOption === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHoveredYearOption(option.value)}
                      onMouseLeave={() => setHoveredYearOption((current) => current === option.value ? null : current)}
                      onClick={() => {
                        setSelectedYear(option.value);
                        setYearMenuOpen(false);
                        setHoveredYearOption(null);
                      }}
                      style={{
                        width:"100%",
                        border:"none",
                        background: active
                          ? "var(--rukn-gold-dim)"
                          : hovered
                            ? "var(--rukn-row-hover)"
                            : "transparent",
                        color: active ? "var(--rukn-gold)" : "var(--rukn-text-strong)",
                        padding:"12px 14px",
                        fontSize:14,
                        fontWeight:active ? 700 : 500,
                        fontFamily:"'Cairo',sans-serif",
                        textAlign:isRTL ? "right" : "left",
                        direction:dir,
                        cursor:"pointer",
                        transition:"background-color .16s ease, color .16s ease",
                        borderBottom: option.value !== yearOptions[yearOptions.length - 1].value
                          ? "1px solid var(--rukn-border-soft)"
                          : "none",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {activePrograms.length > 0 && (
            <>
              <div style={{ order:5, display:"flex", flexWrap:"wrap", alignItems:"center", gap:8 }}>
                <Button
                  variant={programSelectionMode ? "warning" : "ghost"}
                  size="sm"
                  icon="checked"
                  disabled={!visiblePrograms.length}
                  onClick={programSelectionMode ? exitProgramSelectionMode : enterProgramSelectionMode}
                >
                  {programSelectionMode ? t.programCancelSelection : t.programSelectPrograms}
                </Button>
                {programSelectionMode && (
                  <label style={{
                    display:"inline-flex",
                    alignItems:"center",
                    gap:8,
                    height:34,
                    padding:"0 10px",
                    border:"1px solid var(--rukn-border-soft)",
                    borderRadius:9,
                    background:"var(--rukn-bg-soft)",
                    color:"var(--rukn-text)",
                    fontSize:12,
                    fontWeight:800,
                    cursor:visiblePrograms.length ? "pointer" : "not-allowed",
                    opacity:visiblePrograms.length ? 1 : .55,
                  }}>
                    <input
                      type="checkbox"
                      checked={allVisibleProgramsSelected}
                      disabled={!visiblePrograms.length}
                      onChange={(event) => toggleSelectVisiblePrograms(event.target.checked)}
                      style={{ width:15, height:15, accentColor:tc.gold, cursor:"pointer" }}
                    />
                    {t.programSelectVisible}
                  </label>
                )}
              </div>
              <div style={{
                order:7,
                position:"relative",
                height:34,
                display:"inline-flex",
                alignItems:"center",
              }}>
                <button
                  ref={programPageSizeButtonRef}
                  type="button"
                  aria-label={pageSizeSuffix}
                  aria-haspopup="listbox"
                  aria-expanded={programPageSizeMenuOpen}
                  onClick={() => setProgramPageSizeMenuOpen((open) => !open)}
                  style={{
                    height:34,
                    display:"inline-flex",
                    alignItems:"center",
                    justifyContent:"space-between",
                    gap:8,
                    border:"1px solid var(--rukn-border-soft)",
                    borderRadius:9,
                    background:"var(--rukn-bg-soft)",
                    padding:"0 10px",
                    color:"var(--rukn-text-muted)",
                    fontSize:12,
                    fontWeight:800,
                    fontFamily:"'Cairo',sans-serif",
                    direction:dir,
                    whiteSpace:"nowrap",
                    cursor:"pointer",
                    transition:"border-color .2s, box-shadow .2s, background .2s",
                  }}
                >
                  <span style={{ display:"inline-flex", alignItems:"baseline", gap:7, minWidth:0 }}>
                    <span>{pageSizeSuffix}</span>
                    <span style={{ color:"var(--rukn-gold)", fontWeight:900, minWidth:18, textAlign:"center" }}>
                      {programsPageSize}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    color="var(--rukn-text-muted)"
                    strokeWidth={2.3}
                    style={{
                      flexShrink:0,
                      transform:programPageSizeMenuOpen ? "rotate(180deg)" : "none",
                      transition:"transform .18s ease",
                    }}
                  />
                </button>
                {programPageSizeMenuOpen && (
                  <div
                    ref={programPageSizeMenuRef}
                    role="listbox"
                    aria-label={pageSizeSuffix}
                    style={{
                      position:"absolute",
                      top:"calc(100% + 8px)",
                      insetInlineStart:0,
                      minWidth:"100%",
                      width:96,
                      zIndex:35,
                      padding:6,
                      borderRadius:14,
                      border:"1px solid var(--rukn-border-soft)",
                      background:"var(--rukn-bg-select)",
                      boxShadow:"var(--rukn-shadow-card)",
                      backdropFilter:"blur(12px)",
                    }}
                  >
                    {PROGRAMS_LIST_PAGE_SIZE_OPTIONS.map((option) => {
                      const active = option === programsPageSize;
                      const hovered = hoveredProgramPageSizeOption === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setHoveredProgramPageSizeOption(option)}
                          onMouseLeave={() => setHoveredProgramPageSizeOption((current) => current === option ? null : current)}
                          onClick={() => {
                            setProgramsPageSize(option);
                            setProgramPageSizeMenuOpen(false);
                            setHoveredProgramPageSizeOption(null);
                          }}
                          style={{
                            width:"100%",
                            border:0,
                            borderRadius:10,
                            padding:"8px 10px",
                            background:active
                              ? "var(--rukn-gold-dim)"
                              : hovered
                                ? "var(--rukn-row-hover)"
                                : "transparent",
                            color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
                            fontSize:12,
                            fontWeight:active ? 900 : 800,
                            fontFamily:"'Cairo',sans-serif",
                            textAlign:"center",
                            cursor:"pointer",
                            transition:"background-color .16s ease, color .16s ease",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProgramsListResults
        activePrograms={activePrograms}
        programMetricsReady={programMetricsReady}
        totalProgramsCount={totalProgramsCount}
        programSelectionMode={programSelectionMode}
        selectedProgramsCount={selectedProgramsCount}
        visiblePrograms={visiblePrograms}
        clientsByProgramId={clientsByProgramId}
        programSummaryById={programSummaryById}
        clientsReady={clientsReady}
        selectedProgramIds={selectedProgramIds}
        travelGroupCountsByProgramId={travelGroupCountsByProgramId}
        highlightProgramId={highlightProgramId}
        totalProgramsPages={totalProgramsPages}
        safeProgramsPage={safeProgramsPage}
        onBulkArchivePrograms={handleBulkArchivePrograms}
        onOpenBulkTrashProgramsPrompt={openBulkTrashProgramsPrompt}
        onClearProgramSelection={clearProgramSelection}
        onProgramCardRef={handleProgramCardRef}
        onOpenProgramDetail={openProgramDetail}
        onEditProgram={handleProgramCardEdit}
        onDuplicateProgram={openDuplicatePrompt}
        onArchiveProgram={handleProgramCardArchive}
        onDeleteProgram={handleProgramCardDelete}
        onToggleProgramNusukUpload={handleProgramCardNusukUploadToggle}
        canUseNusukUploadForProgram={canUseNusukUploadForProgram}
        nusukUploadLaunchLabel={NUSUK_UPLOAD_LAUNCH_LABEL}
        nusukUploadLaunchHelper={NUSUK_UPLOAD_LAUNCH_HELPER}
        onToggleProgramSelection={toggleProgramSelection}
        onPreviousProgramsPage={goToPreviousProgramsPage}
        onNextProgramsPage={goToNextProgramsPage}
        lang={lang}
        dir={dir}
        formatCurrencyForLang={formatCurrencyForLang}
        t={t}
        tr={tr}
        tc={tc}
      />

      <ProgramEditorModal
        open={showForm || !!editing}
        program={editing}
        store={store}
        title={editing ? t.editProgramTitle : t.addProgramTitle}
        badgesEnabled={badgesEnabled}
        onSaved={handleProgramFormSaved}
        onClose={closeProgramForm}
        programClients={editingProgramClients}
        onTravelGroupsChanged={() => {
          setTravelGroupCountsRefreshKey((key) => key + 1);
          setProgramDetailRefreshKey((key) => key + 1);
        }}
      />
      <DuplicateProgramModal
        prompt={duplicatePrompt}
        onNameChange={handleDuplicateNameChange}
        onCreate={handleConfirmDuplicateProgram}
        onClose={closeDuplicatePrompt}
        lang={lang}
        t={t}
      />
      <BulkProgramPosterModal
        isOpen={showBulkPosterModal}
        onClose={closeBulkPosterModal}
        programs={filteredPrograms}
        onDownloadRequest={handleBulkPosterDownloadRequest}
      />
      {programPostersEnabled && (
        <ProgramPosterTemplateChoiceModal
          choice={bulkPosterTemplateChoice}
          selectedChoiceId={bulkPosterTemplateChoiceId}
          onSelectChoice={setBulkPosterTemplateChoiceId}
          busy={bulkPosterExportBusy}
          onClose={closeBulkPosterTemplateChoice}
          onDownload={handleBulkPosterTemplateChoiceDownload}
          labels={bulkPosterExportLabels}
          lang={lang}
          dir={dir}
          posterOptionsVisible={false}
        />
      )}
      <ProgramLifecycleModals
        archivePrompt={archivePrompt}
        bulkTrashPrompt={bulkTrashPrompt}
        deletePrompt={deletePrompt}
        onCloseArchive={() => setArchivePrompt(null)}
        onCloseBulkTrash={() => setBulkTrashPrompt(null)}
        onCloseDelete={() => setDeletePrompt(null)}
        onConfirmArchive={handleConfirmArchiveProgram}
        onConfirmBulkTrash={handleConfirmBulkTrashPrograms}
        onConfirmDelete={handleConfirmDeleteProgram}
        t={t}
        tr={tr}
        tc={tc}
      />
      <NusukSettingsModal
        open={Boolean(nusukSettingsPrompt)}
        initialSettings={store.agencyNusukSettings}
        saving={nusukSettingsSaving}
        onCancel={handleCancelNusukSettingsPrompt}
        onSave={handleSaveNusukSettingsAndContinue}
      />
      {nusukAssistantInstallModal}
    </div>
  );
}

// ═══════════════════════════════════════
// PROGRAM INNER — full client list
// ═══════════════════════════════════════
function ProgramInner({
  program,
  store,
  onToast,
  onBack,
  onEditProgram,
  programSummaryById = null,
  badgesEnabled = true,
  contractsEnabled = true,
  programPostersEnabled = true,
  agencyNusukUploadFeatureEnabled = false,
  externalRefreshKey = 0,
  onToggleProgramNusukUpload,
}) {
  const {
    clients,
    payments: globalPayments = [],
    getClientTotalPaid,
    getClientPayments,
    agency,
    programs: allPrograms,
    activeClients = [],
    transferClients,
    deleteClientsBulk,
    deleteClient,
    updateClientAndWait,
    updateProgram,
  } = store;
  const { t, lang, dir } = useLang();
  const isRTL = dir === "rtl";
  const { templates: assignedCodePosterTemplates } = useAgencyCodePosterTemplates(store.agencyId, { enabled: programPostersEnabled });
  const clientsReady = !store.isSupabaseEnabled || store.clientsLoaded;
  const paymentsReady = !store.isSupabaseEnabled || store.paymentsLoaded;
  const detailDataReady = clientsReady && paymentsReady;
  const tr = React.useCallback((key, vars = {}) => {
    const template = t?.[key] ?? key;
    if (typeof template === "function") return template(vars);
    return Object.entries(vars).reduce((text, [name, value]) => (
      String(text).replaceAll(`{${name}}`, String(value ?? ""))
    ), String(template));
  }, [t]);
  const formatCurrencyForLang = React.useCallback((value) => formatCurrency(value, lang), [lang]);
  const isLocalhost = isLocalDevelopmentHost();

  const [filter,         setFilter]         = React.useState("all");
  const [search,         setSearch]         = React.useState("");
  const debouncedClientSearch = useDebouncedValue(search, 200);
  const [selectedClient, setSelectedClient] = React.useState(null);
  const [travelGroupMoveClient, setTravelGroupMoveClient] = React.useState(null);
  const [travelGroupMoveValue, setTravelGroupMoveValue] = React.useState("");
  const [travelGroupMoveSaving, setTravelGroupMoveSaving] = React.useState(false);
  const [showAddClient,  setShowAddClient]  = React.useState(false);
  const [showExcelImport, setShowExcelImport] = React.useState(false);
  const [excelImportSaving, setExcelImportSaving] = React.useState(false);
  const [showPassportImport, setShowPassportImport] = React.useState(false);
  const [editingClient,  setEditingClient]  = React.useState(null);
  const [selectMode,     setSelectMode]     = React.useState(false);
  const [checkedIds,     setCheckedIds]     = React.useState(new Set());
  const [transferTargets, setTransferTargets] = React.useState([]);
  const [transferSheetOpen, setTransferSheetOpen] = React.useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const closeExcelImportModal = React.useCallback(() => {
    if (excelImportSaving) return;
    setShowExcelImport(false);
  }, [excelImportSaving]);
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false);
  const [packageFilter, setPackageFilter] = React.useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = React.useState("all");
  const [travelGroupFilter, setTravelGroupFilter] = React.useState("all");
  const [programClientPage, setProgramClientPage] = React.useState(1);
  const [programClientPageSize, setProgramClientPageSize] = React.useState(PROGRAM_DETAIL_DEFAULT_PAGE_SIZE);
  const [programTab, setProgramTab] = React.useState("clients");
  const [costingOpen, setCostingOpen] = React.useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = React.useState(false);
  const [serviceTypeFilterOpen, setServiceTypeFilterOpen] = React.useState(false);
  const [travelGroupFilterOpen, setTravelGroupFilterOpen] = React.useState(false);
  const [packageFilterOpen, setPackageFilterOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [headerActionsOpen, setHeaderActionsOpen] = React.useState(false);
  const [badgeExportBusy, setBadgeExportBusy] = React.useState(false);
  const [badgeExportProgress, setBadgeExportProgress] = React.useState(null);
  const [wordContractExportBusy, setWordContractExportBusy] = React.useState(false);
  const [exportScopeDialogAction, setExportScopeDialogAction] = React.useState(null);
  const [posterExportBusy, setPosterExportBusy] = React.useState(false);
  const [posterTemplateChoice, setPosterTemplateChoice] = React.useState(null);
  const [posterTemplateChoiceId, setPosterTemplateChoiceId] = React.useState("");
  const [posterShowDates, setPosterShowDates] = React.useState(true);
  const [posterTitleOverride, setPosterTitleOverride] = React.useState(() => getDefaultPosterTitle(program, lang));
  const [hoveredHeaderAction, setHoveredHeaderAction] = React.useState("");
  const searchInputRef = React.useRef(null);
  const headerActionsRef = React.useRef(null);
  const bulkActionsBtnRef = React.useRef(null);
  const bulkActionsMenuRef = React.useRef(null);
  const packageFilterRef = React.useRef(null);
  const statusFilterRef = React.useRef(null);
  const serviceTypeFilterRef = React.useRef(null);
  const travelGroupFilterRef = React.useRef(null);
  const detailHydrationRequestedRef = React.useRef(false);
  const scopedProgramDetailHiddenPaymentIdsRef = React.useRef(new Set());
  const scopedRealtimeRefreshTimerRef = React.useRef(null);
  const [scopedProgramDetailRefreshKey, setScopedProgramDetailRefreshKey] = React.useState(0);
  const [scopedProgramDetail, setScopedProgramDetail] = React.useState({
    programId: "",
    status: "idle",
    program: null,
    clients: [],
    payments: [],
    error: null,
  });
  const packages = React.useMemo(() => normalizeProgramPackages(program), [program]);
  const participantTerms = React.useMemo(() => getParticipantTerminology(program, lang), [program, lang]);
  const isHajjProgram = getProgramKind(program) === "hajj";
  const currentProgramTravelGroups = React.useMemo(() => (
    (store.programTravelGroups || [])
      .filter((group) => (
        String(group.programId || group.program_id || "") === String(program.id || "")
      ))
  ), [program.id, store.programTravelGroups]);
  const travelGroupMoveOptions = React.useMemo(() => ([
    {
      value: "",
      label: lang === "fr" ? "Programme principal" : lang === "en" ? "Main program" : "البرنامج الأساسي",
    },
    ...currentProgramTravelGroups.map((group) => ({
      value: String(group.id || ""),
      label: group.name || group.code || String(group.id || ""),
    })),
  ]), [currentProgramTravelGroups, lang]);
  const showTravelGroupFilter = isHajjProgram && currentProgramTravelGroups.length > 0;
  const travelGroupFilters = React.useMemo(() => ([
    {
      key: "all",
      label: lang === "fr" ? "Tous les pèlerins" : lang === "en" ? "All pilgrims" : "كل الحجاج",
    },
    {
      key: "__main_program",
      label: lang === "fr" ? "Programme principal" : lang === "en" ? "Main program" : "البرنامج الأساسي",
    },
    ...currentProgramTravelGroups.map((group) => ({
      key: String(group.id || ""),
      label: group.name || group.code || String(group.id || ""),
    })),
  ]), [currentProgramTravelGroups, lang]);
  const activeTravelGroupFilter = travelGroupFilters.find(
    (option) => option.key === travelGroupFilter
  ) || travelGroupFilters[0];

  const openTravelGroupMove = React.useCallback((client) => {
    const currentTravelGroupId = client?.travelGroupId ?? client?.travel_group_id ?? null;
    const currentGroupExists = currentTravelGroupId && currentProgramTravelGroups.some(
      (group) => String(group.id || "") === String(currentTravelGroupId)
    );
    setTravelGroupMoveClient(client);
    setTravelGroupMoveValue(currentGroupExists ? String(currentTravelGroupId) : "");
  }, [currentProgramTravelGroups]);

  const closeTravelGroupMove = React.useCallback(() => {
    if (travelGroupMoveSaving) return;
    setTravelGroupMoveClient(null);
    setTravelGroupMoveValue("");
  }, [travelGroupMoveSaving]);

  React.useEffect(() => {
    if (!isHajjProgram) return undefined;
    if (typeof store.loadProgramTravelGroups !== "function") return undefined;
    let cancelled = false;
    store.loadProgramTravelGroups(program.id).catch((error) => {
      if (!cancelled && process.env.NODE_ENV === "development") {
        console.warn("[Programs] Travel groups could not be loaded for the client form.", error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isHajjProgram, program.id, store.loadProgramTravelGroups]);
  const participantExcelImportLabel = React.useMemo(() => {
    if (lang === "fr") return `${participantTerms.importAction} depuis Excel / CSV`;
    if (lang === "en") return `${participantTerms.importAction} from Excel / CSV`;
    return `${participantTerms.importAction} من Excel / CSV`;
  }, [lang, participantTerms.importAction]);
  const completionLabels = React.useMemo(() => getClientCompletionLabels(lang), [lang]);
  const bulkActionsMenuPos = useDropdownPosition({
    anchorRef: bulkActionsBtnRef,
    menuRef: bulkActionsMenuRef,
    open: bulkActionsOpen,
    rtl: isRTL,
    offset: MENU_OFFSET_PX,
  });

  const ensureGlobalDetailData = React.useCallback(async ({ notify = false } = {}) => {
    if (!store.isSupabaseEnabled) return true;
    if (clientsReady && paymentsReady) return true;

    const tasks = [];
    if (!clientsReady) {
      if (typeof store.ensureClientsLoaded !== "function") return false;
      tasks.push(store.ensureClientsLoaded());
    }
    if (!paymentsReady) {
      if (typeof store.ensurePaymentsLoaded !== "function") return false;
      tasks.push(store.ensurePaymentsLoaded());
    }

    try {
      const results = await Promise.all(tasks);
      const error = results.find((result) => result?.error)?.error;
      if (error) {
        if (notify) onToast?.(t.loadingFailed || t.error || "تعذر تحميل البيانات", "error");
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Programs] Global detail hydration failed:", error);
      if (notify) onToast?.(t.loadingFailed || t.error || "تعذر تحميل البيانات", "error");
      return false;
    }
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    store.ensureClientsLoaded,
    store.ensurePaymentsLoaded,
    onToast,
    t.loadingFailed,
    t.error,
  ]);

  const runWithGlobalDetailData = React.useCallback(async (action) => {
    const ready = await ensureGlobalDetailData({ notify: true });
    if (!ready) return;
    action?.();
  }, [ensureGlobalDetailData]);

  const ensureGlobalDetailDataForCurrentAction = React.useCallback(async () => {
    if (detailDataReady) return true;
    const ready = await ensureGlobalDetailData({ notify: true });
    if (ready) onToast?.(t.loading || "Loading...", "info");
    return false;
  }, [detailDataReady, ensureGlobalDetailData, onToast, t.loading]);

  const refreshScopedProgramDetail = React.useCallback((options = {}) => {
    const programId = String(program.id || "");
    if (!programId) return;
    const hiddenPaymentIds = Array.isArray(options?.hiddenPaymentIds)
      ? options.hiddenPaymentIds.map((id) => String(id || "")).filter(Boolean)
      : [];
    if (hiddenPaymentIds.length) {
      const nextHiddenIds = new Set(scopedProgramDetailHiddenPaymentIdsRef.current);
      hiddenPaymentIds.forEach((id) => nextHiddenIds.add(id));
      scopedProgramDetailHiddenPaymentIdsRef.current = nextHiddenIds;
    }
    setScopedProgramDetail((current) => (
      current.programId === programId
        ? {
            ...current,
            status: current.program || current.clients.length || current.payments.length ? "refreshing" : "loading",
            payments: scopedProgramDetailHiddenPaymentIdsRef.current.size
              ? current.payments.filter((payment) => !scopedProgramDetailHiddenPaymentIdsRef.current.has(String(payment?.id || "")))
              : current.payments,
            error: null,
          }
        : current
    ));
    setScopedProgramDetailRefreshKey((key) => key + 1);
  }, [program.id]);

  const scheduleScopedRealtimeRefresh = React.useCallback(() => {
    if (scopedRealtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(scopedRealtimeRefreshTimerRef.current);
    }
    scopedRealtimeRefreshTimerRef.current = window.setTimeout(() => {
      scopedRealtimeRefreshTimerRef.current = null;
      refreshScopedProgramDetail({ realtime: true });
    }, PROGRAMS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS);
  }, [refreshScopedProgramDetail]);

  React.useEffect(() => () => {
    if (scopedRealtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(scopedRealtimeRefreshTimerRef.current);
      scopedRealtimeRefreshTimerRef.current = null;
    }
  }, [program.id]);

  const upsertScopedProgramPayment = React.useCallback((payment, fallbackClientId = "") => {
    const paymentId = String(payment?.id || "");
    const paymentClientId = String(payment?.clientId || payment?.client_id || fallbackClientId || "");
    const programId = String(program.id || "");
    if (!paymentId || !paymentClientId || !programId) return;

    const normalizedPayment = {
      ...payment,
      clientId: payment?.clientId || payment?.client_id || paymentClientId,
      client_id: payment?.client_id || payment?.clientId || paymentClientId,
    };

    setScopedProgramDetail((current) => {
      if (current.programId !== programId) return current;
      const clientBelongsToProgram = current.clients.some((client) => String(client.id || "") === paymentClientId)
        || (
          String(selectedClient?.id || "") === paymentClientId
          && String(getClientProgramId(selectedClient) || "") === programId
        );
      if (!clientBelongsToProgram) return current;

      const currentPayments = Array.isArray(current.payments) ? current.payments : [];
      const existingPayment = currentPayments.some((item) => String(item?.id || "") === paymentId);
      const payments = existingPayment
        ? currentPayments.map((item) => (
            String(item?.id || "") === paymentId ? { ...item, ...normalizedPayment } : item
          ))
        : [...currentPayments, normalizedPayment];

      return { ...current, payments };
    });
  }, [program.id, selectedClient]);

  const isVisibleScopedProgramClient = React.useCallback((client) => {
    if (!client) return false;
    const programId = String(program.id || "");
    const clientProgramId = String(getClientProgramId(client) || client.programId || client.program_id || "");
    const status = String(client.status || "").toLowerCase();
    return Boolean(programId)
      && clientProgramId === programId
      && !client.deleted
      && !client.deletedAt
      && !client.deleted_at
      && !client.archived
      && !client.archivedAt
      && !client.archived_at
      && status !== "deleted"
      && status !== "archived";
  }, [program.id]);

  const patchScopedProgramClientFromRealtime = React.useCallback((event) => {
    const programId = String(program.id || "");
    const client = event?.client || null;
    const oldClient = event?.oldClient || null;
    const clientId = String(client?.id || oldClient?.id || event?.id || "");
    if (!programId || !clientId) return;

    const shouldShowClient = isVisibleScopedProgramClient(client);

    setScopedProgramDetail((current) => {
      if (current.programId !== programId) return current;
      const currentClients = Array.isArray(current.clients) ? current.clients : [];
      const clientExists = currentClients.some((item) => String(item?.id || "") === clientId);
      const currentPayments = Array.isArray(current.payments) ? current.payments : [];

      if (shouldShowClient) {
        const clients = upsertProgramClientsNewestFirst(currentClients, client);
        const isActivePaymentRow = (payment) => {
          const status = String(payment?.status || "active").toLowerCase();
          return status !== "trashed"
            && status !== "deleted"
            && !payment?.trashedAt
            && !payment?.trashed_at
            && !payment?.deletedAt
            && !payment?.deleted_at;
        };
        const paymentsById = new Map(currentPayments.map((payment) => [String(payment?.id || ""), payment]));
        (Array.isArray(globalPayments) ? globalPayments : [])
          .filter((payment) => String(payment?.clientId || payment?.client_id || "") === clientId)
          .filter(isActivePaymentRow)
          .forEach((payment) => {
            const paymentId = String(payment?.id || "");
            if (paymentId) paymentsById.set(paymentId, payment);
          });
        return { ...current, clients, payments: Array.from(paymentsById.values()) };
      }

      if (!clientExists) return current;
      return {
        ...current,
        clients: currentClients.filter((item) => String(item?.id || "") !== clientId),
        payments: currentPayments.filter((payment) => String(payment?.clientId || payment?.client_id || "") !== clientId),
      };
    });

    setSelectedClient((current) => {
      if (String(current?.id || "") !== clientId) return current;
      return shouldShowClient ? { ...current, ...client } : null;
    });
    setEditingClient((current) => {
      if (String(current?.id || "") !== clientId) return current;
      return shouldShowClient ? { ...current, ...client } : null;
    });
    if (!shouldShowClient) {
      setCheckedIds((current) => {
        if (!current.has(clientId)) return current;
        const next = new Set(current);
        next.delete(clientId);
        return next;
      });
    }
  }, [globalPayments, isVisibleScopedProgramClient, program.id]);

  const upsertScopedProgramClients = React.useCallback((nextClients = []) => {
    const incomingClients = (Array.isArray(nextClients) ? nextClients : [nextClients])
      .filter(isVisibleScopedProgramClient);
    if (!incomingClients.length) return;
    const programId = String(program.id || "");
    setScopedProgramDetail((current) => {
      if (current.programId !== programId) return current;
      return {
        ...current,
        clients: upsertProgramClientsNewestFirst(current.clients || [], incomingClients),
      };
    });
  }, [isVisibleScopedProgramClient, program.id]);

  const saveTravelGroupMove = React.useCallback(async () => {
    if (!travelGroupMoveClient || travelGroupMoveSaving) return;
    const currentTravelGroupId = travelGroupMoveClient.travelGroupId
      ?? travelGroupMoveClient.travel_group_id
      ?? null;
    const nextTravelGroupId = travelGroupMoveValue || null;
    if (String(currentTravelGroupId || "") === String(nextTravelGroupId || "")) {
      closeTravelGroupMove();
      return;
    }
    setTravelGroupMoveSaving(true);
    try {
      const result = await updateClientAndWait(
        travelGroupMoveClient.id,
        { travelGroupId: nextTravelGroupId },
        travelGroupMoveClient
      );
      if (result?.error || !result?.data) {
        onToast?.("تعذر حفظ فوج السفر لهذا الحاج. يرجى تحديث الصفحة والمحاولة مرة أخرى.", "error");
        return;
      }
      upsertScopedProgramClients(result.data);
      setTravelGroupMoveClient(null);
      setTravelGroupMoveValue("");
      onToast?.(
        lang === "fr"
          ? "Groupe de voyage mis à jour"
          : lang === "en"
            ? "Travel group updated"
            : "تم تحديث فوج السفر",
        "success"
      );
    } catch (error) {
      console.error("[Programs] Travel-group assignment update failed.", error);
      onToast?.("تعذر حفظ فوج السفر لهذا الحاج. يرجى تحديث الصفحة والمحاولة مرة أخرى.", "error");
    } finally {
      setTravelGroupMoveSaving(false);
    }
  }, [
    closeTravelGroupMove,
    lang,
    onToast,
    travelGroupMoveClient,
    travelGroupMoveSaving,
    travelGroupMoveValue,
    updateClientAndWait,
    upsertScopedProgramClients,
  ]);

  const isActiveScopedPayment = React.useCallback((payment) => {
    if (!payment) return false;
    const status = String(payment.status || "active").toLowerCase();
    return status !== "trashed"
      && status !== "deleted"
      && !payment.trashedAt
      && !payment.trashed_at
      && !payment.deletedAt
      && !payment.deleted_at;
  }, []);

  const scopedPaymentBelongsToCurrentProgram = React.useCallback((payment, current) => {
    const paymentClientId = String(payment?.clientId || payment?.client_id || "");
    const programId = String(program.id || "");
    if (!paymentClientId || !programId) return false;
    const currentClients = Array.isArray(current?.clients) ? current.clients : [];
    if (currentClients.some((client) => String(client?.id || "") === paymentClientId)) return true;
    if (
      String(selectedClient?.id || "") === paymentClientId
      && String(getClientProgramId(selectedClient) || selectedClient?.programId || selectedClient?.program_id || "") === programId
    ) return true;
    return (Array.isArray(clients) ? clients : []).some((client) => (
      String(client?.id || "") === paymentClientId
      && isVisibleScopedProgramClient(client)
    ));
  }, [clients, isVisibleScopedProgramClient, program.id, selectedClient]);

  const patchScopedProgramPaymentFromRealtime = React.useCallback((event) => {
    const programId = String(program.id || "");
    const payment = event?.payment || null;
    const oldPayment = event?.oldPayment || null;
    const paymentId = String(payment?.id || oldPayment?.id || event?.id || "");
    if (!programId || !paymentId) return;

    setScopedProgramDetail((current) => {
      if (current.programId !== programId) return current;
      const currentPayments = Array.isArray(current.payments) ? current.payments : [];
      const shouldShowPayment = isActiveScopedPayment(payment)
        && scopedPaymentBelongsToCurrentProgram(payment, current);

      if (!shouldShowPayment) {
        return {
          ...current,
          payments: currentPayments.filter((item) => String(item?.id || "") !== paymentId),
        };
      }

      scopedProgramDetailHiddenPaymentIdsRef.current.delete(paymentId);
      const normalizedPayment = {
        ...payment,
        clientId: payment.clientId || payment.client_id,
        client_id: payment.client_id || payment.clientId,
      };
      const paymentExists = currentPayments.some((item) => String(item?.id || "") === paymentId);
      const payments = paymentExists
        ? currentPayments.map((item) => (
            String(item?.id || "") === paymentId ? { ...item, ...normalizedPayment } : item
          ))
        : [...currentPayments, normalizedPayment];
      return { ...current, payments };
    });
  }, [isActiveScopedPayment, program.id, scopedPaymentBelongsToCurrentProgram]);

  React.useEffect(() => {
    const event = store.latestProgramRealtimeEvent;
    if (!event) return;
    const programId = String(program.id || "");
    const eventProgramId = String(event.program?.id || event.oldProgram?.id || event.id || "");
    if (!programId || eventProgramId !== programId) return;

    if (event.program) {
      setScopedProgramDetail((current) => (
        current.programId === programId
          ? { ...current, program: { ...(current.program || {}), ...event.program } }
          : current
      ));
    }
    scheduleScopedRealtimeRefresh();
  }, [program.id, scheduleScopedRealtimeRefresh, store.latestProgramRealtimeEvent]);

  React.useEffect(() => {
    const event = store.latestClientRealtimeEvent;
    if (!event) return;
    const programId = String(program.id || "");
    const eventProgramIds = [
      getClientProgramId(event.client || {}),
      event.client?.programId,
      event.client?.program_id,
      getClientProgramId(event.oldClient || {}),
      event.oldClient?.programId,
      event.oldClient?.program_id,
    ].map((id) => String(id || "")).filter(Boolean);
    patchScopedProgramClientFromRealtime(event);
    if (programId && eventProgramIds.includes(programId)) scheduleScopedRealtimeRefresh();
  }, [patchScopedProgramClientFromRealtime, program.id, scheduleScopedRealtimeRefresh, store.latestClientRealtimeEvent]);

  React.useEffect(() => {
    const event = store.latestPaymentRealtimeEvent;
    if (!event) return;
    const paymentClientId = String(event.payment?.clientId || event.payment?.client_id || event.oldPayment?.clientId || event.oldPayment?.client_id || "");
    const programId = String(program.id || "");
    const touchesCurrentProgram = Boolean(programId && paymentClientId && (
      scopedProgramDetail.clients.some((client) => String(client?.id || "") === paymentClientId)
      || clients.some((client) => (
        String(client?.id || "") === paymentClientId
        && String(getClientProgramId(client) || client.programId || client.program_id || "") === programId
      ))
      || (
        String(selectedClient?.id || "") === paymentClientId
        && String(getClientProgramId(selectedClient) || selectedClient?.programId || selectedClient?.program_id || "") === programId
      )
    ));
    patchScopedProgramPaymentFromRealtime(event);
    if (touchesCurrentProgram) scheduleScopedRealtimeRefresh();
  }, [
    clients,
    patchScopedProgramPaymentFromRealtime,
    program.id,
    scheduleScopedRealtimeRefresh,
    scopedProgramDetail.clients,
    selectedClient,
    store.latestPaymentRealtimeEvent,
  ]);

  const handleClientDataChanged = React.useCallback((change = {}) => {
    if (change?.payment) upsertScopedProgramPayment(change.payment, change.clientId);
    if (Array.isArray(change?.payments)) {
      change.payments.forEach((payment) => upsertScopedProgramPayment(payment, change.clientId));
    }
    refreshScopedProgramDetail(change);
  }, [refreshScopedProgramDetail, upsertScopedProgramPayment]);

  React.useEffect(() => {
    detailHydrationRequestedRef.current = false;
    scopedProgramDetailHiddenPaymentIdsRef.current = new Set();
  }, [program.id]);

  React.useEffect(() => {
    const programId = String(program.id || "");
    if (!programId) return undefined;

    let cancelled = false;
    let refreshTimer = null;
    const filterHiddenPayments = (payments = []) => {
      const hiddenPaymentIds = scopedProgramDetailHiddenPaymentIdsRef.current;
      if (!hiddenPaymentIds.size) return payments;
      return payments.filter((payment) => !hiddenPaymentIds.has(String(payment?.id || "")));
    };
    setScopedProgramDetail((current) => {
      const keepCurrent = current.programId === programId
        && (current.program || current.clients.length || current.payments.length);
      return {
        programId,
        status: keepCurrent ? "refreshing" : "loading",
        program: keepCurrent ? current.program : null,
        clients: keepCurrent ? current.clients : [],
        payments: keepCurrent ? filterHiddenPayments(current.payments) : [],
        error: null,
      };
    });

    const setScopedProgramDetailFailure = (error) => {
      setScopedProgramDetail((current) => {
        const keepCurrent = current.programId === programId
          && (current.program || current.clients.length || current.payments.length);
        return {
          programId,
          status: "failed",
          program: keepCurrent ? current.program : null,
          clients: keepCurrent ? current.clients : [],
          payments: keepCurrent ? filterHiddenPayments(current.payments) : [],
          error,
        };
      });
    };

    if (typeof store.loadProgramDetailData !== "function") {
      setScopedProgramDetailFailure(new Error("Missing scoped program detail loader"));
      return undefined;
    }

    const loadScopedProgramDetail = () => {
      store.loadProgramDetailData(programId)
        .then((result) => {
          if (cancelled) return;
          if (result?.error) {
            setScopedProgramDetailFailure(result.error);
            return;
          }
          if (!result?.program) {
            setScopedProgramDetailFailure(new Error("Scoped program detail not found"));
            return;
          }
          const resultPayments = Array.isArray(result?.payments) ? result.payments : [];
          const hiddenPaymentIds = new Set(scopedProgramDetailHiddenPaymentIdsRef.current);
          if (hiddenPaymentIds.size) {
            const fetchedPaymentIds = new Set(resultPayments.map((payment) => String(payment?.id || "")).filter(Boolean));
            hiddenPaymentIds.forEach((id) => {
              if (!fetchedPaymentIds.has(id)) hiddenPaymentIds.delete(id);
            });
            scopedProgramDetailHiddenPaymentIdsRef.current = hiddenPaymentIds;
          }
          setScopedProgramDetail({
            programId,
            status: "ready",
            program: result.program,
            clients: sortProgramClientsNewestFirst(Array.isArray(result?.clients) ? result.clients : []),
            payments: filterHiddenPayments(resultPayments),
            error: null,
          });
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[Programs] Scoped program detail fetch failed:", error);
          setScopedProgramDetailFailure(error);
        });
    };

    refreshTimer = window.setTimeout(loadScopedProgramDetail, SCOPED_PROGRAM_DETAIL_REFRESH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, [
    program.id,
    externalRefreshKey,
    scopedProgramDetailRefreshKey,
    store.loadProgramDetailData,
    store.lastSynced,
  ]);

  React.useEffect(() => {
    if (!store.isSupabaseEnabled) return;
    if (clientsReady && paymentsReady) return;
    if (!scopedProgramDetail.error) return;
    if (detailHydrationRequestedRef.current) return;
    detailHydrationRequestedRef.current = true;
    ensureGlobalDetailData();
  }, [
    clientsReady,
    paymentsReady,
    store.isSupabaseEnabled,
    scopedProgramDetail.error,
    ensureGlobalDetailData,
  ]);

  const scopedProgramDetailMatches = scopedProgramDetail.programId === String(program.id || "");
  const scopedProgramDetailReady = scopedProgramDetailMatches
    && (scopedProgramDetail.status === "ready" || scopedProgramDetail.status === "refreshing")
    && !scopedProgramDetail.error;
  const useScopedProgramDetail = scopedProgramDetailReady;
  const listDataReady = useScopedProgramDetail || detailDataReady;

  const scopedPaymentsByClient = React.useMemo(() => {
    const map = new Map();
    (scopedProgramDetail.payments || []).forEach((payment) => {
      const clientId = payment.clientId || payment.client_id;
      if (!clientId) return;
      const current = map.get(clientId);
      if (current) current.push(payment);
      else map.set(clientId, [payment]);
    });
    return map;
  }, [scopedProgramDetail.payments]);

  const getScopedClientPayments = React.useCallback((clientId) => {
    const clientPayments = scopedPaymentsByClient.get(clientId);
    return clientPayments ? clientPayments.slice() : [];
  }, [scopedPaymentsByClient]);

  const getScopedClientTotalPaid = React.useCallback((clientId) => (
    getScopedClientPayments(clientId).reduce((sum, payment) => {
      const amount = Number(payment.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  ), [getScopedClientPayments]);

  const getListClientTotalPaid = useScopedProgramDetail ? getScopedClientTotalPaid : getClientTotalPaid;
  const progClients = React.useMemo(() => (
    sortProgramClientsNewestFirst(
      useScopedProgramDetail
        ? scopedProgramDetail.clients
        : clients.filter(c => c.programId === program.id)
    )
  ), [clients, program.id, scopedProgramDetail.clients, useScopedProgramDetail]);
  const currentProgram = useScopedProgramDetail ? (scopedProgramDetail.program || program) : program;
  const currentNusukUploadEnabled = isProgramNusukUploadEnabled(currentProgram);
  const canUseNusukUpload = getNusukUploadAvailability(currentProgram, {
    isLocalhost,
    agencyNusukUploadFeatureEnabled,
    debug: true,
  });
  const showNusukUploadDisableAction = Boolean(canUseNusukUpload && currentNusukUploadEnabled);
  const currentPackages = React.useMemo(() => normalizeProgramPackages(currentProgram), [currentProgram]);
  const isScopedProgramDetailRefreshing = scopedProgramDetailMatches && scopedProgramDetail.status === "refreshing";
  const registeredCapacityValue = React.useMemo(
    () => formatProgramCapacityValue(currentProgram, progClients.length),
    [currentProgram, progClients.length]
  );
  const ensureCurrentProgramCanAdd = React.useCallback((countToAdd = 1, action = "add") => {
    const capacityInfo = getProgramCapacityInfo(currentProgram, progClients.length, countToAdd);
    if (capacityInfo.canAddRequested) return true;
    onToast(getProgramCapacityMessage({
      program: currentProgram,
      lang,
      messages: t,
      action,
      countToAdd,
      remainingSeats: capacityInfo.remainingSeats || 0,
    }), "error");
    return false;
  }, [currentProgram, lang, onToast, progClients.length, t]);

  const filtered = React.useMemo(() => filterProgramClientsForList({
    clients: progClients,
    program,
    filter,
    packageFilter,
    serviceTypeFilter,
    search: debouncedClientSearch,
    getClientTotalPaid: getListClientTotalPaid,
    lang,
  }), [progClients, filter, packageFilter, serviceTypeFilter, debouncedClientSearch, getListClientTotalPaid, program, lang]);
  const travelGroupFiltered = React.useMemo(() => filterProgramClientsByTravelGroup({
    clients: filtered,
    showTravelGroupFilter,
    travelGroupFilter,
  }), [filtered, showTravelGroupFilter, travelGroupFilter]);

  const totalProgramClientItems = travelGroupFiltered.length;
  const totalProgramClientPages = Math.max(1, Math.ceil(totalProgramClientItems / programClientPageSize));
  const safeProgramClientPage = Math.min(Math.max(1, programClientPage), totalProgramClientPages);
  const programClientStartIndex = (safeProgramClientPage - 1) * programClientPageSize;
  const programClientEndIndex = programClientStartIndex + programClientPageSize;
  const paginatedProgramClients = React.useMemo(
    () => travelGroupFiltered.slice(programClientStartIndex, programClientEndIndex),
    [travelGroupFiltered, programClientStartIndex, programClientEndIndex]
  );
  const filteredPaymentTotals = React.useMemo(() => computeProgramClientPaymentTotals({
    clients: travelGroupFiltered,
    program,
    getClientTotalPaid: getListClientTotalPaid,
  }), [travelGroupFiltered, getListClientTotalPaid, program]);
  const programClientRangeStart = totalProgramClientItems ? programClientStartIndex + 1 : 0;
  const programClientRangeEnd = Math.min(programClientEndIndex, totalProgramClientItems);
  const programClientPageSizeOptions = React.useMemo(() => (
    PROGRAM_DETAIL_PAGE_SIZE_OPTIONS.map((size) => ({
      value: size,
      label: lang === "fr"
        ? `Afficher ${size} par page`
        : lang === "en"
          ? `Show ${size} per page`
          : `عرض ${size} في الصفحة`,
    }))
  ), [lang]);

  React.useEffect(() => {
    setPackageFilter("all");
    setServiceTypeFilter("all");
    setTravelGroupFilter("all");
  }, [program.id]);

  React.useEffect(() => {
    if (travelGroupFilter === "all") return;
    if (!showTravelGroupFilter) {
      setTravelGroupFilter("all");
      return;
    }
    if (travelGroupFilter === "__main_program") return;
    const selectedGroupExists = currentProgramTravelGroups.some(
      (group) => String(group.id || "") === travelGroupFilter
    );
    if (!selectedGroupExists) setTravelGroupFilter("all");
  }, [currentProgramTravelGroups, showTravelGroupFilter, travelGroupFilter]);

  React.useEffect(() => {
    setProgramClientPageSize(PROGRAM_DETAIL_DEFAULT_PAGE_SIZE);
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [program.id]);

  React.useEffect(() => {
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [debouncedClientSearch, filter, packageFilter, serviceTypeFilter, travelGroupFilter, programTab]);

  React.useEffect(() => {
    setProgramClientPage((current) => Math.min(Math.max(1, current), totalProgramClientPages));
  }, [totalProgramClientPages]);

  React.useEffect(() => {
    if (!headerActionsOpen) return undefined;
    const handleOutside = (event) => {
      if (headerActionsRef.current?.contains(event.target)) return;
      setHeaderActionsOpen(false);
      setHoveredHeaderAction("");
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setHeaderActionsOpen(false);
        setHoveredHeaderAction("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [headerActionsOpen]);

  React.useEffect(() => {
    if (!packageFilterOpen && !statusFilterOpen && !serviceTypeFilterOpen && !travelGroupFilterOpen) return undefined;
    const handleOutside = (event) => {
      if (packageFilterOpen && packageFilterRef.current && !packageFilterRef.current.contains(event.target)) {
        setPackageFilterOpen(false);
      }
      if (statusFilterOpen && statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setStatusFilterOpen(false);
      }
      if (serviceTypeFilterOpen && serviceTypeFilterRef.current && !serviceTypeFilterRef.current.contains(event.target)) {
        setServiceTypeFilterOpen(false);
      }
      if (travelGroupFilterOpen && travelGroupFilterRef.current && !travelGroupFilterRef.current.contains(event.target)) {
        setTravelGroupFilterOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setPackageFilterOpen(false);
      setStatusFilterOpen(false);
      setServiceTypeFilterOpen(false);
      setTravelGroupFilterOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [packageFilterOpen, statusFilterOpen, serviceTypeFilterOpen, travelGroupFilterOpen]);

  React.useEffect(() => {
    if (!bulkActionsOpen) return undefined;
    const handleOutside = (event) => {
      if (bulkActionsMenuRef.current?.contains(event.target)) return;
      if (bulkActionsBtnRef.current?.contains(event.target)) return;
      setBulkActionsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setBulkActionsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bulkActionsOpen]);

  React.useEffect(() => {
    if (!bulkActionsOpen) return undefined;
    const closeOnScroll = () => setBulkActionsOpen(false);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => window.removeEventListener("scroll", closeOnScroll, true);
  }, [bulkActionsOpen]);

  const toggleCheck = React.useCallback((id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, [setCheckedIds]);

  const clearSelection = React.useCallback(() => setCheckedIds(new Set()), [setCheckedIds]);

  const toggleAllFiltered = React.useCallback(() => {
    if (!paginatedProgramClients.length) return;
    const filteredIds = paginatedProgramClients.map((client) => client.id);
    setCheckedIds((prev) => {
      const allVisibleSelected = filteredIds.every((id) => prev.has(id));
      if (allVisibleSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  }, [paginatedProgramClients, setCheckedIds]);

  const exitSelectMode = React.useCallback(() => {
    setSelectMode(false);
    clearSelection();
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [clearSelection, setSelectMode, setTransferSheetOpen, setTransferTargets]);

  const openTransferSheet = React.useCallback((ids) => {
    const nextIds = Array.from(new Set((Array.isArray(ids) ? ids : [ids])
      .map((id) => String(id || ""))
      .filter(Boolean)));
    if (!nextIds.length) return;
    runWithGlobalDetailData(() => {
      setTransferTargets(nextIds);
      setTransferSheetOpen(true);
    });
  }, [runWithGlobalDetailData, setTransferSheetOpen, setTransferTargets]);

  const closeTransferSheet = React.useCallback(() => {
    setTransferTargets([]);
    setTransferSheetOpen(false);
  }, [setTransferSheetOpen, setTransferTargets]);

  const handleTransferSelected = React.useCallback(() => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    setBulkActionsOpen(false);
    openTransferSheet(Array.from(checkedIds));
  }, [checkedIds, onToast, t.noClientsSelected, openTransferSheet]);

  const handleDeleteSelectedClick = React.useCallback(() => {
    if (!checkedIds.size) {
      onToast(t.noClientsSelected || "يرجى اختيار معتمر واحد على الأقل", "info");
      return;
    }
    setBulkActionsOpen(false);
    runWithGlobalDetailData(() => setBulkDeleteOpen(true));
  }, [checkedIds, onToast, runWithGlobalDetailData, t.noClientsSelected]);

  const handleConfirmDeleteSelected = React.useCallback(async () => {
    const ids = Array.from(checkedIds);
    if (!ids.length) {
      setBulkDeleteOpen(false);
      return;
    }
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    const deletedCount = typeof deleteClientsBulk === "function"
      ? deleteClientsBulk(ids)
      : ids.reduce((count, id) => {
          if (typeof deleteClient !== "function") return count;
          deleteClient(id);
          return count + 1;
        }, 0);
    setBulkDeleteOpen(false);
    exitSelectMode();
    refreshScopedProgramDetail();
    onToast(tr("bulkDeleteSuccess", { count: deletedCount || ids.length }), "info");
  }, [checkedIds, deleteClientsBulk, deleteClient, ensureGlobalDetailDataForCurrentAction, exitSelectMode, onToast, refreshScopedProgramDetail, tr]);

  const transferList = React.useMemo(
    () => {
      const clientsById = new Map();
      [...progClients, ...activeClients, ...clients].forEach((client) => {
        const id = String(client?.id || "");
        if (id && !clientsById.has(id)) clientsById.set(id, client);
      });
      return transferTargets
        .map((id) => clientsById.get(String(id || "")))
        .filter(Boolean);
    },
    [transferTargets, progClients, activeClients, clients]
  );

  const transferDestinationPrograms = React.useMemo(() => {
    const programsById = new Map();
    (Array.isArray(allPrograms) ? allPrograms : []).forEach((destinationProgram) => {
      if (!isActiveTransferDestinationProgram(destinationProgram)) return;
      const id = String(destinationProgram.id || "");
      if (id && !programsById.has(id)) programsById.set(id, destinationProgram);
    });
    return Array.from(programsById.values());
  }, [allPrograms]);

  const programOccupancy = React.useMemo(() => {
    const map = new Map();
    (activeClients || []).forEach(c => {
      const programId = String(c.programId || c.program_id || "");
      if (!programId) return;
      map.set(programId, (map.get(programId) || 0) + 1);
    });
    return map;
  }, [activeClients]);

  const handleTransferConfirm = React.useCallback(async (programId) => {
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    const destination = allPrograms.find(p => String(p.id || "") === String(programId || ""));
    if (!destination) {
      onToast(t.programNotFound || "البرنامج غير متاح", "error");
      return;
    }
    const clientsToMove = transferList;
    if (!clientsToMove.length) {
      onToast(t.noClientsSelected || "لم يتم اختيار أي معتمر", "info");
      closeTransferSheet();
      return;
    }
    const currentCount = programOccupancy.get(String(programId || "")) || 0;
    const incomingCount = clientsToMove.filter((client) => String(getClientProgramId(client) || "") !== String(programId || "")).length;
    const capacityInfo = getProgramCapacityInfo(destination, currentCount, incomingCount);
    if (!capacityInfo.canAddRequested) {
      onToast(getProgramCapacityMessage({
        program: destination,
        lang,
        messages: t,
        action: "transfer",
        countToAdd: incomingCount,
        remainingSeats: capacityInfo.remainingSeats || 0,
      }), "error");
      return;
    }
    const movedCount = transferClients(clientsToMove.map((client) => client.id), programId);
    if (!movedCount) {
      onToast(t.noClientsSelected || "لم يتم اختيار أي معتمر", "info");
      closeTransferSheet();
      return;
    }
    onToast(tr("transferSuccess", { count: movedCount, program: destination.name }), "success");
    closeTransferSheet();
    exitSelectMode();
    refreshScopedProgramDetail();
  }, [allPrograms, ensureGlobalDetailDataForCurrentAction, transferList, programOccupancy, transferClients, onToast, lang, t, tr, closeTransferSheet, exitSelectMode, refreshScopedProgramDetail]);

  const selectedVisibleCount = React.useMemo(
    () => paginatedProgramClients.reduce((count, client) => count + (checkedIds.has(client.id) ? 1 : 0), 0),
    [paginatedProgramClients, checkedIds]
  );
  const allChecked = selectedVisibleCount === paginatedProgramClients.length && paginatedProgramClients.length > 0;
  const partiallyChecked = selectedVisibleCount > 0 && !allChecked;
  const handleProgramClientPageSizeChange = React.useCallback((event) => {
    const nextSize = Number(event.target.value) || PROGRAM_DETAIL_DEFAULT_PAGE_SIZE;
    setProgramClientPageSize(nextSize);
    setProgramClientPage(1);
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, []);
  const goToProgramClientPage = React.useCallback((nextPage) => {
    setProgramClientPage(Math.min(Math.max(1, nextPage), totalProgramClientPages));
    setCheckedIds(new Set());
    setBulkActionsOpen(false);
  }, [totalProgramClientPages]);

  const totals = React.useMemo(() => computeProgramClientTotals({
    clients: progClients,
    program,
    getClientTotalPaid: getListClientTotalPaid,
  }), [progClients, getListClientTotalPaid, program]);
  const totalRem  = totals.remaining;
  const statusCounts = React.useMemo(() => computeProgramClientStatusCounts({
    clients: progClients,
    program,
    getClientTotalPaid: getListClientTotalPaid,
  }), [progClients, getListClientTotalPaid, program]);
  const pct       = progClients.length > 0 ? Math.round((statusCounts.cleared/progClients.length)*100) : 0;

  const filters = buildProgramClientStatusFilters({
    clients: progClients,
    statusCounts,
    labels: {
      all: t.all,
      cleared: t.clearedFilter,
      partial: t.partialFilter,
      unpaid: t.unpaidFilter,
      informationIncomplete: t.incompleteInfoFilter,
    },
  });
  const activeStatusFilter = filters.find(f => f.key === filter) || filters[0];
  const serviceTypeFilters = React.useMemo(() => buildProgramClientServiceTypeFilters({
    clients: progClients,
    t,
    lang,
  }), [progClients, t, lang]);
  const activeServiceTypeFilter = serviceTypeFilters.find(f => f.key === serviceTypeFilter) || serviceTypeFilters[0];
  const packageChips = React.useMemo(() => buildProgramClientPackageChips({
    clients: progClients,
    packages,
    program,
    getClientTotalPaid: getListClientTotalPaid,
    labels: {
      all: t.all,
      incomplete: completionLabels.incompleteFilter,
      unassigned: t.noHotel || "غير محدد",
    },
    lang,
  }), [completionLabels.incompleteFilter, getListClientTotalPaid, packages, progClients, program, t, lang]);
  const selectedPackageDetail = packageFilter === "all" || packageFilter === "__unassigned" || packageFilter === INCOMPLETE_INFO_FILTER
    ? null
    : packages.find(pkg => pkg.level === packageFilter) || null;
  const activePackageChip = packageChips.find(chip => chip.key === packageFilter) || packageChips[0];
  const searchExpanded = searchOpen || search.trim().length > 0;
  const filterMenuBaseStyle = {
    position:"absolute",
    top:"calc(100% + 6px)",
    zIndex:20,
    background:"var(--rukn-menu-bg)",
    border:"1px solid var(--rukn-menu-border)",
    borderRadius:12,
    boxShadow:"var(--rukn-menu-shadow)",
    padding:6,
  };
  const filterMenuItemStyle = (active) => ({
    width:"100%",
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    gap:10,
    border:0,
    borderRadius:9,
    padding:"8px 9px",
    background:active ? "var(--rukn-gold-dim)" : "transparent",
    color:active ? "var(--rukn-gold)" : "var(--rukn-text)",
    fontSize:12,
    fontWeight:active ? 800 : 600,
    cursor:"pointer",
    fontFamily:"'Cairo',sans-serif",
    textAlign:"start",
  });
  const filterMenuCountStyle = (active) => ({
    minWidth:20,
    textAlign:"center",
    borderRadius:999,
    padding:"0 6px",
    background:active ? "rgba(212,175,55,.14)" : "var(--rukn-bg-soft)",
    color:active ? "var(--rukn-gold)" : "var(--rukn-text-muted)",
    fontSize:10,
  });
  const tableGridTemplate = selectMode
    ? "38px 44px minmax(0,2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.8fr)"
    : "44px minmax(0,2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.8fr)";
  const totalsGridColumn = selectMode ? "1 / span 4" : "1 / span 3";
  const packageById = React.useMemo(() => new Map(packages.map((pkg) => [pkg.id, pkg])), [packages]);
  const packageByLevel = React.useMemo(() => new Map(packages.map((pkg) => [pkg.level, pkg])), [packages]);
  const headerActionsLabel = lang === "fr" ? "Actions" : lang === "en" ? "Actions" : "إجراءات";
  const badgeExportProgressLabel = React.useMemo(
    () => badgeExportProgress ? getBadgeExportProgressLabel(badgeExportProgress, lang) : "",
    [badgeExportProgress, lang]
  );
  const badgeExportProgressPercent = Math.max(0, Math.min(100, Math.round(Number(badgeExportProgress?.percent) || 0)));
  const badgeExportActionLabel = badgeExportBusy
    ? (badgeExportProgressLabel || (lang === "fr" ? "Préparation des badges..." : lang === "en" ? "Preparing badges..." : "جاري تجهيز الشارات..."))
    : (lang === "fr" ? "Télécharger les badges PDF" : lang === "en" ? "Download program badges PDF" : "تحميل شارات البرنامج PDF");
  const allLevelsExportLabel = React.useMemo(() => {
    if (lang === "fr") return "Tous les niveaux";
    if (lang === "en") return "All levels";
    return "كل المستويات";
  }, [lang]);
  const amadeusExportLabel = React.useMemo(() => {
    if (lang === "fr") return "Exporter Amadeus Excel";
    if (lang === "en") return "Export Amadeus Excel";
    return "تصدير Amadeus Excel";
  }, [lang]);
  const wordContractsExportLabels = React.useMemo(() => ({
    action: lang === "fr" ? "Exporter les contrats Word" : lang === "en" ? "Export Word contracts" : "تصدير عقود Word",
    busy: lang === "fr" ? "Génération des contrats Word..." : lang === "en" ? "Generating Word contracts..." : "جاري تجهيز عقود Word...",
    loading: t.loading || (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
    noClients: lang === "fr" ? "Aucun pèlerin à exporter." : lang === "en" ? "No pilgrims available for contract export." : "لا يوجد معتمرون لتصدير عقودهم",
    success: lang === "fr" ? "Les contrats Word ont été générés avec succès." : lang === "en" ? "Word contracts generated successfully." : "تم تجهيز عقود Word بنجاح",
    missingTemplate: lang === "fr" ? "Importez d’abord le modèle de contrat Word." : lang === "en" ? "Upload the Word contract template first." : "ارفع قالب العقد أولًا لتصدير عقود Word.",
    error: lang === "fr" ? "Impossible d’exporter les contrats Word." : lang === "en" ? "Unable to export Word contracts." : "تعذر تصدير عقود Word",
  }), [lang, t.loading]);
  const contractsDisabledMessage = React.useMemo(() => (
    lang === "fr"
      ? "La fonction contrats n’est pas activée pour cette agence."
      : lang === "en"
        ? "Contracts are not enabled for this agency."
        : "ميزة العقود غير مفعلة لهذه الوكالة."
  ), [lang]);
  const programPostersDisabledMessage = React.useMemo(() => (
    lang === "fr"
      ? "Les affiches de programmes ne sont pas activées pour cette agence."
      : lang === "en"
        ? "Program posters are not enabled for this agency."
        : "ميزة ملصقات البرامج غير مفعلة لهذه الوكالة."
  ), [lang]);
  const posterExportLabels = React.useMemo(() => getPosterExportLabels(lang, t), [lang, t]);
  const costingLabels = React.useMemo(() => getProgramCostingLabels(lang), [lang]);
  const defaultPosterTitle = React.useMemo(() => getDefaultPosterTitle(program, lang), [program, lang]);
  const closeHeaderActions = React.useCallback(() => {
    setHeaderActionsOpen(false);
    setHoveredHeaderAction("");
  }, []);
  const closePosterTemplateChoice = React.useCallback(() => {
    if (posterExportBusy) return;
    setPosterTemplateChoice(null);
    setPosterTemplateChoiceId("");
    setPosterShowDates(true);
    setPosterTitleOverride(defaultPosterTitle);
  }, [defaultPosterTitle, posterExportBusy]);
  const openPosterTemplateChoice = React.useCallback((choice) => {
    setPosterShowDates(true);
    setPosterTitleOverride(defaultPosterTitle);
    setPosterTemplateChoice(choice);
    setPosterTemplateChoiceId(OFFICIAL_RUKN_POSTER_CHOICE_ID);
  }, [defaultPosterTitle]);
  const getPosterOptions = React.useCallback(() => ({
    showDates: posterShowDates !== false,
    titleOverride: String(posterTitleOverride || "").trim(),
  }), [posterShowDates, posterTitleOverride]);
  const generatePosterFromTemplate = React.useCallback(async (template) => {
    const imageUrl = await getPosterTemplateImageUrl(template);
    if (!imageUrl) throw new Error("missing-template-image");
    const blob = await generateProgramPosterPng({
      template,
      imageUrl,
      program,
      lang,
    });
    downloadPosterBlob(blob, buildProgramPosterFilename(program, lang));
  }, [lang, program]);
  const generateCodePoster = React.useCallback(async (templateKey = OFFICIAL_RUKN_CODE_TEMPLATE_KEY) => {
    const codeTemplate = await loadCodePosterTemplate(templateKey, { program });
    if (!codeTemplate?.renderPoster) throw new Error("missing-code-poster-template");
    const blob = await codeTemplate.renderPoster({
      program,
      agency,
      locale: lang,
      posterOptions: getPosterOptions(),
    });
    downloadPosterBlob(blob, buildProgramPosterFilename(program, lang));
  }, [agency, getPosterOptions, lang, program]);
  const runPosterTemplateDownload = React.useCallback(async (template) => {
    if (!programPostersEnabled) {
      onToast?.(programPostersDisabledMessage, "info");
      return;
    }
    if (!template || posterExportBusy) return;
    setPosterExportBusy(true);
    try {
      await generatePosterFromTemplate(template);
      setPosterTemplateChoice(null);
      setPosterTemplateChoiceId("");
      setPosterShowDates(true);
      setPosterTitleOverride(defaultPosterTitle);
      onToast?.(posterExportLabels.success, "success");
    } catch (error) {
      console.error("[ProgramPoster] Poster generation failed:", error);
      onToast?.(
        error?.message === "missing-template-image" ? posterExportLabels.missingImage : posterExportLabels.error,
        "error"
      );
    } finally {
      setPosterExportBusy(false);
    }
  }, [defaultPosterTitle, generatePosterFromTemplate, onToast, posterExportBusy, posterExportLabels.error, posterExportLabels.missingImage, posterExportLabels.success, programPostersDisabledMessage, programPostersEnabled]);
  const runCodePosterDownload = React.useCallback(async (templateKey = OFFICIAL_RUKN_CODE_TEMPLATE_KEY) => {
    if (posterExportBusy) return;
    setPosterExportBusy(true);
    try {
      await generateCodePoster(templateKey);
      setPosterTemplateChoice(null);
      setPosterTemplateChoiceId("");
      setPosterShowDates(true);
      setPosterTitleOverride(defaultPosterTitle);
      onToast?.(posterExportLabels.success, "success");
    } catch (error) {
      console.error("[ProgramPoster] Code poster generation failed:", error);
      onToast?.(posterExportLabels.error, "error");
    } finally {
      setPosterExportBusy(false);
    }
  }, [defaultPosterTitle, generateCodePoster, onToast, posterExportBusy, posterExportLabels.error, posterExportLabels.success]);
  const runOfficialPosterDownload = React.useCallback(() => (
    runCodePosterDownload(OFFICIAL_RUKN_CODE_TEMPLATE_KEY)
  ), [runCodePosterDownload]);
  const handleProgramPosterDownload = React.useCallback(async () => {
    closeHeaderActions();
    if (posterExportBusy) return;

    const defaultTemplate = resolveDefaultPosterTemplate({
      agency,
      availableCodeTemplates: assignedCodePosterTemplates,
    });
    runCodePosterDownload(defaultTemplate.key);
  }, [agency, assignedCodePosterTemplates, closeHeaderActions, posterExportBusy, runCodePosterDownload]);
  const handlePosterTemplateChoiceDownload = React.useCallback(() => {
    if (!programPostersEnabled) {
      onToast?.(programPostersDisabledMessage, "info");
      return;
    }
    if (posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID) {
      runOfficialPosterDownload();
      return;
    }
    const selectedCodeTemplate = posterTemplateChoice?.codeTemplates?.find((template) => template.key === posterTemplateChoiceId);
    if (selectedCodeTemplate) {
      runCodePosterDownload(selectedCodeTemplate.key);
      return;
    }
    const selectedTemplate = posterTemplateChoice?.templates?.find((template) => template.id === posterTemplateChoiceId)
      || posterTemplateChoice?.templates?.[0];
    runPosterTemplateDownload(selectedTemplate);
  }, [onToast, posterTemplateChoice, posterTemplateChoiceId, programPostersDisabledMessage, programPostersEnabled, runCodePosterDownload, runOfficialPosterDownload, runPosterTemplateDownload]);
  const posterOptionsVisible = posterTemplateChoiceId === OFFICIAL_RUKN_POSTER_CHOICE_ID
    || posterTemplateChoiceId === TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY;
  const getCurrentExportClients = React.useCallback(() => filtered, [filtered]);
  const notifyNoExportClients = React.useCallback(() => {
    onToast(participantTerms.noMatching, "info");
  }, [onToast, participantTerms.noMatching]);
  const exportScopeDialogTitle = React.useMemo(() => (
    lang === "fr"
      ? "Choisir la portée de l’export"
      : lang === "en"
        ? "Choose export scope"
        : "اختر نطاق التصدير"
  ), [lang]);
  const exportScopeConfirmLabel = React.useMemo(() => (
    lang === "fr" ? "Exporter" : lang === "en" ? "Export" : "تصدير"
  ), [lang]);
  const exportScopeCancelLabel = React.useMemo(() => (
    lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء"
  ), [lang]);
  const exportScopeEmptyMessage = React.useMemo(() => (
    lang === "fr"
      ? `Aucun ${participantTerms.plural || "pèlerin"} dans cette portée.`
      : lang === "en"
        ? `No ${participantTerms.plural || "pilgrims"} in this scope.`
        : `لا يوجد ${participantTerms.plural || "حجاج"} في هذا النطاق.`
  ), [lang, participantTerms.plural]);
  const exportScopeInvalidMessage = React.useMemo(() => (
    lang === "fr"
      ? "Impossible de déterminer la portée de l’export. Actualisez la page et réessayez."
      : lang === "en"
        ? "Unable to determine the export scope. Please refresh the page and try again."
        : "تعذر تحديد نطاق التصدير. يرجى تحديث الصفحة والمحاولة مرة أخرى."
  ), [lang]);
  const wordContractsMixedTravelGroupMessage = React.useMemo(() => (
    lang === "fr"
      ? "Impossible de générer certains contrats car le représentant et certains mineurs sont liés à des groupes de voyage différents. Veuillez harmoniser le groupe de voyage ou les remettre dans le programme principal, puis réessayer."
      : lang === "en"
        ? "Some contracts could not be generated because the representative and some minors are assigned to different travel groups. Please align their travel group or move them back to the main program, then try again."
        : "تعذر إنشاء بعض العقود لأن الممثل وبعض القاصرين مرتبطون بأفواج سفر مختلفة. يرجى توحيد فوج السفر لهم أو إرجاعهم إلى البرنامج الأساسي ثم المحاولة مرة أخرى."
  ), [lang]);
  const wordContractsAllMixedTravelGroupMessage = React.useMemo(() => (
    lang === "fr"
      ? "Impossible de générer le fichier de contrats car tous les contrats sélectionnés ont un conflit de groupe de voyage entre le représentant et les mineurs."
      : lang === "en"
        ? "The contracts ZIP could not be generated because every selected contract has a travel-group conflict between the representative and minors."
        : "تعذر إنشاء ملف العقود لأن جميع العقود المحددة فيها اختلاف فوج السفر بين الممثل والقاصرين."
  ), [lang]);
  const getWordContractsSkippedTravelGroupMessage = React.useCallback((count, skippedErrors = []) => {
    const skippedCount = Number(count) || 0;
    const skippedNames = (Array.isArray(skippedErrors) ? skippedErrors : [])
      .map((error) => {
        const memberNames = Array.isArray(error?.contractMemberNames) ? error.contractMemberNames : [];
        const memberIds = Array.isArray(error?.contractMemberIds) ? error.contractMemberIds : [];
        return [
          error?.contractClientName,
          error?.sourceClientName,
          memberNames[0],
          error?.contractClientId,
          error?.sourceClientId,
          memberIds[0],
        ]
          .map((value) => String(value ?? "").trim())
          .find(Boolean);
      })
      .filter(Boolean);
    const visibleNames = skippedNames.slice(0, 5);
    const hiddenCount = Math.max(0, skippedCount - visibleNames.length);
    const nameLines = visibleNames.map((name) => `* ${name}`);
    if (hiddenCount > 0) {
      nameLines.push(
        lang === "fr"
          ? `et ${hiddenCount} autres`
          : lang === "en"
            ? `and ${hiddenCount} others`
            : `و ${hiddenCount} آخرون`
      );
    }
    const namesBlock = nameLines.length ? `\n\n${nameLines.join("\n")}` : "";
    return lang === "fr"
      ? `Le fichier de contrats a été généré, mais ${skippedCount} contrat(s) ont été ignorés à cause d’un conflit de groupe de voyage entre le représentant et les mineurs :${namesBlock}\n\nVeuillez harmoniser le groupe de voyage puis réessayer.`
      : lang === "en"
        ? `The contracts ZIP was generated, but ${skippedCount} contract(s) were skipped because the representative and minors are assigned to different travel groups:${namesBlock}\n\nPlease align their travel group and try again.`
        : `تم إنشاء ملف العقود، لكن تم تجاوز ${skippedCount} عقد بسبب اختلاف فوج السفر بين الممثل والقاصر:${namesBlock}\n\nيرجى توحيد فوج السفر لهم ثم إعادة المحاولة.`;
  }, [lang]);
  const exportScopeInitialScope = React.useMemo(() => (
    exportScopeDialogAction === PROGRAM_EXPORT_ACTIONS.WORD_CONTRACTS && checkedIds.size > 0
      ? PROGRAM_ACTION_SCOPES.SELECTED
      : PROGRAM_ACTION_SCOPES.CURRENT_FILTERED
  ), [checkedIds.size, exportScopeDialogAction]);
  const resolveCurrentExportScope = React.useCallback((scope) => (
    resolveProgramActionClients({
      scope,
      programClients: progClients,
      filteredClients: travelGroupFiltered,
      checkedIds,
      travelGroups: isHajjProgram ? currentProgramTravelGroups : [],
    })
  ), [checkedIds, currentProgramTravelGroups, isHajjProgram, progClients, travelGroupFiltered]);
  const exportScopeOptions = React.useMemo(() => (
    buildProgramActionScopeOptions({
      checkedIds,
      travelGroups: isHajjProgram ? currentProgramTravelGroups : [],
      includeCurrentFiltered: true,
    })
      .filter((option) => (
        isHajjProgram
        || (
          option.scope !== PROGRAM_ACTION_SCOPES.MAIN_PROGRAM
          && !isTravelGroupScope(option.scope)
        )
      ))
      .map((option) => {
        const resolved = resolveCurrentExportScope(option.scope);
        return {
          ...option,
          label: resolved.label || option.label,
          count: resolved.count,
          isValid: resolved.isValid,
          reason: resolved.reason,
        };
      })
  ), [checkedIds, currentProgramTravelGroups, isHajjProgram, resolveCurrentExportScope]);
  const openExportScopeDialog = React.useCallback(async (action) => {
    closeHeaderActions();
    const requiresGlobalDetail = action === PROGRAM_EXPORT_ACTIONS.PDF || !useScopedProgramDetail;
    if (requiresGlobalDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    setExportScopeDialogAction(action);
  }, [closeHeaderActions, ensureGlobalDetailDataForCurrentAction, useScopedProgramDetail]);
  const closeExportScopeDialog = React.useCallback(() => {
    setExportScopeDialogAction(null);
  }, []);
  const runProgramPdfExport = React.useCallback((exportClients) => {
    printProgramPDF({
      program,
      clients: exportClients,
      getClientStatus: (client) => getProgramClientPaymentStatus(program, client, getClientTotalPaid(client.id)),
      getClientOfficialPrice: (client) => getProgramClientOfficialPrice(program, client),
      getClientSalePrice: (client) => getProgramClientSalePrice(program, client),
      getClientRemainingAmount: (client, paid) => getProgramClientRemainingAmount(program, client, paid),
      getClientTotalPaid,
      getClientPayments,
      lang,
      t,
      agency,
    });
  }, [agency, getClientPayments, getClientTotalPaid, lang, program, t]);
  const handleProgramPdfExport = React.useCallback(() => {
    openExportScopeDialog(PROGRAM_EXPORT_ACTIONS.PDF);
  }, [openExportScopeDialog]);
  const runAmadeusExcelExport = React.useCallback(async (exportClients) => {
    try {
      const selectedLevelLabel = packageFilter === "all"
        ? allLevelsExportLabel
        : (activePackageChip?.label || packageFilter || allLevelsExportLabel);
      const result = await downloadAmadeusExcel(exportClients, program, {
        agency,
        lang,
        selectedLevelLabel,
      });
      const reviewText = result.reviewCount
        ? (lang === "fr"
          ? ` — ${result.reviewCount} ligne(s) à vérifier`
          : lang === "en"
            ? ` — ${result.reviewCount} row(s) need review`
            : ` — ${result.reviewCount} سطر يحتاج للمراجعة`)
        : "";
      const successText = lang === "fr"
        ? `Export Amadeus prêt — ${result.total} pèlerin(s)${reviewText}`
        : lang === "en"
          ? `Amadeus export ready — ${result.total} pilgrim(s)${reviewText}`
          : `تم تصدير ملف Amadeus — ${result.total} معتمر${reviewText}`;
      onToast(successText, result.reviewCount ? "info" : "success");
    } catch (error) {
      onToast(
        lang === "fr"
          ? "Impossible de générer le fichier Amadeus"
          : lang === "en"
            ? "Unable to generate Amadeus file"
            : "تعذر إنشاء ملف Amadeus",
        "error"
      );
    }
  }, [activePackageChip?.label, agency, allLevelsExportLabel, lang, onToast, packageFilter, program]);
  const handleAmadeusExport = React.useCallback(() => {
    openExportScopeDialog(PROGRAM_EXPORT_ACTIONS.AMADEUS_EXCEL);
  }, [openExportScopeDialog]);
  const runPassportListWordExport = React.useCallback((exportClients) => {
    try {
      const result = downloadPassportListWord({ program, clients: exportClients });
      if (!result.ok) {
        onToast(t.noPilgrimsToExport || (lang === "fr" ? "Aucun pèlerin à exporter" : lang === "en" ? "No pilgrims to export" : "لا يوجد معتمرون لتصديرهم"), "info");
        return;
      }
      onToast(t.passportListWordExported || (lang === "fr" ? "Liste passeports Word exportée avec succès" : lang === "en" ? "Passport list Word exported successfully" : "تم تصدير لائحة الجوازات بنجاح"), "success");
    } catch (error) {
      console.error("[Programs] Passport list Word export failed:", error);
      onToast(t.error || (lang === "fr" ? "Erreur inattendue" : lang === "en" ? "Unexpected error" : "خطأ غير متوقع"), "error");
    }
  }, [lang, onToast, program, t.error, t.noPilgrimsToExport, t.passportListWordExported]);
  const handlePassportListWordExport = React.useCallback(() => {
    openExportScopeDialog(PROGRAM_EXPORT_ACTIONS.PASSPORT_LIST_WORD);
  }, [openExportScopeDialog]);
  const handleBadgePdfExport = React.useCallback(async () => {
    if (!badgesEnabled) {
      return;
    }
    if (badgeExportBusy) return;
    closeHeaderActions();
    if (!useScopedProgramDetail) {
      const ready = await ensureGlobalDetailDataForCurrentAction();
      if (!ready) return;
    }
    const exportClients = getCurrentExportClients();
    if (exportClients.length === 0) { notifyNoExportClients(); return; }
    setBadgeExportProgress({ step: "template", current: 0, total: exportClients.length, percent: 0 });
    setBadgeExportBusy(true);
    try {
      await downloadProgramBadgesPdf({
        agencyId: store.agencyId,
        clients: exportClients,
        program,
        agency,
        lang,
        onProgress: setBadgeExportProgress,
      });
    } catch (error) {
      onToast(
        error?.message === "missing-template"
          ? "لا يوجد قالب شارة لهذا البرنامج بعد."
          : "تعذر تصدير شارات البرنامج",
        "error"
      );
    } finally {
      setBadgeExportBusy(false);
      setBadgeExportProgress(null);
    }
  }, [agency, badgeExportBusy, badgesEnabled, closeHeaderActions, ensureGlobalDetailDataForCurrentAction, getCurrentExportClients, lang, notifyNoExportClients, onToast, program, store.agencyId, useScopedProgramDetail]);
  const handlePassportImportOpen = React.useCallback(() => {
    closeHeaderActions();
    runWithGlobalDetailData(() => {
      if (!ensureCurrentProgramCanAdd(1, "import")) return;
      setShowPassportImport(true);
    });
  }, [closeHeaderActions, ensureCurrentProgramCanAdd, runWithGlobalDetailData]);
  const handleExcelImportOpen = React.useCallback(() => {
    closeHeaderActions();
    runWithGlobalDetailData(() => {
      if (!ensureCurrentProgramCanAdd(1, "import")) return;
      setShowExcelImport(true);
    });
  }, [closeHeaderActions, ensureCurrentProgramCanAdd, runWithGlobalDetailData]);
  const handleEditProgram = React.useCallback(() => {
    closeHeaderActions();
    onEditProgram?.(progClients);
  }, [closeHeaderActions, onEditProgram, progClients]);
  const handleCostingOpen = React.useCallback(() => {
    closeHeaderActions();
    setCostingOpen(true);
  }, [closeHeaderActions]);
  const handleToggleNusukUpload = React.useCallback(() => {
    closeHeaderActions();
    if (!canUseNusukUpload) return;
    onToggleProgramNusukUpload?.(currentProgram);
  }, [canUseNusukUpload, closeHeaderActions, currentProgram, onToggleProgramNusukUpload]);
  const handleProgramTabChange = React.useCallback((nextTab) => {
    setProgramTab(nextTab);
    if (nextTab === "rooming") ensureGlobalDetailData({ notify: true });
  }, [ensureGlobalDetailData]);
  const runPilgrimsListExport = React.useCallback(async (exportClients) => {
    const XLSX = await import("xlsx");
    const labels = {
      localName: "الاسم الكامل",
      phone: "رقم الهاتف",
      registrationSource: "جهة التسجيل",
      serviceType: t.serviceType || (lang === "fr" ? "Type de service" : lang === "en" ? "Service type" : "نوع الخدمة"),
    };
    const { data, merges } = buildPilgrimsListSheet(exportClients, lang, labels);
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 24 }, { wch: 18 }];
    if (merges.length) ws["!merges"] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "pilgrims");
    const levelPart = packageFilter === "all" ? "all" : (activePackageChip?.label || packageFilter || "filtered");
    XLSX.writeFile(
      wb,
      `${participantTerms.kind === "hajj" ? "hajj-pilgrims-list" : "pilgrims-list"}-${slugifyFilePart(program.name)}-${slugifyFilePart(levelPart)}.xlsx`,
      { bookType: "xlsx", compression: true }
    );
    onToast(participantTerms.listExportReady || t.pilgrimsListExportReady || (lang === "fr" ? "Liste des pèlerins exportée" : lang === "en" ? "Pilgrims list exported" : "تم تصدير لائحة المعتمرين"), "success");
  }, [activePackageChip?.label, lang, onToast, packageFilter, participantTerms.kind, participantTerms.listExportReady, program.name, t.pilgrimsListExportReady, t.serviceType]);
  const handlePilgrimsListExport = React.useCallback(() => {
    openExportScopeDialog(PROGRAM_EXPORT_ACTIONS.PILGRIMS_LIST);
  }, [openExportScopeDialog]);
  const runContractsExcelExport = React.useCallback(async (exportClients) => {
    const XLSX = await import("xlsx");
    const rows = [
      CONTRACT_EXPORT_HEADERS,
      ...exportClients.map((client) => {
        const travelContext = resolveClientTravelContext(client, program, currentProgramTravelGroups);
        const contractProgram = travelContext.program || program;
        const pkgLevel = client.packageLevel || client.hotelLevel || "";
        const pkg = packageById.get(client.packageId || client.package_id) || packageByLevel.get(pkgLevel) || null;
        const fullName = getClientArabicName(client) || getClientLatinName(client) || resolveClientDisplayName(client, "");
        const passportNumber = pickFirstText(client.passport || {}, ["number"]) || pickFirstText(client, ["passportNumber", "passport_no", "passportNo"]);
        const cin = pickFirstText(client, [
          "cin", "CIN", "cinNumber", "cin_number", "nationalId", "national_id",
          "identityNumber", "identity_number", "idCardNumber", "id_card_number",
        ]);
        const departureDate = pickFirstText(contractProgram, ["departure", "departureDate", "departure_date"]);
        const returnDate = pickFirstText(contractProgram, ["returnDate", "return_date"]);
        const medinaHotel = pickFirstText(client, ["hotelMadina", "hotel_madina"]) || pkg?.hotelMadina || pickFirstText(contractProgram, ["hotelMadina", "hotel_madina"]);
        const makkahHotel = pickFirstText(client, ["hotelMecca", "hotel_mecca"]) || pkg?.hotelMecca || pickFirstText(contractProgram, ["hotelMecca", "hotel_mecca"]);
        const stayDates = calculateHotelStayDates({
          departureDate,
          returnDate,
          visitOrder: pickFirstText(contractProgram, ["visitOrder", "visit_order"]),
          hotelCheckinDay: pickFirstText(contractProgram, ["hotelCheckinDay", "hotel_checkin_day", "hotelCheckIn", "hotel_check_in"]),
          madinahNights: pkg?.madinahNights,
        });
        const roomType = safeCellValue(client.roomTypeLabel || getRoomTypeLabel(client.roomType) || "");
        const address = pickFirstText(client, ["address", "adress", "addressLine", "address_line", "homeAddress", "home_address"]);
        const company = pickFirstText(contractProgram, ["company", "compagnie", "airline", "carrier", "transport"]);
        return [
          safeCellValue(fullName),
          safeCellValue(passportNumber),
          safeCellValue(cin),
          safeCellValue(medinaHotel),
          safeCellValue(stayDates.medinaCheckIn),
          safeCellValue(stayDates.medinaCheckOut),
          safeCellValue(makkahHotel),
          safeCellValue(stayDates.makkahCheckIn),
          safeCellValue(stayDates.makkahCheckOut),
          safeCellValue(roomType),
          safeCellValue(address),
          safeCellValue(company),
          safeCellValue(formatDateForExcel(departureDate)),
          safeCellValue(formatDateForExcel(returnDate)),
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 15 }, { wch: 15 },
      { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 24 }, { wch: 18 },
      { wch: 14 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "contracts");
    XLSX.writeFile(wb, `Contrats-${slugifyFilePart(program.name)}.xlsx`, { bookType: "xlsx", compression: true });
    onToast(lang === "fr" ? "Export contrats prêt" : lang === "en" ? "Contracts export ready" : "تم تصدير Excel العقود", "success");
  }, [currentProgramTravelGroups, lang, onToast, packageById, packageByLevel, program]);
  const handleContractsExcelExport = React.useCallback(() => {
    if (!contractsEnabled) {
      onToast?.(contractsDisabledMessage, "info");
      return;
    }
    openExportScopeDialog(PROGRAM_EXPORT_ACTIONS.CONTRACTS_EXCEL);
  }, [contractsDisabledMessage, contractsEnabled, onToast, openExportScopeDialog]);
  const runWordContractsExport = React.useCallback(async (exportClients) => {
    setWordContractExportBusy(true);
    try {
      const result = await exportProgramWordContractsZip({
        agencyId: store.agencyId,
        clients: exportClients,
        programClients: progClients,
        program,
        travelGroups: currentProgramTravelGroups,
        getClientPayments,
        getClientTotalPaid,
        agency,
        lang,
      });
      if (result?.skippedCount > 0) {
        onToast(getWordContractsSkippedTravelGroupMessage(result.skippedCount, result.skippedErrors), "warning");
      } else {
        onToast(wordContractsExportLabels.success, "success");
      }
    } catch (error) {
      if (error?.code === "missing-contract-template") {
        onToast(wordContractsExportLabels.missingTemplate, "error");
      } else if (error?.code === "no-valid-contract-clients") {
        onToast(wordContractsAllMixedTravelGroupMessage, "error");
      } else if (error?.code === "mixed-contract-travel-context") {
        onToast(wordContractsMixedTravelGroupMessage, "error");
      } else if (error?.code === "no-contract-clients") {
        onToast(wordContractsExportLabels.noClients, "info");
      } else {
        console.error("[Contracts] Bulk Word export failed:", error);
        onToast(getContractGenerationErrorMessage(error, lang) || wordContractsExportLabels.error, "error");
      }
    } finally {
      setWordContractExportBusy(false);
    }
  }, [agency, currentProgramTravelGroups, getClientPayments, getClientTotalPaid, getWordContractsSkippedTravelGroupMessage, lang, onToast, progClients, program, store.agencyId, wordContractsAllMixedTravelGroupMessage, wordContractsExportLabels, wordContractsMixedTravelGroupMessage]);
  const handleConfirmExportScope = React.useCallback(async (scope) => {
    const action = exportScopeDialogAction;
    if (!action) return;

    const result = resolveCurrentExportScope(scope);
    if (!result.isValid) {
      onToast(exportScopeInvalidMessage, "error");
      return;
    }
    if (result.count === 0) {
      onToast(exportScopeEmptyMessage, "info");
      return;
    }

    setExportScopeDialogAction(null);
    if (action === PROGRAM_EXPORT_ACTIONS.PDF) {
      runProgramPdfExport(result.clients);
      return;
    }
    if (action === PROGRAM_EXPORT_ACTIONS.PILGRIMS_LIST) {
      await runPilgrimsListExport(result.clients);
      return;
    }
    if (action === PROGRAM_EXPORT_ACTIONS.AMADEUS_EXCEL) {
      await runAmadeusExcelExport(result.clients);
      return;
    }
    if (action === PROGRAM_EXPORT_ACTIONS.PASSPORT_LIST_WORD) {
      runPassportListWordExport(result.clients);
      return;
    }
    if (action === PROGRAM_EXPORT_ACTIONS.CONTRACTS_EXCEL) {
      await runContractsExcelExport(result.clients);
      return;
    }
    if (action === PROGRAM_EXPORT_ACTIONS.WORD_CONTRACTS) {
      await runWordContractsExport(result.clients);
    }
  }, [exportScopeDialogAction, exportScopeEmptyMessage, exportScopeInvalidMessage, onToast, resolveCurrentExportScope, runAmadeusExcelExport, runContractsExcelExport, runPassportListWordExport, runPilgrimsListExport, runProgramPdfExport, runWordContractsExport]);
  const handleWordContractsExport = React.useCallback(async () => {
    if (!contractsEnabled) {
      onToast?.(contractsDisabledMessage, "info");
      return;
    }
    closeHeaderActions();
    if (wordContractExportBusy) return;
    const ready = await ensureGlobalDetailDataForCurrentAction();
    if (!ready) return;
    if (!paymentsReady) {
      onToast(wordContractsExportLabels.loading, "info");
      return;
    }
    setExportScopeDialogAction(PROGRAM_EXPORT_ACTIONS.WORD_CONTRACTS);
  }, [closeHeaderActions, contractsDisabledMessage, contractsEnabled, ensureGlobalDetailDataForCurrentAction, onToast, paymentsReady, wordContractExportBusy, wordContractsExportLabels.loading]);
  const headerActions = React.useMemo(() => ([
    {
      key: "edit",
      icon: "edit",
      label: t.editProgramTitle || (lang === "fr" ? "Modifier le programme" : lang === "en" ? "Edit program" : "تعديل البرنامج"),
      onClick: handleEditProgram,
    },
    {
      key: "nusuk-upload",
      icon: showNusukUploadDisableAction ? "check" : "upload",
      label: canUseNusukUpload
        ? (showNusukUploadDisableAction ? "إيقاف الرفع لنسك" : "رفع لنسك")
        : NUSUK_UPLOAD_LAUNCH_LABEL,
      disabled: !canUseNusukUpload,
      helper: !canUseNusukUpload ? NUSUK_UPLOAD_LAUNCH_HELPER : "",
      title: !canUseNusukUpload ? NUSUK_UPLOAD_LAUNCH_HELPER : undefined,
      onClick: handleToggleNusukUpload,
    },
    {
      key: "costing",
      icon: "coins",
      label: costingLabels.action,
      onClick: handleCostingOpen,
    },
    {
      key: "excel-import",
      icon: "import",
      label: participantExcelImportLabel,
      onClick: handleExcelImportOpen,
    },
    {
      key: "passport",
      icon: "passport",
      label: participantTerms.passportImport || completionLabels.passportImport,
      onClick: handlePassportImportOpen,
    },
    {
      key: "pilgrims-list",
      icon: "download",
      label: participantTerms.exportListAction || t.exportPilgrimsList || (lang === "fr" ? "Exporter la liste des pèlerins" : lang === "en" ? "Export pilgrims list" : "تصدير لائحة المعتمرين"),
      onClick: handlePilgrimsListExport,
    },
    {
      key: "pdf",
      icon: "print",
      label: lang === "fr" ? "Exporter PDF" : lang === "en" ? "Export PDF" : "تصدير PDF",
      onClick: handleProgramPdfExport,
    },
    {
      key: "program-poster",
      icon: "download",
      label: posterExportBusy ? posterExportLabels.busy : posterExportLabels.action,
      onClick: handleProgramPosterDownload,
    },
    {
      key: "amadeus",
      icon: "clearance",
      label: amadeusExportLabel,
      onClick: handleAmadeusExport,
    },
    {
      key: "passport-list-word",
      icon: "file",
      label: t.exportPassportListWord || (lang === "fr" ? "Exporter la liste passeports Word" : lang === "en" ? "Export passport list Word" : "تصدير لائحة الجوازات Word"),
      onClick: handlePassportListWordExport,
    },
    {
      key: "badges",
      icon: "download",
      label: badgeExportActionLabel,
      disabled: badgeExportBusy,
      onClick: handleBadgePdfExport,
    },
    {
      key: "word-contracts",
      icon: "file",
      label: wordContractExportBusy ? wordContractsExportLabels.busy : wordContractsExportLabels.action,
      onClick: handleWordContractsExport,
    },
    {
      key: "contracts",
      icon: "download",
      label: lang === "fr" ? "Excel contrats" : lang === "en" ? "Contracts Excel" : "تصدير Excel للعقود",
      onClick: handleContractsExcelExport,
    },
  ].filter((action) => (
    (badgesEnabled || action.key !== "badges")
    && (contractsEnabled || (action.key !== "word-contracts" && action.key !== "contracts"))
  ))), [amadeusExportLabel, badgeExportActionLabel, badgeExportBusy, badgesEnabled, canUseNusukUpload, completionLabels.passportImport, contractsEnabled, costingLabels.action, handleAmadeusExport, handleBadgePdfExport, handleContractsExcelExport, handleCostingOpen, handleEditProgram, handleExcelImportOpen, handlePassportImportOpen, handlePassportListWordExport, handlePilgrimsListExport, handleProgramPdfExport, handleProgramPosterDownload, handleToggleNusukUpload, handleWordContractsExport, lang, participantExcelImportLabel, participantTerms.exportListAction, participantTerms.passportImport, posterExportBusy, posterExportLabels.action, posterExportLabels.busy, showNusukUploadDisableAction, t.editProgramTitle, t.exportPassportListWord, t.exportPilgrimsList, wordContractExportBusy, wordContractsExportLabels.action, wordContractsExportLabels.busy]);

  return (
    <div style={{ padding:"28px 32px" }}>

      {/* back + title */}
      <ProgramDetailHeader
        program={program}
        t={t}
        lang={lang}
        onBack={onBack}
        headerActionsRef={headerActionsRef}
        headerActionsLabel={headerActionsLabel}
        headerActionsOpen={headerActionsOpen}
        onToggleHeaderActions={() => setHeaderActionsOpen(open => !open)}
        headerActions={headerActions}
        hoveredHeaderAction={hoveredHeaderAction}
        setHoveredHeaderAction={setHoveredHeaderAction}
        nusukUploadToggleEnabled={canUseNusukUpload}
        onAddClient={() => runWithGlobalDetailData(() => {
          if (!ensureCurrentProgramCanAdd(1, "add")) return;
          setShowAddClient(true);
        })}
        addClientLabel={participantTerms.addAction || t.addClient}
      />

      {badgeExportBusy && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop:-12,
            marginBottom:18,
            padding:"10px 12px",
            border:"1px solid var(--rukn-progress-border)",
            borderRadius:10,
            background:"var(--rukn-progress-bg)",
            boxShadow:"var(--rukn-progress-shadow)",
            direction:dir,
          }}
        >
          <div style={{
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:12,
            flexWrap:"wrap",
            color:"var(--rukn-progress-text)",
            fontSize:12,
            fontWeight:800,
          }}>
            <span>{badgeExportProgressLabel || badgeExportActionLabel}</span>
            <span style={{ color:"var(--rukn-progress-accent)", fontVariantNumeric:"tabular-nums" }}>
              {badgeExportProgressPercent}%
            </span>
          </div>
          <div style={{
            height:6,
            marginTop:8,
            borderRadius:999,
            overflow:"hidden",
            background:"var(--rukn-progress-track)",
          }}>
            <div style={{
              width:`${badgeExportProgressPercent}%`,
              height:"100%",
              borderRadius:999,
              background:"var(--rukn-progress-fill)",
              transition:"width .18s ease",
            }} />
          </div>
        </div>
      )}

      {programPostersEnabled && (
        <ProgramPosterTemplateChoiceModal
          choice={posterTemplateChoice}
          selectedChoiceId={posterTemplateChoiceId}
          onSelectChoice={setPosterTemplateChoiceId}
          busy={posterExportBusy}
          onClose={closePosterTemplateChoice}
          onDownload={handlePosterTemplateChoiceDownload}
          labels={posterExportLabels}
          lang={lang}
          dir={dir}
          posterOptionsVisible={posterOptionsVisible}
          titleOverride={posterTitleOverride}
          onTitleOverrideChange={setPosterTitleOverride}
          showDates={posterShowDates}
          onToggleShowDates={() => setPosterShowDates((show) => !show)}
        />
      )}

      <ProgramDetailOverview
        activeTab={programTab}
        onTabChange={handleProgramTabChange}
        tabs={[
          { key:"clients", label:participantTerms.plural || t.clients, icon:"users" },
          { key:"rooming", label:t.roomingTab, icon:"hotel" },
        ]}
        showSummary={listDataReady && programTab !== "rooming"}
        statCards={[
          { icon:"users", label:t.registered, value:registeredCapacityValue, color:tc.gold },
          { icon:"success", label:t.cleared, value:statusCounts.cleared, color:tc.greenLight },
          { icon:"partial", label:t.partial, value:statusCounts.partial, color:tc.warning },
          { icon:"unpaid", label:t.unpaid, value:statusCounts.unpaid, color:tc.danger },
          { icon:"banknote", label:t.collected, value:formatCurrencyForLang(totals.paid), color:tc.gold },
          { icon:"hourglass", label:t.remaining, value:formatCurrencyForLang(totalRem), color:tc.warning },
        ]}
        clearanceLabel={t.programClearanceRate}
        clearanceValueLabel={`${pct}% ${t.cleared}`}
        clearancePercent={pct}
      />

      {!listDataReady ? (
        <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
          {t.loading || "Loading..."}
        </GlassCard>
      ) : programTab === "rooming" ? (
        !detailDataReady ? (
          <GlassCard style={{ padding:18, textAlign:"center", color:tc.grey, fontSize:13 }}>
            {t.loading || "Loading..."}
          </GlassCard>
        ) : (
          <RoomingWorkflowCanvas
            program={currentProgram}
            clients={progClients}
            packages={currentPackages}
            agency={agency}
            agencyLogoApi={store.agencyLogoApi}
            agencyId={store.agencyId}
            supabaseRoomingEnabled={store.isSupabaseEnabled}
            syncRoomingClientFields={store.syncRoomingClientFields}
            onToast={onToast}
            externalDataReady={!isScopedProgramDetailRefreshing}
            externalDataStatus={scopedProgramDetail.status}
          />
        )
      ) : (
        <>
      <ProgramPackageLevelsPanel
        packages={packages}
        packageFilter={packageFilter}
        setPackageFilter={setPackageFilter}
        packageFilterOpen={packageFilterOpen}
        setPackageFilterOpen={setPackageFilterOpen}
        packageFilterRef={packageFilterRef}
        activePackageChip={activePackageChip}
        packageChips={packageChips}
        selectedPackageDetail={selectedPackageDetail}
        incompleteInfoFilter={INCOMPLETE_INFO_FILTER}
        incompleteInformationLabel={completionLabels.informationIncomplete}
        filterMenuBaseStyle={filterMenuBaseStyle}
        filterMenuItemStyle={filterMenuItemStyle}
        filterMenuCountStyle={filterMenuCountStyle}
        formatCurrencyForLang={formatCurrencyForLang}
        lang={lang}
        t={t}
        tc={tc}
      />

      {/* filters + search */}
      <ProgramClientsToolbar
        selectMode={selectMode}
        statusFilterRef={statusFilterRef}
        statusFilterOpen={statusFilterOpen}
        onToggleStatusFilter={() => {
          setStatusFilterOpen(open => !open);
          setServiceTypeFilterOpen(false);
          setTravelGroupFilterOpen(false);
        }}
        activeStatusFilter={activeStatusFilter}
        filter={filter}
        filters={filters}
        serviceTypeFilterRef={serviceTypeFilterRef}
        serviceTypeFilterOpen={serviceTypeFilterOpen}
        onToggleServiceTypeFilter={() => {
          setServiceTypeFilterOpen(open => !open);
          setStatusFilterOpen(false);
          setTravelGroupFilterOpen(false);
        }}
        activeServiceTypeFilter={activeServiceTypeFilter}
        serviceTypeFilter={serviceTypeFilter}
        serviceTypeFilters={serviceTypeFilters}
        showTravelGroupFilter={showTravelGroupFilter}
        travelGroupFilterRef={travelGroupFilterRef}
        travelGroupFilterOpen={travelGroupFilterOpen}
        onToggleTravelGroupFilter={() => {
          setTravelGroupFilterOpen(open => !open);
          setStatusFilterOpen(false);
          setServiceTypeFilterOpen(false);
        }}
        activeTravelGroupFilter={activeTravelGroupFilter}
        travelGroupFilter={travelGroupFilter}
        travelGroupFilters={travelGroupFilters}
        filterMenuBaseStyle={filterMenuBaseStyle}
        filterMenuItemStyle={filterMenuItemStyle}
        filterMenuCountStyle={filterMenuCountStyle}
        onSelectStatusFilter={(key) => {
          setFilter(key);
          setStatusFilterOpen(false);
        }}
        onSelectServiceTypeFilter={(key) => {
          setServiceTypeFilter(key);
          setServiceTypeFilterOpen(false);
        }}
        onSelectTravelGroupFilter={(key) => {
          setTravelGroupFilter(key);
          setTravelGroupFilterOpen(false);
        }}
        searchExpanded={searchExpanded}
        search={search}
        searchInputRef={searchInputRef}
        onSearchMouseEnter={() => setSearchOpen(true)}
        onSearchMouseLeave={() => {
          if (!search.trim() && document.activeElement !== searchInputRef.current) setSearchOpen(false);
        }}
        onSearchButtonClick={() => {
          setSearchOpen(true);
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
        onSearchChange={e=>setSearch(e.target.value)}
        onSearchFocus={() => setSearchOpen(true)}
        onSearchBlur={() => {
          if (!search.trim()) setSearchOpen(false);
        }}
        onClearSearch={() => {
          setSearch("");
          requestAnimationFrame(() => searchInputRef.current?.focus());
        }}
        filteredCount={travelGroupFiltered.length}
        onToggleSelectMode={() => {
          if (selectMode) {
            exitSelectMode();
          } else {
            clearSelection();
            setSelectMode(true);
          }
        }}
        t={t}
        lang={lang}
        dir={dir}
        isRTL={isRTL}
        programClientRangeStart={programClientRangeStart}
        programClientRangeEnd={programClientRangeEnd}
        programClientPageSize={programClientPageSize}
        onProgramClientPageSizeChange={handleProgramClientPageSizeChange}
        programClientPageSizeOptions={programClientPageSizeOptions}
        safeProgramClientPage={safeProgramClientPage}
        totalProgramClientPages={totalProgramClientPages}
        onGoToProgramClientPage={goToProgramClientPage}
      />

      {selectMode && (
        <BulkClientActionsBar
          selectedCount={checkedIds.size}
          selectedCountLabel={tr("selectedCount", { count: checkedIds.size })}
          bulkActionsOpen={bulkActionsOpen}
          bulkActionsBtnRef={bulkActionsBtnRef}
          bulkActionsMenuRef={bulkActionsMenuRef}
          bulkActionsMenuPos={bulkActionsMenuPos}
          onToggleBulkActions={() => setBulkActionsOpen((open) => !open)}
          onTransferSelected={(event) => {
            event.stopPropagation();
            handleTransferSelected();
          }}
          onDeleteSelected={(event) => {
            event.stopPropagation();
            handleDeleteSelectedClick();
          }}
          onExitSelectMode={exitSelectMode}
          t={t}
          isRTL={isRTL}
        />
      )}

      <ProgramClientsTable
        filteredCount={travelGroupFiltered.length}
        tableGridTemplate={tableGridTemplate}
        selectMode={selectMode}
        headerSelectControl={(
          <HeaderSelectCheckbox
            checked={allChecked}
            indeterminate={partiallyChecked}
            onChange={toggleAllFiltered}
            label={allChecked ? t.deselectAll : t.selectAll}
          />
        )}
        labels={{
          name: t.name,
          roomType: t.roomType,
          serviceType: t.serviceType || "نوع الخدمة",
          ticketNo: t.ticketNo,
          amount: t.amount || (lang === "fr" ? "Montant" : lang === "en" ? "Amount" : "المبلغ"),
          paid: t.paid,
          remaining: t.remaining,
          status: t.statusLabel || t.status || "الحالة",
        }}
        emptyTitle={participantTerms.emptyTitle || t.programNoPilgrimsTitle}
        emptySub={filter !== "all" || travelGroupFilter !== "all"
          ? (participantTerms.emptyFiltered || t.programNoPilgrimsFiltered)
          : (participantTerms.emptySub || t.programNoPilgrimsSub)}
        rows={paginatedProgramClients}
        renderRow={(c,i)=>{
            const paid = getListClientTotalPaid(c.id);
            const amount = getProgramClientSalePrice(program, c);
            const rem  = getProgramClientRemainingAmount(program, c, paid);
            const overpaid = getProgramClientOverpaidAmount(program, c, paid);
            const stat = getProgramClientDisplayStatus(program, c, paid);
            const completionTooltip = getClientCompletionTooltip(c, lang, program, {
              referencePrice: getProgramPricingReferenceCost(program, c),
              standaloneSalePrice: getProgramStandaloneSalePrice(program, c),
            });
            return (
              <ProgramClientRow key={c.id} client={c} index={programClientStartIndex + i}
                program={program}
                travelGroups={currentProgramTravelGroups}
                amount={amount} paid={paid} remaining={rem} overpaid={overpaid} status={stat}
                completionTooltip={completionTooltip}
                badgePhotoApi={store.badgePhotoApi}
                onClick={()=>setSelectedClient(c)}
                onEdit={()=>runWithGlobalDetailData(() => setEditingClient(c))}
                selectMode={selectMode}
                showCheckbox={selectMode}
                isChecked={checkedIds.has(c.id)}
                onCheck={()=>toggleCheck(c.id)}
                onTransfer={()=>openTransferSheet([c.id])}
                onMoveToTravelGroup={()=>openTravelGroupMove(c)}
                onDelete={async ()=>{
                  const ready = await ensureGlobalDetailDataForCurrentAction();
                  if(!ready) return;
                  if(window.confirm(`حذف "${c.name}"؟`)){
                    store.deleteClient(c.id);
                    refreshScopedProgramDetail();
                    onToast("تم الحذف","info");
                  }
                }}
                gridTemplate={tableGridTemplate}
              />
            );
          }}
        totalsGridColumn={totalsGridColumn}
        totalLabel={participantTerms.totalLabel ? participantTerms.totalLabel(travelGroupFiltered.length) : tr("programTotalsLabel", { count: travelGroupFiltered.length })}
        summaryLabel={t.summary || participantTerms.plural || t.clients}
        amountTotalLabel={formatCurrencyForLang(filteredPaymentTotals.amount)}
        paidTotalLabel={formatCurrencyForLang(filteredPaymentTotals.paid)}
        remainingTotalLabel={formatCurrencyForLang(filteredPaymentTotals.remaining)}
      />
        </>
      )}

      {/* modals */}
      <ProgramCostingModal
        open={costingOpen}
        onClose={() => setCostingOpen(false)}
        program={program}
        packages={packages}
        agency={agency}
        onUpdateProgram={(nextProgram) => updateProgram?.(program.id, nextProgram)}
        onToast={onToast}
      />
      <Modal
        open={!!travelGroupMoveClient}
        onClose={closeTravelGroupMove}
        title={lang === "fr"
          ? "Déplacer vers un groupe de voyage"
          : lang === "en"
            ? "Move to travel group"
            : "نقل إلى فوج سفر"}
        width={440}
        closeOnBackdrop={!travelGroupMoveSaving}
        closeOnEscape={!travelGroupMoveSaving}
      >
        {travelGroupMoveClient && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Select
              label={lang === "fr" ? "Groupe de voyage" : lang === "en" ? "Travel group" : "فوج السفر"}
              value={travelGroupMoveValue}
              onChange={(event) => setTravelGroupMoveValue(event.target.value)}
              options={travelGroupMoveOptions}
              disabled={travelGroupMoveSaving}
            />
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, flexWrap:"wrap" }}>
              <Button variant="ghost" onClick={closeTravelGroupMove} disabled={travelGroupMoveSaving}>
                {t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء")}
              </Button>
              <Button variant="primary" icon="save" onClick={saveTravelGroupMove} disabled={travelGroupMoveSaving}>
                {travelGroupMoveSaving
                  ? (lang === "fr" ? "Enregistrement..." : lang === "en" ? "Saving..." : "جارٍ الحفظ...")
                  : (t.save || (lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "حفظ"))}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ProgramActionScopeDialog
        open={Boolean(exportScopeDialogAction)}
        title={exportScopeDialogTitle}
        options={exportScopeOptions}
        initialScope={exportScopeInitialScope}
        onClose={closeExportScopeDialog}
        onConfirm={handleConfirmExportScope}
        confirmLabel={exportScopeConfirmLabel}
        cancelLabel={exportScopeCancelLabel}
      />
      <ProgramClientModals
        store={store}
        onToast={onToast}
        t={t}
        tr={tr}
        program={currentProgram}
        packages={packages}
        travelGroups={currentProgramTravelGroups}
        defaultTravelGroupId={travelGroupFilter !== "all" && travelGroupFilter !== "__main_program"
          ? travelGroupFilter
          : null}
        registeredCount={progClients.length}
        participantTerms={participantTerms}
        completionLabels={completionLabels}
        participantExcelImportLabel={participantExcelImportLabel}
        selectedClient={selectedClient}
        onCloseClientDetail={() => setSelectedClient(null)}
        onEditClientFromDetail={(client) => {
          runWithGlobalDetailData(() => {
            setSelectedClient(null);
            setEditingClient(client);
          });
        }}
        isAddClientOpen={showAddClient}
        onCloseAddClient={() => setShowAddClient(false)}
        onSaveAddClient={(createdClient) => {
          upsertScopedProgramClients(createdClient);
          setShowAddClient(false);
          setProgramClientPage(1);
          setCheckedIds(new Set());
          refreshScopedProgramDetail();
          onToast(t.addSuccess, "success");
        }}
        isExcelImportOpen={showExcelImport}
        onCloseExcelImport={() => {
          if (excelImportSaving) {
            closeExcelImportModal();
            return;
          }
          closeExcelImportModal();
          refreshScopedProgramDetail();
        }}
        onExcelImportingChange={setExcelImportSaving}
        isPassportImportOpen={showPassportImport}
        onClosePassportImport={() => {
          setShowPassportImport(false);
          refreshScopedProgramDetail();
        }}
        editingClient={editingClient}
        onCloseEditClient={() => setEditingClient(null)}
        onSaveEditClient={() => {
          setEditingClient(null);
          refreshScopedProgramDetail();
          onToast(t.updateSuccess, "success");
        }}
        isTransferOpen={transferSheetOpen}
        onCloseTransfer={closeTransferSheet}
        transferClients={transferList}
        availablePrograms={transferDestinationPrograms}
        programOccupancy={programOccupancy}
        programSummaryById={programSummaryById}
        onConfirmTransfer={handleTransferConfirm}
        getClientPayments={getClientPayments}
        onClientDataChanged={handleClientDataChanged}
        programOverride={useScopedProgramDetail ? (scopedProgramDetail.program || program) : null}
        programClientsOverride={useScopedProgramDetail ? progClients : null}
        paymentsOverride={useScopedProgramDetail ? scopedProgramDetail.payments : null}
        paymentsReadyOverride={useScopedProgramDetail ? true : undefined}
        onRequireGlobalData={ensureGlobalDetailDataForCurrentAction}
        invoiceApi={store.invoiceApi}
        badgesEnabled={badgesEnabled}
        contractsEnabled={contractsEnabled}
        programPostersEnabled={programPostersEnabled}
        isBulkDeleteOpen={bulkDeleteOpen}
        onCloseBulkDelete={() => setBulkDeleteOpen(false)}
        bulkDeleteSelectedCount={checkedIds.size}
        onConfirmBulkDelete={handleConfirmDeleteSelected}
      />
    </div>
  );
}

function RoomingWorkflowCanvas({
  program,
  clients,
  packages = [],
  agency,
  agencyLogoApi,
  agencyId = null,
  supabaseRoomingEnabled = false,
  syncRoomingClientFields,
  onToast,
  externalDataReady = true,
  externalDataStatus = "ready",
}) {
  const { t, tr, lang } = useLang();
  const [city, setCity] = React.useState("makkah");
  const [rooms, setRooms] = React.useState([]);
  const [unassigned, setUnassigned] = React.useState([]);
  const [roomLinks, setRoomLinks] = React.useState([]);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [roomingWorkspaceMode, setRoomingWorkspaceMode] = React.useState("normal");
  const [zoom, setZoom] = React.useState(100);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState(null);
  const [roomModal, setRoomModal] = React.useState({ open: false, mode: "edit", roomId: null });
  const [roomDraft, setRoomDraft] = React.useState({ roomType: "", category: "", hotel: "", roomCount: "1" });
  const [roomDraftErrors, setRoomDraftErrors] = React.useState({});
  const [roomCreatePosition, setRoomCreatePosition] = React.useState({ x: 0, y: 0 });
  const [canvasMenu, setCanvasMenu] = React.useState({ open: false, x: 0, y: 0, position: { x: 0, y: 0 } });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerSearch, setPickerSearch] = React.useState("");
  const [selectedPilgrimIds, setSelectedPilgrimIds] = React.useState([]);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = React.useState(() => new Set());
  const [roomSelectionMode, setRoomSelectionMode] = React.useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = React.useState(() => new Set());
  const [linkMode, setLinkMode] = React.useState(false);
  const [linkStartRoomId, setLinkStartRoomId] = React.useState(null);
  const [selectedRoomLinkId, setSelectedRoomLinkId] = React.useState(null);
  const [roomLinkMenu, setRoomLinkMenu] = React.useState({ open: false, x: 0, y: 0, linkId: "" });
  const [pendingDrop, setPendingDrop] = React.useState(null);
  const [pendingDropSalePrice, setPendingDropSalePrice] = React.useState("");
  const [panelSearch, setPanelSearch] = React.useState("");
  const [panelHotel, setPanelHotel] = React.useState("all");
  const [panelRoomType, setPanelRoomType] = React.useState("all");
  const [roomOccupancyFilter, setRoomOccupancyFilter] = React.useState("all");
  const [roomFilterOpen, setRoomFilterOpen] = React.useState(false);
  const [roomNeedsOpen, setRoomNeedsOpen] = React.useState(false);
  const [largeRoomGenerationConfirm, setLargeRoomGenerationConfirm] = React.useState(null);
  const [roomingPrintSettingsOpen, setRoomingPrintSettingsOpen] = React.useState(false);
  const [roomingPrintSettings, setRoomingPrintSettings] = React.useState(() => readRoomingPrintSettingsFromStorage(agencyId));
  const [isGeneratingRooms, setIsGeneratingRooms] = React.useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = React.useState(false);
  const [roomingExportBusy, setRoomingExportBusy] = React.useState("");
  const [roomingPrintBusy, setRoomingPrintBusy] = React.useState("");
  const [roomingLoadStatus, setRoomingLoadStatus] = React.useState("idle");
  const [roomingLoadConfirmed, setRoomingLoadConfirmed] = React.useState(false);
  const [roomingLoadConfirmedKey, setRoomingLoadConfirmedKey] = React.useState("");
  const [roomingSaveStatus, setRoomingSaveStatus] = React.useState("idle");
  const [roomingLoadRetryNonce, setRoomingLoadRetryNonce] = React.useState(0);
  const [roomingDraftAvailable, setRoomingDraftAvailable] = React.useState(false);
  const [roomingExportStatus, setRoomingExportStatus] = React.useState("");
  const [roomingCopyBusy, setRoomingCopyBusy] = React.useState(false);
  const [roomingCopyModal, setRoomingCopyModal] = React.useState({
    open: false,
    sourceCity: "",
    targetCity: "",
    sourceRooms: [],
    sourceRoomLinks: [],
    mode: "rooms",
    targetAction: "append",
    useTargetHotels: true,
    replaceConfirmed: false,
  });
  const [draggingClientId, setDraggingClientId] = React.useState(null);
  const [hoveredDropRoomId, setHoveredDropRoomId] = React.useState(null);
  const flowRef = React.useRef(null);
  const roomingFullscreenRef = React.useRef(null);
  const flowNodesRef = React.useRef([]);
  const roomDragActiveRef = React.useRef(false);
  const dragStartPositionRef = React.useRef(new Map());
  const lastValidPositionRef = React.useRef(new Map());
  const dragInvalidRef = React.useRef(new Map());
  const roomingLoadSeqRef = React.useRef(0);
  const roomingRevisionRef = React.useRef(0);
  const generatedRoomFitPendingRef = React.useRef(null);
  const roomingRealtimeTimerRef = React.useRef(null);
  const roomingRealtimePendingRef = React.useRef(false);
  const roomingRealtimePendingUpdatedAtRef = React.useRef("");
  const roomingRealtimeFetchRetryRef = React.useRef(0);
  const roomingRealtimeSeqRef = React.useRef(0);
  const roomingLastRemoteUpdatedAtRef = React.useRef("");
  const roomingLastPayloadUpdatedAtRef = React.useRef("");
  const scheduleRoomingRealtimeRefetchRef = React.useRef(null);
  const roomingSaveInFlightRef = React.useRef(false);
  const roomingSavePendingRef = React.useRef(null);
  const roomingSavePromiseRef = React.useRef(Promise.resolve({ ok: true }));
  const roomingSaveSeqRef = React.useRef(0);
  const roomingDirtyReasonRef = React.useRef("");
  const roomingSaveTriggerCountRef = React.useRef(0);
  const roomingSaveStatusRef = React.useRef(roomingSaveStatus);
  const isGeneratingRoomsRef = React.useRef(false);
  const dirtyRef = React.useRef(false);
  const draggingClientIdRef = React.useRef(null);
  const roomModalOpenRef = React.useRef(false);
  const pendingDropRef = React.useRef(null);
  const roomingCopyModalOpenRef = React.useRef(false);
  const roomFilterMenuRef = React.useRef(null);
  const roomNeedsMenuRef = React.useRef(null);

  const fullWorkspace = roomingWorkspaceMode !== "normal";
  const browserFullscreenMode = roomingWorkspaceMode === "browserFullscreen";
  const roomingModalPortalContainer = browserFullscreenMode ? roomingFullscreenRef.current : null;
  const canPersistRoomingRemote = Boolean(supabaseRoomingEnabled && agencyId && program?.id);
  dirtyRef.current = dirty;
  roomingSaveStatusRef.current = roomingSaveStatus;
  draggingClientIdRef.current = draggingClientId;
  roomModalOpenRef.current = roomModal.open;
  pendingDropRef.current = pendingDrop;
  roomingCopyModalOpenRef.current = roomingCopyModal.open;
  const packageByLevel = React.useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => map.set(pkg.level, pkg));
    return map;
  }, [packages]);
  const packageById = React.useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => {
      if (pkg.id) map.set(pkg.id, pkg);
    });
    return map;
  }, [packages]);
  const roomingEligibleClients = React.useMemo(
    () => clients.filter((client) => doesServiceTypeNeedAccommodation(client)),
    [clients]
  );
  const roomingEligibleClientIds = React.useMemo(
    () => new Set(roomingEligibleClients.map((client) => client.id).filter(Boolean)),
    [roomingEligibleClients]
  );
  const excludedRoomingClientCount = Math.max(0, clients.length - roomingEligibleClients.length);
  const clientsById = React.useMemo(() => Object.fromEntries(roomingEligibleClients.map((client) => [client.id, client])), [roomingEligibleClients]);
  const roomingCityLabels = React.useMemo(() => ({
    makkah: t.roomingMakkah || ROOMING_CITY_LABELS.makkah,
    madinah: t.roomingMadinah || ROOMING_CITY_LABELS.madinah,
  }), [t]);
  const roomingPrintMenuLabels = React.useMemo(() => ({
    current: city === "madinah"
      ? (t.roomingPrintMadinahOption || (lang === "fr" ? "Hébergement Madinah" : lang === "en" ? "Madinah rooming" : "تسكين المدينة"))
      : (t.roomingPrintMakkahOption || (lang === "fr" ? "Hébergement Makkah" : lang === "en" ? "Makkah rooming" : "تسكين مكة")),
    full: t.roomingPrintFullOption || (lang === "fr" ? "Hébergement complet" : lang === "en" ? "Full rooming" : "التسكين الكامل"),
    loading: t.loading || (lang === "fr" ? "Préparation..." : lang === "en" ? "Preparing..." : "جاري التجهيز..."),
  }), [city, lang, t]);
  const roomingRoomOptions = React.useMemo(() => ROOMING_ROOM_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "single" ? (t.roomSingleShort || option.label)
      : option.value === "double" ? (t.roomDoubleShort || option.label)
        : option.value === "triple" ? (t.roomTripleShort || option.label)
          : option.value === "quad" ? (t.roomQuadShort || option.label)
            : option.value === "quint" ? (t.roomQuintShort || option.label)
              : option.label,
  })), [t]);
  const roomingCategoryOptions = React.useMemo(() => ROOMING_CATEGORY_OPTIONS.map((option) => ({
    ...option,
    label: option.value === "male_only" ? (t.roomCategoryMaleOnly || option.label)
      : option.value === "female_only" ? (t.roomCategoryFemaleOnly || option.label)
        : (t.roomCategoryFamily || option.label),
  })), [t]);
  const largeRoomGenerationCopy = React.useMemo(() => ({
    title: t.roomingLargeGenerationConfirmTitle || (
      lang === "fr" ? "Confirmer la génération des chambres"
        : lang === "en" ? "Confirm room generation"
          : "تأكيد توليد الغرف"
    ),
    message: t.roomingLargeGenerationConfirmMessage || (
      lang === "fr" ? "Le nombre de chambres sélectionné est relativement élevé. Les chambres seront générées et organisées dans l’espace d’hébergement. Voulez-vous continuer ?"
        : lang === "en" ? "The selected number of rooms is relatively large. The rooms will be generated and arranged in the rooming workspace. Do you want to continue?"
          : "عدد الغرف المختار كبير نسبيًا. سيتم إنشاء هذه الغرف وترتيبها داخل مساحة التسكين. هل تؤكد المتابعة؟"
    ),
    confirm: t.roomingLargeGenerationConfirmAction || (
      lang === "fr" ? "Confirmer la génération"
        : lang === "en" ? "Confirm generation"
          : "تأكيد التوليد"
    ),
    cancel: t.roomingLargeGenerationCancelAction || t.cancel || (
      lang === "fr" ? "Annuler"
        : lang === "en" ? "Cancel"
          : "إلغاء"
    ),
    countLabel: t.roomingLargeGenerationCountLabel || (
      lang === "fr" ? "Nombre de chambres"
        : lang === "en" ? "Number of rooms"
          : "عدد الغرف"
    ),
  }), [lang, t]);
  const getLocalizedRoomTypeLabel = React.useCallback((roomType) => {
    const key = normalizeRoomingRoomType(roomType) || roomType;
    return roomingRoomOptions.find((option) => option.value === key)?.label || getRoomingRoomLabel(key);
  }, [roomingRoomOptions]);
  const getLocalizedCategoryLabel = React.useCallback((category) => {
    return roomingCategoryOptions.find((option) => option.value === category)?.label || getRoomingCategoryLabel(category);
  }, [roomingCategoryOptions]);
  const roomingClientSyncWarning = React.useMemo(() => {
    if (lang === "fr") return "La répartition a été enregistrée, mais certaines informations des pèlerins n’ont pas pu être mises à jour.";
    if (lang === "en") return "Rooming was saved, but some pilgrim details could not be updated.";
    return "تم حفظ التسكين، لكن تعذر تحديث بعض بيانات المعتمرين.";
  }, [lang]);
  const roomingServiceTypeHiddenNote = React.useMemo(() => {
    if (lang === "fr") return "Certains clients sont masqués de l’hébergement car leur type de service ne nécessite pas d’hébergement.";
    if (lang === "en") return "Some clients are hidden from rooming because their service type does not require accommodation.";
    return "تم إخفاء بعض العملاء من التسكين لأن نوع خدمتهم لا يحتاج سكنًا.";
  }, [lang]);
  const unknownGenderBadgeLabel = React.useMemo(() => {
    if (lang === "fr") return "Sexe non défini";
    if (lang === "en") return "Gender not set";
    return "الجنس غير محدد";
  }, [lang]);
  const roomingParticipantTerms = React.useMemo(() => getParticipantTerminology(program, lang), [program, lang]);
  const roomingPrintLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        title: "Paramètres d’impression",
        showSource: "Afficher la source d’inscription",
        showBedNumbers: "Afficher la numérotation des lits dans la chambre",
        density: "Densité d’impression",
        comfortable: "Confortable",
        normal: "Normal",
        compact: "Compact",
        nameFontSize: `Taille des noms des ${roomingParticipantTerms.plural || "pèlerins"}`,
        autoShrinkLongNames: "Réduire automatiquement les noms longs",
        resetDefault: "Réinitialiser",
        layoutMode: "Mode d’organisation d’impression",
        defaultLayout: "Organisation par défaut",
        arrangedLayout: "Selon l’agencement du rooming",
        layoutHelp: "L’organisation par défaut regroupe les chambres par type. L’agencement du rooming respecte la proximité des chambres que vous avez organisée, tout en les compactant proprement pour l’impression.",
        unifiedBoth: t.roomingPrintUnifiedBoth || "Imprimer un hébergement unifié Makkah + Madinah",
        unifiedBothDescription: t.roomingPrintUnifiedBothDescription || "Si l’hébergement de Makkah et Madinah est identique, une seule feuille sera imprimée au lieu de répéter les mêmes chambres.",
        done: "Terminé",
      };
    }
    if (lang === "en") {
      return {
        title: "Print settings",
        showSource: "Show registration source",
        showBedNumbers: "Show bed numbering inside the room",
        density: "Print density",
        comfortable: "Comfortable",
        normal: "Normal",
        compact: "Compact",
        nameFontSize: `${roomingParticipantTerms.plural || "Pilgrim"} names font size`,
        autoShrinkLongNames: "Auto-shrink long names",
        resetDefault: "Reset to default",
        layoutMode: "Print layout mode",
        defaultLayout: "Default layout",
        arrangedLayout: "Rooming arrangement",
        layoutHelp: "Default layout groups rooms by type. Rooming arrangement keeps rooms close to how you arranged them, while packing them cleanly for print.",
        unifiedBoth: t.roomingPrintUnifiedBoth || "Print unified Makkah + Madinah rooming",
        unifiedBothDescription: t.roomingPrintUnifiedBothDescription || "If Makkah and Madinah rooming are identical, print one unified sheet instead of repeating the same rooms.",
        done: "Done",
      };
    }
    return {
      title: "إعدادات الطباعة",
      showSource: "إظهار جهة التسجيل",
      showBedNumbers: "إظهار ترقيم الأسرة داخل الغرفة",
      density: "حجم الغرف",
      comfortable: "كبير",
      normal: "عادي",
      compact: "صغير",
      nameFontSize: roomingParticipantTerms.kind === "hajj" ? "حجم خط أسماء الحجاج" : "حجم خط أسماء المعتمرين",
      autoShrinkLongNames: "تصغير تلقائي للأسماء الطويلة",
      resetDefault: "إعادة إلى الافتراضي",
      layoutMode: "طريقة ترتيب الطباعة",
      defaultLayout: "الترتيب الافتراضي",
      arrangedLayout: "حسب ترتيب التسكين",
      layoutHelp: "الترتيب الافتراضي يجمع الغرف حسب النوع، أما ترتيب التسكين فيحافظ على قرب الغرف كما رتبتها مع ضغطها للطباعة باحترافية.",
      unifiedBoth: t.roomingPrintUnifiedBoth || "طباعة تسكين موحد لمكة والمدينة",
      unifiedBothDescription: t.roomingPrintUnifiedBothDescription || "إذا كان تسكين مكة والمدينة متطابقا، تتم طباعة ورقة واحدة فقط بدل تكرار نفس الغرف.",
      done: "تطبيق",
    };
  }, [lang, roomingParticipantTerms.kind, roomingParticipantTerms.plural, t]);
  const roomingDensityOptions = React.useMemo(() => ([
    { value: "comfortable", label: roomingPrintLabels.comfortable },
    { value: "normal", label: roomingPrintLabels.normal },
    { value: "compact", label: roomingPrintLabels.compact },
  ]), [roomingPrintLabels]);
  const roomingPrintLayoutOptions = React.useMemo(() => ([
    { value: "default", label: roomingPrintLabels.defaultLayout },
    { value: "arranged", label: roomingPrintLabels.arrangedLayout },
  ]), [roomingPrintLabels]);
  React.useEffect(() => {
    setRoomingPrintSettings(readRoomingPrintSettingsFromStorage(agencyId));
  }, [agencyId]);
  const applyRoomingPrintSettings = React.useCallback(() => {
    setRoomingPrintSettings((current) => {
      const normalized = normalizeRoomingPrintSettingsValue(current);
      writeRoomingPrintSettingsToStorage(agencyId, normalized);
      return normalized;
    });
    setRoomingPrintSettingsOpen(false);
  }, [agencyId]);
  const roomingNameFontSize = clampRoomingNameFontSize(roomingPrintSettings.roomingNameFontSize);
  const roomingAutoShrinkLongNames = roomingPrintSettings.roomingAutoShrinkLongNames !== false;
  const roomingNamePreviewNames = React.useMemo(() => ([
    "الإسم الكامل",
    "الإسم الكامل",
    "الإسم الكامل",
    "الإسم الكامل",
  ]), []);
  const roomingCopySourceCity = getOppositeRoomingCity(city);
  const roomingCityShortLabels = React.useMemo(() => ({
    makkah: t.makkah || (lang === "fr" ? "La Mecque" : lang === "en" ? "Makkah" : "مكة"),
    madinah: t.madinah || (lang === "fr" ? "Médine" : lang === "en" ? "Madinah" : "المدينة"),
  }), [lang, t]);
  const roomingLoadKey = React.useMemo(
    () => [agencyId || "local", program?.id || "", city].join(":"),
    [agencyId, city, program?.id]
  );
  const hasRoomingLoaded = roomingLoadConfirmed && roomingLoadConfirmedKey === roomingLoadKey;
  const isRoomingLoading = roomingLoadStatus === "initialLoading" || roomingLoadStatus === "slowLoading";
  const isRoomingSaving = roomingSaveStatus === "saving" || roomingSaveStatus === "slowSaving";
  const isRoomingExternalDataRefreshing = externalDataReady === false || externalDataStatus === "refreshing";
  const canShowGenerateRooms = hasRoomingLoaded && !rooms.length && !dirty;
  const roomingGenerateBlockedMessage = t.roomingGenerateBlockedExisting || (
    lang === "fr"
      ? "Des chambres existent déjà, impossible de générer de nouvelles chambres sur l’hébergement actuel"
      : lang === "en"
        ? "Rooms already exist. You cannot generate new rooms over the current rooming."
        : "توجد غرف مسجلة بالفعل، لا يمكن توليد غرف جديدة فوق التسكين الحالي"
  );
  const roomingGenerateWaitMessage = t.roomingGenerateWaitForLoad || (
    lang === "fr"
      ? "Chargement de l’hébergement en cours. Veuillez patienter."
      : lang === "en"
        ? "Rooming is still loading. Please wait."
        : "جاري تحميل بيانات التسكين، يرجى الانتظار قليلا"
  );
  const roomingCopyPeopleTerm = React.useMemo(() => {
    const isHajj = getProgramKind(program) === "hajj";
    if (isHajj) return t.roomingCopyPeopleHajj || (lang === "fr" ? "pèlerins du Hajj" : lang === "en" ? "hajj pilgrims" : "الحجاج");
    return t.roomingCopyPeopleUmrah || (lang === "fr" ? "pèlerins" : lang === "en" ? "pilgrims" : "المعتمرون");
  }, [lang, program, t]);
  const roomingCopyButtonLabel = React.useMemo(() => (
    tr("roomingCopyFromCity", { city: roomingCityShortLabels[roomingCopySourceCity] })
      || (lang === "fr"
        ? `Copier depuis ${roomingCityShortLabels[roomingCopySourceCity]}`
        : lang === "en"
          ? `Copy from ${roomingCityShortLabels[roomingCopySourceCity]}`
          : `نسخ من ${roomingCityShortLabels[roomingCopySourceCity]}`)
  ), [lang, roomingCityShortLabels, roomingCopySourceCity, tr]);
  const roomingCopyModalTitle = React.useMemo(() => {
    const sourceCity = roomingCopyModal.sourceCity || roomingCopySourceCity;
    return tr("roomingCopyTitle", { city: roomingCityShortLabels[sourceCity] })
      || (lang === "fr"
        ? `Copier l’hébergement depuis ${roomingCityShortLabels[sourceCity]}`
        : lang === "en"
          ? `Copy rooming from ${roomingCityShortLabels[sourceCity]}`
          : `نسخ التسكين من ${roomingCityShortLabels[sourceCity]}`);
  }, [lang, roomingCityShortLabels, roomingCopyModal.sourceCity, roomingCopySourceCity, tr]);

  const verifiedCityHotelOptions = React.useMemo(
    () => getProgramHotelsForCity(program, packages, city),
    [city, packages, program]
  );
  const logRoomingGenerateDebug = React.useCallback((phase, details = {}) => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      console.info("[rooming] generateRooms debug", {
        phase,
        clientsCount: clients.length,
        eligibleClientsCount: roomingEligibleClients.length,
        packagesCount: packages.length,
        hotelsCount: verifiedCityHotelOptions.length,
        currentProgramId: program?.id || "",
        scopedProgramDetailStatus: externalDataStatus,
        hasRoomingLoaded,
        roomingLoading: isRoomingLoading,
        ...details,
      });
    } catch {}
  }, [
    clients.length,
    externalDataStatus,
    hasRoomingLoaded,
    isRoomingLoading,
    packages.length,
    program?.id,
    roomingEligibleClients.length,
    verifiedCityHotelOptions.length,
  ]);
  const getClientContext = React.useCallback((client) => {
    const level = client.packageLevel || client.hotelLevel || "";
    const pkg = packageByLevel.get(level) || packageById.get(client.packageId || client.package_id);
    const hotelCandidates = city === "makkah"
      ? [client.hotelMecca, client.hotel_mecca, pkg?.hotelMecca, pkg?.hotel_mecca, program.hotelMecca, program.hotel_mecca]
      : [client.hotelMadina, client.hotel_madina, pkg?.hotelMadina, pkg?.hotel_madina, program.hotelMadina, program.hotel_madina];
    const hotel = hotelCandidates
      .map((value) => getVerifiedRoomingHotel(value, verifiedCityHotelOptions))
      .find(Boolean) || "";
    const roomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room) || "";
    const gender = normalizeRoomingGender(client.gender);
    return {
      name: getClientDisplayName(client, lang),
      registrationSource: getClientRegistrationSource(client),
      gender,
      genderLabel: gender === "male" ? t.male : gender === "female" ? t.female : "—",
      hotel,
      level: level ? (translateHotelLevel(level, lang) || level) : "",
      roomType,
      roomTypeLabel: getLocalizedRoomTypeLabel(roomType),
      category: client.roomCategory || "",
      familyKey: client.roomingGroupId || getRoomingFamilyKey(client),
    };
  }, [city, packageById, packageByLevel, program, t, lang, getLocalizedRoomTypeLabel, verifiedCityHotelOptions]);

  const hotelOptions = verifiedCityHotelOptions;
  const resolveRoomHotelName = React.useCallback(
    (room, targetCity = city) => getRoomHotelName(room, program, packages, targetCity),
    [city, packages, program]
  );
  const roomModalLabels = React.useMemo(() => ({
    selectHotel: t.roomingSelectHotelPlaceholder || (lang === "fr" ? "Choisir un hôtel…" : lang === "en" ? "Select hotel…" : "اختيار فندق…"),
    selectRoomType: t.roomingSelectRoomTypePlaceholder || (lang === "fr" ? "Type de chambre…" : lang === "en" ? "Room type…" : "نوع الغرفة…"),
    selectCategory: t.roomingSelectRoomCategoryPlaceholder || (lang === "fr" ? "Classification de chambre…" : lang === "en" ? "Room classification…" : "تصنيف الغرفة…"),
    hotelRequired: t.roomingHotelRequired || (lang === "fr" ? "L’hôtel est obligatoire" : lang === "en" ? "Hotel is required" : "الفندق مطلوب"),
    hotelInvalid: t.roomingHotelInvalid || (lang === "fr" ? "Choisissez un hôtel valide pour cette ville" : lang === "en" ? "Select a valid hotel for this city" : "يرجى اختيار فندق صالح لهذه المدينة"),
    roomTypeRequired: t.roomingRoomTypeRequired || (lang === "fr" ? "Le type de chambre est obligatoire" : lang === "en" ? "Room type is required" : "نوع الغرفة مطلوب"),
    categoryRequired: t.roomingRoomCategoryRequired || (lang === "fr" ? "La classification de la chambre est obligatoire" : lang === "en" ? "Room classification is required" : "تصنيف الغرفة مطلوب"),
  }), [lang, t]);
  const roomHotelSelectOptions = React.useMemo(() => {
    const values = [];
    const addHotel = (hotel) => {
      const value = String(hotel || "").trim();
      if (!value) return;
      if (!getVerifiedRoomingHotel(value, hotelOptions)) return;
      if (values.some((item) => normalizeRoomingHotel(item) === normalizeRoomingHotel(value))) return;
      values.push(value);
    };
    hotelOptions.forEach(addHotel);
    addHotel(roomDraft.hotel);
    return [
      { value: "", label: roomModalLabels.selectHotel, disabled: true },
      ...values.map((hotel) => ({ value: hotel, label: hotel })),
    ];
  }, [hotelOptions, roomDraft.hotel, roomModalLabels.selectHotel]);
  const roomTypeSelectOptions = React.useMemo(() => [
    { value: "", label: roomModalLabels.selectRoomType, disabled: true },
    ...roomingRoomOptions.map((option) => ({ value: option.value, label: option.label })),
  ], [roomModalLabels.selectRoomType, roomingRoomOptions]);
  const roomCategorySelectOptions = React.useMemo(() => [
    { value: "", label: roomModalLabels.selectCategory, disabled: true },
    ...roomingCategoryOptions.map((option) => ({ value: option.value, label: option.label })),
  ], [roomModalLabels.selectCategory, roomingCategoryOptions]);
  const setRoomDraftField = React.useCallback((field, value) => {
    setRoomDraft((prev) => ({ ...prev, [field]: value }));
    setRoomDraftErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);
  const validateRoomDraft = React.useCallback((draft) => {
    const errors = {};
    const hotel = String(draft.hotel || "").trim();
    const roomType = normalizeRoomingRoomType(draft.roomType);
    const category = String(draft.category || "").trim();
    if (!hotel) errors.hotel = roomModalLabels.hotelRequired;
    else if (!getVerifiedRoomingHotel(hotel, hotelOptions)) errors.hotel = roomModalLabels.hotelInvalid;
    if (!roomType) errors.roomType = roomModalLabels.roomTypeRequired;
    if (!["male_only", "female_only", "family"].includes(category)) errors.category = roomModalLabels.categoryRequired;
    return errors;
  }, [hotelOptions, roomModalLabels.categoryRequired, roomModalLabels.hotelInvalid, roomModalLabels.hotelRequired, roomModalLabels.roomTypeRequired]);

  const buildCanvasPayload = React.useCallback((targetCity, nextRooms = [], nextUnassigned = [], nextRoomLinks = []) => ({
    kind: "rooming-canvas",
    version: 4,
    city: targetCity,
    rooms: Array.isArray(nextRooms) ? nextRooms : [],
    unassigned: Array.isArray(nextUnassigned) ? nextUnassigned : [],
    roomLinks: normalizeRoomingLinks(nextRoomLinks, nextRooms),
    updatedAt: new Date().toISOString(),
  }), []);

  const syncRoomingClientsFromRooms = React.useCallback(async (nextRooms = []) => {
    if (typeof syncRoomingClientFields !== "function") return { error: null, updatedCount: 0, skippedCount: 0 };
    const updates = buildRoomingClientFieldUpdates({ rooms: nextRooms, clients: roomingEligibleClients, program, programId: program.id, city, packages });
    if (!updates.length) return { error: null, updatedCount: 0, skippedCount: 0 };
    return syncRoomingClientFields(program.id, updates);
  }, [city, roomingEligibleClients, packages, program, syncRoomingClientFields]);

  const writeCanvasCache = React.useCallback((targetCity, payload) => {
    try {
      localStorage.setItem(
        getRoomingStorageKey(program.id, targetCity, agencyId),
        JSON.stringify(payload)
      );
    } catch (error) {
      console.warn("[rooming] local cache write failed", error);
    }
  }, [agencyId, program.id]);

  const readCanvasStateFromStorage = React.useCallback((targetCity) => {
    const keys = [
      getRoomingStorageKey(program.id, targetCity, agencyId),
      getLegacyRoomingStorageKey(program.id, targetCity),
    ].filter((key, index, list) => key && list.indexOf(key) === index);

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        return normalizeRoomingCanvasState(JSON.parse(raw), roomingEligibleClients);
      } catch (error) {
        console.warn("[rooming] local cache read failed", error);
      }
    }
    return { rooms: [], unassigned: [], roomLinks: [], version: 4 };
  }, [agencyId, roomingEligibleClients, program.id]);

  const readRoomingDraftFromStorage = React.useCallback((targetCity) => {
    try {
      const raw = localStorage.getItem(getRoomingDraftStorageKey(program.id, targetCity, agencyId));
      if (!raw) return null;
      return normalizeRoomingCanvasState(JSON.parse(raw), roomingEligibleClients);
    } catch (error) {
      console.warn("[rooming] local draft read failed", error);
      return null;
    }
  }, [agencyId, program.id, roomingEligibleClients]);

  const hasRoomingDraftInStorage = React.useCallback((targetCity) => {
    try {
      return Boolean(localStorage.getItem(getRoomingDraftStorageKey(program.id, targetCity, agencyId)));
    } catch {
      return false;
    }
  }, [agencyId, program.id]);

  const writeRoomingDraftToStorage = React.useCallback((targetCity, payload) => {
    try {
      localStorage.setItem(
        getRoomingDraftStorageKey(program.id, targetCity, agencyId),
        JSON.stringify(payload)
      );
      if (targetCity === city) setRoomingDraftAvailable(true);
    } catch (error) {
      console.warn("[rooming] local draft write failed", error);
    }
  }, [agencyId, city, program.id]);

  const clearRoomingDraftFromStorage = React.useCallback((targetCity) => {
    try {
      localStorage.removeItem(getRoomingDraftStorageKey(program.id, targetCity, agencyId));
      if (targetCity === city) setRoomingDraftAvailable(false);
    } catch (error) {
      console.warn("[rooming] local draft clear failed", error);
    }
  }, [agencyId, city, program.id]);

  React.useEffect(() => {
    setRoomingDraftAvailable(hasRoomingDraftInStorage(city));
  }, [city, hasRoomingDraftInStorage]);

  const loadRoomingStateForCopy = React.useCallback(async (targetCity) => {
    if (canPersistRoomingRemote) {
      try {
        const { data } = await retryRoomingOperation(
          async () => {
            const result = await runRoomingTimedOperation(
              () => db.roomingAssignments.fetch(agencyId, program.id, targetCity),
              { action: "rooming.copyLoad" }
            );
            if (result?.error) throw result.error;
            return result;
          },
          { shouldRetry: (loadError) => loadError?.code !== "ROOMING_TIMEOUT" }
        );
        if (data) {
          const loaded = normalizeRoomingCanvasState(data, roomingEligibleClients);
          const payload = buildCanvasPayload(targetCity, loaded.rooms, loaded.unassigned, loaded.roomLinks);
          writeCanvasCache(targetCity, payload);
          return sanitizeRoomingStateForEligibleClients(loaded, roomingEligibleClientIds);
        }
      } catch (error) {
        console.error("[rooming] copy source load failed", error);
      }
    }
    return sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds);
  }, [
    agencyId,
    buildCanvasPayload,
    canPersistRoomingRemote,
    program.id,
    readCanvasStateFromStorage,
    roomingEligibleClients,
    roomingEligibleClientIds,
    writeCanvasCache,
  ]);

  const getTargetHotelOptionsForCopy = React.useCallback((targetCity) => {
    return getProgramHotelsForCity(program, packages, targetCity);
  }, [packages, program]);

  const resolveCopiedRoomHotel = React.useCallback((room, sourceCity, targetCity, useTargetHotels) => {
    const targetHotels = getTargetHotelOptionsForCopy(targetCity);
    const sourceHotel = String(getRoomHotelName(room, program, packages, sourceCity) || room?.hotel || "").trim();
    const targetHotelByKey = new Map(targetHotels.map((hotel) => [normalizeRoomingHotel(hotel), hotel]));
    const sameTargetHotel = sourceHotel ? targetHotelByKey.get(normalizeRoomingHotel(sourceHotel)) : "";
    if (sameTargetHotel) return sameTargetHotel;

    if (useTargetHotels) {
      const sourcePackage = findRoomingPackageFromRoom(room, packages, sourceCity);
      const targetPackageHotel = String(getRoomingPackageHotel(sourcePackage, targetCity) || "").trim();
      const verifiedTargetPackageHotel = getVerifiedRoomingHotel(targetPackageHotel, targetHotels);
      if (verifiedTargetPackageHotel) return verifiedTargetPackageHotel;
    }

    return "";
  }, [getTargetHotelOptionsForCopy, packages, program]);

  const applyLoadedRoomingState = React.useCallback((loaded, sourceUpdatedAt = null, options = {}) => {
    const resetInteraction = options.resetInteraction !== false;
    const sanitized = sanitizeRoomingStateForEligibleClients(loaded, roomingEligibleClientIds);
    const normalizedLinks = normalizeRoomingLinks(sanitized.roomLinks, sanitized.rooms);
    const sourceUpdatedAtMs = Date.parse(sourceUpdatedAt || "");
    if (Number.isFinite(sourceUpdatedAtMs) && sourceUpdatedAtMs > 0) {
      roomingLastRemoteUpdatedAtRef.current = sourceUpdatedAt;
    }
    const payloadUpdatedAtMs = Date.parse(sanitized.updatedAt || loaded?.updatedAt || "");
    if (Number.isFinite(payloadUpdatedAtMs) && payloadUpdatedAtMs > 0) {
      roomingLastPayloadUpdatedAtRef.current = sanitized.updatedAt || loaded.updatedAt;
    }
    setRooms(sanitized.rooms);
    setUnassigned(sanitized.unassigned);
    setRoomLinks(normalizedLinks);
    setDirty(Boolean(sanitized.removedCount));
    roomingRevisionRef.current += 1;
    setSavedAt(Number.isFinite(sourceUpdatedAtMs) && sourceUpdatedAtMs > 0 ? new Date(sourceUpdatedAtMs) : null);
    if (resetInteraction) {
      setSelectedRoomId(null);
      setSelectedUnassignedIds(new Set());
      setSelectedRoomIds(new Set());
      setRoomSelectionMode(false);
      setLinkMode(false);
      setLinkStartRoomId(null);
      setSelectedRoomLinkId(null);
      setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
    } else {
      const roomIds = new Set(sanitized.rooms.map((room) => room.id).filter(Boolean));
      const unassignedIds = new Set(sanitized.unassigned.map((item) => item.clientId).filter(Boolean));
      const linkIds = new Set(normalizedLinks.map((link) => link.id).filter(Boolean));
      setSelectedRoomId((current) => (current && !roomIds.has(current) ? null : current));
      setSelectedRoomIds((current) => {
        const next = new Set(Array.from(current).filter((roomId) => roomIds.has(roomId)));
        return next.size === current.size ? current : next;
      });
      setSelectedUnassignedIds((current) => {
        const next = new Set(Array.from(current).filter((clientId) => unassignedIds.has(clientId)));
        return next.size === current.size ? current : next;
      });
      setLinkStartRoomId((current) => (current && !roomIds.has(current) ? null : current));
      setSelectedRoomLinkId((current) => (current && !linkIds.has(current) ? null : current));
      setRoomLinkMenu((current) => (
        current.open && current.linkId && !linkIds.has(current.linkId)
          ? { open: false, x: 0, y: 0, linkId: "" }
          : current
      ));
    }
    setRoomingSaveStatus(sanitized.removedCount ? "dirty" : "idle");
  }, [roomingEligibleClientIds]);

  React.useEffect(() => {
    let active = true;
    const loadSeq = roomingLoadSeqRef.current + 1;
    roomingLoadSeqRef.current = loadSeq;
    const startedAt = Date.now();

    const applyLoadedState = (loaded, sourceUpdatedAt = null) => {
      if (!active || roomingLoadSeqRef.current !== loadSeq) return;
      applyLoadedRoomingState(loaded, sourceUpdatedAt, { resetInteraction: true });
    };

    const loadRooming = async () => {
      const loadContext = {
        programId: program.id,
        location: city,
        agencyScoped: Boolean(agencyId),
      };
      const localDraft = readRoomingDraftFromStorage(city);
      setRoomingDraftAvailable(Boolean(localDraft));

      if (!canPersistRoomingRemote) {
        applyLoadedState(localDraft || readCanvasStateFromStorage(city));
        if (localDraft) {
          setDirty(true);
          setRoomingSaveStatus("dirty");
        }
        setRoomingLoadStatus("loaded");
        setRoomingLoadConfirmed(true);
        setRoomingLoadConfirmedKey(roomingLoadKey);
        logRoomingDiagnostic("load.local", {
          ...loadContext,
          durationMs: Date.now() - startedAt,
          source: localDraft ? "draft" : "cache",
        });
        return;
      }

      setRoomingLoadConfirmed(false);
      setRoomingLoadConfirmedKey("");
      setRoomingLoadStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "initialLoading");

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        applyLoadedState(localDraft || readCanvasStateFromStorage(city));
        if (localDraft) {
          setDirty(true);
          setRoomingSaveStatus("offline");
        }
        setRoomingLoadConfirmed(Boolean(localDraft));
        setRoomingLoadConfirmedKey(localDraft ? roomingLoadKey : "");
        logRoomingDiagnostic("load.offline", {
          ...loadContext,
          durationMs: Date.now() - startedAt,
          source: localDraft ? "draft" : "cache",
        });
        return;
      }

      try {
        const { data } = await retryRoomingOperation(async (attempt) => {
          const result = await runRoomingTimedOperation(
            () => db.roomingAssignments.fetch(agencyId, program.id, city),
            {
              action: "rooming.load",
              onSlow: () => {
                if (!active || roomingLoadSeqRef.current !== loadSeq) return;
                setRoomingLoadStatus("slowLoading");
                logRoomingDiagnostic("load.slow", {
                  ...loadContext,
                  attempt: attempt + 1,
                  durationMs: Date.now() - startedAt,
                });
              },
            }
          );
          if (result?.error) throw result.error;
          return result;
        }, {
          shouldRetry: (error) => error?.code !== "ROOMING_TIMEOUT",
          onRetry: (error, attempt) => {
            logRoomingDiagnostic("load.retry", {
              ...loadContext,
              attempt,
              durationMs: Date.now() - startedAt,
              error: error?.code || error?.message || "unknown",
            });
          },
        });
        if (!active || roomingLoadSeqRef.current !== loadSeq) return;

        if (data) {
          const loaded = normalizeRoomingCanvasState(data, roomingEligibleClients);
          writeCanvasCache(city, buildCanvasPayload(city, loaded.rooms, loaded.unassigned, loaded.roomLinks));
          applyLoadedState(localDraft || loaded, data.updatedAt);
          if (localDraft) {
            setDirty(true);
            setRoomingSaveStatus("dirty");
          }
          setRoomingLoadStatus("loaded");
          setRoomingLoadConfirmed(true);
          setRoomingLoadConfirmedKey(roomingLoadKey);
          logRoomingDiagnostic("load.success", {
            ...loadContext,
            durationMs: Date.now() - startedAt,
            source: localDraft ? "draft" : "remote",
            rooms: (localDraft || loaded).rooms?.length || 0,
          });
          return;
        }

        applyLoadedState(localDraft || readCanvasStateFromStorage(city));
        if (localDraft) {
          setDirty(true);
          setRoomingSaveStatus("dirty");
        }
        setRoomingLoadStatus("loaded");
        setRoomingLoadConfirmed(true);
        setRoomingLoadConfirmedKey(roomingLoadKey);
        logRoomingDiagnostic("load.emptyRemote", {
          ...loadContext,
          durationMs: Date.now() - startedAt,
          source: localDraft ? "draft" : "cache",
        });
        return;
      } catch (error) {
        if (!active || roomingLoadSeqRef.current !== loadSeq) return;
        console.error("[rooming] Supabase load failed", error);
        applyLoadedState(localDraft || readCanvasStateFromStorage(city));
        if (localDraft) {
          setDirty(true);
          setRoomingSaveStatus("dirty");
        }
        setRoomingLoadStatus("loadFailed");
        setRoomingLoadConfirmed(Boolean(localDraft));
        setRoomingLoadConfirmedKey(localDraft ? roomingLoadKey : "");
        setRoomingDraftAvailable(Boolean(localDraft));
        onToast?.(t.roomingLoadFailed || "تعذر تحميل التسكين. يمكنك إعادة المحاولة أو متابعة النسخة المحلية إن وجدت.", "error");
        logRoomingDiagnostic("load.failed", {
          ...loadContext,
          durationMs: Date.now() - startedAt,
          source: localDraft ? "draft" : "cache",
          error: error?.code || error?.message || "unknown",
        });
      }
    };

    loadRooming();
    return () => {
      active = false;
    };
  }, [agencyId, applyLoadedRoomingState, buildCanvasPayload, canPersistRoomingRemote, city, onToast, program.id, readCanvasStateFromStorage, readRoomingDraftFromStorage, roomingEligibleClients, roomingLoadKey, roomingLoadRetryNonce, t.roomingLoadFailed, writeCanvasCache]);

  const getRoomingRealtimeUnsafeReasons = React.useCallback(() => {
    const reasons = [];
    if (dirtyRef.current) reasons.push("dirty");
    if (roomingSaveInFlightRef.current || roomingSavePendingRef.current) reasons.push("saveQueue");
    if (["saving", "slowSaving", "saveFailed", "offline"].includes(roomingSaveStatusRef.current)) {
      reasons.push(roomingSaveStatusRef.current);
    }
    if (draggingClientIdRef.current) reasons.push("clientDrag");
    if (roomDragActiveRef.current) reasons.push("roomDrag");
    if (roomModalOpenRef.current) reasons.push("roomEditor");
    if (pendingDropRef.current) reasons.push("pendingDrop");
    if (roomingCopyModalOpenRef.current) reasons.push("copyModal");
    return reasons;
  }, []);

  const isRoomingRealtimeUnsafe = React.useCallback(
    () => getRoomingRealtimeUnsafeReasons().length > 0,
    [getRoomingRealtimeUnsafeReasons]
  );

  const fetchAndApplyRealtimeRooming = React.useCallback(async () => {
    if (!canPersistRoomingRemote) return;
    const unsafeReasons = getRoomingRealtimeUnsafeReasons();
    if (unsafeReasons.length) {
      logRoomingDiagnostic("rooming.realtime.deferred", {
        programId: program.id,
        location: city,
        reasons: unsafeReasons,
        pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
        source: "beforeFetch",
      });
      return;
    }
    const requestSeq = roomingRealtimeSeqRef.current + 1;
    roomingRealtimeSeqRef.current = requestSeq;
    const requestedPendingUpdatedAt = roomingRealtimePendingUpdatedAtRef.current;
    let result = { data: null, error: null };
    try {
      result = await runRoomingTimedOperation(
        () => db.roomingAssignments.fetch(agencyId, program.id, city),
        { action: "rooming.realtimeLoad" }
      );
    } catch (error) {
      result = { data: null, error };
    }
    if (roomingRealtimeSeqRef.current !== requestSeq) return;
    const { data, error } = result;
    if (error) {
      console.error("[rooming] realtime refetch failed", error);
      roomingRealtimeFetchRetryRef.current += 1;
      logRoomingDiagnostic("rooming.realtime.fetchFailed", {
        programId: program.id,
        location: city,
        pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
        retryAttempt: roomingRealtimeFetchRetryRef.current,
        error: error?.code || error?.message || "unknown",
      });
      if (roomingRealtimeFetchRetryRef.current <= ROOMING_RETRY_COUNT) {
        scheduleRoomingRealtimeRefetchRef.current?.({
          source: "fetchFailed",
          delayMs: 1200,
        });
      }
      return;
    }
    if (!data) return;
    roomingRealtimeFetchRetryRef.current = 0;
    const unsafeAfterFetch = getRoomingRealtimeUnsafeReasons();
    if (unsafeAfterFetch.length) {
      logRoomingDiagnostic("rooming.realtime.deferred", {
        programId: program.id,
        location: city,
        reasons: unsafeAfterFetch,
        pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
        source: "afterFetch",
      });
      return;
    }
    const remoteUpdatedAtMs = Date.parse(data.updatedAt || "");
    const lastAppliedAtMs = Date.parse(roomingLastRemoteUpdatedAtRef.current || "");
    if (
      Number.isFinite(remoteUpdatedAtMs)
      && remoteUpdatedAtMs > 0
      && Number.isFinite(lastAppliedAtMs)
      && lastAppliedAtMs > 0
      && remoteUpdatedAtMs <= lastAppliedAtMs
    ) {
      roomingRealtimePendingRef.current = false;
      roomingRealtimePendingUpdatedAtRef.current = "";
      logRoomingDiagnostic("rooming.realtime.ignoredOlderServerUpdate", {
        programId: program.id,
        location: city,
        remoteUpdatedAt: data.updatedAt,
        lastAppliedUpdatedAt: roomingLastRemoteUpdatedAtRef.current,
        payloadUpdatedAt: data.meta?.payloadUpdatedAt || "",
      });
      return;
    }
    const loaded = normalizeRoomingCanvasState(data, roomingEligibleClients);
    writeCanvasCache(city, buildCanvasPayload(city, loaded.rooms, loaded.unassigned, loaded.roomLinks));
    applyLoadedRoomingState(loaded, data.updatedAt, { resetInteraction: false });
    const latestPendingUpdatedAtMs = Date.parse(roomingRealtimePendingUpdatedAtRef.current || "");
    if (
      !Number.isFinite(latestPendingUpdatedAtMs)
      || !Number.isFinite(remoteUpdatedAtMs)
      || latestPendingUpdatedAtMs <= remoteUpdatedAtMs
    ) {
      roomingRealtimePendingRef.current = false;
      roomingRealtimePendingUpdatedAtRef.current = "";
    }
    setRoomingLoadStatus("loaded");
    setRoomingLoadConfirmed(true);
    setRoomingLoadConfirmedKey(roomingLoadKey);
    logRoomingDiagnostic("rooming.realtime.applied", {
      programId: program.id,
      location: city,
      remoteUpdatedAt: data.updatedAt,
      requestedPendingUpdatedAt,
      payloadUpdatedAt: data.meta?.payloadUpdatedAt || "",
      rooms: loaded.rooms?.length || 0,
      roomLinks: loaded.roomLinks?.length || 0,
    });
    if (roomingRealtimePendingRef.current) {
      scheduleRoomingRealtimeRefetchRef.current?.({
        source: "newerEventDuringFetch",
        delayMs: 0,
      });
    }
  }, [agencyId, applyLoadedRoomingState, buildCanvasPayload, canPersistRoomingRemote, city, getRoomingRealtimeUnsafeReasons, program.id, roomingEligibleClients, roomingLoadKey, writeCanvasCache]);

  const scheduleRoomingRealtimeRefetch = React.useCallback(({
    source = "event",
    remoteUpdatedAt = "",
    delayMs = 350,
  } = {}) => {
    if (!canPersistRoomingRemote) return;
    roomingRealtimePendingRef.current = true;
    const incomingUpdatedAtMs = Date.parse(remoteUpdatedAt || "");
    const pendingUpdatedAtMs = Date.parse(roomingRealtimePendingUpdatedAtRef.current || "");
    if (
      remoteUpdatedAt
      && (
        !Number.isFinite(pendingUpdatedAtMs)
        || !Number.isFinite(incomingUpdatedAtMs)
        || incomingUpdatedAtMs > pendingUpdatedAtMs
      )
    ) {
      roomingRealtimePendingUpdatedAtRef.current = remoteUpdatedAt;
    }
    if (roomingRealtimeTimerRef.current) {
      window.clearTimeout(roomingRealtimeTimerRef.current);
      roomingRealtimeTimerRef.current = null;
    }
    const unsafeReasons = getRoomingRealtimeUnsafeReasons();
    if (unsafeReasons.length) {
      logRoomingDiagnostic("rooming.realtime.deferred", {
        programId: program.id,
        location: city,
        reasons: unsafeReasons,
        source,
        pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
      });
      return;
    }
    logRoomingDiagnostic("rooming.realtime.pendingRetry", {
      programId: program.id,
      location: city,
      source,
      delayMs,
      pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
    });
    roomingRealtimeTimerRef.current = window.setTimeout(() => {
      roomingRealtimeTimerRef.current = null;
      if (!roomingRealtimePendingRef.current) return;
      const timerUnsafeReasons = getRoomingRealtimeUnsafeReasons();
      if (timerUnsafeReasons.length) {
        logRoomingDiagnostic("rooming.realtime.deferred", {
          programId: program.id,
          location: city,
          reasons: timerUnsafeReasons,
          source: `${source}:timer`,
          pendingUpdatedAt: roomingRealtimePendingUpdatedAtRef.current,
        });
        return;
      }
      fetchAndApplyRealtimeRooming();
    }, Math.max(0, Number(delayMs) || 0));
  }, [canPersistRoomingRemote, city, fetchAndApplyRealtimeRooming, getRoomingRealtimeUnsafeReasons, program.id]);
  scheduleRoomingRealtimeRefetchRef.current = scheduleRoomingRealtimeRefetch;

  React.useEffect(() => {
    if (!roomingRealtimePendingRef.current || isRoomingRealtimeUnsafe()) return;
    scheduleRoomingRealtimeRefetch({
      source: "unsafeStateCleared",
      delayMs: 0,
    });
  }, [
    dirty,
    draggingClientId,
    isRoomingRealtimeUnsafe,
    pendingDrop,
    roomModal.open,
    roomingCopyModal.open,
    roomingSaveStatus,
    scheduleRoomingRealtimeRefetch,
  ]);

  React.useEffect(() => {
    roomingRealtimePendingRef.current = false;
    roomingRealtimePendingUpdatedAtRef.current = "";
    roomingLastRemoteUpdatedAtRef.current = "";
    roomingLastPayloadUpdatedAtRef.current = "";
    roomingRealtimeSeqRef.current += 1;
    if (roomingRealtimeTimerRef.current) {
      window.clearTimeout(roomingRealtimeTimerRef.current);
      roomingRealtimeTimerRef.current = null;
    }
    if (!canPersistRoomingRemote) return undefined;

    logRoomingDiagnostic("rooming.realtime.subscription.start", {
      programId: program.id,
      location: city,
      agencyScoped: Boolean(agencyId),
    });
    const unsubscribe = db.roomingAssignments.subscribe({
      agencyId,
      programId: program.id,
      location: city,
      onChange: (payload) => {
        const row = payload?.new || payload?.old;
        roomingRealtimeFetchRetryRef.current = 0;
        const remoteUpdatedAtMs = Date.parse(row?.updated_at || "");
        const lastAppliedAtMs = Date.parse(roomingLastRemoteUpdatedAtRef.current || "");
        logRoomingDiagnostic("rooming.realtime.received", {
          programId: program.id,
          location: city,
          eventType: payload?.eventType || payload?.event || "",
          remoteUpdatedAt: row?.updated_at || "",
          lastAppliedUpdatedAt: roomingLastRemoteUpdatedAtRef.current,
          payloadUpdatedAt: row?.meta?.payloadUpdatedAt || "",
        });
        if (
          Number.isFinite(remoteUpdatedAtMs)
          && remoteUpdatedAtMs > 0
          && Number.isFinite(lastAppliedAtMs)
          && lastAppliedAtMs > 0
          && remoteUpdatedAtMs <= lastAppliedAtMs
        ) {
          logRoomingDiagnostic("rooming.realtime.ignoredOlderServerUpdate", {
            programId: program.id,
            location: city,
            remoteUpdatedAt: row?.updated_at || "",
            lastAppliedUpdatedAt: roomingLastRemoteUpdatedAtRef.current,
          });
          return;
        }
        scheduleRoomingRealtimeRefetchRef.current?.({
          source: "subscriptionEvent",
          remoteUpdatedAt: row?.updated_at || "",
          delayMs: 0,
        });
      },
      onError: (error) => {
        console.error("[rooming] realtime subscription failed", error);
        logRoomingDiagnostic("rooming.realtime.subscription.error", {
          programId: program.id,
          location: city,
          error: error?.code || error?.message || "unknown",
        });
      },
    });

    return () => {
      roomingRealtimePendingRef.current = false;
      roomingRealtimePendingUpdatedAtRef.current = "";
      roomingRealtimeFetchRetryRef.current = 0;
      roomingRealtimeSeqRef.current += 1;
      if (roomingRealtimeTimerRef.current) {
        window.clearTimeout(roomingRealtimeTimerRef.current);
        roomingRealtimeTimerRef.current = null;
      }
      logRoomingDiagnostic("rooming.realtime.subscription.stop", {
        programId: program.id,
        location: city,
      });
      unsubscribe?.();
    };
  }, [agencyId, canPersistRoomingRemote, city, program.id]);

  const exitRoomingWorkspace = React.useCallback(async () => {
    setRoomingWorkspaceMode("normal");
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (!fullscreenElement) return;
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    try {
      await exitFullscreen?.call(document);
    } catch (error) {
      console.warn("[rooming] browser fullscreen exit failed", error);
    }
  }, []);

  const enterRoomingExpanded = React.useCallback(async () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (fullscreenElement) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      try {
        await exitFullscreen?.call(document);
      } catch (error) {
        console.warn("[rooming] browser fullscreen exit failed", error);
      }
    }
    setRoomingWorkspaceMode("expanded");
  }, []);

  const enterRoomingBrowserFullscreen = React.useCallback(async () => {
    setRoomingWorkspaceMode("browserFullscreen");
    const target = roomingFullscreenRef.current || document.documentElement;
    const requestFullscreen = target?.requestFullscreen || target?.webkitRequestFullscreen || target?.msRequestFullscreen;
    if (!requestFullscreen) {
      setRoomingWorkspaceMode("expanded");
      return;
    }
    try {
      await requestFullscreen.call(target);
    } catch (error) {
      console.warn("[rooming] browser fullscreen request failed", error);
      setRoomingWorkspaceMode("expanded");
    }
  }, []);

  React.useEffect(() => {
    const syncFullscreenState = () => {
      const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
      if (!fullscreenElement && roomingWorkspaceMode === "browserFullscreen") {
        setRoomingWorkspaceMode("normal");
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    document.addEventListener("MSFullscreenChange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
      document.removeEventListener("MSFullscreenChange", syncFullscreenState);
    };
  }, [roomingWorkspaceMode]);

  React.useEffect(() => {
    if (!fullWorkspace) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      const modalOpen = roomModal.open || pickerOpen || Boolean(pendingDrop) || roomingPrintSettingsOpen || roomingCopyModal.open;
      if (!modalOpen) exitRoomingWorkspace();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exitRoomingWorkspace, fullWorkspace, pendingDrop, pickerOpen, roomModal.open, roomingCopyModal.open, roomingPrintSettingsOpen]);

  const createRoomingSaveSnapshot = React.useCallback((notify = true) => {
    const sanitized = sanitizeRoomingStateForEligibleClients({ rooms, unassigned, roomLinks }, roomingEligibleClientIds);
    const payload = buildCanvasPayload(city, sanitized.rooms, sanitized.unassigned, sanitized.roomLinks);
    const reason = normalizeRoomingSaveReason(roomingDirtyReasonRef.current || ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED);
    return {
      agencyId,
      city,
      notify,
      payload,
      programId: program.id,
      reason,
      revision: roomingRevisionRef.current,
    };
  }, [agencyId, buildCanvasPayload, city, program.id, rooms, roomLinks, roomingEligibleClientIds, unassigned]);

  const persistRoomingSaveSnapshot = React.useCallback(async (snapshot) => {
    const saveSeq = roomingSaveSeqRef.current + 1;
    roomingSaveSeqRef.current = saveSeq;
    const startedAt = Date.now();
    const payloadSize = getRoomingPayloadSize(snapshot.payload);
    const saveContext = {
      programId: snapshot.programId,
      location: snapshot.city,
      revision: snapshot.revision,
      reason: normalizeRoomingSaveReason(snapshot.reason),
      payloadSize,
      rooms: snapshot.payload.rooms?.length || 0,
    };

    try {
      writeCanvasCache(snapshot.city, snapshot.payload);
      writeRoomingDraftToStorage(snapshot.city, snapshot.payload);
      logRoomingDiagnostic("save.start", saveContext);
      logRoomingDiagnostic("rooming.save.reason", saveContext);

      const syncClientsBestEffort = async () => {
        if (saveContext.reason === ROOMING_SAVE_REASON_LAYOUT_ONLY) {
          logRoomingDiagnostic("rooming.clientSync.skipped", {
            ...saveContext,
            durationMs: Date.now() - startedAt,
          });
          return { ok: true, skipped: true };
        }
        logRoomingDiagnostic("rooming.clientSync.start", saveContext);
        try {
          const clientSync = await runRoomingTimedOperation(
            () => syncRoomingClientsFromRooms(snapshot.payload.rooms),
            {
              action: "rooming.clientSync",
              onSlow: () => {
                logRoomingDiagnostic("rooming.clientSync.warning", {
                  ...saveContext,
                  durationMs: Date.now() - startedAt,
                  error: "slow",
                });
              },
            }
          );
          if (clientSync?.error) {
            console.warn("[rooming] client field sync failed", clientSync.error);
            logRoomingDiagnostic("rooming.clientSync.warning", {
              ...saveContext,
              durationMs: Date.now() - startedAt,
              error: clientSync.error?.code || clientSync.error?.message || "unknown",
            });
            if (snapshot.notify) onToast?.(roomingClientSyncWarning, "warning");
            return { ok: false, error: clientSync.error };
          }
          logRoomingDiagnostic("rooming.clientSync.success", {
            ...saveContext,
            durationMs: Date.now() - startedAt,
            updatedCount: clientSync?.updatedCount || 0,
            skippedCount: clientSync?.skippedCount || 0,
          });
          return { ok: true };
        } catch (syncError) {
          console.warn("[rooming] client field sync failed", syncError);
          logRoomingDiagnostic("rooming.clientSync.warning", {
            ...saveContext,
            durationMs: Date.now() - startedAt,
            error: syncError?.code || syncError?.message || "unknown",
          });
          if (snapshot.notify) onToast?.(roomingClientSyncWarning, "warning");
          return { ok: false, error: syncError };
        }
      };

      if (canPersistRoomingRemote) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setRoomingSaveStatus("offline");
          setDirty(true);
          logRoomingDiagnostic("save.offline", {
            ...saveContext,
            durationMs: Date.now() - startedAt,
          });
          if (snapshot.notify) {
            onToast?.(
              t.roomingSaveOffline || (lang === "fr" ? "Hors ligne. Le brouillon local est conservé." : lang === "en" ? "Offline. The local draft is kept." : "أنت غير متصل. تم الاحتفاظ بالمسودة المحلية."),
              "warning"
            );
          }
          return { ok: false, offline: true };
        }

        setRoomingSaveStatus("saving");
        if (saveContext.reason === ROOMING_SAVE_REASON_LAYOUT_ONLY) {
          logRoomingDiagnostic("rooming.layoutSave.start", saveContext);
        }
        logRoomingDiagnostic("rooming.assignmentSave.start", saveContext);
        const data = await retryRoomingOperation(async (attempt) => {
          const result = await runRoomingTimedOperation(
            () => db.roomingAssignments.upsert({
              programId: snapshot.programId,
              location: snapshot.city,
              rooms: snapshot.payload.rooms,
              unassigned: snapshot.payload.unassigned,
              version: snapshot.payload.version,
              meta: {
                kind: snapshot.payload.kind,
                city: snapshot.city,
                roomLinks: snapshot.payload.roomLinks,
                payloadUpdatedAt: snapshot.payload.updatedAt,
                roomingRevision: snapshot.revision,
              },
            }, snapshot.agencyId),
            {
              action: "rooming.assignmentSave",
              onSlow: () => {
                if (roomingSaveSeqRef.current !== saveSeq) return;
                setRoomingSaveStatus("slowSaving");
                logRoomingDiagnostic("rooming.assignmentSave.warning", {
                  ...saveContext,
                  attempt: attempt + 1,
                  durationMs: Date.now() - startedAt,
                  error: "slow",
                });
              },
            }
          );
          if (result?.error) throw result.error;
          return result?.data || null;
        }, {
          shouldRetry: (error) => error?.code !== "ROOMING_TIMEOUT",
          onRetry: (error, attempt) => {
            logRoomingDiagnostic("save.retry", {
              ...saveContext,
              attempt,
              durationMs: Date.now() - startedAt,
              error: error?.code || error?.message || "unknown",
            });
          },
        });
        if (data?.updatedAt) roomingLastRemoteUpdatedAtRef.current = data.updatedAt;
        if (snapshot.payload.updatedAt) roomingLastPayloadUpdatedAtRef.current = snapshot.payload.updatedAt;
        logRoomingDiagnostic("rooming.assignmentSave.success", {
          ...saveContext,
          durationMs: Date.now() - startedAt,
        });
        if (saveContext.reason === ROOMING_SAVE_REASON_LAYOUT_ONLY) {
          logRoomingDiagnostic("rooming.layoutSave.success", {
            ...saveContext,
            durationMs: Date.now() - startedAt,
          });
        }
        if (roomingRevisionRef.current === snapshot.revision) {
          setDirty(false);
          roomingDirtyReasonRef.current = "";
          setSavedAt(data?.updatedAt ? new Date(data.updatedAt) : new Date());
          setRoomingSaveStatus("saved");
          clearRoomingDraftFromStorage(snapshot.city);
        } else {
          setDirty(true);
          setRoomingSaveStatus(roomingSavePendingRef.current ? "saving" : "dirty");
        }
        syncClientsBestEffort();
        if (snapshot.notify) {
          onToast?.(t.roomingSaved || "تم حفظ التسكين", "success");
        }
        logRoomingDiagnostic("save.success", {
          ...saveContext,
          durationMs: Date.now() - startedAt,
        });
        return { ok: true };
      }

      if (snapshot.payload.updatedAt) roomingLastPayloadUpdatedAtRef.current = snapshot.payload.updatedAt;
      if (roomingRevisionRef.current === snapshot.revision) {
        setDirty(false);
        roomingDirtyReasonRef.current = "";
        setSavedAt(new Date());
        setRoomingSaveStatus("saved");
        clearRoomingDraftFromStorage(snapshot.city);
      } else {
        setDirty(true);
        setRoomingSaveStatus(roomingSavePendingRef.current ? "saving" : "dirty");
      }
      syncClientsBestEffort();
      if (snapshot.notify) {
        onToast?.(t.roomingSavedLocal || "تم حفظ مصمم التسكين محليًا", "success");
      }
      logRoomingDiagnostic("save.localSuccess", {
        ...saveContext,
        durationMs: Date.now() - startedAt,
      });
      return { ok: true };
    } catch (error) {
      console.error("[rooming] save failed", error);
      logRoomingDiagnostic("rooming.assignmentSave.failed", {
        ...saveContext,
        durationMs: Date.now() - startedAt,
        error: error?.code || error?.message || "unknown",
      });
      setDirty(true);
      setRoomingSaveStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "saveFailed");
      writeCanvasCache(snapshot.city, snapshot.payload);
      writeRoomingDraftToStorage(snapshot.city, snapshot.payload);
      logRoomingDiagnostic("save.failed", {
        ...saveContext,
        durationMs: Date.now() - startedAt,
        error: error?.code || error?.message || "unknown",
      });
      if (snapshot.notify || canPersistRoomingRemote) {
        onToast?.(
          t.roomingSaveFailed || "تعذر حفظ التسكين. تحقق من الاتصال ثم حاول مرة أخرى.",
          "error"
        );
      }
      return { ok: false, error };
    }
  }, [canPersistRoomingRemote, clearRoomingDraftFromStorage, lang, onToast, roomingClientSyncWarning, syncRoomingClientsFromRooms, t, writeCanvasCache, writeRoomingDraftToStorage]);

  const processRoomingSaveQueue = React.useCallback(() => {
    if (roomingSaveInFlightRef.current) return roomingSavePromiseRef.current;
    roomingSaveInFlightRef.current = true;

    roomingSavePromiseRef.current = (async () => {
      let finalResult = { ok: true };
      try {
        while (roomingSavePendingRef.current) {
          const snapshot = roomingSavePendingRef.current;
          roomingSavePendingRef.current = null;
          finalResult = await persistRoomingSaveSnapshot(snapshot);
        }
      } finally {
        roomingSaveInFlightRef.current = false;
        if (roomingRealtimePendingRef.current) {
          scheduleRoomingRealtimeRefetchRef.current?.({
            source: "saveQueueSettled",
            delayMs: 0,
          });
        }
      }
      return finalResult;
    })();

    return roomingSavePromiseRef.current;
  }, [persistRoomingSaveSnapshot]);

  const saveCanvas = React.useCallback(async (notify = true) => {
    const snapshot = createRoomingSaveSnapshot(notify);
    writeCanvasCache(snapshot.city, snapshot.payload);
    writeRoomingDraftToStorage(snapshot.city, snapshot.payload);

    const existingPending = roomingSavePendingRef.current;
    const pendingReason = mergeRoomingSaveReason(existingPending?.reason, snapshot.reason);
    roomingSaveTriggerCountRef.current += 1;
    roomingSavePendingRef.current = {
      ...snapshot,
      notify: Boolean(notify || existingPending?.notify),
      reason: pendingReason,
    };
    logRoomingDiagnostic("rooming.save.queued", {
      programId: snapshot.programId,
      location: snapshot.city,
      revision: snapshot.revision,
      reason: pendingReason,
      inFlight: roomingSaveInFlightRef.current,
      replacedPending: Boolean(existingPending),
      triggerCount: roomingSaveTriggerCountRef.current,
    });

    if (!roomingSaveInFlightRef.current) setRoomingSaveStatus("saving");
    return processRoomingSaveQueue();
  }, [createRoomingSaveSnapshot, processRoomingSaveQueue, writeCanvasCache, writeRoomingDraftToStorage]);

  const retryRoomingLoad = React.useCallback(() => {
    setRoomingLoadRetryNonce((value) => value + 1);
  }, []);

  const retryRoomingSave = React.useCallback(() => {
    saveCanvas(true);
  }, [saveCanvas]);

  const continueRoomingLocalDraft = React.useCallback(() => {
    const draft = readRoomingDraftFromStorage(city);
    if (!draft) {
      onToast?.(
        t.roomingNoLocalDraft || (lang === "fr" ? "Aucun brouillon local disponible." : lang === "en" ? "No local draft is available." : "لا توجد مسودة محلية متاحة."),
        "warning"
      );
      setRoomingDraftAvailable(false);
      return;
    }
    applyLoadedRoomingState(draft, null, { resetInteraction: true });
    setDirty(true);
    setRoomingSaveStatus("dirty");
    setRoomingLoadStatus("loaded");
    setRoomingLoadConfirmed(true);
    setRoomingLoadConfirmedKey(roomingLoadKey);
    logRoomingDiagnostic("load.continueDraft", {
      programId: program.id,
      location: city,
      payloadSize: getRoomingPayloadSize(draft),
      rooms: draft.rooms?.length || 0,
    });
  }, [applyLoadedRoomingState, city, lang, onToast, program.id, readRoomingDraftFromStorage, roomingLoadKey, t]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleOffline = () => {
      if (canPersistRoomingRemote) setRoomingSaveStatus((current) => (current === "saving" || current === "slowSaving" ? "offline" : current));
    };
    const handleOnline = () => {
      setRoomingSaveStatus((current) => (current === "offline" && dirtyRef.current ? "dirty" : current));
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [canPersistRoomingRemote]);

  const markDirty = React.useCallback((reason = ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED) => {
    const normalizedReason = normalizeRoomingSaveReason(reason);
    roomingRevisionRef.current += 1;
    roomingDirtyReasonRef.current = roomingDirtyReasonRef.current
      ? mergeRoomingSaveReason(roomingDirtyReasonRef.current, normalizedReason)
      : normalizedReason;
    setDirty(true);
    setRoomingSaveStatus("dirty");
  }, []);

  React.useEffect(() => {
    if (!dirty) return;
    const sanitized = sanitizeRoomingStateForEligibleClients({ rooms, unassigned, roomLinks }, roomingEligibleClientIds);
    const payload = buildCanvasPayload(city, sanitized.rooms, sanitized.unassigned, sanitized.roomLinks);
    writeCanvasCache(city, payload);
    writeRoomingDraftToStorage(city, payload);
  }, [buildCanvasPayload, city, dirty, rooms, roomLinks, roomingEligibleClientIds, unassigned, writeCanvasCache, writeRoomingDraftToStorage]);

  React.useEffect(() => {
    const sanitized = sanitizeRoomingStateForEligibleClients({ rooms, unassigned, roomLinks }, roomingEligibleClientIds);
    if (!sanitized.removedCount) return;
    setRooms(sanitized.rooms);
    setUnassigned(sanitized.unassigned);
    setRoomLinks(normalizeRoomingLinks(sanitized.roomLinks, sanitized.rooms));
    setSelectedUnassignedIds((current) => {
      const available = new Set(sanitized.unassigned.map((item) => item.clientId));
      const next = new Set(Array.from(current).filter((clientId) => available.has(clientId)));
      return next.size === current.size ? current : next;
    });
    markDirty();
  }, [markDirty, rooms, roomLinks, roomingEligibleClientIds, unassigned]);

  React.useEffect(() => {
    if (!dirty) return undefined;
    const reason = normalizeRoomingSaveReason(roomingDirtyReasonRef.current || ROOMING_SAVE_REASON_ASSIGNMENT_CHANGED);
    const delayMs = reason === ROOMING_SAVE_REASON_LAYOUT_ONLY
      ? ROOMING_LAYOUT_AUTOSAVE_DELAY_MS
      : ROOMING_AUTOSAVE_DELAY_MS;
    if (reason === ROOMING_SAVE_REASON_LAYOUT_ONLY) {
      logRoomingDiagnostic("rooming.layoutSave.scheduled", {
        programId: program.id,
        location: city,
        revision: roomingRevisionRef.current,
        debounceMs: delayMs,
        rooms: rooms.length,
        saveInFlight: roomingSaveInFlightRef.current,
      });
    }
    let timer = null;
    const scheduleAutosave = (nextDelayMs) => {
      timer = window.setTimeout(() => {
        if (roomDragActiveRef.current) {
          scheduleAutosave(ROOMING_LAYOUT_AUTOSAVE_DELAY_MS);
          return;
        }
        saveCanvas(false);
      }, nextDelayMs);
    };
    scheduleAutosave(delayMs);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [city, dirty, program.id, rooms, roomLinks, unassigned, saveCanvas]);

  const switchCity = React.useCallback((nextCity) => {
    if (nextCity === city) return;
    if (dirty) saveCanvas(false);
    setCity(nextCity);
  }, [city, dirty, saveCanvas]);

  React.useEffect(() => {
    if (!canvasMenu.open) return undefined;
    const close = () => setCanvasMenu((current) => ({ ...current, open: false }));
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasMenu.open]);

  React.useEffect(() => {
    if (!roomLinkMenu.open) return undefined;
    const close = () => setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [roomLinkMenu.open]);

  React.useEffect(() => {
    if (!roomFilterOpen && !roomNeedsOpen) return undefined;
    const close = () => {
      setRoomFilterOpen(false);
      setRoomNeedsOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [roomFilterOpen, roomNeedsOpen]);

  const clientIdsInRooms = React.useMemo(() => {
    const ids = new Set();
    rooms.forEach((room) => (room.occupantIds || []).forEach((id) => ids.add(id)));
    return ids;
  }, [rooms]);

  const normalizedUnassigned = React.useMemo(() => {
    const explicit = new Map(unassigned.map((item) => [item.clientId, item]));
    roomingEligibleClients.forEach((client) => {
      if (!clientIdsInRooms.has(client.id) && !explicit.has(client.id)) {
        explicit.set(client.id, { clientId: client.id, reason: "" });
      }
    });
    return Array.from(explicit.values()).filter((item) => clientsById[item.clientId] && !clientIdsInRooms.has(item.clientId));
  }, [roomingEligibleClients, clientsById, clientIdsInRooms, unassigned]);

  React.useEffect(() => {
    const availableIds = new Set(normalizedUnassigned.map((item) => item.clientId));
    setSelectedUnassignedIds((current) => {
      const next = new Set(Array.from(current).filter((clientId) => availableIds.has(clientId)));
      return next.size === current.size ? current : next;
    });
  }, [normalizedUnassigned]);

  const groupedRooms = React.useMemo(() => {
    const sorted = rooms.slice().sort((a, b) => {
      const hotel = String(resolveRoomHotelName(a) || "").localeCompare(String(resolveRoomHotelName(b) || ""), "ar");
      if (hotel) return hotel;
      const type = String(a.roomType || "").localeCompare(String(b.roomType || ""), "ar");
      if (type) return type;
      const category = String(a.category || "").localeCompare(String(b.category || ""), "ar");
      if (category) return category;
      return (a.order || 0) - (b.order || 0);
    });
    const hotels = new Map();
    sorted.forEach((room) => {
      const hotelKey = resolveRoomHotelName(room) || (t.roomingMissingHotel || "فندق غير محدد");
      const typeKey = room.roomType || (t.noHotel || "غير محدد");
      if (!hotels.has(hotelKey)) hotels.set(hotelKey, new Map());
      const byType = hotels.get(hotelKey);
      if (!byType.has(typeKey)) byType.set(typeKey, []);
      byType.get(typeKey).push(room);
    });
    return hotels;
  }, [resolveRoomHotelName, rooms, t.noHotel, t.roomingMissingHotel]);

  const getCompatibilityResult = React.useCallback((client, room) => {
    if (!client || !room) return { ok: false, reason: t.roomingMissingPilgrimData || "بيانات المعتمر ناقصة" };
    if (String(client.programId || "") !== String(program.id || "")) return { ok: false, reason: t.programNotFound || "البرنامج غير متاح" };
    if (!doesServiceTypeNeedAccommodation(client)) return { ok: false, reason: roomingServiceTypeHiddenNote };
    const context = getClientContext(client);
    const occupantIds = room.occupantIds || [];
    const roomType = normalizeRoomingRoomType(room.roomType);
    const capacity = room.capacity || getRoomingCapacity(roomType);
    const clientGender = normalizeRoomingGender(context.gender);
    if (occupantIds.includes(client.id)) return { ok: false, reason: t.roomingAlreadyInserted || "المعتمر مدرج مسبقا" };
    if (occupantIds.length >= capacity) return { ok: false, reason: t.roomFull || "الغرفة ممتلئة" };
    if (room.category === "male_only" && clientGender === "female") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    if (room.category === "female_only" && clientGender === "male") return { ok: false, reason: t.roomingGenderMismatch || "الجنس غير متوافق" };
    return { ok: true };
  }, [getClientContext, program.id, roomingServiceTypeHiddenNote, t]);

  const getRoomingDropConflicts = React.useCallback((client, room) => {
    if (!client || !room) return null;
    const targetRoomType = normalizeRoomingRoomType(room.roomType);
    const currentRoomType = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
    const resolvedRoomHotel = resolveRoomHotelName(room);
    const targetHotel = isMissingRoomingValue(resolvedRoomHotel) ? "" : String(resolvedRoomHotel).trim();
    const currentHotel = getExplicitClientHotelForRoomingCity(client, city);
    const clientGender = normalizeRoomingGender(client.gender);
    const occupantGenders = (room.occupantIds || [])
      .map((id) => normalizeRoomingGender(clientsById[id]?.gender))
      .filter((gender) => gender === "male" || gender === "female");
    const hasMale = occupantGenders.includes("male");
    const hasFemale = occupantGenders.includes("female");
    const conflicts = [];
    if (targetRoomType && currentRoomType && targetRoomType !== currentRoomType) conflicts.push("roomType");
    if (targetHotel && currentHotel && normalizeRoomingHotel(targetHotel) !== normalizeRoomingHotel(currentHotel)) conflicts.push("hotel");
    const priceSync = getRoomingPriceSync({ client, room, packages, city });
    if (priceSync?.requiresConfirmation) conflicts.push("price");
    let genderAssignment = "";
    if (!clientGender && room.category === "male_only") {
      conflicts.push("genderAssignment");
      genderAssignment = "male";
    } else if (!clientGender && room.category === "female_only") {
      conflicts.push("genderAssignment");
      genderAssignment = "female";
    }
    const createsFamilyMix = room.category === "family"
      && ["male", "female"].includes(clientGender)
      && occupantGenders.length > 0
      && !(hasMale && hasFemale)
      && ((clientGender === "male" && hasFemale) || (clientGender === "female" && hasMale));
    if (createsFamilyMix) conflicts.push("familyMixed");
    if (!conflicts.length) return null;
    return {
      clientId: client.id,
      roomId: room.id,
      city,
      conflicts,
      genderAssignment,
      currentRoomType,
      targetRoomType,
      currentRoomTypeLabel: currentRoomType ? getLocalizedRoomTypeLabel(currentRoomType) : "",
      targetRoomTypeLabel: targetRoomType ? getLocalizedRoomTypeLabel(targetRoomType) : "",
      currentHotel,
      targetHotel,
      priceSync,
    };
  }, [city, clientsById, getLocalizedRoomTypeLabel, packages, resolveRoomHotelName]);

  const getCompatibilityReason = React.useCallback((client, room) => {
    const result = getCompatibilityResult(client, room);
    return result.ok ? "" : result.reason;
  }, [getCompatibilityResult]);

  const compatibleUnassigned = React.useMemo(() => {
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room) return [];
    const remaining = Math.max(0, (room.capacity || getRoomingCapacity(room.roomType)) - (room.occupantIds || []).length);
    if (!remaining) return [];
    return normalizedUnassigned
      .map((item) => ({ item, client: clientsById[item.clientId] }))
      .filter(({ client }) => client && !getCompatibilityReason(client, room));
  }, [rooms, selectedRoomId, normalizedUnassigned, clientsById, getCompatibilityReason]);

  const filteredCompatibleUnassigned = React.useMemo(() => {
    const query = normalizeRoomingSearchText(pickerSearch);
    if (!query) return compatibleUnassigned;
    return compatibleUnassigned.filter(({ client }) => getRoomingClientSearchText(client, lang).includes(query));
  }, [compatibleUnassigned, lang, pickerSearch]);

  const filteredUnassigned = React.useMemo(() => {
    const query = panelSearch.trim().toLowerCase();
    return normalizedUnassigned.filter((item) => {
      const client = clientsById[item.clientId];
      if (!client) return false;
      const context = getClientContext(client);
      if (query && !context.name.toLowerCase().includes(query)) return false;
      if (panelHotel !== "all" && context.hotel !== panelHotel) return false;
      if (panelRoomType !== "all" && context.roomType !== panelRoomType) return false;
      return true;
    });
  }, [normalizedUnassigned, clientsById, getClientContext, panelSearch, panelHotel, panelRoomType]);

  const unassignedSelectionLabels = React.useMemo(() => {
    if (lang === "fr") {
      return {
        selected: "sélectionnés",
        clear: "Effacer",
        addToRoom: "Ajouter à la chambre sélectionnée",
        capacity: "La chambre ne peut pas accueillir tous les pèlerins sélectionnés.",
        classification: "Certains pèlerins sélectionnés ne correspondent pas à la classification de cette chambre.",
        conflict: "Certains pèlerins sélectionnés nécessitent une vérification. Ajoutez-les un par un pour confirmer les différences.",
        success: "Les pèlerins sélectionnés ont été ajoutés.",
      };
    }
    if (lang === "en") {
      return {
        selected: "selected",
        clear: "Clear",
        addToRoom: "Add to selected room",
        capacity: "This room does not have enough capacity for all selected pilgrims.",
        classification: "Some selected pilgrims do not match this room classification.",
        conflict: "Some selected pilgrims need review before they can be added. Add them one by one to confirm differences.",
        success: "Selected pilgrims added.",
      };
    }
    return {
      selected: "محدد",
      clear: "إلغاء",
      addToRoom: "إضافة المحددين إلى الغرفة",
      capacity: "الغرفة لا تتسع لكل المعتمرين المحددين",
      classification: "بعض المحددين لا يناسبون تصنيف هذه الغرفة",
      conflict: "بعض المحددين يحتاجون مراجعة قبل إدراجهم. أضفهم فرديًا لتأكيد الاختلافات.",
      success: "تم إدراج المعتمرين المحددين",
    };
  }, [lang]);

  const selectedUnassignedList = React.useMemo(() => (
    Array.from(selectedUnassignedIds).filter((clientId) => clientsById[clientId] && !clientIdsInRooms.has(clientId))
  ), [selectedUnassignedIds, clientsById, clientIdsInRooms]);

  const clearSelectedUnassigned = React.useCallback(() => {
    setSelectedUnassignedIds(new Set());
  }, []);

  const toggleUnassignedSelection = React.useCallback((clientId) => {
    setSelectedUnassignedIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }, []);

  const setUnassignedGroupDragImage = React.useCallback((event, dragIds = [], fallbackName = "") => {
    if (!event?.dataTransfer?.setDragImage || dragIds.length <= 1 || typeof document === "undefined") return;
    const firstClient = clientsById[dragIds[0]];
    const firstName = getClientDisplayName(firstClient, lang) || fallbackName || "—";
    const extraCount = Math.max(0, dragIds.length - 1);
    const title = extraCount ? `${firstName} +${extraCount}` : firstName;
    const subtitle = lang === "fr"
      ? `${dragIds.length} ${roomingParticipantTerms.plural} sélectionnés`
      : lang === "en"
        ? `${dragIds.length} selected ${roomingParticipantTerms.plural}`
        : `${dragIds.length} ${roomingParticipantTerms.plural} محددين`;
    const preview = document.createElement("div");
    preview.dir = lang === "ar" ? "rtl" : "ltr";
    preview.style.cssText = [
      "position:fixed",
      "top:-1000px",
      "left:-1000px",
      "z-index:2147483647",
      "width:230px",
      "border:1px solid rgba(37,99,235,.35)",
      "border-radius:12px",
      "background:#ffffff",
      "box-shadow:0 18px 42px rgba(15,23,42,.22)",
      "padding:10px 12px",
      "font-family:Cairo,Arial,Tahoma,sans-serif",
      "pointer-events:none",
    ].join(";");
    const titleEl = document.createElement("strong");
    titleEl.textContent = title;
    titleEl.style.cssText = "display:block;color:#0f172a;font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    const subtitleEl = document.createElement("span");
    subtitleEl.textContent = subtitle;
    subtitleEl.style.cssText = "display:inline-flex;margin-top:5px;border-radius:999px;background:rgba(37,99,235,.10);border:1px solid rgba(37,99,235,.22);color:#1d4ed8;font-size:11px;font-weight:900;padding:3px 8px";
    preview.appendChild(titleEl);
    preview.appendChild(subtitleEl);
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, lang === "ar" ? 206 : 24, 24);
    window.setTimeout(() => preview.remove(), 0);
  }, [clientsById, lang, roomingParticipantTerms.plural]);

  const roomOccupancyOptions = React.useMemo(() => [
    { value: "all", label: t.roomingFilterAllRooms || t.allRooms || "كل الغرف" },
    { value: "empty", label: t.roomingFilterEmpty || "الفارغة" },
    { value: "incomplete", label: t.roomingFilterIncomplete || "الناقصة" },
    { value: "full", label: t.roomingFilterFull || "الممتلئة" },
  ], [t]);

  const visibleRooms = React.useMemo(() => rooms.filter((room) => {
    const roomHotelName = resolveRoomHotelName(room);
    const hotelMatch = panelHotel === "all"
      || normalizeRoomingHotel(roomHotelName) === normalizeRoomingHotel(panelHotel);
    const roomTypeMatch = panelRoomType === "all"
      || normalizeRoomingRoomType(room.roomType) === normalizeRoomingRoomType(panelRoomType);
    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
    const count = (room.occupantIds || []).length;
    const occupancyMatch = roomOccupancyFilter === "all"
      || (roomOccupancyFilter === "empty" && count === 0)
      || (roomOccupancyFilter === "incomplete" && count > 0 && count < capacity)
      || (roomOccupancyFilter === "full" && count === capacity);
    return hotelMatch && roomTypeMatch && occupancyMatch;
  }), [rooms, panelHotel, panelRoomType, roomOccupancyFilter, resolveRoomHotelName]);

  const getRoomingProgressForCity = React.useCallback((targetCity) => {
    const sourceRooms = targetCity === city ? rooms : readCanvasStateFromStorage(targetCity).rooms;
    const assigned = new Set();
    sourceRooms.forEach((room) => (room.occupantIds || []).forEach((id) => {
      if (clientsById[id]) assigned.add(id);
    }));
    const total = roomingEligibleClients.length;
    const percent = total ? Math.round((assigned.size / total) * 100) : 0;
    return { assigned: assigned.size, total, percent };
  }, [city, rooms, readCanvasStateFromStorage, roomingEligibleClients.length, clientsById]);

  const roomingProgress = React.useMemo(() => ({
    makkah: getRoomingProgressForCity("makkah"),
    madinah: getRoomingProgressForCity("madinah"),
  }), [getRoomingProgressForCity]);

  const roomingStatusText = React.useMemo(() => {
    if (roomingLoadStatus === "initialLoading") return t.loading || "جاري التحميل...";
    if (roomingLoadStatus === "slowLoading") return t.roomingSlowLoading || (lang === "fr" ? "Chargement lent..." : lang === "en" ? "Loading is taking longer..." : "التحميل يستغرق وقتا أطول...");
    if (roomingLoadStatus === "loadFailed") return t.roomingLoadFailedShort || (lang === "fr" ? "Échec du chargement" : lang === "en" ? "Load failed" : "تعذر التحميل");
    if (roomingLoadStatus === "offline") return t.roomingOfflineShort || (lang === "fr" ? "Hors ligne" : lang === "en" ? "Offline" : "غير متصل");
    if (roomingSaveStatus === "saving") return t.saving || "جارٍ الحفظ";
    if (roomingSaveStatus === "slowSaving") return t.roomingSlowSaving || (lang === "fr" ? "Enregistrement lent..." : lang === "en" ? "Saving is taking longer..." : "الحفظ يستغرق وقتا أطول...");
    if (roomingSaveStatus === "saveFailed") return t.roomingSaveFailedShort || "تعذر الحفظ";
    if (roomingSaveStatus === "offline") return t.roomingOfflineDraft || (lang === "fr" ? "Brouillon local conservé" : lang === "en" ? "Local draft kept" : "تم حفظ مسودة محلية");
    if (roomingExportStatus === "slow") return t.roomingExportSlow || (lang === "fr" ? "Export en cours..." : lang === "en" ? "Export is taking longer..." : "التصدير يستغرق وقتا أطول...");
    if (dirty) return t.unsavedChanges || "تغييرات غير محفوظة";
    if (savedAt) return tr("lastSaved", { time: savedAt.toLocaleTimeString("ar-MA") }) || `آخر حفظ ${savedAt.toLocaleTimeString("ar-MA")}`;
    if (roomingLoadStatus === "loaded") return t.roomingLoadedFromCloud || "محفوظ في السحابة";
    return "";
  }, [dirty, lang, roomingExportStatus, roomingLoadStatus, roomingSaveStatus, savedAt, t, tr]);

  const roomingStatusBanner = React.useMemo(() => {
    const retryLoadLabel = t.retry || (lang === "fr" ? "Réessayer" : lang === "en" ? "Retry" : "إعادة المحاولة");
    const retrySaveLabel = t.roomingRetrySave || (lang === "fr" ? "Réessayer l’enregistrement" : lang === "en" ? "Retry save" : "إعادة الحفظ");
    const localDraftLabel = t.roomingContinueLocalDraft || (lang === "fr" ? "Continuer le brouillon local" : lang === "en" ? "Continue local draft" : "متابعة المسودة المحلية");
    if (roomingLoadStatus === "loadFailed") {
      return {
        tone: "error",
        message: t.roomingLoadFailed || (lang === "fr" ? "Chargement impossible. Réessayez ou continuez avec le brouillon local." : lang === "en" ? "Unable to load rooming. Retry or continue with the local draft." : "تعذر تحميل التسكين. أعد المحاولة أو تابع المسودة المحلية."),
        retryLoadLabel,
        localDraftLabel: roomingDraftAvailable ? localDraftLabel : "",
      };
    }
    if (roomingLoadStatus === "slowLoading") {
      return {
        tone: "warning",
        message: t.roomingSlowLoading || (lang === "fr" ? "Le chargement prend plus de temps que prévu." : lang === "en" ? "Loading is taking longer than expected." : "تحميل التسكين يستغرق وقتا أطول من المعتاد."),
        retryLoadLabel,
        localDraftLabel: roomingDraftAvailable ? localDraftLabel : "",
      };
    }
    if (roomingLoadStatus === "offline") {
      return {
        tone: "warning",
        message: t.roomingOfflineLoad || (lang === "fr" ? "Hors ligne. Les données locales sont affichées." : lang === "en" ? "Offline. Local data is shown." : "أنت غير متصل. يتم عرض البيانات المحلية."),
        retryLoadLabel,
        localDraftLabel: roomingDraftAvailable ? localDraftLabel : "",
      };
    }
    if (roomingSaveStatus === "saveFailed") {
      return {
        tone: "error",
        message: t.roomingSaveFailed || (lang === "fr" ? "Impossible d’enregistrer l’hébergement. Le brouillon local est conservé." : lang === "en" ? "Unable to save rooming. The local draft is kept." : "تعذر حفظ التسكين. تم الاحتفاظ بالمسودة المحلية."),
        retrySaveLabel,
      };
    }
    if (roomingSaveStatus === "offline") {
      return {
        tone: "warning",
        message: t.roomingSaveOffline || (lang === "fr" ? "Hors ligne. Le brouillon local est conservé." : lang === "en" ? "Offline. The local draft is kept." : "أنت غير متصل. تم الاحتفاظ بالمسودة المحلية."),
        retrySaveLabel,
      };
    }
    if (roomingSaveStatus === "slowSaving") {
      return {
        tone: "warning",
        message: t.roomingSlowSaving || (lang === "fr" ? "L’enregistrement prend plus de temps que prévu." : lang === "en" ? "Saving is taking longer than expected." : "حفظ التسكين يستغرق وقتا أطول من المعتاد."),
      };
    }
    if (roomingExportStatus === "slow") {
      return {
        tone: "warning",
        message: t.roomingExportSlow || (lang === "fr" ? "L’export prend plus de temps que prévu." : lang === "en" ? "Export is taking longer than expected." : "تصدير التسكين يستغرق وقتا أطول من المعتاد."),
      };
    }
    return null;
  }, [lang, roomingDraftAvailable, roomingExportStatus, roomingLoadStatus, roomingSaveStatus, t]);

  const roomNeeds = React.useMemo(() => {
    const counts = new Map();
    roomingEligibleClients.forEach((client) => {
      const type = normalizeRoomingRoomType(client.roomType, client.roomTypeLabel, client.room);
      if (!type) return;
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    const details = ROOMING_ROOM_OPTIONS
      .map((option) => {
        const pilgrims = counts.get(option.value) || 0;
        if (!pilgrims) return null;
        const capacity = getRoomingCapacity(option.value);
        return {
          type: option.value,
          label: getLocalizedRoomTypeLabel(option.value),
          pilgrims,
          rooms: Math.ceil(pilgrims / capacity),
        };
      })
      .filter(Boolean);
    return {
      details,
      totalRooms: details.reduce((sum, item) => sum + item.rooms, 0),
      totalPilgrims: details.reduce((sum, item) => sum + item.pilgrims, 0),
    };
  }, [roomingEligibleClients, getLocalizedRoomTypeLabel]);

  const getNextRoomNumber = React.useCallback(() => {
    const values = rooms
      .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    return String((values.length ? Math.max(...values) : 0) + 1).padStart(2, "0");
  }, [rooms]);

  const roomToCollisionNode = React.useCallback((room) => ({
    id: room.id,
    type: "room",
    position: { x: Number(room.x) || 0, y: Number(room.y) || 0 },
    data: { room },
    width: ROOMING_NODE_WIDTH,
  }), []);

  const allCollisionNodes = React.useMemo(
    () => rooms.map((room) => roomToCollisionNode(room)),
    [rooms, roomToCollisionNode]
  );

  const findFreePositionForRoom = React.useCallback((room, preferredPosition) => {
    const node = {
      ...roomToCollisionNode(room),
      position: preferredPosition,
    };
    return findNearestFreeRoomingPosition(node, allCollisionNodes.filter((item) => item.id !== room.id), preferredPosition);
  }, [allCollisionNodes, roomToCollisionNode]);

  const loadExistingRoomsBeforeGenerate = React.useCallback(async () => {
    if (rooms.length) return rooms;
    if (canPersistRoomingRemote) {
      const { data, error } = await retryRoomingOperation(
        async () => {
          const result = await runRoomingTimedOperation(
            () => db.roomingAssignments.fetch(agencyId, program.id, city),
            {
              action: "rooming.generatePreload",
              onSlow: () => setRoomingLoadStatus("slowLoading"),
            }
          );
          if (result?.error) throw result.error;
          return result;
        },
        { shouldRetry: (error) => error?.code !== "ROOMING_TIMEOUT" }
      );
      if (error) throw error;
      if (data) {
        const loaded = normalizeRoomingCanvasState(data, roomingEligibleClients);
        const sanitized = sanitizeRoomingStateForEligibleClients(loaded, roomingEligibleClientIds);
        writeCanvasCache(city, buildCanvasPayload(city, loaded.rooms, loaded.unassigned, loaded.roomLinks));
        if (sanitized.rooms.length) {
          applyLoadedRoomingState(loaded, data.updatedAt, { resetInteraction: false });
          setRoomingLoadStatus("loaded");
          setRoomingLoadConfirmed(true);
          setRoomingLoadConfirmedKey(roomingLoadKey);
        }
        return sanitized.rooms;
      }
    }
    const localLoaded = readCanvasStateFromStorage(city);
    const localSanitized = sanitizeRoomingStateForEligibleClients(localLoaded, roomingEligibleClientIds);
    if (localSanitized.rooms.length) {
      applyLoadedRoomingState(localLoaded, null, { resetInteraction: false });
      setRoomingLoadStatus("loaded");
      setRoomingLoadConfirmed(true);
      setRoomingLoadConfirmedKey(roomingLoadKey);
    }
    return localSanitized.rooms;
  }, [
    agencyId,
    applyLoadedRoomingState,
    buildCanvasPayload,
    canPersistRoomingRemote,
    city,
    program.id,
    readCanvasStateFromStorage,
    roomingEligibleClients,
    roomingEligibleClientIds,
    roomingLoadKey,
    rooms,
    writeCanvasCache,
  ]);

  const generateRooms = React.useCallback(async (options = {}) => {
    const skipLargeConfirm = Boolean(options?.skipLargeConfirm);
    const transientBlockers = [];
    const incompleteBlockers = [];
    if (isGeneratingRoomsRef.current || isGeneratingRooms) transientBlockers.push("التوليد قيد التنفيذ");
    if (isRoomingLoading || !hasRoomingLoaded) transientBlockers.push("بيانات التسكين ما زالت تتحمل");
    if (isRoomingSaving) transientBlockers.push("الحفظ جار");
    if (isRoomingExternalDataRefreshing) transientBlockers.push("البرنامج ما زال يحدّث");
    if (!Array.isArray(packages) || !packages.length) incompleteBlockers.push("الباقات غير جاهزة");
    if (!verifiedCityHotelOptions.length) incompleteBlockers.push("الفندق غير محدد");

    logRoomingGenerateDebug("before", {
      dirty,
      isGeneratingRooms: isGeneratingRoomsRef.current || isGeneratingRooms,
      roomingSaving: isRoomingSaving,
      externalDataReady,
      externalDataRefreshing: isRoomingExternalDataRefreshing,
      blockers: [...transientBlockers, ...incompleteBlockers],
    });

    if (transientBlockers.length) {
      onToast?.(roomingGenerateWaitMessage, "info");
      return;
    }
    if (dirty) {
      onToast?.(roomingGenerateWaitMessage, "info");
      return;
    }
    if (incompleteBlockers.length) {
      onToast?.(`لم يتم توليد أي غرفة لأن بيانات التسكين غير مكتملة: ${incompleteBlockers.join("، ")}`, "warning");
      return;
    }

    isGeneratingRoomsRef.current = true;
    setIsGeneratingRooms(true);
    try {
      try {
      const existingRooms = await loadExistingRoomsBeforeGenerate();
      if (existingRooms.length) {
        onToast?.(roomingGenerateBlockedMessage, "warning");
        return;
      }
    } catch (error) {
      console.error("[rooming] generate preflight failed", error);
      onToast?.(t.roomingLoadFailed || "تعذر تحميل التسكين. سيتم استخدام النسخة المحلية إن وجدت.", "error");
      return;
    }
    const nextRooms = [];
    const nextUnassignedByClientId = new Map(roomingEligibleClients.map((client) => [client.id, { clientId: client.id, reason: "" }]));
    const grouped = new Map();
    const generationIssueCounts = {
      missingHotel: 0,
      missingRoomType: 0,
      missingGender: 0,
      missingFamily: 0,
      capacityExceeded: 0,
    };
    const addUnassigned = (client, reason, issueKey = "") => {
      if (issueKey && Object.prototype.hasOwnProperty.call(generationIssueCounts, issueKey)) {
        generationIssueCounts[issueKey] += 1;
      }
      nextUnassignedByClientId.set(client.id, { clientId: client.id, reason });
    };

    roomingEligibleClients.forEach((client) => {
      const context = getClientContext(client);
      if (!context.hotel) return addUnassigned(client, t.roomingMissingHotel || "فندق غير محدد", "missingHotel");
      if (!context.roomType) return addUnassigned(client, t.roomingMissingRoomType || "نوع الغرفة غير محدد", "missingRoomType");
      if (!context.gender) return addUnassigned(client, t.roomingMissingGender || "الجنس غير محدد", "missingGender");
      const roomType = context.roomType;
      const capacity = getRoomingCapacity(roomType);
      const requestedCategory = client.roomCategory || (context.gender === "female" ? "female_only" : "male_only");
      if (requestedCategory === "family" && !context.familyKey) return addUnassigned(client, t.roomingMissingFamily || "لا توجد مجموعة عائلية", "missingFamily");
      const groupKey = [
        context.hotel,
        roomType,
        requestedCategory,
        client.roomingGroupId || context.familyKey || (requestedCategory === "family" ? client.id : context.gender),
      ].join("::");
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey).push(client);
      if (grouped.get(groupKey).length > capacity && client.roomingGroupId) {
        grouped.get(groupKey).pop();
        addUnassigned(client, t.roomingCapacityExceeded || "تجاوز سعة الغرفة", "capacityExceeded");
      }
    });

    let order = 0;
    Array.from(grouped.values()).forEach((group) => {
      if (!group.length) return;
      const first = group[0];
      const context = getClientContext(first);
      const capacity = getRoomingCapacity(context.roomType);
      for (let index = 0; index < group.length; index += capacity) {
        const plannedClients = group.slice(index, index + capacity);
        const category = first.roomCategory || inferRoomCategoryFromClients(plannedClients);
        const hasUnsafeFamilyMix = category === "family" && new Set(plannedClients.map((client) => client.gender)).size > 1
          && !plannedClients.every((client) => getClientContext(client).familyKey && getClientContext(client).familyKey === getClientContext(first).familyKey);
        if (hasUnsafeFamilyMix) {
          plannedClients.forEach((client) => addUnassigned(client, t.roomingMissingFamily || "لا توجد مجموعة عائلية", "missingFamily"));
          return;
        }
        nextRooms.push({
          id: createRoomId(),
          order: order,
          roomNumber: String(order + 1).padStart(2, "0"),
          roomType: context.roomType,
          category,
          hotel: context.hotel,
          capacity,
          occupantIds: [],
          roomingGroupId: "",
          roomingGroupName: "",
        });
        order += 1;
      }
    });

    const generatedRooms = autoLayoutGeneratedRoomNodes(nextRooms);
    if (!generatedRooms.length) {
      const zeroReasons = [];
      if (!roomingEligibleClients.length) {
        zeroReasons.push(clients.length ? "لا يوجد عملاء مؤهلون" : "لا يوجد عملاء في البرنامج");
      }
      if (generationIssueCounts.missingHotel) zeroReasons.push(`الفندق غير محدد (${generationIssueCounts.missingHotel})`);
      if (generationIssueCounts.missingRoomType) zeroReasons.push(`نوع الغرفة غير محدد (${generationIssueCounts.missingRoomType})`);
      if (generationIssueCounts.missingGender) zeroReasons.push(`الجنس غير محدد (${generationIssueCounts.missingGender})`);
      if (generationIssueCounts.missingFamily) zeroReasons.push(`المجموعة العائلية غير محددة (${generationIssueCounts.missingFamily})`);
      if (generationIssueCounts.capacityExceeded) zeroReasons.push(`تجاوز سعة الغرفة (${generationIssueCounts.capacityExceeded})`);
      setUnassigned(Array.from(nextUnassignedByClientId.values()));
      logRoomingGenerateDebug("zeroRooms", { zeroReasons, generationIssueCounts });
      const reasonText = zeroReasons.length ? `: ${zeroReasons.join("، ")}` : "";
      onToast?.(`لم يتم توليد أي غرفة لأن بيانات التسكين غير مكتملة${reasonText}`, "warning");
      return;
    }
    if (!skipLargeConfirm && generatedRooms.length >= ROOMING_LARGE_GENERATION_THRESHOLD) {
      generatedRoomFitPendingRef.current = null;
      setLargeRoomGenerationConfirm({ mode: "generate", roomCount: generatedRooms.length });
      return;
    }
    generatedRoomFitPendingRef.current = getRoomingGeneratedLayoutSummary(generatedRooms.length);
    setRooms(generatedRooms);
    setUnassigned(Array.from(nextUnassignedByClientId.values()));
    setRoomLinks([]);
    setLinkMode(false);
    setLinkStartRoomId(null);
    setSelectedRoomLinkId(null);
    setSelectedRoomId(null);
    markDirty();
    onToast?.(t.roomingGenerated || "تم توليد الغرف فارغة حسب الاحتياج. سيبقى الحجاج/المعتمرون في قائمة غير المسكنين لتقوم بتسكينهم يدويًا.", "success");
    } finally {
      isGeneratingRoomsRef.current = false;
      setIsGeneratingRooms(false);
    }
  }, [
    clients.length,
    dirty,
    externalDataReady,
    getClientContext,
    hasRoomingLoaded,
    isGeneratingRooms,
    isRoomingExternalDataRefreshing,
    isRoomingLoading,
    isRoomingSaving,
    loadExistingRoomsBeforeGenerate,
    logRoomingGenerateDebug,
    markDirty,
    onToast,
    packages,
    roomingEligibleClients,
    roomingGenerateBlockedMessage,
    roomingGenerateWaitMessage,
    t,
    verifiedCityHotelOptions.length,
  ]);

  const closeRoomModal = React.useCallback(() => {
    setRoomModal({ open: false, mode: "edit", roomId: null });
    setRoomDraftErrors({});
  }, []);

  const openCreateRoom = React.useCallback((position = { x: 0, y: 0 }) => {
    setRoomDraft({
      roomType: "",
      category: "",
      hotel: "",
      roomCount: "1",
    });
    setRoomDraftErrors({});
    setRoomCreatePosition(position);
    setRoomModal({ open: true, mode: "create", roomId: null });
  }, []);

  const openEditRoom = React.useCallback((room) => {
    const hotelName = resolveRoomHotelName(room);
    setSelectedRoomId(room.id);
    setRoomDraft({
      roomType: normalizeRoomingRoomType(room.roomType) || "",
      category: ["male_only", "female_only", "family"].includes(room.category) ? room.category : "",
      hotel: hotelName || "",
      roomCount: "1",
    });
    setRoomDraftErrors({});
    setRoomModal({ open: true, mode: "edit", roomId: room.id });
  }, [resolveRoomHotelName]);

  const saveRoomEdit = React.useCallback((options = {}) => {
    const skipLargeConfirm = Boolean(options?.skipLargeConfirm);
    const validationErrors = validateRoomDraft(roomDraft);
    if (Object.keys(validationErrors).length) {
      setRoomDraftErrors(validationErrors);
      return;
    }
    const selectedRoomType = normalizeRoomingRoomType(roomDraft.roomType);
    const selectedCategory = String(roomDraft.category || "").trim();
    const selectedHotel = getVerifiedRoomingHotel(roomDraft.hotel, hotelOptions);
    const capacity = getRoomingCapacity(selectedRoomType);
    if (roomModal.mode === "create") {
      const roomCount = normalizeRoomCreateCount(roomDraft.roomCount);
      if (!skipLargeConfirm && roomCount >= ROOMING_LARGE_GENERATION_THRESHOLD) {
        setLargeRoomGenerationConfirm({ mode: "create", roomCount });
        return;
      }
      const now = new Date().toISOString();
      const roomNumbers = rooms
        .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
        .filter((value) => Number.isFinite(value) && value > 0);
      const firstRoomNumber = (roomNumbers.length ? Math.max(...roomNumbers) : 0) + 1;
      const createdRooms = [];
      const baseCollisionNodes = rooms.map((room) => roomToCollisionNode(room));
      const createdLayout = getRoomingGeneratedLayoutSummary(roomCount);
      const createdLayoutOrigin = {
        x: Number(roomCreatePosition.x ?? ROOMING_LAYOUT_START_X),
        y: Number(roomCreatePosition.y ?? ROOMING_LAYOUT_START_Y),
      };
      for (let index = 0; index < roomCount; index += 1) {
        const draftRoom = {
          id: createRoomId(),
          order: rooms.length + index,
          roomNumber: String(firstRoomNumber + index).padStart(2, "0"),
          roomType: selectedRoomType,
          category: selectedCategory,
          hotel: selectedHotel,
          hotelName: selectedHotel,
          hotel_name: selectedHotel,
          hotelId: "",
          hotel_id: "",
          capacity,
          occupantIds: [],
          locked: false,
          createdAt: now,
          updatedAt: now,
        };
        const preferredPosition = getRoomingGeneratedGridPosition(index, createdLayout.columns, createdLayoutOrigin);
        const node = { ...roomToCollisionNode(draftRoom), position: preferredPosition };
        const collisionNodes = [...baseCollisionNodes, ...createdRooms.map((room) => roomToCollisionNode(room))];
        const position = findNearestFreeRoomingPosition(node, collisionNodes, preferredPosition);
        createdRooms.push({ ...draftRoom, x: position.x, y: position.y });
      }
      if (roomCount > 1) generatedRoomFitPendingRef.current = getRoomingGeneratedLayoutSummary(rooms.length + createdRooms.length);
      setRooms((prev) => [...prev, ...createdRooms]);
      setSelectedRoomId(createdRooms[createdRooms.length - 1]?.id || null);
      closeRoomModal();
      markDirty();
      onToast?.(roomCount > 1 ? (t.roomingRoomsAdded || t.roomingRoomAdded || "تمت إضافة الغرف") : (t.roomingRoomAdded || "تمت إضافة الغرفة"), "success");
      return;
    }

    const room = rooms.find((item) => item.id === roomModal.roomId);
    if (!room) return;
    const previousHotelName = resolveRoomHotelName(room);
    const preserveHotelId = previousHotelName
      && normalizeRoomingHotel(previousHotelName) === normalizeRoomingHotel(selectedHotel);
    const kept = [];
    const removed = [];
    (room.occupantIds || []).forEach((clientId) => {
      const client = clientsById[clientId];
      if (!client) return;
      const nextRoom = { ...room, ...roomDraft, roomType: selectedRoomType, category: selectedCategory, hotel: selectedHotel, capacity, occupantIds: kept };
      const reason = getCompatibilityReason(client, nextRoom);
      if (reason || kept.length >= capacity) removed.push({ clientId, reason: reason || t.roomingCapacityExceeded || "تجاوز سعة الغرفة" });
      else kept.push(clientId);
    });
    setRooms((prev) => prev.map((item) => item.id === room.id ? {
      ...item,
      ...roomDraft,
      roomType: selectedRoomType,
      category: selectedCategory,
      hotel: selectedHotel,
      hotelName: selectedHotel,
      hotel_name: selectedHotel,
      hotelId: preserveHotelId ? (item.hotelId || "") : "",
      hotel_id: preserveHotelId ? (item.hotel_id || "") : "",
      capacity,
      occupantIds: kept,
      genderOverrides: Object.fromEntries(Object.entries(item.genderOverrides || {}).filter(([id]) => kept.includes(id))),
      priceOverrides: Object.fromEntries(Object.entries(item.priceOverrides || {}).filter(([id]) => kept.includes(id))),
    } : item));
    if (removed.length) {
      setUnassigned((prev) => [...prev, ...removed]);
      if (selectedCategory === "male_only") onToast?.(t.roomingMovedIncompatibleWomen || "تم نقل المعتمرات غير المتوافقات إلى غير المدرجين", "info");
      else if (selectedCategory === "female_only") onToast?.(t.roomingMovedIncompatibleMen || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
      else onToast?.(t.roomingMovedIncompatible || "تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
    }
    closeRoomModal();
    markDirty();
  }, [closeRoomModal, rooms, roomModal.mode, roomModal.roomId, roomDraft, roomCreatePosition, clientsById, getCompatibilityReason, hotelOptions, markDirty, onToast, resolveRoomHotelName, roomToCollisionNode, t, validateRoomDraft]);

  const cancelLargeRoomGeneration = React.useCallback(() => {
    setLargeRoomGenerationConfirm(null);
  }, []);

  const confirmLargeRoomGeneration = React.useCallback(() => {
    const pending = largeRoomGenerationConfirm;
    if (!pending) return;
    setLargeRoomGenerationConfirm(null);
    if (pending.mode === "generate") {
      generateRooms({ skipLargeConfirm: true });
      return;
    }
    if (pending.mode === "create") {
      saveRoomEdit({ skipLargeConfirm: true });
    }
  }, [generateRooms, largeRoomGenerationConfirm, saveRoomEdit]);

  const deleteRoom = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    setRooms((prev) => prev.filter((item) => item.id !== roomId));
    setRoomLinks((prev) => prev.filter((link) => link.sourceRoomId !== roomId && link.targetRoomId !== roomId));
    setUnassigned((prev) => [
      ...prev,
      ...(room.occupantIds || []).map((clientId) => ({ clientId, reason: "" })),
    ]);
    setSelectedRoomId((current) => current === roomId ? null : current);
    setSelectedRoomLinkId((current) => {
      const selectedLink = roomLinks.find((link) => link.id === current);
      return selectedLink && (selectedLink.sourceRoomId === roomId || selectedLink.targetRoomId === roomId) ? null : current;
    });
    markDirty();
  }, [rooms, roomLinks, markDirty]);

  const toggleRoomSelectionMode = React.useCallback(() => {
    setLinkMode(false);
    setLinkStartRoomId(null);
    setSelectedRoomLinkId(null);
    setRoomSelectionMode((active) => {
      if (active) setSelectedRoomIds(new Set());
      return !active;
    });
  }, []);

  const toggleRoomSelection = React.useCallback((roomId) => {
    setSelectedRoomIds((current) => {
      const next = new Set(current);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }, []);

  const selectAllRooms = React.useCallback(() => {
    setRoomSelectionMode(true);
    setSelectedRoomIds(new Set(visibleRooms.map((room) => room.id)));
  }, [visibleRooms]);

  const clearRoomSelection = React.useCallback(() => {
    setSelectedRoomIds(new Set());
  }, []);

  const deleteRoomLink = React.useCallback((linkId) => {
    if (!linkId) return;
    setRoomLinks((prev) => prev.filter((link) => link.id !== linkId));
    setSelectedRoomLinkId((current) => current === linkId ? null : current);
    setRoomLinkMenu((current) => current.linkId === linkId ? { open: false, x: 0, y: 0, linkId: "" } : current);
    markDirty();
  }, [markDirty]);

  const createRoomLink = React.useCallback((sourceRoomId, targetRoomId) => {
    if (!sourceRoomId || !targetRoomId || sourceRoomId === targetRoomId) return false;
    const sourceExists = rooms.some((room) => room.id === sourceRoomId);
    const targetExists = rooms.some((room) => room.id === targetRoomId);
    if (!sourceExists || !targetExists) return false;
    const id = createRoomLinkId(sourceRoomId, targetRoomId);
    const normalized = normalizeRoomingLinks(roomLinks, rooms);
    if (normalized.some((link) => link.id === id)) {
      setSelectedRoomLinkId(id);
      return false;
    }
    setRoomLinks(normalizeRoomingLinks([...normalized, { id, sourceRoomId, targetRoomId }], rooms));
    setSelectedRoomLinkId(id);
    markDirty();
    return true;
  }, [markDirty, roomLinks, rooms]);

  const toggleRoomLinkMode = React.useCallback(() => {
    setRoomSelectionMode(false);
    setSelectedRoomIds(new Set());
    setSelectedRoomLinkId(null);
    setLinkMode((active) => {
      if (active) setLinkStartRoomId(null);
      return !active;
    });
  }, []);

  const handleRoomLinkConnect = React.useCallback((connection) => {
    if (!linkMode) return;
    createRoomLink(connection?.source, connection?.target);
    setLinkStartRoomId(null);
  }, [createRoomLink, linkMode]);

  const handleRoomLinkConnectStart = React.useCallback((_event, params) => {
    if (!linkMode) return;
    setLinkStartRoomId(params?.nodeId || null);
  }, [linkMode]);

  const handleRoomLinkConnectEnd = React.useCallback(() => {
    setLinkStartRoomId(null);
  }, []);

  const isValidRoomLinkConnection = React.useCallback((connection) => {
    if (!linkMode || !connection?.source || !connection?.target) return false;
    if (connection.source === connection.target) return false;
    const id = createRoomLinkId(connection.source, connection.target);
    return !normalizeRoomingLinks(roomLinks, rooms).some((link) => link.id === id);
  }, [linkMode, roomLinks, rooms]);

  React.useEffect(() => {
    if (!selectedRoomLinkId) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      deleteRoomLink(selectedRoomLinkId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteRoomLink, selectedRoomLinkId]);

  const deleteSelectedRooms = React.useCallback(() => {
    if (!selectedRoomIds.size) return;
    const selectedRooms = rooms.filter((room) => selectedRoomIds.has(room.id));
    if (!selectedRooms.length) return;
    const confirmed = window.confirm(
      t.roomingDeleteSelectedConfirm || "هل تريد حذف الغرف المحددة؟ لا يمكن التراجع عن هذا الإجراء بعد الحفظ."
    );
    if (!confirmed) return;
    const selectedOccupantIds = Array.from(new Set(selectedRooms.flatMap((room) => room.occupantIds || [])))
      .filter((clientId) => clientsById[clientId]);
    const remainingAssignedIds = new Set();
    rooms.forEach((room) => {
      if (selectedRoomIds.has(room.id)) return;
      (room.occupantIds || []).forEach((clientId) => remainingAssignedIds.add(clientId));
    });
    setRooms((prev) => prev.filter((room) => !selectedRoomIds.has(room.id)));
    if (selectedOccupantIds.length) {
      setUnassigned((prev) => {
        const byClientId = new Map(prev.map((item) => [item.clientId, item]));
        selectedOccupantIds.forEach((clientId) => {
          if (!remainingAssignedIds.has(clientId)) byClientId.set(clientId, { clientId, reason: "" });
        });
        return Array.from(byClientId.values());
      });
    }
    setRoomLinks((prev) => prev.filter((link) => !selectedRoomIds.has(link.sourceRoomId) && !selectedRoomIds.has(link.targetRoomId)));
    setSelectedRoomId((current) => selectedRoomIds.has(current) ? null : current);
    setSelectedRoomLinkId(null);
    setSelectedRoomIds(new Set());
    setRoomSelectionMode(false);
    markDirty();
  }, [clientsById, markDirty, rooms, selectedRoomIds, t]);

  const copyRoom = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return;
    const draftRoom = {
      ...room,
      id: createRoomId(),
      order: rooms.length,
      roomNumber: getNextRoomNumber(),
      occupantIds: [],
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const preferred = {
      x: Number(room.x || 0) + ROOMING_NODE_WIDTH + ROOMING_NODE_MIN_GAP,
      y: Number(room.y || 0),
    };
    const position = findFreePositionForRoom(draftRoom, preferred);
    setRooms((prev) => [...prev, { ...draftRoom, x: position.x, y: position.y }]);
    setSelectedRoomId(draftRoom.id);
    markDirty();
    onToast?.(t.roomingRoomCopied || "تم نسخ الغرفة بدون المعتمرين", "success");
  }, [rooms, getNextRoomNumber, findFreePositionForRoom, markDirty, onToast]);

  const openCopyRoomingModal = React.useCallback(async () => {
    const sourceCity = getOppositeRoomingCity(city);
    setRoomingCopyBusy(true);
    try {
      const sourceState = await loadRoomingStateForCopy(sourceCity);
      const sourceRooms = Array.isArray(sourceState.rooms) ? sourceState.rooms : [];
      if (!sourceRooms.length) {
        onToast?.(
          tr("roomingCopyNoDataFromCity", { city: roomingCityShortLabels[sourceCity] })
            || (lang === "fr"
              ? `Aucune donnée d’hébergement trouvée à ${roomingCityShortLabels[sourceCity]} à copier.`
              : lang === "en"
                ? `No rooming data found in ${roomingCityShortLabels[sourceCity]} to copy from.`
                : `لا توجد بيانات تسكين في ${roomingCityShortLabels[sourceCity]} لنسخها.`),
          "warning"
        );
        return;
      }
      setRoomingCopyModal({
        open: true,
        sourceCity,
        targetCity: city,
        sourceRooms,
        sourceRoomLinks: Array.isArray(sourceState.roomLinks) ? sourceState.roomLinks : [],
        mode: "rooms",
        targetAction: rooms.length ? "append" : "replace",
        useTargetHotels: true,
        replaceConfirmed: false,
      });
    } catch (error) {
      console.error("[rooming] copy open failed", error);
      onToast?.(t.roomingCopyFailed || (lang === "fr" ? "Impossible de copier l’hébergement." : lang === "en" ? "Unable to copy rooming." : "تعذر نسخ التسكين."), "error");
    } finally {
      setRoomingCopyBusy(false);
    }
  }, [city, lang, loadRoomingStateForCopy, onToast, rooms.length, roomingCityShortLabels, t.roomingCopyFailed, tr]);

  const closeCopyRoomingModal = React.useCallback(() => {
    setRoomingCopyModal((current) => ({ ...current, open: false }));
  }, []);

  const buildCopiedRoomingState = React.useCallback((copyOptions) => {
    const {
      sourceCity,
      targetCity,
      sourceRooms = [],
      sourceRoomLinks = [],
      mode = "rooms",
      targetAction = "append",
      useTargetHotels = true,
    } = copyOptions || {};
    const replaceTarget = targetAction === "replace";
    const existingRooms = replaceTarget ? [] : rooms;
    const copiedRoomIdBySourceId = new Map();
    const copiedRooms = [];
    const now = new Date().toISOString();
    const assignedIds = new Set(existingRooms.flatMap((room) => Array.isArray(room.occupantIds) ? room.occupantIds : []));
    const existingRoomNumbers = existingRooms
      .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    const firstAppendRoomNumber = (existingRoomNumbers.length ? Math.max(...existingRoomNumbers) : 0) + 1;
    const blockedMissingHotelRooms = [];
    let skippedAlreadyAssigned = 0;
    let skippedUnavailable = 0;
    let skippedCapacity = 0;

    sourceRooms.forEach((sourceRoom, index) => {
      const newRoomId = createRoomId();
      copiedRoomIdBySourceId.set(sourceRoom.id, newRoomId);
      const roomType = normalizeRoomingRoomType(sourceRoom.roomType) || sourceRoom.roomType || getRoomingRoomTypeFromCapacity(sourceRoom.capacity);
      const capacity = Math.max(1, Number(sourceRoom.capacity) || getRoomingCapacity(roomType));
      const occupantIds = [];

      if (mode === "distribution") {
        (Array.isArray(sourceRoom.occupantIds) ? sourceRoom.occupantIds : []).forEach((clientId) => {
          if (!clientsById[clientId]) {
            skippedUnavailable += 1;
            return;
          }
          if (assignedIds.has(clientId)) {
            skippedAlreadyAssigned += 1;
            return;
          }
          if (occupantIds.length >= capacity) {
            skippedCapacity += 1;
            return;
          }
          occupantIds.push(clientId);
          assignedIds.add(clientId);
        });
      }

      const occupantIdSet = new Set(occupantIds);
      const gridFallback = getRoomingGeneratedGridPosition(index, Math.min(ROOMING_LAYOUT_MAX_COLUMNS, Math.max(1, sourceRooms.length)), {
        x: ROOMING_LAYOUT_START_X,
        y: ROOMING_LAYOUT_START_Y,
      });
      const preferredPosition = {
        x: Number.isFinite(Number(sourceRoom.x)) ? Number(sourceRoom.x) : gridFallback.x,
        y: Number.isFinite(Number(sourceRoom.y)) ? Number(sourceRoom.y) : gridFallback.y,
      };
      const copiedHotel = resolveCopiedRoomHotel(sourceRoom, sourceCity, targetCity, useTargetHotels);
      if (!copiedHotel) {
        blockedMissingHotelRooms.push({
          roomNumber: sourceRoom.roomNumber || String(index + 1).padStart(2, "0"),
          sourceHotel: getRoomHotelName(sourceRoom, program, packages, sourceCity) || sourceRoom.hotel || "",
        });
      }
      const copiedRoom = {
        ...sourceRoom,
        id: newRoomId,
        city: targetCity,
        order: existingRooms.length + index,
        roomNumber: replaceTarget
          ? (sourceRoom.roomNumber || String(index + 1).padStart(2, "0"))
          : String(firstAppendRoomNumber + index).padStart(2, "0"),
        roomType,
        category: sourceRoom.category || "male_only",
        hotel: copiedHotel,
        hotelName: copiedHotel,
        hotel_name: copiedHotel,
        hotelId: "",
        hotel_id: "",
        capacity,
        occupantIds,
        genderOverrides: mode === "distribution" ? filterRoomingMapByClientIds(sourceRoom.genderOverrides, occupantIdSet) : {},
        priceOverrides: mode === "distribution" ? filterRoomingMapByClientIds(sourceRoom.priceOverrides, occupantIdSet) : {},
        createdAt: now,
        updatedAt: now,
      };

      if (replaceTarget) {
        copiedRooms.push({ ...copiedRoom, x: preferredPosition.x, y: preferredPosition.y });
        return;
      }

      const collisionNodes = [
        ...existingRooms.map((room) => roomToCollisionNode(room)),
        ...copiedRooms.map((room) => roomToCollisionNode(room)),
      ];
      const node = { ...roomToCollisionNode(copiedRoom), position: preferredPosition };
      const position = findNearestFreeRoomingPosition(node, collisionNodes, preferredPosition);
      copiedRooms.push({ ...copiedRoom, x: position.x, y: position.y });
    });

    const copiedRoomLinks = normalizeRoomingLinks(
      (Array.isArray(sourceRoomLinks) ? sourceRoomLinks : []).map((link) => ({
        sourceRoomId: copiedRoomIdBySourceId.get(link.sourceRoomId),
        targetRoomId: copiedRoomIdBySourceId.get(link.targetRoomId),
      })),
      copiedRooms
    );
    const nextRooms = [...existingRooms, ...copiedRooms];
    const nextRoomLinks = replaceTarget
      ? copiedRoomLinks
      : normalizeRoomingLinks([...roomLinks, ...copiedRoomLinks], nextRooms);
    const nextAssignedIds = new Set(nextRooms.flatMap((room) => Array.isArray(room.occupantIds) ? room.occupantIds : []));
    const nextUnassigned = roomingEligibleClients
      .filter((client) => !nextAssignedIds.has(client.id))
      .map((client) => ({ clientId: client.id, reason: "" }));

    return {
      rooms: nextRooms,
      unassigned: nextUnassigned,
      roomLinks: nextRoomLinks,
      copiedRoomIds: copiedRooms.map((room) => room.id),
      blockedMissingHotelRooms,
      skippedAlreadyAssigned,
      skippedUnavailable,
      skippedCapacity,
    };
  }, [clientsById, packages, program, resolveCopiedRoomHotel, roomLinks, roomToCollisionNode, roomingEligibleClients, rooms]);

  const confirmCopyRooming = React.useCallback(() => {
    const modal = roomingCopyModal;
    if (!modal.open || !modal.sourceRooms.length) return;
    const targetHasRooms = rooms.length > 0;
    const replaceNeedsConfirmation = targetHasRooms && modal.targetAction === "replace" && !modal.replaceConfirmed;
    if (replaceNeedsConfirmation) return;
    if (modal.targetCity !== city) {
      onToast?.(t.roomingCopyFailed || (lang === "fr" ? "Impossible de copier l’hébergement." : lang === "en" ? "Unable to copy rooming." : "تعذر نسخ التسكين."), "error");
      return;
    }

    try {
      const copied = buildCopiedRoomingState(modal);
      if (copied.blockedMissingHotelRooms?.length) {
        onToast?.(
          t.roomingCopyHotelMappingFailed
            || (lang === "fr"
              ? "Impossible de copier certaines chambres car l’hôtel cible n’a pas pu être identifié."
              : lang === "en"
                ? "Some rooms cannot be copied because the target hotel could not be mapped."
                : "تعذر نسخ بعض الغرف لأن الفندق الهدف غير معروف."),
          "warning"
        );
        return;
      }
      setRooms(copied.rooms);
      setUnassigned(copied.unassigned);
      setRoomLinks(copied.roomLinks);
      setSelectedRoomId(copied.copiedRoomIds[0] || null);
      setSelectedRoomIds(new Set());
      setSelectedUnassignedIds(new Set());
      setRoomSelectionMode(false);
      setLinkMode(false);
      setLinkStartRoomId(null);
      setSelectedRoomLinkId(null);
      setRoomingCopyModal((current) => ({ ...current, open: false }));
      markDirty();

      if (modal.mode === "distribution") {
        onToast?.(t.roomingCopyDistributionSuccess || (lang === "fr" ? "Chambres et répartition des pèlerins copiées avec succès." : lang === "en" ? "Rooms and pilgrim distribution copied successfully." : "تم نسخ الغرف وتوزيع المعتمرين بنجاح."), "success");
      } else {
        onToast?.(t.roomingCopyRoomsSuccess || (lang === "fr" ? "Chambres copiées avec succès." : lang === "en" ? "Rooms copied successfully." : "تم نسخ الغرف بنجاح."), "success");
      }

      if (copied.skippedAlreadyAssigned || copied.skippedUnavailable || copied.skippedCapacity) {
        onToast?.(
          tr("roomingCopySkippedPilgrims", { people: roomingCopyPeopleTerm })
            || (lang === "fr"
              ? `Certains ${roomingCopyPeopleTerm} ont été ignorés car ils sont déjà affectés dans cet hébergement.`
              : lang === "en"
                ? `Some ${roomingCopyPeopleTerm} were skipped because they were already assigned in this rooming.`
                : `تم تخطي بعض ${roomingCopyPeopleTerm} لأنهم مسكنون مسبقًا في هذا التسكين.`),
          "warning"
        );
      }
    } catch (error) {
      console.error("[rooming] copy failed", error);
      onToast?.(t.roomingCopyFailed || (lang === "fr" ? "Impossible de copier l’hébergement." : lang === "en" ? "Unable to copy rooming." : "تعذر نسخ التسكين."), "error");
    }
  }, [buildCopiedRoomingState, city, lang, markDirty, onToast, roomingCopyModal, roomingCopyPeopleTerm, rooms.length, t, tr]);

  const toggleRoomLock = React.useCallback((roomId) => {
    setRooms((prev) => prev.map((room) => room.id === roomId
      ? { ...room, locked: !room.locked, updatedAt: new Date().toISOString() }
      : room));
    markDirty();
  }, [markDirty]);

  const removeClientFromRoom = React.useCallback((roomId, clientId) => {
    setRooms((prev) => prev.map((room) => room.id === roomId
      ? {
        ...room,
        occupantIds: (room.occupantIds || []).filter((id) => id !== clientId),
        genderOverrides: Object.fromEntries(Object.entries(room.genderOverrides || {}).filter(([id]) => id !== clientId)),
        priceOverrides: Object.fromEntries(Object.entries(room.priceOverrides || {}).filter(([id]) => id !== clientId)),
      }
      : room));
    setUnassigned((prev) => [...prev, { clientId, reason: "" }]);
    markDirty();
  }, [markDirty]);

  const commitClientDropIntoRoom = React.useCallback((roomId, clientId, options = {}) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    setRooms((prev) => prev.map((item) => {
      if (item.id !== room.id) return item;
      const occupantIds = item.occupantIds || [];
      const genderAssignment = ["male", "female"].includes(options.genderAssignment) ? options.genderAssignment : "";
      const priceDecision = options.priceDecision && typeof options.priceDecision === "object" ? options.priceDecision : null;
      if (occupantIds.includes(clientId)) {
        if (!genderAssignment && !priceDecision) return item;
        return {
          ...item,
          ...(genderAssignment ? { genderOverrides: { ...(item.genderOverrides || {}), [clientId]: genderAssignment } } : {}),
          ...(priceDecision ? { priceOverrides: { ...(item.priceOverrides || {}), [clientId]: priceDecision } } : {}),
        };
      }
      return {
        ...item,
        occupantIds: [...occupantIds, clientId],
        ...(genderAssignment ? { genderOverrides: { ...(item.genderOverrides || {}), [clientId]: genderAssignment } } : {}),
        ...(priceDecision ? { priceOverrides: { ...(item.priceOverrides || {}), [clientId]: priceDecision } } : {}),
      };
    }));
    setUnassigned((prev) => prev.filter((item) => item.clientId !== clientId));
    setSelectedRoomId(room.id);
    markDirty();
    return true;
  }, [markDirty, rooms]);

  const insertClientIntoRoom = React.useCallback((roomId, clientId, notify = true, options = {}) => {
    const room = rooms.find((item) => item.id === roomId);
    const client = clientsById[clientId];
    if (!room || !client) return false;
    const reason = getCompatibilityReason(client, room);
    if (reason) {
      if (notify) onToast?.(reason, "error");
      return false;
    }
    const conflict = getRoomingDropConflicts(client, room);
    if (conflict && !options.confirmed) {
      setPendingDrop(conflict);
      return false;
    }
    return commitClientDropIntoRoom(roomId, clientId, options);
  }, [rooms, clientsById, getCompatibilityReason, getRoomingDropConflicts, commitClientDropIntoRoom, onToast]);

  const insertClientsIntoRoom = React.useCallback((roomId, clientIds = [], notify = true) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return false;
    const uniqueIds = Array.from(new Set(clientIds))
      .filter((clientId) => clientsById[clientId] && !clientIdsInRooms.has(clientId));
    if (!uniqueIds.length) return false;
    if (uniqueIds.length === 1) return insertClientIntoRoom(roomId, uniqueIds[0], notify);

    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
    const occupantIds = room.occupantIds || [];
    const remaining = Math.max(0, capacity - occupantIds.length);
    if (uniqueIds.length > remaining) {
      if (notify) onToast?.(unassignedSelectionLabels.capacity, "error");
      return false;
    }

    const classificationMismatch = uniqueIds.some((clientId) => {
      const gender = normalizeRoomingGender(getClientContext(clientsById[clientId]).gender);
      return (room.category === "male_only" && gender === "female")
        || (room.category === "female_only" && gender === "male");
    });
    if (classificationMismatch) {
      if (notify) onToast?.(unassignedSelectionLabels.classification, "error");
      return false;
    }

    const firstReason = uniqueIds
      .map((clientId) => getCompatibilityReason(clientsById[clientId], room))
      .find(Boolean);
    if (firstReason) {
      if (notify) onToast?.(firstReason, "error");
      return false;
    }

    const needsSingleReview = uniqueIds.some((clientId) => getRoomingDropConflicts(clientsById[clientId], room));
    if (needsSingleReview) {
      if (notify) onToast?.(unassignedSelectionLabels.conflict, "error");
      return false;
    }

    setRooms((prev) => prev.map((item) => item.id === room.id
      ? { ...item, occupantIds: [...(item.occupantIds || []), ...uniqueIds] }
      : item));
    setUnassigned((prev) => prev.filter((item) => !uniqueIds.includes(item.clientId)));
    setSelectedRoomId(room.id);
    clearSelectedUnassigned();
    markDirty();
    if (notify) onToast?.(unassignedSelectionLabels.success, "success");
    return true;
  }, [
    clearSelectedUnassigned,
    clientIdsInRooms,
    clientsById,
    getCompatibilityReason,
    getClientContext,
    getRoomingDropConflicts,
    insertClientIntoRoom,
    markDirty,
    onToast,
    rooms,
    unassignedSelectionLabels,
  ]);

  const addSelectedPilgrimsToRoom = React.useCallback(() => {
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room || !selectedPilgrimIds.length) return;
    const remaining = Math.max(0, (room.capacity || getRoomingCapacity(room.roomType)) - (room.occupantIds || []).length);
    const selected = selectedPilgrimIds
      .filter((clientId) => {
        const client = clientsById[clientId];
        return client && !getCompatibilityReason(client, room);
      })
      .slice(0, remaining);
    if (!selected.length) {
      onToast?.(t.noCompatiblePilgrims || "لا يوجد معتمرون مناسبون لهذه الغرفة", "error");
      return;
    }
    const firstConflict = selected
      .map((clientId) => getRoomingDropConflicts(clientsById[clientId], room))
      .find(Boolean);
    if (firstConflict) {
      setPendingDrop({ ...firstConflict, source: "picker" });
      return;
    }
    setRooms((prev) => prev.map((item) => item.id === room.id
      ? { ...item, occupantIds: [...(item.occupantIds || []), ...selected] }
      : item));
    setUnassigned((prev) => prev.filter((item) => !selected.includes(item.clientId)));
    setSelectedRoomId(room.id);
    markDirty();
    setSelectedPilgrimIds([]);
    setPickerSearch("");
    setPickerOpen(false);
  }, [rooms, selectedRoomId, selectedPilgrimIds, clientsById, getCompatibilityReason, getRoomingDropConflicts, markDirty, onToast, t.noCompatiblePilgrims]);

  const autoArrangeRooms = React.useCallback(() => {
    if (rooms.length && !window.confirm(t.roomingAutoArrangeConfirm || "سيتم إعادة ترتيب الغرف تلقائيًا. هل تريد المتابعة؟")) return;
    setRooms((prev) => autoLayoutRoomNodes(prev));
    markDirty(ROOMING_SAVE_REASON_LAYOUT_ONLY);
    window.requestAnimationFrame(() => flowRef.current?.fitView?.({ padding: 0.18, duration: 400 }));
  }, [rooms.length, markDirty]);

  const openPickerForRoom = React.useCallback((roomId) => {
    setSelectedRoomId(roomId);
    setSelectedPilgrimIds([]);
    setPickerSearch("");
    setPickerOpen(true);
  }, []);

  const openEditRoomById = React.useCallback((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (room) openEditRoom(room);
  }, [rooms, openEditRoom]);

  const clearRoomingDragState = React.useCallback(() => {
    setDraggingClientId(null);
    setHoveredDropRoomId(null);
  }, []);

  const enterRoomingDropHover = React.useCallback((roomId) => {
    setHoveredDropRoomId((current) => current === roomId ? current : roomId);
  }, []);

  const leaveRoomingDropHover = React.useCallback((roomId) => {
    setHoveredDropRoomId((current) => current === roomId ? null : current);
  }, []);

  const getRoomingDropVisualStatus = React.useCallback((client, room) => {
    if (!client || !room) return null;
    const fullMessage = lang === "fr" ? "Chambre complète" : lang === "en" ? "Room is full" : "الغرفة ممتلئة";
    const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
    const roomType = normalizeRoomingRoomType(room.roomType) || getRoomingRoomTypeFromCapacity(room.capacity);
    const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(roomType));
    if (occupantIds.length >= capacity) return { state: "full", message: fullMessage };

    const clientGender = normalizeRoomingGender(client.gender);
    const occupantGenders = occupantIds
      .map((clientId) => normalizeRoomingGender(clientsById[clientId]?.gender))
      .filter((gender) => gender === "male" || gender === "female");
    const hasOppositeGender = ["male", "female"].includes(clientGender)
      && occupantGenders.some((gender) => gender !== clientGender);
    if (hasOppositeGender) {
      return { state: "invalid", message: t.roomingGenderMismatch || "الجنس غير متوافق" };
    }

    const hardReason = getCompatibilityReason(client, room);
    if (hardReason) return { state: "invalid", message: hardReason };

    const conflict = getRoomingDropConflicts(client, room);
    if (conflict) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    const context = getClientContext(client);
    const resolvedRoomHotel = resolveRoomHotelName(room);
    const targetHotel = isMissingRoomingValue(resolvedRoomHotel) ? "" : String(resolvedRoomHotel).trim();
    const currentHotel = isMissingRoomingValue(context.hotel) ? "" : String(context.hotel).trim();
    if (targetHotel && currentHotel && normalizeRoomingHotel(targetHotel) !== normalizeRoomingHotel(currentHotel)) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    const clientLevel = normalizeRoomingText(client.packageLevel || client.hotelLevel || client.hotel_level || "");
    const roomPackage = findRoomingPackageFromRoom(room, packages, city);
    const roomLevel = normalizeRoomingText(roomPackage?.level || room.packageLevel || room.hotelLevel || room.level || room.levelName || "");
    if (clientLevel && roomLevel && clientLevel !== roomLevel) {
      return {
        state: "mismatch",
        message: t.roomingDropNeedsConfirmation || "سيتم طلب تأكيد لتحديث بيانات المعتمر",
      };
    }

    return { state: "match", message: t.canInsertPilgrimHere || "يمكن إدراج المعتمر هنا" };
  }, [city, clientsById, getClientContext, getCompatibilityReason, getRoomingDropConflicts, lang, packages, resolveRoomHotelName, t]);

  const roomFlowNodes = React.useMemo(() => visibleRooms.map((room) => ({
    id: room.id,
    type: "room",
    position: { x: Number(room.x) || 0, y: Number(room.y) || 0 },
    data: {
      room,
      hotelName: resolveRoomHotelName(room),
      clientsById,
      draggingClientId,
      draggingClient: draggingClientId ? clientsById[draggingClientId] : null,
      hoveredDropRoomId,
      dragInvalid: false,
      getDropReason: getCompatibilityReason,
      getDropVisualStatus: getRoomingDropVisualStatus,
      onDropClient: insertClientIntoRoom,
      onDropClients: insertClientsIntoRoom,
      onDragComplete: clearRoomingDragState,
      onDropHoverEnter: enterRoomingDropHover,
      onDropHoverLeave: leaveRoomingDropHover,
      onAdd: openPickerForRoom,
      onEdit: openEditRoomById,
      onCopy: copyRoom,
      onToggleLock: toggleRoomLock,
      onDelete: deleteRoom,
      onRemoveClient: removeClientFromRoom,
      selectionMode: roomSelectionMode,
      selectionChecked: selectedRoomIds.has(room.id),
      linkMode,
      linkActive: linkStartRoomId === room.id,
    },
    draggable: !room.locked && !roomSelectionMode,
    selected: room.id === selectedRoomId,
  })), [visibleRooms, clientsById, draggingClientId, hoveredDropRoomId, getCompatibilityReason, getRoomingDropVisualStatus, insertClientIntoRoom, insertClientsIntoRoom, clearRoomingDragState, enterRoomingDropHover, leaveRoomingDropHover, openPickerForRoom, openEditRoomById, copyRoom, toggleRoomLock, deleteRoom, removeClientFromRoom, roomSelectionMode, selectedRoomIds, linkMode, linkStartRoomId, selectedRoomId, resolveRoomHotelName]);

  const roomLinkDeleteLabel = t.roomingDeleteLink || (lang === "fr" ? "Supprimer le lien" : lang === "en" ? "Delete link" : "حذف الرابط");
  const roomFlowEdges = React.useMemo(() => {
    const visibleIds = new Set(visibleRooms.map((room) => room.id));
    return normalizeRoomingLinks(roomLinks, visibleRooms)
      .filter((link) => visibleIds.has(link.sourceRoomId) && visibleIds.has(link.targetRoomId))
      .map((link) => {
        const selected = selectedRoomLinkId === link.id;
        return {
          id: link.id,
          source: link.sourceRoomId,
          target: link.targetRoomId,
          type: "roomProximity",
          selectable: true,
          focusable: true,
          interactionWidth: 18,
          data: {
            linkId: link.id,
            selected,
            deleteLabel: roomLinkDeleteLabel,
            onDelete: deleteRoomLink,
          },
          style: {
            stroke: selected ? "var(--rooming-link-selected)" : "var(--rooming-link-line)",
            strokeWidth: selected ? 2.6 : 1.6,
          },
        };
      });
  }, [deleteRoomLink, roomLinkDeleteLabel, roomLinks, selectedRoomLinkId, visibleRooms]);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([]);

  React.useEffect(() => {
    if (roomDragActiveRef.current) return;
    setFlowNodes(roomFlowNodes);
  }, [roomFlowNodes, setFlowNodes]);

  React.useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  React.useEffect(() => {
    const pending = generatedRoomFitPendingRef.current;
    if (!pending || !flowNodes.length || roomDragActiveRef.current) return undefined;
    generatedRoomFitPendingRef.current = null;

    let cancelled = false;
    let frameId = 0;
    const fitGeneratedRooms = (attempt = 0) => {
      if (cancelled) return;
      const flow = flowRef.current;
      if (flow?.fitView) {
        flow.fitView({ padding: 0.16, duration: 450 });
        return;
      }
      if (attempt < 6) {
        frameId = window.requestAnimationFrame(() => fitGeneratedRooms(attempt + 1));
      }
    };

    frameId = window.requestAnimationFrame(() => fitGeneratedRooms());
    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [flowNodes]);

  React.useEffect(() => {
    if (!selectedRoomId) return;
    if (!visibleRooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(null);
    }
  }, [selectedRoomId, visibleRooms]);

  React.useEffect(() => {
    if (!draggingClientId) return undefined;
    const handleDragEnd = () => clearRoomingDragState();

    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);

    return () => {
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
    };
  }, [clearRoomingDragState, draggingClientId]);

  React.useEffect(() => {
    setSelectedRoomIds((current) => {
      if (!current.size) return current;
      const roomIds = new Set(rooms.map((room) => room.id));
      const next = new Set(Array.from(current).filter((roomId) => roomIds.has(roomId)));
      return next.size === current.size ? current : next;
    });
  }, [rooms]);

  const setFlowNodeDragInvalid = React.useCallback((nodeId, invalid) => {
    if (dragInvalidRef.current.get(nodeId) === invalid) return;
    dragInvalidRef.current.set(nodeId, invalid);
    setFlowNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, dragInvalid: invalid } }
      : node));
  }, [setFlowNodes]);

  const onNodeDragStart = React.useCallback((_event, node) => {
    if (node.data?.room?.locked) return;
    roomDragActiveRef.current = true;
    dragStartPositionRef.current.set(node.id, { ...node.position });
    logRoomingDiagnostic("rooming.drag.start", {
      programId: program.id,
      location: city,
      roomId: node.id,
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    });
    const nodes = allCollisionNodes;
    const isValidStart = !hasRoomingNodeCollision(node, nodes, node.position);
    if (isValidStart) lastValidPositionRef.current.set(node.id, { ...node.position });
    setFlowNodeDragInvalid(node.id, false);
  }, [allCollisionNodes, city, program.id, setFlowNodeDragInvalid]);

  const onNodeDrag = React.useCallback((_event, node) => {
    const nodes = allCollisionNodes.map((item) => (
      item.id === node.id ? { ...item, position: node.position, measured: node.measured || item.measured } : item
    ));
    const currentNode = nodes.find((item) => item.id === node.id) || node;
    const invalid = hasRoomingNodeCollision(currentNode, nodes, node.position);
    if (!invalid) lastValidPositionRef.current.set(node.id, { ...node.position });
    setFlowNodeDragInvalid(node.id, invalid);
  }, [allCollisionNodes, setFlowNodeDragInvalid]);

  const onNodeDragStop = React.useCallback((_event, node) => {
    const nodes = allCollisionNodes.map((item) => (
      item.id === node.id ? { ...item, position: node.position, measured: node.measured || item.measured } : item
    ));
    const currentNode = nodes.find((item) => item.id === node.id) || node;
    const invalid = hasRoomingNodeCollision(currentNode, nodes, node.position);
    const fallbackPosition = lastValidPositionRef.current.get(node.id)
      || dragStartPositionRef.current.get(node.id)
      || node.position;
    const nextPosition = invalid
      ? findNearestFreeRoomingPosition(currentNode, nodes, fallbackPosition)
      : node.position;
    const startPosition = dragStartPositionRef.current.get(node.id) || node.position;
    const positionChanged = !areRoomingPositionsEqual(startPosition, nextPosition);
    roomDragActiveRef.current = false;
    dragInvalidRef.current.set(node.id, false);
    setFlowNodes((current) => current.map((item) => item.id === node.id
      ? { ...item, position: nextPosition, data: { ...item.data, dragInvalid: false } }
      : item));
    if (positionChanged) {
      setRooms((prev) => prev.map((room) => room.id === node.id ? {
        ...room,
        x: nextPosition.x,
        y: nextPosition.y,
      } : room));
    }
    lastValidPositionRef.current.set(node.id, { ...nextPosition });
    dragStartPositionRef.current.delete(node.id);
    logRoomingDiagnostic("rooming.drag.end", {
      programId: program.id,
      location: city,
      roomId: node.id,
      changed: positionChanged,
      invalid,
      from: {
        x: Number(startPosition?.x) || 0,
        y: Number(startPosition?.y) || 0,
      },
      to: {
        x: Number(nextPosition?.x) || 0,
        y: Number(nextPosition?.y) || 0,
      },
    });
    if (positionChanged) markDirty(ROOMING_SAVE_REASON_LAYOUT_ONLY);
    if (roomingRealtimePendingRef.current) {
      scheduleRoomingRealtimeRefetchRef.current?.({
        source: "roomDragEnd",
        delayMs: 0,
      });
    }
    if (invalid) onToast?.(t.roomingOverlapFixed || "تم منع تداخل الغرف وإرجاع البطاقة إلى موضع صالح", "info");
  }, [allCollisionNodes, city, markDirty, onToast, program.id, setFlowNodes, t]);

  const openCanvasContextMenu = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
    const position = flowRef.current?.screenToFlowPosition
      ? flowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: 0, y: 0 };
    setCanvasMenu({
      open: true,
      x: menuPoint.x,
      y: menuPoint.y,
      position,
    });
  }, []);

  const closeCanvasContextMenu = React.useCallback(() => {
    setCanvasMenu((current) => ({ ...current, open: false }));
  }, []);

  const handleRoomLinkClick = React.useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedRoomLinkId(edge?.data?.linkId || edge?.id || "");
    setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
  }, []);

  const handleRoomLinkContextMenu = React.useCallback((event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    const linkId = edge?.data?.linkId || edge?.id || "";
    if (!linkId) return;
    const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
    setSelectedRoomLinkId(linkId);
    setRoomLinkMenu({ open: true, x: menuPoint.x, y: menuPoint.y, linkId });
  }, []);

  const fitView = React.useCallback(() => {
    flowRef.current?.fitView?.({ padding: 0.18, duration: 450 });
  }, []);

  const applyFlowZoom = React.useCallback((nextZoom) => {
    setZoom(nextZoom);
    flowRef.current?.zoomTo?.(nextZoom / 100, { duration: 250 });
  }, []);

  const resolveAgencyLogoUrlForRooming = React.useCallback(async () => {
    const directUrl = agency?.logoUrl || agency?.logo_url || "";
    if (directUrl) return directUrl;
    const logoPath = agency?.logoPath || agency?.logo_path || "";
    if (!logoPath || !agencyLogoApi?.isAvailable || !agencyLogoApi.getLogoUrl) return "";
    try {
      return await agencyLogoApi.getLogoUrl(logoPath) || "";
    } catch {
      return "";
    }
  }, [agency?.logoPath, agency?.logoUrl, agency?.logo_path, agency?.logo_url, agencyLogoApi]);

  const printCanvas = React.useCallback(async () => {
    const cityLabel = city === "makkah" ? (t.makkah || "مكة") : (t.madinah || "المدينة");
    const win = window.open("", "_blank");
    if (!win) return false;
    const agencyName = getLocalizedAgencyName(agency, lang, t.agencyFallbackName);
    const agencyLogoUrl = await resolveAgencyLogoUrlForRooming();
    const printRooms = rooms.map((room, index) => {
      const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
      const pilgrims = occupantIds
        .map((clientId) => clientsById[clientId])
        .filter(Boolean)
        .map((client) => ({
          name: getClientDisplayName(client),
          source: getClientRegistrationSource(client),
        }));
      const roomTypeKey = normalizeRoomingRoomType(room.roomType) || room.roomType || "other";
      const hotelName = resolveRoomHotelName(room);
      return {
        id: room.id,
        city,
        cityLabel,
        hotel: hotelName || (t.roomingMissingHotel || "فندق غير محدد"),
        checkIn: program.departure || "",
        checkOut: program.returnDate || "",
        roomTypeKey,
        roomTypeLabel: getLocalizedRoomTypeLabel(roomTypeKey),
        capacity: Math.max(1, Number(room.capacity) || getRoomingCapacity(roomTypeKey), pilgrims.length || 1),
        pilgrims,
        names: pilgrims.map((pilgrim) => pilgrim.name),
        order: Number(room.order ?? index),
        x: Number(room.x) || 0,
        y: Number(room.y) || 0,
      };
    });
    win.document.write(createRoomingPrintHtml({
      rooms: printRooms,
      roomLinks,
      lang,
      programName: program.name || "",
      agencyName,
      agencyLogoUrl,
      printSettings: roomingPrintSettings,
      labels: {
        rooming: t.roomingPrintTitle || "ورقة التسكين",
        checkIn: t.checkIn || (lang === "fr" ? "Arrivée" : lang === "en" ? "Check-in" : "الدخول"),
        checkOut: t.checkOut || (lang === "fr" ? "Départ" : lang === "en" ? "Check-out" : "الخروج"),
        roomsCount: t.roomingRoomsCount || (lang === "fr" ? "Chambres" : lang === "en" ? "Rooms" : "عدد الغرف"),
        unknownHotel: t.roomingMissingHotel || (lang === "fr" ? "Hôtel non défini" : lang === "en" ? "Unspecified hotel" : "فندق غير محدد"),
        noRooms: t.noRoomingRooms || (lang === "fr" ? "Aucune chambre d'hébergement." : lang === "en" ? "No rooming rooms." : "لا توجد غرف للتسكين."),
        otherRoomType: t.other || (lang === "fr" ? "Autre" : lang === "en" ? "Other" : "أخرى"),
      },
    }));
    win.document.close();
    return true;
  }, [rooms, roomLinks, clientsById, program, city, agency, lang, t, getLocalizedRoomTypeLabel, roomingPrintSettings, resolveAgencyLogoUrlForRooming, resolveRoomHotelName]);

  const getStoredCanvasRooms = React.useCallback((targetCity) => {
    if (targetCity === city) return rooms;
    return sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds).rooms;
  }, [city, rooms, readCanvasStateFromStorage, roomingEligibleClientIds]);

  const getStoredCanvasLinks = React.useCallback((targetCity) => {
    const stored = targetCity === city
      ? { rooms, roomLinks }
      : sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds);
    const cityRooms = stored.rooms;
    const cityLinks = stored.roomLinks;
    return normalizeRoomingLinks(cityLinks, cityRooms);
  }, [city, rooms, roomLinks, readCanvasStateFromStorage, roomingEligibleClientIds]);

  const getRoomingStayDates = React.useCallback((targetCity, room) => {
    const firstClient = (room.occupantIds || []).map((id) => clientsById[id]).find(Boolean);
    const pkgLevel = firstClient?.packageLevel || firstClient?.hotelLevel || "";
    const pkg = firstClient
      ? (packageById.get(firstClient.packageId || firstClient.package_id) || packageByLevel.get(pkgLevel))
      : null;
    const explicitDates = targetCity === "makkah"
      ? {
        checkIn: pickFirstText(program, ["makkahCheckin", "makkah_checkin", "meccaCheckin", "mecca_checkin"]),
        checkOut: pickFirstText(program, ["makkahCheckout", "makkah_checkout", "meccaCheckout", "mecca_checkout"]),
      }
      : {
        checkIn: pickFirstText(program, ["madinahCheckin", "madinah_checkin", "madinaCheckin", "madina_checkin", "medinaCheckin", "medina_checkin"]),
        checkOut: pickFirstText(program, ["madinahCheckout", "madinah_checkout", "madinaCheckout", "madina_checkout", "medinaCheckout", "medina_checkout"]),
      };
    if (explicitDates.checkIn || explicitDates.checkOut) return explicitDates;
    const stayDates = calculateHotelStayDates({
      departureDate: program.departure,
      returnDate: program.returnDate,
      visitOrder: program.visitOrder || program.visit_order,
      hotelCheckinDay: program.hotelCheckinDay || program.hotel_checkin_day,
      madinahNights: pkg?.madinahNights ?? program.madinahNights ?? program.madinah_nights,
    });
    return targetCity === "makkah"
      ? { checkIn: stayDates.makkahCheckIn, checkOut: stayDates.makkahCheckOut }
      : { checkIn: stayDates.medinaCheckIn, checkOut: stayDates.medinaCheckOut };
  }, [clientsById, packageById, packageByLevel, program]);

  const getRoomingHotelForCity = React.useCallback((targetCity, cityRooms = []) => {
    const fallbackHotel = targetCity === "makkah"
      ? (program.hotelMecca || program.hotel_mecca || "")
      : (program.hotelMadina || program.hotel_madina || "");
    return cityRooms.map((room) => resolveRoomHotelName(room, targetCity)).find((hotel) => String(hotel || "").trim()) || fallbackHotel || "";
  }, [program, resolveRoomHotelName]);

  const roomingExportLabels = React.useMemo(() => ({
    title: t.roomingPrintTitle || (lang === "fr" ? "Feuille d’hébergement" : lang === "en" ? "Rooming sheet" : "ورقة التسكين"),
    rooming: t.roomingPrintTitle || (lang === "fr" ? "Feuille d’hébergement" : lang === "en" ? "Rooming sheet" : "ورقة التسكين"),
    checkIn: t.checkIn || (lang === "fr" ? "Arrivée" : lang === "en" ? "Check-in" : "الدخول"),
    checkOut: t.checkOut || (lang === "fr" ? "Départ" : lang === "en" ? "Check-out" : "الخروج"),
    roomsCount: t.roomingRoomsCount || (lang === "fr" ? "Chambres" : lang === "en" ? "Rooms" : "عدد الغرف"),
    unknownHotel: t.roomingMissingHotel || (lang === "fr" ? "Hôtel non défini" : lang === "en" ? "Unspecified hotel" : "فندق غير محدد"),
    noRooms: t.noRoomingRooms || (lang === "fr" ? "Aucune chambre d'hébergement." : lang === "en" ? "No rooming rooms." : "لا توجد غرف للتسكين."),
    otherRoomType: t.other || (lang === "fr" ? "Autre" : lang === "en" ? "Other" : "أخرى"),
    generatedAt: t.generatedAt || (lang === "fr" ? "Généré le" : lang === "en" ? "Generated at" : "تاريخ الإنشاء"),
    generatedAtValue: new Date().toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US"),
    makkah: t.makkah || (lang === "fr" ? "La Mecque" : lang === "en" ? "Makkah" : "مكة"),
    madinah: t.madinah || (lang === "fr" ? "Médine" : lang === "en" ? "Madinah" : "المدينة"),
    roomingUnifiedTitle: t.roomingUnifiedTitle || (lang === "fr" ? "Hébergement Makkah et Madinah" : lang === "en" ? "Makkah and Madinah Rooming" : "تسكين مكة والمدينة"),
    roomingUnifiedMakkahInfo: t.roomingUnifiedMakkahInfo || (lang === "fr" ? "Makkah : hôtel {hotel} — arrivée {checkIn} / départ {checkOut}" : lang === "en" ? "Makkah: hotel {hotel} — check-in {checkIn} / check-out {checkOut}" : "مكة: الفندق {hotel} — الدخول {checkIn} / الخروج {checkOut}"),
    roomingUnifiedMadinahInfo: t.roomingUnifiedMadinahInfo || (lang === "fr" ? "Madinah : hôtel {hotel} — arrivée {checkIn} / départ {checkOut}" : lang === "en" ? "Madinah: hotel {hotel} — check-in {checkIn} / check-out {checkOut}" : "المدينة: الفندق {hotel} — الدخول {checkIn} / الخروج {checkOut}"),
    agency: t.agency || (lang === "fr" ? "Agence" : lang === "en" ? "Agency" : "الوكالة"),
    program: t.program || t.programs || (lang === "fr" ? "Programme" : lang === "en" ? "Program" : "البرنامج"),
    location: t.location || (lang === "fr" ? "Lieu" : lang === "en" ? "Location" : "الموقع"),
    hotel: t.hotel || (lang === "fr" ? "Hôtel" : lang === "en" ? "Hotel" : "الفندق"),
    room: t.room || (lang === "fr" ? "Chambre" : lang === "en" ? "Room" : "الغرفة"),
    roomType: t.roomType || (lang === "fr" ? "Type de chambre" : lang === "en" ? "Room type" : "نوع الغرفة"),
    classification: t.roomingClassification || (lang === "fr" ? "Classification" : lang === "en" ? "Classification" : "التصنيف"),
    capacity: t.capacity || (lang === "fr" ? "Capacité" : lang === "en" ? "Capacity" : "السعة"),
    bedNumber: t.roomingBedNumber || (lang === "fr" ? "Lit" : lang === "en" ? "Bed" : "السرير"),
    pilgrimName: roomingParticipantTerms.singular || t.fullName || (lang === "fr" ? "Pèlerin" : lang === "en" ? "Pilgrim" : "المعتمر"),
    assignedPilgrims: roomingParticipantTerms.plural || t.clients || (lang === "fr" ? "Pèlerins" : lang === "en" ? "Pilgrims" : "المعتمرون"),
    gender: t.gender || (lang === "fr" ? "Sexe" : lang === "en" ? "Gender" : "الجنس"),
    registrationSource: t.registrationSource || (lang === "fr" ? "Source d’inscription" : lang === "en" ? "Registration source" : "جهة التسجيل"),
    totalRooms: t.roomingRoomsCount || (lang === "fr" ? "Nombre de chambres" : lang === "en" ? "Rooms" : "عدد الغرف"),
    totalCapacity: t.roomingTotalCapacity || (lang === "fr" ? "Capacité totale" : lang === "en" ? "Total capacity" : "إجمالي السعة"),
    emptyBeds: t.roomingEmptyBeds || (lang === "fr" ? "Lits vides" : lang === "en" ? "Empty beds" : "أسرة فارغة"),
    emptyBed: t.roomingEmptyBed || (lang === "fr" ? "Lit vide" : lang === "en" ? "Empty bed" : "سرير فارغ"),
    total: t.total || (lang === "fr" ? "Total" : lang === "en" ? "Total" : "الإجمالي"),
    summarySheet: t.summary || (lang === "fr" ? "Résumé" : lang === "en" ? "Summary" : "ملخص"),
  }), [lang, roomingParticipantTerms.plural, roomingParticipantTerms.singular, t]);

  const getRoomingExportGenderLabel = React.useCallback((client = {}) => {
    const gender = normalizeRoomingGender(client.gender || client.passport?.gender);
    if (gender === "male") return t.male || (lang === "fr" ? "Homme" : lang === "en" ? "Male" : "ذكر");
    if (gender === "female") return t.female || (lang === "fr" ? "Femme" : lang === "en" ? "Female" : "أنثى");
    return "";
  }, [lang, t]);

  const buildRoomingExportPayload = React.useCallback(async (mode = "single") => {
    const combined = mode === "combined";
    const targetCities = combined ? ["makkah", "madinah"] : [city];
    const roomsByCity = Object.fromEntries(targetCities.map((targetCity) => [targetCity, getStoredCanvasRooms(targetCity)]));
    const roomLinksByCity = Object.fromEntries(targetCities.map((targetCity) => [targetCity, getStoredCanvasLinks(targetCity)]));
    const hotelsByCity = Object.fromEntries(targetCities.map((targetCity) => [
      targetCity,
      getRoomingHotelForCity(targetCity, roomsByCity[targetCity]),
    ]));
    const datesByCity = Object.fromEntries(targetCities.map((targetCity) => [
      targetCity,
      getRoomingStayDates(targetCity, { occupantIds: roomsByCity[targetCity]?.[0]?.occupantIds || [] }),
    ]));
    const agencyLogoUrl = await resolveAgencyLogoUrlForRooming();
    return buildRoomingPrintModel({
      program,
      agencyName: getLocalizedAgencyName(agency, lang),
      agencyLogoUrl,
      lang,
      targetCities,
      cityLabels: {
        makkah: roomingExportLabels.makkah,
        madinah: roomingExportLabels.madinah,
      },
      roomsByCity,
      roomLinksByCity,
      hotelsByCity,
      datesByCity,
      getRoomDates: getRoomingStayDates,
      clientsById,
      labels: roomingExportLabels,
      settings: roomingPrintSettings,
      getRoomTypeLabel: getLocalizedRoomTypeLabel,
      getRoomCategoryLabel: getLocalizedCategoryLabel,
      getRoomTypeKey: (roomType) => normalizeRoomingRoomType(roomType) || roomType || "other",
      getCapacity: getRoomingCapacity,
      getClientName: getClientDisplayName,
      getClientRegistrationSource,
      getClientGenderLabel: getRoomingExportGenderLabel,
    });
  }, [
    agency,
    city,
    clientsById,
    getLocalizedCategoryLabel,
    getLocalizedRoomTypeLabel,
    getRoomingExportGenderLabel,
    getRoomingHotelForCity,
    getRoomingStayDates,
    getStoredCanvasLinks,
    getStoredCanvasRooms,
    lang,
    program,
    resolveAgencyLogoUrlForRooming,
    roomingExportLabels,
    roomingPrintSettings,
  ]);

  const buildFullRoomingPrintSection = React.useCallback((exportData, { allowUnified = false } = {}) => {
    const locationByKey = new Map((exportData.locations || []).map((location) => [location.key, location]));
    const makkahLocation = locationByKey.get("makkah") || {};
    const madinahLocation = locationByKey.get("madinah") || {};
    const shouldUnify = Boolean(
      allowUnified
      && exportData.roomingPrintDebug?.unifyMakkahMadinah
    );
    const rooms = exportData.pdfRooms || [];
    const roomLinks = shouldUnify
      ? (Array.isArray(makkahLocation.roomLinks) ? makkahLocation.roomLinks : [])
      : (exportData.roomLinks || []);
    const commonSectionProps = {
      rooms,
      makkahHotel: makkahLocation.hotelName,
      madinahHotel: madinahLocation.hotelName,
      makkahDates: { checkIn: makkahLocation.checkIn, checkOut: makkahLocation.checkOut },
      madinahDates: { checkIn: madinahLocation.checkIn, checkOut: madinahLocation.checkOut },
      labels: exportData.labels,
    };
    return {
      unified: shouldUnify,
      rooms,
      roomLinks,
      section: shouldUnify
        ? createUnifiedRoomingSection(commonSectionProps)
        : createCombinedRoomingSection(commonSectionProps),
    };
  }, []);

  const logRoomingUnifiedPrintDebug = React.useCallback((exportData, rooms = []) => {
    if (process.env.NODE_ENV === "production") return;
    const debug = exportData?.roomingPrintDebug || {};
    console.log("unified rooming print debug", {
      unifyMakkahMadinah: Boolean(debug.unifyMakkahMadinah),
      orderMode: roomingPrintSettings.layoutMode || "default",
      rawRoomCount: Number(debug.rawRoomCount || 0),
      uniqueRoomCount: Number(debug.uniqueRoomCount || rooms.length || 0),
      sharedRoomsCount: Number(debug.sharedRoomsCount || 0),
      extraRoomsCount: Number(debug.extraRoomsCount || 0),
      changedPilgrimRoomsCount: Number(debug.changedPilgrimRoomsCount || 0),
      duplicateKeys: Array.isArray(debug.duplicateKeys) ? debug.duplicateKeys : [],
      rooms: (Array.isArray(rooms) ? rooms : []).map((room) => ({
        key: room.key,
        badgeText: room.badgeText || null,
        badgeReason: room.badgeReason || "shared",
        hotelName: room.hotelName || room.hotel,
        location: room.location || room.city,
        roomNumber: room.roomNumber || room.roomName || "",
        roomType: room.roomTypeLabel || room.roomTypeKey || room.roomType,
        capacity: room.capacity,
        occupantsCount: room.occupants?.length ?? room.pilgrims?.length ?? room.names?.length ?? 0,
      })),
    });
  }, [roomingPrintSettings.layoutMode]);

  const hasRoomingPrintableData = React.useCallback((mode = "single") => {
    const targetCities = mode === "combined" ? ["makkah", "madinah"] : [city];
    return targetCities.some((targetCity) => {
      if (targetCity === city) return rooms.length > 0;
      return sanitizeRoomingStateForEligibleClients(readCanvasStateFromStorage(targetCity), roomingEligibleClientIds).rooms.length > 0;
    });
  }, [city, readCanvasStateFromStorage, roomingEligibleClientIds, rooms.length]);

  const confirmRoomingExportReadiness = React.useCallback(async (mode = "single", action = "export") => {
    const hasPrintableData = hasRoomingPrintableData(mode);
    if (isRoomingLoading && !hasPrintableData) {
      onToast?.(
        t.roomingExportWaitForLoad || (lang === "fr" ? "Chargement de l’hébergement en cours. Réessayez dans un instant." : lang === "en" ? "Rooming is still loading. Try again shortly." : "جاري تحميل التسكين. حاول بعد لحظات."),
        "info"
      );
      return false;
    }
    if ((roomingLoadStatus === "loadFailed" || roomingLoadStatus === "offline") && !hasPrintableData) {
      onToast?.(
        t.roomingLoadFailedRetry || (lang === "fr" ? "Le chargement a échoué. Réessayez ou continuez avec le brouillon local." : lang === "en" ? "Loading failed. Retry or continue with the local draft." : "فشل تحميل التسكين. أعد المحاولة أو تابع المسودة المحلية."),
        "error"
      );
      return false;
    }
    if (!hasPrintableData) {
      onToast?.(
        t.noRoomingRooms || (lang === "fr" ? "Aucune chambre d’hébergement à exporter." : lang === "en" ? "No rooming rooms to export." : "لا توجد غرف للتسكين للتصدير."),
        "info"
      );
      return false;
    }

    const hasUnsavedWork = dirty || isRoomingSaving || roomingSaveStatus === "saveFailed" || roomingSaveStatus === "offline";
    if (!hasUnsavedWork) return true;

    const promptMessage = lang === "fr"
      ? "Des modifications d’hébergement ne sont pas encore enregistrées.\n1 - Attendre l’enregistrement puis exporter\n2 - Exporter la version visible actuelle\n3 - Annuler"
      : lang === "en"
        ? "Rooming has unsaved changes.\n1 - Wait for save, then export\n2 - Export the current visible version\n3 - Cancel"
        : "هناك تغييرات غير محفوظة في التسكين.\n1 - انتظار الحفظ ثم التصدير\n2 - تصدير النسخة الظاهرة حاليا\n3 - إلغاء";
    const choice = typeof window === "undefined" ? "1" : window.prompt(promptMessage, "1");
    if (choice === null) return false;
    const normalizedChoice = String(choice || "").trim();
    if (normalizedChoice === "2") {
      logRoomingDiagnostic("export.visibleDraft", {
        programId: program.id,
        location: city,
        action,
        mode,
        payloadSize: getRoomingPayloadSize(createRoomingSaveSnapshot(false).payload),
      });
      return true;
    }
    if (normalizedChoice !== "1") return false;

    const result = await saveCanvas(false);
    if (result?.ok && !dirtyRef.current) return true;

    const failedChoiceMessage = lang === "fr"
      ? "L’enregistrement n’a pas pu être confirmé.\n1 - Exporter la version visible actuelle\n2 - Annuler"
      : lang === "en"
        ? "Save could not be confirmed.\n1 - Export the current visible version\n2 - Cancel"
        : "تعذر تأكيد الحفظ.\n1 - تصدير النسخة الظاهرة حاليا\n2 - إلغاء";
    const failedChoice = typeof window === "undefined" ? "2" : window.prompt(failedChoiceMessage, "2");
    return String(failedChoice || "").trim() === "1";
  }, [city, createRoomingSaveSnapshot, dirty, hasRoomingPrintableData, isRoomingLoading, isRoomingSaving, lang, onToast, program.id, roomingLoadStatus, roomingSaveStatus, saveCanvas, t]);

  const handleDownloadRoomingPdf = React.useCallback(async (mode = "single") => {
    if (roomingExportBusy) return;
    if (!(await confirmRoomingExportReadiness(mode, "pdf"))) return;
    try {
      setRoomingExportBusy(`${mode}:pdf`);
      setRoomingExportStatus("preparing");
      await runRoomingTimedOperation(async () => {
        const combined = mode === "combined";
        const exportData = await buildRoomingExportPayload(mode);
        const fullPrintSection = combined
          ? buildFullRoomingPrintSection(exportData, { allowUnified: true })
          : null;
        logRoomingUnifiedPrintDebug(exportData, fullPrintSection?.rooms || exportData.pdfRooms);
        logRoomingDiagnostic("export.pdf", {
          programId: program.id,
          location: city,
          mode,
          payloadSize: getRoomingPayloadSize(exportData),
          rooms: (fullPrintSection?.rooms || exportData.pdfRooms || []).length,
        });
        await downloadRoomingPdf({
          rooms: fullPrintSection?.rooms || exportData.pdfRooms,
          lang,
          programName: exportData.programInfo.name || "program",
          agencyName: exportData.agencyInfo.name,
          agencyLogoUrl: exportData.agencyInfo.logoUrl,
          filename: `rooming-${combined ? "combined" : city}-${slugifyFilePart(program.name)}-${new Date().toISOString().slice(0, 10)}.pdf`,
          labels: exportData.labels,
          printSettings: roomingPrintSettings,
          roomLinks: fullPrintSection?.roomLinks || exportData.roomLinks,
          sectionOverride: fullPrintSection?.section || null,
        });
      }, {
        action: "rooming.exportPdf",
        timeoutMs: ROOMING_EXPORT_TIMEOUT_MS,
        onSlow: () => setRoomingExportStatus("slow"),
      });
      onToast?.(t.roomingPdfReady || (lang === "fr" ? "PDF d'hébergement téléchargé" : lang === "en" ? "Rooming PDF downloaded" : "تم تنزيل PDF التسكين"), "success");
    } catch (error) {
      console.error("[rooming pdf export]", error);
      onToast?.(t.roomingPdfFailed || (lang === "fr" ? "Impossible de générer le PDF" : lang === "en" ? "Unable to generate PDF" : "تعذر إنشاء ملف PDF"), "error");
    } finally {
      setRoomingExportBusy("");
      setRoomingExportStatus("");
    }
  }, [buildFullRoomingPrintSection, buildRoomingExportPayload, city, confirmRoomingExportReadiness, lang, logRoomingUnifiedPrintDebug, onToast, program.id, program.name, roomingExportBusy, roomingPrintSettings, t]);

  const handleDownloadRoomingExcel = React.useCallback(async (mode = "single") => {
    if (roomingExportBusy) return;
    if (!(await confirmRoomingExportReadiness(mode, "excel"))) return;
    try {
      setRoomingExportBusy(`${mode}:excel`);
      setRoomingExportStatus("preparing");
      await runRoomingTimedOperation(async () => {
        const exportData = await buildRoomingExportPayload(mode);
        logRoomingDiagnostic("export.excel", {
          programId: program.id,
          location: city,
          mode,
          payloadSize: getRoomingPayloadSize(exportData),
        });
        await downloadRoomingExcel(exportData);
      }, {
        action: "rooming.exportExcel",
        timeoutMs: ROOMING_EXPORT_TIMEOUT_MS,
        onSlow: () => setRoomingExportStatus("slow"),
      });
      onToast?.(t.roomingExcelReady || (lang === "fr" ? "Fichier Excel d’hébergement téléchargé" : lang === "en" ? "Rooming Excel downloaded" : "تم تنزيل Excel التسكين"), "success");
    } catch (error) {
      console.error("[rooming excel export]", error);
      onToast?.(t.roomingExcelFailed || (lang === "fr" ? "Impossible de générer Excel" : lang === "en" ? "Unable to generate Excel" : "تعذر إنشاء ملف Excel"), "error");
    } finally {
      setRoomingExportBusy("");
      setRoomingExportStatus("");
    }
  }, [buildRoomingExportPayload, city, confirmRoomingExportReadiness, lang, onToast, program.id, roomingExportBusy, t]);

  const handleRoomingExport = React.useCallback((mode, format) => {
    if (format === "excel") {
      handleDownloadRoomingExcel(mode);
      return;
    }
    handleDownloadRoomingPdf(mode);
  }, [handleDownloadRoomingExcel, handleDownloadRoomingPdf]);

  const printCombinedRooming = React.useCallback(async () => {
    const win = window.open("", "_blank");
    if (!win) return false;
    try {
      const exportData = await buildRoomingExportPayload("combined");
      const fullPrintSection = buildFullRoomingPrintSection(exportData, { allowUnified: true });
      logRoomingUnifiedPrintDebug(exportData, fullPrintSection.rooms);
      win.document.write(createRoomingPrintHtml({
        rooms: fullPrintSection.rooms,
        roomLinks: fullPrintSection.roomLinks,
        lang,
        programName: exportData.programInfo.name || "",
        agencyName: exportData.agencyInfo.name,
        agencyLogoUrl: exportData.agencyInfo.logoUrl,
        printSettings: roomingPrintSettings,
        labels: exportData.labels,
        sectionOverride: fullPrintSection.section,
      }));
      win.document.close();
      return true;
    } catch (error) {
      try { win.close(); } catch {}
      throw error;
    }
  }, [buildFullRoomingPrintSection, buildRoomingExportPayload, lang, logRoomingUnifiedPrintDebug, roomingPrintSettings]);

  const handleRoomingPrintChoice = React.useCallback(async (mode = "single") => {
    if (roomingPrintBusy) return;
    if (!(await confirmRoomingExportReadiness(mode, "print"))) return;
    try {
      setRoomingPrintBusy(mode);
      setRoomingExportStatus("preparing");
      const printed = await runRoomingTimedOperation(
        () => (mode === "combined" ? printCombinedRooming() : printCanvas()),
        {
          action: "rooming.print",
          timeoutMs: ROOMING_EXPORT_TIMEOUT_MS,
          onSlow: () => setRoomingExportStatus("slow"),
        }
      );
      if (!printed) {
        onToast?.(
          t.printWindowBlocked || (lang === "fr" ? "Impossible d’ouvrir la fenêtre d’impression." : lang === "en" ? "Unable to open the print window." : "تعذر فتح نافذة الطباعة."),
          "error"
        );
      }
    } catch (error) {
      console.error("[rooming print]", error);
      onToast?.(
        t.roomingPrintFailed || (lang === "fr" ? "Impossible de préparer l’impression de l’hébergement" : lang === "en" ? "Unable to prepare rooming print" : "تعذر تجهيز طباعة التسكين"),
        "error"
      );
    } finally {
      setRoomingPrintBusy("");
      setRoomingExportStatus("");
    }
  }, [confirmRoomingExportReadiness, lang, onToast, printCanvas, printCombinedRooming, roomingPrintBusy, t]);

  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId) || null;
  const canvasHeight = fullWorkspace ? "100%" : "min(72vh, 720px)";
  const fullWorkspacePanelTop = toolbarCollapsed ? 106 : "calc(58px + 22vh + 18px)";
  const expandRoomingLabel = t.roomingExpandWorkspace || (lang === "fr" ? "Agrandir le rooming dans l’application" : lang === "en" ? "Expand rooming in app" : "توسيع التسكين داخل النظام");
  const browserFullscreenLabel = t.roomingBrowserFullscreen || (lang === "fr" ? "Plein écran" : lang === "en" ? "Full screen" : "فتح بملء الشاشة");
  const exitFullWorkspaceLabel = t.roomingExitFullWorkspace || (lang === "fr" ? "Quitter le mode rooming plein écran" : lang === "en" ? "Exit full rooming mode" : "الخروج من وضع التسكين الكامل");
  const hideUnassignedLabel = t.roomingHideUnassigned || (lang === "fr" ? "Masquer les non affectés" : lang === "en" ? "Hide unassigned" : "إخفاء غير المسكنين");
  const showUnassignedLabel = t.roomingShowUnassigned || (lang === "fr" ? "Afficher les non affectés" : lang === "en" ? "Show unassigned" : "إظهار غير المسكنين");
  React.useEffect(() => {
    if (!pendingDrop?.priceSync?.requiresConfirmation) {
      setPendingDropSalePrice("");
      return;
    }
    setPendingDropSalePrice(String(pendingDrop.priceSync.newOfficialPrice || ""));
  }, [pendingDrop]);
  const pendingDropCopy = React.useMemo(() => {
    if (!pendingDrop) return null;
    const hasRoomType = pendingDrop.conflicts.includes("roomType");
    const hasHotel = pendingDrop.conflicts.includes("hotel");
    const hasGenderAssignment = pendingDrop.conflicts.includes("genderAssignment");
    const hasFamilyMixed = pendingDrop.conflicts.includes("familyMixed");
    const hasPrice = pendingDrop.conflicts.includes("price") && pendingDrop.priceSync?.requiresConfirmation;
    const conflictCity = pendingDrop.city || city;
    const hotelLabel = conflictCity === "madinah" ? (t.hotelMadina || "فندق المدينة") : (t.hotelMecca || "فندق مكة");
    const genderTarget = pendingDrop.genderAssignment === "female"
      ? (lang === "fr" ? "femme" : lang === "en" ? "female" : "أنثى")
      : (lang === "fr" ? "homme" : lang === "en" ? "male" : "ذكر");
    const formatPriceLabel = (value) => formatCurrency(value || 0, lang);
    const priceSection = hasPrice ? {
      newOfficialLabel: lang === "fr" ? "Nouveau prix officiel" : lang === "en" ? "New official price" : "السعر الرسمي الجديد",
      newSaleLabel: lang === "fr" ? "Nouveau prix de vente" : lang === "en" ? "New sale price" : "سعر البيع الجديد",
      oldOfficialLabel: lang === "fr" ? "Ancien prix officiel" : lang === "en" ? "Previous official price" : "السعر الرسمي السابق",
      oldSaleLabel: lang === "fr" ? "Ancien prix de vente" : lang === "en" ? "Previous sale price" : "سعر البيع السابق",
      keepPrevious: lang === "fr" ? "Garder l’ancien prix de vente" : lang === "en" ? "Keep previous sale price" : "الإبقاء على سعر البيع السابق",
      intro: lang === "fr"
        ? "Le type de chambre a été modifié, et le prix de vente actuel est différent de l’ancien prix officiel."
        : lang === "en"
          ? "The room type has changed, and the current sale price is different from the previous official price."
          : "تم تغيير نوع الغرفة، وسعر البيع الحالي مختلف عن السعر الرسمي السابق.",
      newOfficialPrice: pendingDrop.priceSync.newOfficialPrice,
      oldOfficialPrice: pendingDrop.priceSync.oldOfficialPrice,
      oldSalePrice: pendingDrop.priceSync.oldSalePrice,
      formatPrice: formatPriceLabel,
    } : null;
    const conflictCount = [hasRoomType, hasHotel, hasGenderAssignment, hasFamilyMixed, hasPrice].filter(Boolean).length;
    const makeDetails = (labels) => [
      ...(hasRoomType ? [{ currentLabel: labels.roomCurrent, currentValue: pendingDrop.currentRoomTypeLabel || "—", targetLabel: labels.roomTarget, targetValue: pendingDrop.targetRoomTypeLabel || "—" }] : []),
      ...(hasHotel ? [{ currentLabel: labels.hotelCurrent, currentValue: pendingDrop.currentHotel || "—", targetLabel: labels.hotelTarget, targetValue: pendingDrop.targetHotel || "—" }] : []),
      ...(hasGenderAssignment ? [{ currentLabel: labels.genderCurrent, currentValue: labels.unknownGender, targetLabel: labels.genderTarget, targetValue: genderTarget }] : []),
      ...(hasFamilyMixed ? [{ note: labels.familyNote }] : []),
    ];
    if (conflictCount > 1) {
      if (lang === "fr") return {
        title: "Mettre à jour les informations de répartition ?",
        intro: "Certaines informations sont différentes entre le dossier du pèlerin et la chambre choisie :",
        details: makeDetails({
          roomCurrent: "Type de chambre actuel",
          roomTarget: "Nouveau type de chambre",
          hotelCurrent: "Hôtel actuel",
          hotelTarget: "Nouvel hôtel",
          genderCurrent: "Sexe actuel",
          genderTarget: "Nouveau sexe",
          unknownGender: "Non défini",
          familyNote: "La chambre familiale peut inclure des hommes et des femmes.",
        }),
        question: "Voulez-vous mettre à jour ces informations et ajouter le pèlerin à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update rooming details?",
        intro: "Some details differ between the pilgrim file and the selected room:",
        details: makeDetails({
          roomCurrent: "Current room type",
          roomTarget: "New room type",
          hotelCurrent: "Current hotel",
          hotelTarget: "New hotel",
          genderCurrent: "Current gender",
          genderTarget: "New gender",
          unknownGender: "Not set",
          familyNote: "The family room may include both men and women.",
        }),
        question: "Do you want to update these details and add the pilgrim to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث بيانات التسكين؟",
        intro: "توجد معلومات مختلفة بين ملف المعتمر والغرفة المختارة:",
        details: makeDetails({
          roomCurrent: "نوع الغرفة الحالي",
          roomTarget: "نوع الغرفة الجديد",
          hotelCurrent: "الفندق الحالي",
          hotelTarget: "الفندق الجديد",
          genderCurrent: "الجنس الحالي",
          genderTarget: "الجنس الجديد",
          unknownGender: "غير محدد",
          familyNote: "الغرفة العائلية يمكن أن تضم رجالًا ونساءً.",
        }),
        question: "هل تريد تحديث هذه البيانات وإضافة المعتمر إلى الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasPrice) {
      if (lang === "fr") return {
        title: "Mettre à jour le prix de vente ?",
        intro: priceSection.intro,
        question: "Voulez-vous mettre à jour le prix et ajouter ce pèlerin à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update sale price?",
        intro: priceSection.intro,
        question: "Do you want to update the price and add them to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث سعر البيع؟",
        intro: priceSection.intro,
        question: "هل تريد تحديث السعر وإضافة المعتمر إلى هذه الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasRoomType) {
      if (lang === "fr") return {
        title: "Mettre à jour le type de chambre ?",
        intro: `Ce pèlerin est actuellement défini en ${pendingDrop.currentRoomTypeLabel}, mais la chambre sélectionnée est ${pendingDrop.targetRoomTypeLabel}.`,
        question: "Voulez-vous mettre à jour le type de chambre et l’ajouter à cette chambre ?",
        primary: "Mettre à jour et ajouter",
        priceSection,
      };
      if (lang === "en") return {
        title: "Update room type?",
        intro: `This pilgrim is currently assigned to ${pendingDrop.currentRoomTypeLabel}, but the selected room is ${pendingDrop.targetRoomTypeLabel}.`,
        question: "Do you want to update the room type and add them to this room?",
        primary: "Update and add",
        priceSection,
      };
      return {
        title: "تحديث نوع الغرفة؟",
        intro: `هذا المعتمر محدد حاليًا كـ ${pendingDrop.currentRoomTypeLabel}، والغرفة المختارة هي ${pendingDrop.targetRoomTypeLabel}.`,
        question: "هل تريد تحديث نوع الغرفة وإضافته إلى هذه الغرفة؟",
        primary: "تحديث وإضافة",
        priceSection,
      };
    }
    if (hasGenderAssignment) {
      if (lang === "fr") return {
        title: "Définir le sexe ?",
        intro: pendingDrop.genderAssignment === "female"
          ? "Cette pèlerine n’a pas de sexe défini dans son dossier.\nLa chambre sélectionnée est réservée aux femmes."
          : "Ce pèlerin n’a pas de sexe défini dans son dossier.\nLa chambre sélectionnée est réservée aux hommes.",
        question: pendingDrop.genderAssignment === "female"
          ? "Voulez-vous définir le sexe comme femme et l’ajouter à cette chambre ?"
          : "Voulez-vous définir le sexe comme homme et l’ajouter à cette chambre ?",
        primary: pendingDrop.genderAssignment === "female" ? "Définir comme femme et ajouter" : "Définir comme homme et ajouter",
      };
      if (lang === "en") return {
        title: "Set gender?",
        intro: pendingDrop.genderAssignment === "female"
          ? "This pilgrim does not have a gender set in their file.\nThe selected room is women-only."
          : "This pilgrim does not have a gender set in their file.\nThe selected room is men-only.",
        question: pendingDrop.genderAssignment === "female"
          ? "Do you want to set gender as female and add them to this room?"
          : "Do you want to set gender as male and add them to this room?",
        primary: pendingDrop.genderAssignment === "female" ? "Set as female and add" : "Set as male and add",
      };
      return {
        title: "تحديد الجنس؟",
        intro: pendingDrop.genderAssignment === "female"
          ? "هذه المعتمرة لا يوجد لها جنس محدد في ملفها.\nالغرفة المختارة مصنفة كـ نساء فقط."
          : "هذا المعتمر لا يوجد له جنس محدد في ملفه.\nالغرفة المختارة مصنفة كـ رجال فقط.",
        question: pendingDrop.genderAssignment === "female"
          ? "هل تريد تحديد الجنس كأنثى وإضافتها إلى هذه الغرفة؟"
          : "هل تريد تحديد الجنس كذكر وإضافته إلى هذه الغرفة؟",
        primary: pendingDrop.genderAssignment === "female" ? "تحديد كأنثى وإضافة" : "تحديد كذكر وإضافة",
      };
    }
    if (hasFamilyMixed) {
      if (lang === "fr") return {
        title: "Confirmer la chambre familiale",
        intro: "Cette chambre est définie comme familiale et peut contenir des hommes et des femmes.",
        question: "Voulez-vous ajouter ce pèlerin à cette chambre ?",
        primary: "Confirmer et ajouter",
      };
      if (lang === "en") return {
        title: "Confirm family room",
        intro: "This room is marked as a family room and may include both men and women.",
        question: "Do you want to add this pilgrim to this room?",
        primary: "Confirm and add",
      };
      return {
        title: "تأكيد غرفة عائلية",
        intro: "هذه الغرفة مصنفة كغرفة عائلة، وستضم رجالًا ونساءً.",
        question: "هل تريد إضافة هذا المعتمر إلى هذه الغرفة؟",
        primary: "تأكيد وإضافة",
      };
    }
    if (lang === "fr") return {
      title: `Mettre à jour ${hotelLabel} ?`,
      intro: `Ce pèlerin est actuellement lié à l’hôtel : ${pendingDrop.currentHotel}`,
      target: `La chambre sélectionnée dépend de l’hôtel : ${pendingDrop.targetHotel}`,
      question: `Voulez-vous mettre à jour ${hotelLabel} et l’ajouter à cette chambre ?`,
      primary: "Mettre à jour et ajouter",
    };
    if (lang === "en") return {
      title: `Update ${hotelLabel}?`,
      intro: `This pilgrim is currently linked to hotel: ${pendingDrop.currentHotel}`,
      target: `The selected room belongs to hotel: ${pendingDrop.targetHotel}`,
      question: `Do you want to update ${hotelLabel} and add them to this room?`,
      primary: "Update and add",
    };
    return {
      title: conflictCity === "madinah" ? "تحديث فندق المدينة؟" : "تحديث فندق مكة؟",
      intro: `هذا المعتمر مرتبط حاليًا بـ${hotelLabel}: ${pendingDrop.currentHotel}`,
      target: `والغرفة المختارة تابعة لفندق: ${pendingDrop.targetHotel}`,
      question: `هل تريد تحديث ${hotelLabel} وإضافته إلى هذه الغرفة؟`,
      primary: "تحديث وإضافة",
    };
  }, [city, lang, pendingDrop, t.hotelMadina, t.hotelMecca]);
  const buildPendingDropPriceDecision = React.useCallback((mode = "update") => {
    if (!pendingDrop?.priceSync?.requiresConfirmation) return null;
    if (mode === "keep") {
      return {
        officialPrice: pendingDrop.priceSync.newOfficialPrice,
        salePrice: pendingDrop.priceSync.oldSalePrice,
        keepPreviousSale: true,
      };
    }
    const parsedSalePrice = getRoomingPriceNumber(String(pendingDropSalePrice).replace(",", "."));
    return {
      officialPrice: pendingDrop.priceSync.newOfficialPrice,
      salePrice: parsedSalePrice,
      keepPreviousSale: false,
    };
  }, [pendingDrop, pendingDropSalePrice]);
  const confirmPendingDrop = React.useCallback(() => {
    if (!pendingDrop) return;
    commitClientDropIntoRoom(pendingDrop.roomId, pendingDrop.clientId, {
      genderAssignment: pendingDrop.genderAssignment,
      priceDecision: buildPendingDropPriceDecision("update"),
    });
    if (pendingDrop.source === "picker") {
      setSelectedPilgrimIds([]);
      setPickerOpen(false);
    }
    setPendingDrop(null);
  }, [buildPendingDropPriceDecision, commitClientDropIntoRoom, pendingDrop]);
  const keepPendingDropSalePrice = React.useCallback(() => {
    if (!pendingDrop) return;
    commitClientDropIntoRoom(pendingDrop.roomId, pendingDrop.clientId, {
      genderAssignment: pendingDrop.genderAssignment,
      priceDecision: buildPendingDropPriceDecision("keep"),
    });
    if (pendingDrop.source === "picker") {
      setSelectedPilgrimIds([]);
      setPickerOpen(false);
    }
    setPendingDrop(null);
  }, [buildPendingDropPriceDecision, commitClientDropIntoRoom, pendingDrop]);
  const cancelPendingDrop = React.useCallback(() => {
    setPendingDrop(null);
  }, []);

  const roomingExportMenuLabels = React.useMemo(() => ({
    pdf: t.exportAsPdf || (lang === "fr" ? "Exporter en PDF" : lang === "en" ? "Export as PDF" : "تصدير كـ PDF"),
    excel: t.exportAsExcel || (lang === "fr" ? "Exporter en Excel" : lang === "en" ? "Export as Excel" : "تصدير كـ Excel"),
    loading: t.loading || (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
  }), [lang, t]);

  return (
    <div ref={roomingFullscreenRef} className="rooming-designer-root" style={fullWorkspace ? { position: "fixed", inset: 0, zIndex: 90, background: "var(--rooming-page-bg)" } : undefined}>
      <style>{`
        .rooming-designer-root,
        .rooming-modal-surface {
          --rooming-page-bg: #f3f5f8;
          --rooming-panel-bg: #ffffff;
          --rooming-panel-border: rgba(148,163,184,.22);
          --rooming-panel-shadow: 0 12px 28px rgba(15,23,42,.08);
          --rooming-text: #0f172a;
          --rooming-text-soft: #334155;
          --rooming-muted: #64748b;
          --rooming-input-bg: #ffffff;
          --rooming-input-border: rgba(148,163,184,.24);
          --rooming-toolbar-bg: #ffffff;
          --rooming-toolbar-border: rgba(148,163,184,.2);
          --rooming-button-bg: #ffffff;
          --rooming-button-active-bg: rgba(37,99,235,.08);
          --rooming-button-text: #334155;
          --rooming-button-active-text: #2563eb;
          --rooming-popover-bg: #ffffff;
          --rooming-popover-border: rgba(148,163,184,.22);
          --rooming-popover-shadow: 0 18px 42px rgba(15,23,42,.16);
          --rooming-list-bg: #f8fafc;
          --rooming-list-hover-bg: #ffffff;
          --rooming-list-selected-bg: rgba(37,99,235,.07);
          --rooming-chip-bg: rgba(248,250,252,.78);
          --rooming-chip-border: rgba(148,163,184,.18);
          --rooming-chip-text: #111827;
          --rooming-source-bg: rgba(241,245,249,.7);
          --rooming-source-text: #64748b;
          --rooming-modal-section-bg: #f8fafc;
          --rooming-modal-section-border: rgba(148,163,184,.18);
          --rooming-danger-soft-bg: rgba(254,226,226,.75);
          --rooming-danger-text: #b91c1c;
          --rooming-minimap-mask: rgba(248,250,252,.72);
        }
        html[data-theme="dark"] .rooming-designer-root,
        html[data-theme="dark"] .rooming-modal-surface {
          --rooming-page-bg: #07111f;
          --rooming-panel-bg: rgba(15,23,42,.96);
          --rooming-panel-border: rgba(148,163,184,.24);
          --rooming-panel-shadow: 0 18px 44px rgba(0,0,0,.38);
          --rooming-text: #f8fafc;
          --rooming-text-soft: #e2e8f0;
          --rooming-muted: #a8b5c8;
          --rooming-input-bg: rgba(15,23,42,.72);
          --rooming-input-border: rgba(148,163,184,.30);
          --rooming-toolbar-bg: rgba(15,23,42,.94);
          --rooming-toolbar-border: rgba(148,163,184,.24);
          --rooming-button-bg: rgba(30,41,59,.88);
          --rooming-button-active-bg: rgba(37,99,235,.22);
          --rooming-button-text: #dbeafe;
          --rooming-button-active-text: #93c5fd;
          --rooming-popover-bg: rgba(15,23,42,.98);
          --rooming-popover-border: rgba(148,163,184,.28);
          --rooming-popover-shadow: 0 22px 52px rgba(0,0,0,.48);
          --rooming-list-bg: rgba(30,41,59,.78);
          --rooming-list-hover-bg: rgba(51,65,85,.92);
          --rooming-list-selected-bg: rgba(37,99,235,.22);
          --rooming-chip-bg: rgba(30,41,59,.82);
          --rooming-chip-border: rgba(148,163,184,.24);
          --rooming-chip-text: #f8fafc;
          --rooming-source-bg: rgba(15,23,42,.78);
          --rooming-source-text: #cbd5e1;
          --rooming-modal-section-bg: rgba(30,41,59,.72);
          --rooming-modal-section-border: rgba(148,163,184,.24);
          --rooming-danger-soft-bg: rgba(127,29,29,.28);
          --rooming-danger-text: #fca5a5;
          --rooming-minimap-mask: rgba(2,6,23,.58);
        }
        .rooming-flow-node {
          transition: box-shadow .12s ease, border-color .12s ease, background .12s ease;
          cursor: grab;
          will-change: box-shadow, border-color, background;
        }
        .rooming-flow-node:hover {
          box-shadow: var(--rooming-card-hover-shadow) !important;
        }
        .react-flow__node.dragging .rooming-flow-node {
          transition: none;
          cursor: grabbing;
          box-shadow: 0 20px 46px rgba(15,23,42,.20) !important;
        }
        .room-link-handle {
          transition: filter .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .room-link-handle:hover {
          filter: brightness(1.08) saturate(1.08);
        }
        .rooming-canvas-shell,
        .rooming-flow-canvas {
          --rooming-canvas-bg: #f6f2e8;
          --rooming-canvas-dot: rgba(120,113,108,.34);
          --rooming-canvas-border: rgba(15,23,42,.14);
          --rooming-canvas-shadow: 0 12px 30px rgba(15,23,42,.08);
          --rooming-link-line: rgba(37,99,235,.42);
          --rooming-link-selected: rgba(154,116,24,.86);
          --rooming-card-bg: #fffdf8;
          --rooming-card-border: rgba(15,23,42,.16);
          --rooming-card-shadow: 0 8px 20px rgba(15,23,42,.09);
          --rooming-card-hover-shadow: 0 12px 28px rgba(15,23,42,.13);
        }
        html[data-theme="dark"] .rooming-canvas-shell,
        html[data-theme="dark"] .rooming-flow-canvas {
          --rooming-canvas-bg: #08111f;
          --rooming-canvas-dot: rgba(148,163,184,.26);
          --rooming-canvas-border: rgba(148,163,184,.22);
          --rooming-canvas-shadow: 0 18px 46px rgba(0,0,0,.42);
          --rooming-link-line: rgba(147,197,253,.46);
          --rooming-link-selected: rgba(250,204,21,.88);
          --rooming-card-bg: #111c2d;
          --rooming-card-border: rgba(203,213,225,.20);
          --rooming-card-shadow: 0 18px 38px rgba(0,0,0,.42);
          --rooming-card-hover-shadow: 0 22px 46px rgba(0,0,0,.48), 0 0 0 1px rgba(96,165,250,.20);
        }
        .rooming-flow-canvas.react-flow,
        .rooming-flow-canvas .react-flow__renderer,
        .rooming-flow-canvas .react-flow__pane {
          background: var(--rooming-canvas-bg) !important;
          background-image: radial-gradient(circle, var(--rooming-canvas-dot) 1.25px, transparent 1.35px) !important;
          background-size: 22px 22px !important;
          background-position: 0 0 !important;
        }
        .rooming-flow-canvas .react-flow__background {
          background: transparent !important;
        }
        .rooming-flow-canvas .react-flow__viewport {
          background: transparent !important;
        }
        .rooming-flow-canvas .react-flow__node-room {
          filter: drop-shadow(0 8px 16px rgba(15,23,42,.08));
        }
        .rooming-flow-canvas .react-flow__controls,
        .rooming-flow-canvas .react-flow__minimap {
          z-index: 18 !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          filter: drop-shadow(0 12px 22px rgba(15,23,42,.14));
        }
        .rooming-flow-canvas .react-flow__controls {
          display: flex !important;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(148,163,184,.28);
          border-radius: 12px;
          background: var(--rooming-panel-bg);
        }
        .rooming-flow-canvas .react-flow__controls-button {
          width: 34px;
          height: 34px;
          border-bottom: 1px solid rgba(148,163,184,.16);
          background: var(--rooming-panel-bg);
          color: var(--rooming-text);
        }
        .rooming-flow-canvas .react-flow__controls-button:hover {
          background: var(--rooming-list-hover-bg);
        }
        .rooming-unassigned-card {
          transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease;
          cursor: grab;
        }
        .rooming-unassigned-card:hover {
          border-color: rgba(37,99,235,.32) !important;
          background: var(--rooming-list-hover-bg) !important;
          box-shadow: 0 10px 24px rgba(15,23,42,.10);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .rooming-unassigned-card:hover {
          border-color: rgba(96,165,250,.44) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,.34);
        }
        .rooming-unassigned-card:active {
          cursor: grabbing;
        }
        .rooming-menu-item:hover {
          background: rgba(37,99,235,.08) !important;
        }
        .rooming-menu-panel {
          --rooming-popover-bg: #ffffff;
          --rooming-popover-border: rgba(148,163,184,.22);
          --rooming-popover-shadow: 0 18px 42px rgba(15,23,42,.16);
          --rooming-button-bg: #ffffff;
          --rooming-button-active-bg: rgba(37,99,235,.08);
          --rooming-button-text: #334155;
          --rooming-button-active-text: #2563eb;
          --rooming-danger-text: #b91c1c;
          background: var(--rooming-popover-bg);
          border: 1px solid var(--rooming-popover-border);
          box-shadow: var(--rooming-popover-shadow);
          backdrop-filter: blur(14px);
        }
        .rooming-menu-panel .rooming-menu-item {
          transition: background .16s ease, color .16s ease;
        }
        .rooming-menu-panel .rooming-menu-item svg {
          flex: 0 0 auto;
          color: currentColor;
          stroke: currentColor;
        }
        .rooming-menu-panel .rooming-menu-item span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        html[data-theme="dark"] .rooming-menu-item:hover {
          background: rgba(96,165,250,.16) !important;
        }
        html[data-theme="dark"] .rooming-menu-panel {
          --rooming-popover-bg: rgba(15,23,42,.98);
          --rooming-popover-border: rgba(148,163,184,.28);
          --rooming-popover-shadow: 0 22px 52px rgba(0,0,0,.48);
          --rooming-button-bg: rgba(30,41,59,.88);
          --rooming-button-active-bg: rgba(37,99,235,.22);
          --rooming-button-text: #dbeafe;
          --rooming-button-active-text: #93c5fd;
          --rooming-danger-text: #fca5a5;
        }
        html[data-theme="dark"] .rooming-menu-item svg {
          color: currentColor;
          stroke: currentColor;
        }
        html[data-theme="dark"] .rooming-category-badge {
          background: var(--category-dark-bg) !important;
          color: var(--category-dark-text) !important;
          border-color: var(--category-dark-border) !important;
        }
        .rooming-designer-root input:not([type="checkbox"]),
        .rooming-designer-root select,
        .rooming-designer-root textarea,
        .rooming-modal-surface input:not([type="checkbox"]),
        .rooming-modal-surface select,
        .rooming-modal-surface textarea {
          background: var(--rooming-input-bg) !important;
          border-color: var(--rooming-input-border) !important;
          color: var(--rooming-text) !important;
        }
        .rooming-designer-root input::placeholder,
        .rooming-modal-surface input::placeholder {
          color: var(--rooming-muted) !important;
        }
        html[data-theme="dark"] .rooming-modal-surface p,
        html[data-theme="dark"] .rooming-modal-surface span,
        html[data-theme="dark"] .rooming-modal-surface strong,
        html[data-theme="dark"] .rooming-modal-surface small,
        html[data-theme="dark"] .rooming-modal-surface label {
          color: var(--rooming-text-soft);
        }
      `}</style>
      <GlassCard gold style={{
        padding: fullWorkspace ? 10 : 12,
        marginBottom: fullWorkspace ? 0 : 24,
        height: fullWorkspace ? "100vh" : "auto",
        width: fullWorkspace ? "100vw" : "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "var(--rooming-page-bg)",
        border: "1px solid var(--rooming-panel-border)",
        overflow: "hidden",
      }}>
        {fullWorkspace && (
          <div style={{ position: "absolute", top: 10, insetInlineEnd: 10, zIndex: 48 }}>
            <RoomingToolbarButton
              title={exitFullWorkspaceLabel}
              onClick={exitRoomingWorkspace}
              icon={<Minimize2 size={15} />}
              active
              style={{
                background: "var(--rooming-popover-bg)",
                border: "1px solid var(--rooming-popover-border)",
                boxShadow: "var(--rooming-popover-shadow)",
              }}
            />
          </div>
        )}
        {!fullWorkspace && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
          paddingInlineEnd: 0,
        }}>
          <div>
            <p style={{ color: "var(--rooming-text)", fontWeight: 900, fontSize: 16 }}>{t.roomingDesigner || "مصمم التسكين الذكي"}</p>
            <p style={{ color: "var(--rooming-muted)", fontSize: 12, marginTop: 3 }}>
              {program.name || "—"} • {roomingCityLabels[city]} • {roomingEligibleClients.length} {t.pilgrimUnit || "معتمر"}
              {roomingStatusText ? ` • ${roomingStatusText}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flex: "1 1 280px", justifyContent: "center" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => {
              const progress = roomingProgress[key] || { assigned: 0, total: roomingEligibleClients.length, percent: 0 };
              return (
                <div key={key} style={{
                  minWidth: 132,
                  border: "1px solid var(--rooming-panel-border)",
                  background: "var(--rooming-panel-bg)",
                  borderRadius: 999,
                  padding: "5px 8px",
                  boxShadow: "0 6px 16px rgba(15,23,42,.045)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "var(--rooming-text-soft)", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>
                    <span>{label}</span>
                    <span>{progress.assigned}/{progress.total} · {progress.percent}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: "var(--rooming-input-border)", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ width: `${Math.min(100, progress.percent)}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#2563eb,#16a34a)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--rooming-toolbar-bg)", border: "1px solid var(--rooming-toolbar-border)" }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "var(--rooming-button-active-bg)" : "transparent",
                  color: city === key ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        )}

        {fullWorkspace && (
          <div style={{
            position: "absolute",
            top: 10,
            insetInlineStart: 10,
            zIndex: 48,
            display: "inline-flex",
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: "var(--rooming-popover-bg)",
            border: "1px solid var(--rooming-popover-border)",
            boxShadow: "var(--rooming-popover-shadow)",
            backdropFilter: "blur(14px)",
          }}>
            {Object.entries(roomingCityLabels).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "var(--rooming-button-active-bg)" : "transparent",
                  color: city === key ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                  borderRadius: 9,
                  padding: "8px 11px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!toolbarCollapsed && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            padding: 8,
            marginBottom: fullWorkspace ? 8 : 10,
            borderRadius: 12,
            background: "var(--rooming-toolbar-bg)",
            border: "1px solid var(--rooming-toolbar-border)",
            ...(fullWorkspace ? {
              position: "absolute",
              top: 58,
              insetInlineStart: 10,
              insetInlineEnd: 10,
              zIndex: 38,
              boxShadow: "0 16px 40px rgba(15,23,42,.16)",
              maxHeight: "22vh",
              overflow: "auto",
              backdropFilter: "blur(14px)",
              boxSizing: "border-box",
            } : {}),
          }}>
            <RoomingToolbarButton
              title={t.hideToolbar || "إخفاء الأدوات"}
              onClick={() => setToolbarCollapsed(true)}
              icon={<ChevronUp size={15} />}
            />
            {canShowGenerateRooms && (
              <Button variant="primary" icon="refresh" onClick={generateRooms} disabled={isGeneratingRooms || isRoomingSaving}>
                {t.roomingGenerateRooms || "توليد الغرف"}
              </Button>
            )}
            {roomingStatusBanner && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: 34,
                maxWidth: fullWorkspace ? 520 : 620,
                padding: "6px 9px",
                borderRadius: 10,
                border: `1px solid ${roomingStatusBanner.tone === "error" ? "rgba(239,68,68,.28)" : "rgba(212,175,55,.30)"}`,
                background: roomingStatusBanner.tone === "error" ? "rgba(239,68,68,.08)" : "rgba(212,175,55,.12)",
                color: roomingStatusBanner.tone === "error" ? "var(--rooming-danger-text)" : "var(--rooming-text-soft)",
                fontSize: 11,
                fontWeight: 800,
                flexWrap: "wrap",
              }}>
                <span style={{ minWidth: 0 }}>{roomingStatusBanner.message}</span>
                {roomingStatusBanner.retryLoadLabel && (
                  <button
                    type="button"
                    onClick={retryRoomingLoad}
                    style={{
                      border: "1px solid var(--rooming-input-border)",
                      background: "var(--rooming-button-bg)",
                      color: "var(--rooming-text)",
                      borderRadius: 8,
                      padding: "3px 7px",
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {roomingStatusBanner.retryLoadLabel}
                  </button>
                )}
                {roomingStatusBanner.localDraftLabel && (
                  <button
                    type="button"
                    onClick={continueRoomingLocalDraft}
                    style={{
                      border: "1px solid rgba(37,99,235,.24)",
                      background: "var(--rooming-button-active-bg)",
                      color: "var(--rooming-button-active-text)",
                      borderRadius: 8,
                      padding: "3px 7px",
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {roomingStatusBanner.localDraftLabel}
                  </button>
                )}
                {roomingStatusBanner.retrySaveLabel && (
                  <button
                    type="button"
                    onClick={retryRoomingSave}
                    style={{
                      border: "1px solid rgba(37,99,235,.24)",
                      background: "var(--rooming-button-active-bg)",
                      color: "var(--rooming-button-active-text)",
                      borderRadius: 8,
                      padding: "3px 7px",
                      fontFamily: "'Cairo',sans-serif",
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {roomingStatusBanner.retrySaveLabel}
                  </button>
                )}
              </div>
            )}
          <RoomingToolbarButton
            title={t.addRooms || t.addRoom || "إضافة غرف"}
            onClick={() => openCreateRoom({ x: ROOMING_LAYOUT_START_X, y: ROOMING_LAYOUT_START_Y })}
            icon={<AppIcon name="plus" size={15} />}
          >
            <span>{t.addRooms || t.addRoom || "إضافة غرف"}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={roomingCopyButtonLabel}
            onClick={openCopyRoomingModal}
            disabled={roomingCopyBusy || isRoomingLoading}
            active={roomingCopyModal.open}
            icon={<Copy size={15} />}
          >
            <span>{roomingCopyBusy ? (t.loading || "جاري التحميل...") : roomingCopyButtonLabel}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={roomingPrintLabels.title}
            onClick={() => setRoomingPrintSettingsOpen(true)}
            active={
              roomingPrintSettingsOpen
              || roomingPrintSettings.density !== ROOMING_PRINT_DEFAULT_SETTINGS.density
              || roomingPrintSettings.layoutMode !== ROOMING_PRINT_DEFAULT_SETTINGS.layoutMode
              || roomingPrintSettings.showRegistrationSource !== ROOMING_PRINT_DEFAULT_SETTINGS.showRegistrationSource
              || roomingPrintSettings.showBedNumbers !== ROOMING_PRINT_DEFAULT_SETTINGS.showBedNumbers
              || roomingPrintSettings.unifyMakkahMadinahRooming !== ROOMING_PRINT_DEFAULT_SETTINGS.unifyMakkahMadinahRooming
              || roomingPrintSettings.roomingNameFontSize !== ROOMING_PRINT_DEFAULT_SETTINGS.roomingNameFontSize
              || roomingPrintSettings.roomingAutoShrinkLongNames !== ROOMING_PRINT_DEFAULT_SETTINGS.roomingAutoShrinkLongNames
            }
            icon={<Settings size={15} />}
          >
            <span>{roomingPrintLabels.title}</span>
          </RoomingToolbarButton>
          <RoomingToolbarButton title={t.roomingAutoArrange || "ترتيب تلقائي"} onClick={autoArrangeRooms} icon={<LayoutGrid size={15} />} />
          <RoomingToolbarButton
            title={t.roomingLinkRooms || (lang === "fr" ? "Lier les chambres" : lang === "en" ? "Link rooms" : "ربط الغرف")}
            onClick={toggleRoomLinkMode}
            active={linkMode}
            icon={<Link2 size={15} />}
          >
            {linkMode && linkStartRoomId ? <span>{t.roomingDragLinkToRoom || (lang === "fr" ? "Glisser vers une chambre" : lang === "en" ? "Drag to a room" : "اسحب إلى غرفة")}</span> : null}
          </RoomingToolbarButton>
          <RoomingToolbarButton
            title={t.roomingSelectRooms || "تحديد الغرف"}
            onClick={toggleRoomSelectionMode}
            active={roomSelectionMode}
            icon={<Square size={15} />}
          >
            {roomSelectionMode && selectedRoomIds.size ? `${t.roomingSelectRooms || "تحديد الغرف"} · ${selectedRoomIds.size}` : null}
          </RoomingToolbarButton>
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingSelectAllRooms || "تحديد كل الغرف"}
              onClick={selectAllRooms}
              icon={<LayoutGrid size={15} />}
            >
              <span>{t.roomingSelectAllRooms || "تحديد كل الغرف"}</span>
            </RoomingToolbarButton>
          )}
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingClearSelection || "إلغاء التحديد"}
              onClick={clearRoomSelection}
              disabled={!selectedRoomIds.size}
              icon={<SquareSlash size={15} />}
            >
              <span>{t.roomingClearSelection || "إلغاء التحديد"}</span>
            </RoomingToolbarButton>
          )}
          {roomSelectionMode && (
            <RoomingToolbarButton
              title={t.roomingDeleteSelectedRooms || "حذف الغرف المحددة"}
              onClick={deleteSelectedRooms}
              disabled={!selectedRoomIds.size}
              icon={<Trash2 size={15} />}
              style={{
                border: "1px solid rgba(239,68,68,.32)",
                background: "var(--rooming-danger-soft-bg)",
                color: "var(--rooming-danger-text)",
              }}
            >
              <span>{t.roomingDeleteSelectedRooms || "حذف الغرف المحددة"}</span>
            </RoomingToolbarButton>
          )}
          <RoomingToolbarButton
            title={t.roomingSave || "حفظ"}
            onClick={() => saveCanvas(true)}
            active={dirty || isRoomingSaving}
            disabled={isRoomingLoading || isRoomingSaving}
            icon={<AppIcon name="save" size={15} />}
          />
          <RoomingPrintMenuButton
            title={t.roomingPrint || "طباعة"}
            currentLabel={roomingPrintMenuLabels.current}
            fullLabel={roomingPrintMenuLabels.full}
            loadingLabel={roomingPrintMenuLabels.loading}
            disabled={false}
            busy={Boolean(roomingPrintBusy)}
            onPrint={handleRoomingPrintChoice}
          />
          <RoomingExportMenuButton
            title={t.roomingExportRooming || (lang === "fr" ? "Exporter l’hébergement" : lang === "en" ? "Export rooming" : "تصدير التسكين")}
            label={t.roomingExportRooming || (lang === "fr" ? "Exporter" : lang === "en" ? "Export" : "تصدير")}
            disabled={Boolean(roomingExportBusy)}
            busy={roomingExportBusy.startsWith("single:")}
            menuLabels={roomingExportMenuLabels}
            onExport={(format) => handleRoomingExport("single", format)}
          />
          <RoomingExportMenuButton
            title={t.roomingCombinedExport || (lang === "fr" ? "Exporter La Mecque + Médine" : lang === "en" ? "Export Makkah + Madinah" : "تصدير مكة والمدينة")}
            label={t.roomingCombinedExport || (lang === "fr" ? "La Mecque + Médine" : lang === "en" ? "Makkah + Madinah" : "مكة والمدينة")}
            disabled={Boolean(roomingExportBusy)}
            busy={roomingExportBusy.startsWith("combined:")}
            menuLabels={roomingExportMenuLabels}
            onExport={(format) => handleRoomingExport("combined", format)}
          />
          <div ref={roomFilterMenuRef} onPointerDown={(event) => event.stopPropagation()} style={{ position: "relative" }}>
            <RoomingToolbarButton
              title={t.roomingRoomFilter || "فلترة الغرف"}
              onClick={() => {
                setRoomNeedsOpen(false);
                setRoomFilterOpen((open) => !open);
              }}
              active={roomOccupancyFilter !== "all" || roomFilterOpen}
              icon={<Filter size={15} />}
            />
            <RoomingMenu open={roomFilterOpen} align="start" width={190} anchorRef={roomFilterMenuRef} portal={fullWorkspace}>
              {roomOccupancyOptions.map((option) => (
                <RoomingMenuItem
                  key={option.value}
                  label={option.label}
                  active={roomOccupancyFilter === option.value}
                  icon={<span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: roomOccupancyFilter === option.value ? "var(--rooming-button-active-text)" : "var(--rooming-input-border)",
                    flexShrink: 0,
                  }} />}
                  onClick={() => {
                    setRoomOccupancyFilter(option.value);
                    setRoomFilterOpen(false);
                  }}
                />
              ))}
            </RoomingMenu>
          </div>
          <div ref={roomNeedsMenuRef} onPointerDown={(event) => event.stopPropagation()} style={{ position: "relative" }}>
            <RoomingToolbarButton
              title={t.roomNeeds || "احتياج الغرف"}
              onClick={() => {
                setRoomFilterOpen(false);
                setRoomNeedsOpen((open) => !open);
              }}
              active={roomNeedsOpen}
              icon={<LayoutGrid size={15} />}
            >
              {roomNeeds.totalRooms ? `${t.roomNeeds || "احتياج الغرف"} · ${roomNeeds.totalRooms}` : (t.roomNeeds || "احتياج الغرف")}
            </RoomingToolbarButton>
            <RoomingMenu open={roomNeedsOpen} align="start" width={260} anchorRef={roomNeedsMenuRef} portal={fullWorkspace}>
              <div style={{ padding: "6px 8px 8px" }}>
                <p style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900, marginBottom: 8 }}>{t.roomNeeds || "احتياج الغرف"}</p>
                {!roomNeeds.details.length ? (
                  <p style={{ color: "var(--rooming-muted)", fontSize: 11 }}>{t.noDetails || "بدون تفاصيل"}</p>
                ) : (
                  <div style={{ display: "grid", gap: 7 }}>
                    {roomNeeds.details.map((item) => (
                      <div key={item.type} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", color: "var(--rooming-text-soft)", fontSize: 11, fontWeight: 800 }}>
                        <span>{item.label}</span>
                        <span style={{ color: "var(--rooming-text)" }}>
                          {tr("roomNeedsLine", { rooms: item.rooms, pilgrims: item.pilgrims }) || `${item.rooms} غرف / ${item.pilgrims} معتمرين`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RoomingMenu>
          </div>
          <select
            value={zoom}
            onChange={(event) => applyFlowZoom(Number(event.target.value))}
            title={t.roomingZoom || "التكبير"}
            style={{ height: 34, borderRadius: 8, border: "1px solid var(--rooming-input-border)", background: "var(--rooming-input-bg)", color: "var(--rooming-text-soft)", padding: "0 10px", fontSize: 12, fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}
          >
            {[75, 100, 125].map((value) => <option key={value} value={value}>{value}%</option>)}
          </select>
          <RoomingToolbarButton title={t.roomingFit || "Fit"} onClick={fitView} icon={<Scan size={15} />} />
          <RoomingToolbarButton title={panelOpen ? hideUnassignedLabel : showUnassignedLabel} onClick={() => setPanelOpen((open) => !open)} icon={panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />} active={panelOpen} />
          <RoomingToolbarButton
            title={expandRoomingLabel}
            onClick={enterRoomingExpanded}
            icon={<PanelTop size={15} />}
            active={roomingWorkspaceMode === "expanded"}
            style={{
              background: roomingWorkspaceMode === "expanded" ? "var(--rooming-button-active-bg)" : "var(--rooming-list-bg)",
              border: "1px solid var(--rooming-input-border)",
              color: roomingWorkspaceMode === "expanded" ? "var(--rooming-button-active-text)" : "var(--rooming-text-soft)",
            }}
          />
          <RoomingToolbarButton
            title={browserFullscreenLabel}
            onClick={enterRoomingBrowserFullscreen}
            icon={<Maximize2 size={15} />}
            active={browserFullscreenMode}
            style={{
              border: browserFullscreenMode ? "1px solid rgba(37,99,235,.42)" : "1px solid rgba(212,175,55,.48)",
              background: browserFullscreenMode ? "var(--rooming-button-active-bg)" : "linear-gradient(135deg, rgba(212,175,55,.18), var(--rooming-button-bg))",
              color: browserFullscreenMode ? "var(--rooming-button-active-text)" : "var(--rooming-text)",
              boxShadow: "0 8px 18px rgba(15,23,42,.10)",
            }}
          />
          </div>
        )}

        <div style={fullWorkspace ? {
          position: "relative",
          flex: 1,
          minHeight: 0,
          height: canvasHeight,
          display: "block",
        } : {
          display: "grid",
          gridTemplateColumns: panelOpen ? "minmax(0,1fr) 290px" : "1fr",
          gap: 10,
          minHeight: 0,
          height: canvasHeight,
        }}>
          <div className="rooming-canvas-shell" style={{
            position: fullWorkspace ? "absolute" : "relative",
            inset: fullWorkspace ? 0 : undefined,
            overflow: "hidden",
            borderRadius: fullWorkspace ? 16 : 14,
            border: "1px solid var(--rooming-canvas-border)",
            backgroundColor: "var(--rooming-canvas-bg)",
            boxShadow: "var(--rooming-canvas-shadow)",
            height: fullWorkspace ? "100%" : undefined,
            minHeight: 0,
          }}>
            {toolbarCollapsed && (
              <div style={{
                position: "absolute",
                top: fullWorkspace ? 58 : 12,
                insetInlineStart: 12,
                zIndex: fullWorkspace ? 38 : 24,
              }}>
                <RoomingToolbarButton
                  title={t.showToolbar || "إظهار الأدوات"}
                  onClick={() => setToolbarCollapsed(false)}
                  active
                  icon={<ChevronDown size={15} />}
                  style={{
                    background: "var(--rooming-button-bg)",
                    border: "1px solid var(--rooming-toolbar-border)",
                    boxShadow: "0 10px 24px rgba(15,23,42,.12)",
                  }}
                />
              </div>
            )}
            {!rooms.length ? (
              <div
                onContextMenu={(event) => {
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const menuPoint = clampRoomingContextMenuPoint(event.clientX, event.clientY);
                  setCanvasMenu({
                    open: true,
                    x: menuPoint.x,
                    y: menuPoint.y,
                    position: {
                      x: Math.max(0, event.clientX - rect.left),
                      y: Math.max(0, event.clientY - rect.top),
                    },
                  });
                }}
                style={{ display: "grid", placeItems: "center", minHeight: "100%", padding: 30 }}
              >
                <div style={{ textAlign: "center", maxWidth: 420 }}>
                  <p style={{ color: "var(--rooming-text)", fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
                    {isRoomingLoading
                      ? (t.roomingLoadingRooms || (lang === "fr" ? "Chargement de l’hébergement..." : lang === "en" ? "Loading rooming..." : "جاري تحميل التسكين..."))
                      : roomingLoadStatus === "loadFailed"
                        ? (t.roomingLoadFailedShort || (lang === "fr" ? "Chargement impossible" : lang === "en" ? "Load failed" : "تعذر تحميل التسكين"))
                        : (t.roomingStartTitle || "ابدأ بتوليد الغرف")}
                  </p>
                  <p style={{ color: "var(--rooming-muted)", fontSize: 13, marginBottom: 16 }}>
                    {isRoomingLoading
                      ? (t.roomingLoadingRoomsDesc || (lang === "fr" ? "Les chambres seront affichées dès que les données seront chargées." : lang === "en" ? "Rooms will appear as soon as the data finishes loading." : "ستظهر الغرف فور اكتمال تحميل البيانات."))
                      : roomingLoadStatus === "loadFailed"
                        ? (t.roomingLoadFailedRetry || (lang === "fr" ? "Réessayez le chargement ou continuez avec le brouillon local si disponible." : lang === "en" ? "Retry loading or continue with the local draft if available." : "أعد محاولة التحميل أو تابع المسودة المحلية إن وجدت."))
                        : (t.roomingStartDesc || "سيتم توليد الغرف فارغة حسب الاحتياج. سيبقى الحجاج/المعتمرون في قائمة غير المسكنين لتقوم بتسكينهم يدويًا.")}
                  </p>
                  {canShowGenerateRooms && (
                    <Button variant="primary" icon="refresh" onClick={generateRooms} disabled={isGeneratingRooms || isRoomingSaving}>
                      {t.roomingGenerateRooms || "توليد الغرف"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <ReactFlowProvider>
                  <RoomingFlowSurface
                    nodes={flowNodes}
                    edges={roomFlowEdges}
                    onNodesChange={onFlowNodesChange}
                    selectedRoomId={selectedRoomId}
                    panelOpen={panelOpen}
                    nodesDraggable={!roomSelectionMode}
                    panOnDrag={!draggingClientId}
                    onInit={(flow) => { flowRef.current = flow; }}
                    onNodeClick={(_event, node) => {
                      if (roomSelectionMode) {
                        toggleRoomSelection(node.id);
                        return;
                      }
                      setSelectedRoomId(node.id);
                    }}
                    linkMode={linkMode}
                    onConnect={handleRoomLinkConnect}
                    onConnectStart={handleRoomLinkConnectStart}
                    onConnectEnd={handleRoomLinkConnectEnd}
                    isValidConnection={isValidRoomLinkConnection}
                    onEdgeClick={handleRoomLinkClick}
                    onEdgeContextMenu={handleRoomLinkContextMenu}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    onPaneContextMenu={openCanvasContextMenu}
                    onPaneClick={() => {
                      closeCanvasContextMenu();
                      setRoomLinkMenu({ open: false, x: 0, y: 0, linkId: "" });
                      setSelectedRoomLinkId(null);
                    }}
                  />
                </ReactFlowProvider>
                {!visibleRooms.length && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}>
                    <div style={{
                      background: "var(--rooming-panel-bg)",
                      border: "1px solid var(--rooming-panel-border)",
                      boxShadow: "0 18px 42px rgba(15,23,42,.12)",
                      borderRadius: 14,
                      padding: "16px 20px",
                      color: "var(--rooming-text-soft)",
                      fontWeight: 800,
                      fontSize: 13,
                    }}>
                      {t.roomingNoRoomsForFilters || "لا توجد غرف مطابقة للفلاتر الحالية"}
                    </div>
                  </div>
                )}
              </>
            )}
            {canvasMenu.open && (
              <div
                onPointerDown={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: canvasMenu.y,
                  left: canvasMenu.x,
                  width: 170,
                  background: "var(--rooming-popover-bg)",
                  border: "1px solid var(--rooming-popover-border)",
                  borderRadius: 12,
                  boxShadow: "var(--rooming-popover-shadow)",
                  padding: 6,
                  zIndex: 120,
                }}
              >
                <RoomingMenuItem
                  label={t.addRooms || t.addRoom || "إضافة غرف"}
                  icon={<AppIcon name="plus" size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    openCreateRoom(canvasMenu.position);
                  }}
                />
                <RoomingMenuItem
                  label={t.roomingAutoArrange || "ترتيب تلقائي"}
                  icon={<LayoutGrid size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    autoArrangeRooms();
                  }}
                />
                <RoomingMenuItem
                  label={t.roomingFit || "ملاءمة العرض"}
                  icon={<Scan size={14} />}
                  onClick={() => {
                    closeCanvasContextMenu();
                    fitView();
                  }}
                />
              </div>
            )}
            {roomLinkMenu.open && (
              <div
                onPointerDown={(event) => event.stopPropagation()}
                style={{
                  position: "fixed",
                  top: roomLinkMenu.y,
                  left: roomLinkMenu.x,
                  zIndex: 70,
                  width: 176,
                }}
              >
                <RoomingMenu open width={176}>
                  <RoomingMenuItem
                    destructive
                    icon={<Trash2 size={14} />}
                    label={t.roomingDeleteLink || (lang === "fr" ? "Supprimer le lien" : lang === "en" ? "Delete link" : "حذف الرابط")}
                    onClick={() => deleteRoomLink(roomLinkMenu.linkId)}
                  />
                </RoomingMenu>
              </div>
            )}
          </div>

          {fullWorkspace && !panelOpen && (
            <button
              type="button"
              title={showUnassignedLabel}
              onClick={() => setPanelOpen(true)}
              style={{
                position: "absolute",
                top: "50%",
                left: 14,
                transform: "translateY(-50%)",
                zIndex: 32,
                border: "1px solid var(--rooming-popover-border)",
                background: "var(--rooming-popover-bg)",
                color: "var(--rooming-button-text)",
                borderRadius: 999,
                padding: "8px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                boxShadow: "var(--rooming-popover-shadow)",
                fontFamily: "'Cairo',sans-serif",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <PanelRightOpen size={15} />
              <span>{showUnassignedLabel}</span>
            </button>
          )}

          {panelOpen && (
            <aside style={{
              background: "var(--rooming-panel-bg)",
              border: "1px solid var(--rooming-panel-border)",
              borderRadius: 14,
              padding: 12,
              overflow: "auto",
              boxShadow: fullWorkspace ? "var(--rooming-popover-shadow)" : "var(--rooming-panel-shadow)",
              ...(fullWorkspace ? {
                position: "absolute",
                top: fullWorkspacePanelTop,
                bottom: 18,
                left: 18,
                zIndex: 31,
                width: "min(340px, calc(100vw - 36px))",
                maxWidth: "calc(100vw - 36px)",
                maxHeight: toolbarCollapsed ? "calc(100vh - 124px)" : "calc(100vh - 58px - 22vh - 36px)",
                backdropFilter: "blur(14px)",
              } : {}),
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ color: "var(--rooming-text)", fontWeight: 900, fontSize: 13 }}>{t.unassignedReview || "غير مسكنين / يحتاجون مراجعة"}</p>
                <RoomingToolbarButton title={fullWorkspace ? hideUnassignedLabel : (t.roomingHideUnassigned || "إخفاء")} onClick={() => setPanelOpen(false)} icon={<PanelRightClose size={14} />} style={{ minWidth: 28, height: 28 }} />
              </div>
              <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>
                <Input label="" value={panelSearch} onChange={(event) => setPanelSearch(event.target.value)} placeholder={t.searchGeneral || "بحث"} />
                <Select label="" value={panelHotel} onChange={(event) => setPanelHotel(event.target.value)} options={[{ value: "all", label: t.allHotels || "كل الفنادق" }, ...hotelOptions.map((hotel) => ({ value: hotel, label: hotel }))]} />
                <Select label="" value={panelRoomType} onChange={(event) => setPanelRoomType(event.target.value)} options={[{ value: "all", label: t.allRooms || "كل الغرف" }, ...roomingRoomOptions.map((option) => ({ value: option.value, label: option.label }))]} />
              </div>
              {excludedRoomingClientCount > 0 && (
                <p style={{
                  marginBottom:10,
                  padding:"8px 10px",
                  borderRadius:10,
                  background:"rgba(148,163,184,.08)",
                  border:"1px solid var(--rooming-panel-border)",
                  color:"var(--rooming-muted)",
                  fontSize:11.5,
                  lineHeight:1.55,
                  fontWeight:800,
                }}>
                  {roomingServiceTypeHiddenNote}
                </p>
              )}
              {selectedUnassignedList.length > 0 && (
                <div style={{
                  display: "grid",
                  gap: 7,
                  marginBottom: 10,
                  padding: 8,
                  border: "1px solid rgba(37,99,235,.22)",
                  borderRadius: 11,
                  background: "var(--rooming-list-selected-bg)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900 }}>
                      {selectedUnassignedList.length} {unassignedSelectionLabels.selected}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedUnassigned}
                      style={{
                        border: "1px solid var(--rooming-panel-border)",
                        background: "var(--rooming-button-bg)",
                        color: "var(--rooming-button-text)",
                        borderRadius: 8,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {unassignedSelectionLabels.clear}
                    </button>
                  </div>
                  {selectedRoom && (
                    <button
                      type="button"
                      onClick={() => insertClientsIntoRoom(selectedRoom.id, selectedUnassignedList, true)}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(37,99,235,.24)",
                        background: "var(--rooming-button-active-bg)",
                        color: "var(--rooming-button-active-text)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {unassignedSelectionLabels.addToRoom}
                    </button>
                  )}
                </div>
              )}
              {!filteredUnassigned.length ? (
                <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.noUnassignedForFilters || "لا توجد حالات غير مسكنة ضمن الفلاتر الحالية."}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredUnassigned.map((item) => {
                    const client = clientsById[item.clientId];
                    const context = client ? getClientContext(client) : {};
                    const genderMissing = client && !normalizeRoomingGender(client.gender);
                    const selectedRoomReason = client && selectedRoom ? getCompatibilityReason(client, selectedRoom) : "";
                    const canAddToSelected = Boolean(client && selectedRoom && !selectedRoomReason);
                    const displayReason = item.reason && item.reason !== "يحتاج مراجعة" ? item.reason : "";
                    const unassignedSelected = selectedUnassignedIds.has(item.clientId);
                    return (
                      <div
                        key={item.clientId}
                        className="rooming-unassigned-card"
                        draggable={Boolean(client)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          if (!client) return;
                          const dragIds = unassignedSelected && selectedUnassignedList.length
                            ? selectedUnassignedList
                            : [item.clientId];
                          setDraggingClientId(item.clientId);
                          setHoveredDropRoomId(null);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("application/x-rukn-client-id", item.clientId);
                          event.dataTransfer.setData("application/x-rukn-client-ids", JSON.stringify(dragIds));
                          event.dataTransfer.setData("text/plain", dragIds.length > 1 ? `${dragIds.length} ${unassignedSelectionLabels.selected}` : (context.name || item.clientId));
                          setUnassignedGroupDragImage(event, dragIds, context.name);
                        }}
                        onDragEnd={(event) => {
                          event.stopPropagation();
                          clearRoomingDragState();
                        }}
                        style={{
                          position: "relative",
                          border: draggingClientId === item.clientId || unassignedSelected ? "1px solid rgba(37,99,235,.42)" : "1px solid var(--rooming-panel-border)",
                          background: draggingClientId === item.clientId || unassignedSelected ? "var(--rooming-list-selected-bg)" : "var(--rooming-list-bg)",
                          boxShadow: unassignedSelected ? "0 10px 22px rgba(37,99,235,.10)" : "none",
                          borderRadius: 10,
                          padding: 9,
                          paddingInlineStart: 38,
                        }}
                      >
                        <button
                          type="button"
                          title={unassignedSelected ? unassignedSelectionLabels.clear : unassignedSelectionLabels.selected}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleUnassignedSelection(item.clientId);
                          }}
                          style={{
                            position: "absolute",
                            top: 8,
                            insetInlineStart: 8,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            border: unassignedSelected ? "1px solid rgba(37,99,235,.56)" : "1px solid var(--rooming-panel-border)",
                            background: unassignedSelected ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
                            color: unassignedSelected ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: 900,
                            lineHeight: 1,
                            fontFamily: "'Cairo',sans-serif",
                          }}
                        >
                          {unassignedSelected ? "✓" : ""}
                        </button>
                        <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 12 }}>{context.name}</strong>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", color: "var(--rooming-muted)", fontSize: 11, marginTop: 3 }}>
                          <span>{[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ") || (t.noDetails || "بدون تفاصيل")}</span>
                          {genderMissing && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              border: "1px solid rgba(148,163,184,.24)",
                              background: "var(--rooming-source-bg)",
                              color: "var(--rooming-source-text)",
                              borderRadius: 999,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 800,
                              lineHeight: 1.45,
                              whiteSpace: "nowrap",
                            }}>
                              {unknownGenderBadgeLabel}
                            </span>
                          )}
                        </span>
                        {displayReason && <span style={{ display: "block", color: "var(--rukn-warning)", fontSize: 11, marginTop: 3 }}>{displayReason}</span>}
                        {selectedRoom && (
                          <button
                            type="button"
                            disabled={!canAddToSelected}
                            onClick={() => {
                              if (!canAddToSelected) return;
                              const ids = unassignedSelected && selectedUnassignedList.length > 1
                                ? selectedUnassignedList
                                : [item.clientId];
                              insertClientsIntoRoom(selectedRoom.id, ids, true);
                            }}
                            style={{
                              marginTop: 8,
                              width: "100%",
                              border: "1px solid rgba(37,99,235,.18)",
                              background: canAddToSelected ? "var(--rooming-button-active-bg)" : "var(--rooming-list-bg)",
                              color: canAddToSelected ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
                              borderRadius: 8,
                              padding: "6px 8px",
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: canAddToSelected ? "pointer" : "not-allowed",
                              fontFamily: "'Cairo',sans-serif",
                            }}
                          >
                            {canAddToSelected ? (t.addToSelectedRoom || "إضافة إلى الغرفة المحددة") : (selectedRoomReason || t.roomFull || "الغرفة ممتلئة")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </aside>
          )}
        </div>

        <Modal
          open={roomingCopyModal.open}
          onClose={closeCopyRoomingModal}
          title={roomingCopyModalTitle}
          width={560}
          portalContainer={roomingModalPortalContainer}
        >
          <div className="rooming-modal-surface" style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "var(--rooming-text-soft)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
              {tr("roomingCopyIntro", { people: roomingCopyPeopleTerm })
                || (lang === "fr"
                  ? `Vous pouvez copier uniquement la structure des chambres ou conserver la même répartition des ${roomingCopyPeopleTerm}.`
                  : lang === "en"
                    ? `You can copy the room structure only or keep the same ${roomingCopyPeopleTerm} distribution.`
                    : `يمكنك نسخ هيكلة الغرف فقط أو الاحتفاظ بنفس توزيع ${roomingCopyPeopleTerm}.`)}
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 8,
            }}>
              <div style={{ padding: 10, borderRadius: 12, border: "1px solid var(--rooming-modal-section-border)", background: "var(--rooming-modal-section-bg)" }}>
                <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900, margin: 0 }}>{t.roomingCopySource || (lang === "fr" ? "Source" : lang === "en" ? "Source" : "المصدر")}</p>
                <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 13, marginTop: 3 }}>
                  {roomingCityShortLabels[roomingCopyModal.sourceCity] || "—"} · {roomingCopyModal.sourceRooms.length} {t.roomingRoomsUnit || "غرف"}
                </strong>
              </div>
              <div style={{ padding: 10, borderRadius: 12, border: "1px solid var(--rooming-modal-section-border)", background: "var(--rooming-modal-section-bg)" }}>
                <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900, margin: 0 }}>{t.roomingCopyTarget || (lang === "fr" ? "Destination" : lang === "en" ? "Target" : "الوجهة")}</p>
                <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 13, marginTop: 3 }}>
                  {roomingCityShortLabels[roomingCopyModal.targetCity] || roomingCityShortLabels[city]} · {rooms.length} {t.roomingRoomsUnit || "غرف"}
                </strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: 9 }}>
              {[
                {
                  value: "rooms",
                  title: t.roomingCopyRoomsOnly || (lang === "fr" ? "Copier les chambres seulement" : lang === "en" ? "Copy rooms only" : "نسخ الغرف فقط"),
                  description: tr("roomingCopyRoomsOnlyDesc", { people: roomingCopyPeopleTerm })
                    || (lang === "fr"
                      ? `Crée les mêmes chambres sans affecter de ${roomingCopyPeopleTerm}.`
                      : lang === "en"
                        ? `Creates the same rooms without assigning any ${roomingCopyPeopleTerm}.`
                        : `ينشئ نفس الغرف دون تسكين أي من ${roomingCopyPeopleTerm}.`),
                },
                {
                  value: "distribution",
                  title: t.roomingCopyWithDistribution || (lang === "fr" ? "Copier avec la même répartition" : lang === "en" ? "Copy with same distribution" : "نسخ الغرف مع نفس التوزيع"),
                  description: tr("roomingCopyWithDistributionDesc", { people: roomingCopyPeopleTerm })
                    || (lang === "fr"
                      ? `Préserve les groupes de ${roomingCopyPeopleTerm} dans chaque chambre, sans doublons.`
                      : lang === "en"
                        ? `Preserves the same ${roomingCopyPeopleTerm} grouping in each room without duplicates.`
                        : `يحافظ على نفس مجموعات ${roomingCopyPeopleTerm} داخل كل غرفة بدون تكرار.`),
                },
              ].map((option) => {
                const active = roomingCopyModal.mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRoomingCopyModal((current) => ({ ...current, mode: option.value }))}
                    style={{
                      textAlign: "inherit",
                      border: active ? "1px solid rgba(37,99,235,.42)" : "1px solid var(--rooming-modal-section-border)",
                      background: active ? "var(--rooming-button-active-bg)" : "var(--rooming-modal-section-bg)",
                      color: "var(--rooming-text)",
                      borderRadius: 12,
                      padding: "11px 12px",
                      cursor: "pointer",
                      fontFamily: "'Cairo',sans-serif",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        border: active ? "5px solid var(--rooming-button-active-text)" : "2px solid var(--rooming-input-border)",
                        background: "var(--rooming-button-bg)",
                        flexShrink: 0,
                      }} />
                      <strong style={{ color: active ? "var(--rooming-button-active-text)" : "var(--rooming-text)", fontSize: 13 }}>{option.title}</strong>
                    </span>
                    <small style={{ display: "block", color: "var(--rooming-muted)", fontSize: 11.5, lineHeight: 1.7, marginTop: 5 }}>{option.description}</small>
                  </button>
                );
              })}
            </div>

            <label style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={roomingCopyModal.useTargetHotels}
                onChange={(event) => setRoomingCopyModal((current) => ({ ...current, useTargetHotels: event.target.checked }))}
                style={{ marginTop: 4 }}
              />
              <span>
                <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 13 }}>
                  {t.roomingCopyUseTargetHotels || (lang === "fr" ? "Utiliser les hôtels de l’hébergement actuel quand c’est possible" : lang === "en" ? "Use hotels from the current rooming when possible" : "استعمال فنادق التسكين الحالي عند الإمكان")}
                </strong>
                <small style={{ display: "block", color: "var(--rooming-muted)", fontSize: 11.5, lineHeight: 1.7, marginTop: 3 }}>
                  {t.roomingCopyUseTargetHotelsDesc || (lang === "fr"
                    ? "La structure et la répartition sont conservées, avec correspondance vers les hôtels de la destination si une correspondance sûre existe."
                    : lang === "en"
                      ? "The structure and distribution are preserved while safely matching rooms to target-location hotels when possible."
                      : "سيتم الحفاظ على الهيكلة والتوزيع مع مطابقة الغرف مع فنادق الوجهة فقط عند وجود تطابق آمن.")}
                </small>
              </span>
            </label>

            {rooms.length > 0 && (
              <div style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(245,158,11,.30)",
                background: "rgba(245,158,11,.10)",
                color: "var(--rooming-text)",
              }}>
                <strong style={{ display: "block", fontSize: 12.5, marginBottom: 4 }}>
                  {t.roomingCopyExistingWarningTitle || (lang === "fr" ? "Cet hébergement contient déjà des chambres" : lang === "en" ? "This rooming already contains rooms" : "هذا التسكين يحتوي على غرف مسبقًا")}
                </strong>
                <span style={{ display: "block", color: "var(--rooming-text-soft)", fontSize: 11.5, lineHeight: 1.7 }}>
                  {t.roomingCopyExistingWarning || (lang === "fr"
                    ? "Choisissez comment continuer avant de copier."
                    : lang === "en"
                      ? "Choose how you want to continue before copying."
                      : "اختر كيف تريد المتابعة قبل النسخ.")}
                </span>
              </div>
            )}

            {rooms.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                {[
                  { value: "append", label: t.roomingCopyAppend || (lang === "fr" ? "Ajouter comme nouvelles chambres" : lang === "en" ? "Add as new rooms" : "إضافة كغرف جديدة") },
                  { value: "replace", label: t.roomingCopyReplace || (lang === "fr" ? "Remplacer l’hébergement actuel" : lang === "en" ? "Replace current rooming" : "استبدال التسكين الحالي") },
                ].map((action) => {
                  const active = roomingCopyModal.targetAction === action.value;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setRoomingCopyModal((current) => ({ ...current, targetAction: action.value, replaceConfirmed: action.value === "replace" ? current.replaceConfirmed : false }))}
                      style={{
                        border: active ? "1px solid rgba(37,99,235,.42)" : "1px solid var(--rooming-modal-section-border)",
                        background: active ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
                        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                        borderRadius: 11,
                        padding: "9px 10px",
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}

            {rooms.length > 0 && roomingCopyModal.targetAction === "replace" && (
              <label style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--rooming-danger-text)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={roomingCopyModal.replaceConfirmed}
                  onChange={(event) => setRoomingCopyModal((current) => ({ ...current, replaceConfirmed: event.target.checked }))}
                />
                <span>{t.roomingCopyReplaceConfirm || (lang === "fr" ? "Je confirme le remplacement des chambres actuelles." : lang === "en" ? "I confirm replacing the current rooms." : "أؤكد استبدال الغرف الحالية.")}</span>
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              <button
                type="button"
                onClick={closeCopyRoomingModal}
                style={{
                  border: "1px solid var(--rooming-modal-section-border)",
                  background: "var(--rooming-button-bg)",
                  color: "var(--rooming-button-text)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {t.cancel || (lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "إلغاء")}
              </button>
              <button
                type="button"
                disabled={rooms.length > 0 && roomingCopyModal.targetAction === "replace" && !roomingCopyModal.replaceConfirmed}
                onClick={confirmCopyRooming}
                style={{
                  border: "1px solid rgba(212,175,55,.48)",
                  background: "linear-gradient(135deg,#d4af37,#f7d774)",
                  color: "#111827",
                  borderRadius: 10,
                  padding: "8px 14px",
                  cursor: rooms.length > 0 && roomingCopyModal.targetAction === "replace" && !roomingCopyModal.replaceConfirmed ? "not-allowed" : "pointer",
                  opacity: rooms.length > 0 && roomingCopyModal.targetAction === "replace" && !roomingCopyModal.replaceConfirmed ? 0.55 : 1,
                  fontFamily: "'Cairo',sans-serif",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {rooms.length > 0
                  ? (roomingCopyModal.targetAction === "replace"
                    ? (t.roomingCopyReplace || (lang === "fr" ? "Remplacer l’hébergement actuel" : lang === "en" ? "Replace current rooming" : "استبدال التسكين الحالي"))
                    : (t.roomingCopyAppend || (lang === "fr" ? "Ajouter comme nouvelles chambres" : lang === "en" ? "Add as new rooms" : "إضافة كغرف جديدة")))
                  : (t.roomingCopyAction || (lang === "fr" ? "Copier l’hébergement" : lang === "en" ? "Copy rooming" : "نسخ التسكين"))}
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={roomingPrintSettingsOpen}
          onClose={() => setRoomingPrintSettingsOpen(false)}
          title={roomingPrintLabels.title}
          width={460}
          portalContainer={roomingModalPortalContainer}
        >
          <div className="rooming-modal-surface" style={{ display: "grid", gap: 16 }}>
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              color: "var(--rooming-text)",
              fontSize: 13,
              fontWeight: 900,
            }}>
              <span>{roomingPrintLabels.showSource}</span>
              <input
                type="checkbox"
                checked={roomingPrintSettings.showRegistrationSource}
                onChange={(event) => setRoomingPrintSettings((prev) => ({
                  ...prev,
                  showRegistrationSource: event.target.checked,
                }))}
                style={{ width: 18, height: 18, accentColor: "#2563eb" }}
              />
            </label>

            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              color: "var(--rooming-text)",
              fontSize: 13,
              fontWeight: 900,
            }}>
              <span>{roomingPrintLabels.showBedNumbers}</span>
              <input
                type="checkbox"
                checked={roomingPrintSettings.showBedNumbers}
                onChange={(event) => setRoomingPrintSettings((prev) => ({
                  ...prev,
                  showBedNumbers: event.target.checked,
                }))}
                style={{ width: 18, height: 18, accentColor: "#b99235" }}
              />
            </label>

            <label style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
              color: "var(--rooming-text)",
              cursor: "pointer",
            }}>
              <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
                <strong style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.35 }}>
                  {roomingPrintLabels.unifiedBoth}
                </strong>
                <small style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.55 }}>
                  {roomingPrintLabels.unifiedBothDescription}
                </small>
              </span>
              <input
                type="checkbox"
                checked={roomingPrintSettings.unifyMakkahMadinahRooming}
                onChange={(event) => setRoomingPrintSettings((prev) => ({
                  ...prev,
                  unifyMakkahMadinahRooming: event.target.checked,
                }))}
                style={{ width: 18, height: 18, flex: "0 0 auto", marginTop: 2, accentColor: "#b99235" }}
              />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>{roomingPrintLabels.density}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 6,
                padding: 4,
                borderRadius: 12,
                background: "var(--rooming-list-bg)",
                border: "1px solid var(--rooming-modal-section-border)",
              }}>
                {roomingDensityOptions.map((option) => {
                  const active = roomingPrintSettings.density === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRoomingPrintSettings((prev) => ({ ...prev, density: option.value }))}
                      style={{
                        border: active ? "1px solid rgba(37,99,235,.34)" : "1px solid transparent",
                        background: active ? "var(--rooming-button-bg)" : "transparent",
                        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                        boxShadow: active ? "0 8px 18px rgba(15,23,42,.08)" : "none",
                        borderRadius: 9,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: "grid",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid var(--rooming-modal-section-border)",
              borderRadius: 12,
              background: "var(--rooming-modal-section-bg)",
            }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>
                {roomingPrintLabels.nameFontSize}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-grid",
                  gridTemplateColumns: "34px 58px 34px",
                  alignItems: "center",
                  border: "1px solid var(--rooming-modal-section-border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--rooming-list-bg)",
                }}>
                  <button
                    type="button"
                    onClick={() => setRoomingPrintSettings((prev) => ({
                      ...prev,
                      roomingNameFontSize: clampRoomingNameFontSize(roomingNameFontSize - 1),
                    }))}
                    disabled={roomingNameFontSize <= 9}
                    style={{
                      height: 34,
                      border: 0,
                      borderInlineEnd: "1px solid var(--rooming-modal-section-border)",
                      background: "transparent",
                      color: "var(--rooming-button-text)",
                      fontSize: 18,
                      fontWeight: 900,
                      cursor: roomingNameFontSize <= 9 ? "not-allowed" : "pointer",
                      opacity: roomingNameFontSize <= 9 ? 0.45 : 1,
                    }}
                  >
                    -
                  </button>
                  <strong style={{ textAlign: "center", color: "var(--rooming-text)", fontSize: 13, fontWeight: 900 }}>
                    {roomingNameFontSize}px
                  </strong>
                  <button
                    type="button"
                    onClick={() => setRoomingPrintSettings((prev) => ({
                      ...prev,
                      roomingNameFontSize: clampRoomingNameFontSize(roomingNameFontSize + 1),
                    }))}
                    disabled={roomingNameFontSize >= 18}
                    style={{
                      height: 34,
                      border: 0,
                      borderInlineStart: "1px solid var(--rooming-modal-section-border)",
                      background: "transparent",
                      color: "var(--rooming-button-text)",
                      fontSize: 18,
                      fontWeight: 900,
                      cursor: roomingNameFontSize >= 18 ? "not-allowed" : "pointer",
                      opacity: roomingNameFontSize >= 18 ? 0.45 : 1,
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setRoomingPrintSettings((prev) => ({
                    ...prev,
                    roomingNameFontSize: ROOMING_PRINT_DEFAULT_SETTINGS.roomingNameFontSize,
                    roomingAutoShrinkLongNames: ROOMING_PRINT_DEFAULT_SETTINGS.roomingAutoShrinkLongNames,
                  }))}
                  style={{
                    border: "1px solid var(--rooming-modal-section-border)",
                    background: "var(--rooming-button-bg)",
                    color: "var(--rooming-button-text)",
                    borderRadius: 9,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontFamily: "'Cairo',sans-serif",
                  }}
                >
                  {roomingPrintLabels.resetDefault}
                </button>
              </div>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "var(--rooming-text)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                <span>{roomingPrintLabels.autoShrinkLongNames}</span>
                <input
                  type="checkbox"
                  checked={roomingAutoShrinkLongNames}
                  onChange={(event) => setRoomingPrintSettings((prev) => ({
                    ...prev,
                    roomingAutoShrinkLongNames: event.target.checked,
                  }))}
                  style={{ width: 17, height: 17, accentColor: "#b99235" }}
                />
              </label>

              <div style={{
                width: "min(100%, 260px)",
                justifySelf: "center",
                border: "1px solid #334155",
                background: "#fff",
                color: "#111827",
                direction: "rtl",
                fontFamily: "'Cairo', sans-serif",
                boxShadow: "0 10px 24px rgba(15,23,42,.08)",
              }}>
                <div style={{
                  minHeight: 30,
                  borderBottom: "1px solid #334155",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "5px 8px",
                  fontSize: 11,
                  fontWeight: 900,
                }}>
                  <span>غرفة رباعية 4/4</span>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 28,
                    height: 18,
                    borderRadius: 999,
                    background: "#fffbeb",
                    border: "1px solid #d9b861",
                    color: "#7c641f",
                    fontSize: 10,
                    fontWeight: 900,
                  }}>
                    4
                  </span>
                </div>
                <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {roomingNamePreviewNames.map((name, index) => {
                    return (
                      <li
                        key={`${name}-${index}`}
                        style={{
                          minHeight: 30,
                          borderTop: index === 0 ? 0 : "1px solid #94a3b8",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "5px 8px",
                          overflow: "hidden",
                        }}
                      >
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          background: "#fef3c7",
                          color: "#111827",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 900,
                          flex: "0 0 auto",
                        }}>
                          {index + 1}
                        </span>
                        <span style={{
                          display: "block",
                          minWidth: 0,
                          flex: "1 1 auto",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "clip",
                          fontSize: roomingNameFontSize,
                          lineHeight: 1.2,
                          fontWeight: 700,
                          textAlign: "right",
                        }}>
                          {name}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>{roomingPrintLabels.layoutMode}</p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 6,
                padding: 4,
                borderRadius: 12,
                background: "var(--rooming-list-bg)",
                border: "1px solid var(--rooming-modal-section-border)",
              }}>
                {roomingPrintLayoutOptions.map((option) => {
                  const active = roomingPrintSettings.layoutMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRoomingPrintSettings((prev) => ({ ...prev, layoutMode: option.value }))}
                      style={{
                        border: active ? "1px solid rgba(37,99,235,.34)" : "1px solid transparent",
                        background: active ? "var(--rooming-button-bg)" : "transparent",
                        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
                        boxShadow: active ? "0 8px 18px rgba(15,23,42,.08)" : "none",
                        borderRadius: 9,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontFamily: "'Cairo',sans-serif",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ color: "var(--rooming-muted)", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                {roomingPrintLabels.layoutHelp}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" onClick={applyRoomingPrintSettings}>
                {roomingPrintLabels.done}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={Boolean(pendingDrop)} onClose={cancelPendingDrop} title={pendingDropCopy?.title || ""} width={520} portalContainer={roomingModalPortalContainer}>
          {pendingDrop && pendingDropCopy && (
            <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: "var(--rooming-text-soft)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                {pendingDropCopy.intro}
              </p>
              {pendingDropCopy.details?.length ? (
                <div style={{ display: "grid", gap: 9, padding: 12, border: "1px solid var(--rooming-modal-section-border)", background: "var(--rooming-modal-section-bg)", borderRadius: 12 }}>
                  {pendingDropCopy.details.map((detail, index) => detail.note ? (
                    <p key={`note-${index}`} style={{ color: "var(--rooming-muted)", fontSize: 12, fontWeight: 800, lineHeight: 1.7, margin: 0 }}>{detail.note}</p>
                  ) : (
                    <div key={`${detail.currentLabel}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 800 }}>{detail.currentLabel}</p>
                        <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 900 }}>{detail.currentValue}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 800 }}>{detail.targetLabel}</p>
                        <p style={{ color: "var(--rooming-button-active-text)", fontSize: 13, fontWeight: 900 }}>{detail.targetValue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingDropCopy.target ? (
                <p style={{ color: "var(--rooming-text-soft)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>{pendingDropCopy.target}</p>
              ) : null}
              {pendingDropCopy.priceSection && (
                <div style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  border: "1px solid rgba(212,175,55,.24)",
                  background: "var(--rukn-gold-dim)",
                  borderRadius: 12,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900 }}>
                      {pendingDropCopy.priceSection.newOfficialLabel}
                    </span>
                    <strong style={{ color: "var(--rooming-text)", fontSize: 14 }}>
                      {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.newOfficialPrice)}
                    </strong>
                  </div>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ color: "var(--rooming-muted)", fontSize: 11, fontWeight: 900 }}>
                      {pendingDropCopy.priceSection.newSaleLabel}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={pendingDropSalePrice}
                      onChange={(event) => setPendingDropSalePrice(event.target.value)}
                      onWheel={preventNumberInputWheelChange}
                      style={{
                        width: "100%",
                        border: "1px solid var(--rooming-input-border)",
                        borderRadius: 9,
                        padding: "8px 10px",
                        background: "var(--rooming-input-bg)",
                        color: "var(--rooming-text)",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "'Cairo',sans-serif",
                        outline: "none",
                      }}
                    />
                  </label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    paddingTop: 2,
                  }}>
                    <div>
                      <p style={{ color: "var(--rooming-muted)", fontSize: 10.5, fontWeight: 800 }}>
                        {pendingDropCopy.priceSection.oldOfficialLabel}
                      </p>
                      <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>
                        {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.oldOfficialPrice)}
                      </p>
                    </div>
                    <div>
                      <p style={{ color: "var(--rooming-muted)", fontSize: 10.5, fontWeight: 800 }}>
                        {pendingDropCopy.priceSection.oldSaleLabel}
                      </p>
                      <p style={{ color: "var(--rooming-text-soft)", fontSize: 12, fontWeight: 900 }}>
                        {pendingDropCopy.priceSection.formatPrice(pendingDropCopy.priceSection.oldSalePrice)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 800, lineHeight: 1.8, margin: 0 }}>
                {pendingDropCopy.question}
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={cancelPendingDrop}>{t.cancel || "إلغاء"}</Button>
                {pendingDropCopy.priceSection && (
                  <Button variant="ghost" onClick={keepPendingDropSalePrice}>
                    {pendingDropCopy.priceSection.keepPrevious}
                  </Button>
                )}
                <Button onClick={confirmPendingDrop}>{pendingDropCopy.primary}</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(largeRoomGenerationConfirm)}
          onClose={cancelLargeRoomGeneration}
          title={largeRoomGenerationCopy.title}
          width={500}
          portalContainer={roomingModalPortalContainer}
        >
          {largeRoomGenerationConfirm && (
            <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                display: "grid",
                gap: 8,
                padding: 14,
                border: "1px solid rgba(212,175,55,.28)",
                background: "var(--rukn-gold-dim)",
                borderRadius: 14,
              }}>
                <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 800, lineHeight: 1.8, margin: 0 }}>
                  {largeRoomGenerationCopy.message}
                </p>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 8,
                  border: "1px solid rgba(212,175,55,.34)",
                  background: "var(--rooming-button-bg)",
                  color: "var(--rooming-text)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}>
                  <LayoutGrid size={14} />
                  <span>{largeRoomGenerationCopy.countLabel}: {largeRoomGenerationConfirm.roomCount}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={cancelLargeRoomGeneration}>
                  {largeRoomGenerationCopy.cancel}
                </Button>
                <Button onClick={confirmLargeRoomGeneration}>
                  {largeRoomGenerationCopy.confirm}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={roomModal.open} onClose={closeRoomModal} title={roomModal.mode === "create" ? (t.addRooms || t.addRoom || "إضافة غرف") : (t.editRoom || "تعديل الغرفة")} width={420} portalContainer={roomingModalPortalContainer}>
          <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select
              label={t.hotel || "الفندق"}
              value={roomDraft.hotel}
              onChange={(event) => setRoomDraftField("hotel", event.target.value)}
              options={roomHotelSelectOptions}
              error={roomDraftErrors.hotel}
              required
              portalContainer={roomingModalPortalContainer}
            />
            <Select
              label={t.roomType}
              value={roomDraft.roomType}
              onChange={(event) => setRoomDraftField("roomType", event.target.value)}
              options={roomTypeSelectOptions}
              error={roomDraftErrors.roomType}
              required
              portalContainer={roomingModalPortalContainer}
            />
            <Select
              label={t.roomCategory || "تصنيف الغرفة"}
              value={roomDraft.category}
              onChange={(event) => setRoomDraftField("category", event.target.value)}
              options={roomCategorySelectOptions}
              error={roomDraftErrors.category}
              required
              portalContainer={roomingModalPortalContainer}
            />
            {roomModal.mode === "create" && (
              <Input
                label={t.roomingRoomCountInput || "عدد الغرف"}
                type="number"
                min="1"
                max="100"
                step="1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={roomDraft.roomCount ?? "1"}
                onWheel={preventNumberInputWheelChange}
                onChange={(event) => {
                  const digits = String(event.target.value || "").replace(/[^\d]/g, "");
                  setRoomDraft((prev) => ({
                    ...prev,
                    roomCount: digits ? String(normalizeRoomCreateCount(digits)) : "",
                  }));
                }}
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={closeRoomModal}>{t.cancel}</Button>
              <Button onClick={saveRoomEdit}>{roomModal.mode === "create" ? (t.addRooms || t.add || "إضافة غرف") : t.save}</Button>
            </div>
          </div>
        </Modal>

        <Modal open={pickerOpen} onClose={() => { setPickerOpen(false); setSelectedPilgrimIds([]); setPickerSearch(""); }} title={t.addPilgrim || "إضافة معتمر"} width={560} portalContainer={roomingModalPortalContainer}>
          <div className="rooming-modal-surface" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              label=""
              value={pickerSearch}
              onChange={(event) => setPickerSearch(event.target.value)}
              placeholder={t.roomingPilgrimSearchPlaceholder || "ابحث بالاسم أو الهاتف أو رقم الجواز..."}
            />
            {!compatibleUnassigned.length ? (
              <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.noCompatiblePilgrims || "لا يوجد معتمرون مناسبون لهذه الغرفة"}</p>
            ) : !filteredCompatibleUnassigned.length ? (
              <p style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.roomingNoMatchingPilgrims || "لا توجد نتائج مطابقة"}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 330, overflow: "auto" }}>
                {filteredCompatibleUnassigned.map(({ client }) => {
                  const context = getClientContext(client);
                  const checked = selectedPilgrimIds.includes(client.id);
                  return (
                    <label key={client.id} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, border: "1px solid var(--rooming-modal-section-border)", background: checked ? "var(--rooming-list-selected-bg)" : "var(--rooming-list-bg)", cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={(event) => setSelectedPilgrimIds((prev) => event.target.checked ? [...prev, client.id] : prev.filter((id) => id !== client.id))} />
                      <span>
                        <strong style={{ display: "block", color: "var(--rooming-text)", fontSize: 13 }}>{context.name}</strong>
                        <small style={{ color: "var(--rooming-muted)" }}>{[context.registrationSource, context.roomTypeLabel, context.level || context.hotel].filter(Boolean).join(" • ")}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => { setPickerOpen(false); setSelectedPilgrimIds([]); }}>{t.cancel}</Button>
              <Button disabled={!selectedPilgrimIds.length} onClick={addSelectedPilgrimsToRoom}>{t.insertSelected || "إدراج المحدد"}</Button>
            </div>
          </div>
        </Modal>
      </GlassCard>
    </div>
  );
}

function RoomingToolbarButton({
  title,
  icon,
  onClick,
  active = false,
  disabled = false,
  children,
  style,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 34,
        height: 34,
        padding: children ? "0 10px" : 0,
        borderRadius: 8,
        border: `1px solid ${active ? "rgba(37,99,235,.32)" : "var(--rooming-toolbar-border)"}`,
        background: active ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
        color: active ? "var(--rooming-button-active-text)" : "var(--rooming-button-text)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background .15s ease, border-color .15s ease, color .15s ease",
        fontFamily: "'Cairo',sans-serif",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function RoomingPrintMenuButton({
  title,
  currentLabel,
  fullLabel,
  loadingLabel,
  disabled = false,
  busy = false,
  onPrint,
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (disabled || busy) setOpen(false);
  }, [busy, disabled]);

  const handleSelect = React.useCallback((mode) => {
    setOpen(false);
    onPrint?.(mode);
  }, [onPrint]);

  return (
    <div
      ref={menuRef}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      <RoomingToolbarButton
        title={title}
        onClick={() => {
          if (!disabled && !busy) setOpen((value) => !value);
        }}
        active={open}
        disabled={disabled || busy}
        icon={<AppIcon name="print" size={15} />}
      >
        <span>{busy ? loadingLabel : title}</span>
        <ChevronDown size={13} />
      </RoomingToolbarButton>
      <RoomingMenu open={open} align="end" width={210} anchorRef={menuRef} portal>
        <RoomingMenuItem
          label={currentLabel}
          icon={<AppIcon name="print" size={14} />}
          onClick={() => handleSelect("single")}
        />
        <RoomingMenuItem
          label={fullLabel}
          icon={<LayoutGrid size={14} />}
          onClick={() => handleSelect("combined")}
        />
      </RoomingMenu>
    </div>
  );
}

function RoomingExportMenuButton({
  title,
  label,
  disabled = false,
  busy = false,
  menuLabels = {},
  onExport,
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleSelect = React.useCallback((format) => {
    setOpen(false);
    onExport?.(format);
  }, [onExport]);

  return (
    <div
      ref={menuRef}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      <RoomingToolbarButton
        title={title}
        onClick={() => {
          if (!disabled) setOpen((value) => !value);
        }}
        active={open}
        disabled={disabled}
        icon={<AppIcon name="download" size={15} />}
      >
        <span>{busy ? menuLabels.loading : label}</span>
        <ChevronDown size={13} />
      </RoomingToolbarButton>
      <RoomingMenu open={open} align="end" width={190} anchorRef={menuRef} portal>
        <RoomingMenuItem
          label={menuLabels.pdf || "PDF"}
          icon={<FileText size={14} />}
          onClick={() => handleSelect("pdf")}
        />
        <RoomingMenuItem
          label={menuLabels.excel || "Excel"}
          icon={<FileSpreadsheet size={14} />}
          onClick={() => handleSelect("excel")}
        />
      </RoomingMenu>
    </div>
  );
}

const RoomingFlowNode = React.memo(function RoomingFlowNode({ data, selected }) {
  const { t, lang } = useLang();
  const room = data.room;
  const accent = getRoomingCategoryAccent(room.category);
  const occupantIds = room.occupantIds || [];
  const capacity = Math.max(1, Number(room.capacity) || getRoomingCapacity(room.roomType));
  const isFull = occupantIds.length === capacity;
  const isDropHovered = Boolean(data.draggingClient && data.hoveredDropRoomId === room.id);
  const dropFeedback = data.draggingClient && data.getDropVisualStatus
    ? data.getDropVisualStatus(data.draggingClient, room)
    : null;
  const dropState = dropFeedback?.state || "";
  const canDrop = dropState === "match";
  const needsDropReview = dropState === "mismatch";
  const cannotDrop = dropState === "invalid";
  const isFullDropTarget = dropState === "full";
  const isInvalidPosition = Boolean(data.dragInvalid);
  const selectionMode = Boolean(data.selectionMode);
  const selectionChecked = Boolean(data.selectionChecked);
  const linkMode = Boolean(data.linkMode);
  const linkActive = Boolean(data.linkActive);
  const dropBorder = isInvalidPosition
    ? "#ef4444"
    : canDrop
      ? "#16a34a"
      : needsDropReview
        ? "#d97706"
        : cannotDrop
          ? "#ef4444"
          : isFullDropTarget
            ? "rgba(100,116,139,.56)"
            : linkActive ? "#2563eb" : selectionChecked ? "#d4af37" : selected ? accent.border : "var(--rooming-card-border)";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const dragHoverDepthRef = React.useRef(0);

  React.useEffect(() => {
    if (data.draggingClient) return;
    dragHoverDepthRef.current = 0;
  }, [data.draggingClient]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = () => setMenuOpen(false);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  return (
    <article
      className="rooming-flow-node"
      title={isInvalidPosition ? (t.invalidRoomOverlap || "لا يمكن وضع غرفة فوق غرفة أخرى") : isDropHovered ? (dropFeedback?.message || t.canInsertPilgrimHere || "يمكن إدراج المعتمر هنا") : undefined}
      onContextMenu={(event) => event.stopPropagation()}
      onDragEnter={(event) => {
        if (!data.draggingClient) return;
        event.preventDefault();
        dragHoverDepthRef.current += 1;
        data.onDropHoverEnter?.(room.id);
      }}
      onDragOver={(event) => {
        if (!data.draggingClient) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        data.onDropHoverEnter?.(room.id);
      }}
      onDragLeave={() => {
        if (!data.draggingClient) return;
        dragHoverDepthRef.current = Math.max(0, dragHoverDepthRef.current - 1);
        if (dragHoverDepthRef.current === 0) data.onDropHoverLeave?.(room.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dragHoverDepthRef.current = 0;
        data.onDropHoverLeave?.(room.id);
        const clientId = event.dataTransfer.getData("application/x-rukn-client-id");
        let clientIds = [];
        try {
          const rawClientIds = event.dataTransfer.getData("application/x-rukn-client-ids");
          const parsed = rawClientIds ? JSON.parse(rawClientIds) : [];
          if (Array.isArray(parsed)) clientIds = parsed.filter(Boolean);
        } catch {
          clientIds = [];
        }
        if (clientIds.length > 1 && data.onDropClients) data.onDropClients(room.id, clientIds, true);
        else if (clientId) data.onDropClient(room.id, clientId, true);
        data.onDragComplete?.();
      }}
      style={{
        width: 250,
        position: "relative",
        background: isInvalidPosition
          ? "var(--rooming-danger-soft-bg)"
          : canDrop
            ? (isDropHovered ? "rgba(22,163,74,.18)" : "rgba(22,163,74,.12)")
            : needsDropReview
              ? (isDropHovered ? "rgba(217,119,6,.13)" : "rgba(217,119,6,.075)")
              : cannotDrop
                ? "var(--rooming-danger-soft-bg)"
                : isFullDropTarget
                  ? "rgba(100,116,139,.09)"
                  : linkActive ? "rgba(37,99,235,.12)" : selectionChecked ? "rgba(212,175,55,.16)" : "var(--rooming-card-bg)",
        border: `1px solid ${dropBorder}`,
        borderRight: `4px solid ${accent.border}`,
        borderRadius: 10,
        outline: isInvalidPosition
          ? "2px solid rgba(239,68,68,.28)"
          : canDrop
            ? (isDropHovered ? "2px solid rgba(22,163,74,.34)" : "1px solid rgba(22,163,74,.18)")
            : needsDropReview
              ? (isDropHovered ? "2px solid rgba(217,119,6,.26)" : "1px solid rgba(217,119,6,.14)")
              : cannotDrop
                ? (isDropHovered ? "2px solid rgba(239,68,68,.30)" : "1px solid rgba(239,68,68,.16)")
                : isFullDropTarget
                  ? (isDropHovered ? "2px solid rgba(100,116,139,.30)" : "1px solid rgba(100,116,139,.16)")
                  : linkActive ? "2px solid rgba(37,99,235,.30)" : selectionChecked ? "2px solid rgba(212,175,55,.34)" : "none",
        boxShadow: isInvalidPosition
          ? "0 18px 40px rgba(239,68,68,.20)"
          : canDrop
          ? (isDropHovered ? "0 18px 40px rgba(22,163,74,.22)" : "0 12px 28px rgba(22,163,74,.13)")
          : needsDropReview
            ? (isDropHovered ? "0 16px 36px rgba(217,119,6,.17)" : "0 10px 24px rgba(217,119,6,.10)")
            : cannotDrop
              ? (isDropHovered ? "0 16px 36px rgba(239,68,68,.18)" : "0 10px 24px rgba(239,68,68,.11)")
              : isFullDropTarget
                ? (isDropHovered ? "0 16px 34px rgba(100,116,139,.16)" : "0 8px 20px rgba(100,116,139,.10)")
                : selectionChecked ? "0 16px 34px rgba(212,175,55,.18)"
                : selected ? "0 14px 30px rgba(37,99,235,.18)" : "var(--rooming-card-shadow)",
        opacity: isFullDropTarget ? 0.78 : 1,
        padding: 12,
        direction: "rtl",
        fontFamily: "'Cairo',sans-serif",
        cursor: selectionMode ? "pointer" : room.locked ? "default" : "grab",
      }}
    >
      <Handle
        className="room-link-handle room-link-source-handle"
        type="source"
        position={Position.Right}
        isConnectable={linkMode}
        style={{
          top: 18,
          right: 9,
          width: 24,
          height: 24,
          borderRadius: 999,
          border: `2px solid ${linkActive ? "rgba(37,99,235,.95)" : "rgba(37,99,235,.72)"}`,
          background: linkMode ? (linkActive ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)") : "transparent",
          boxShadow: linkMode ? "0 0 0 5px rgba(37,99,235,.14), 0 10px 22px rgba(15,23,42,.18)" : "none",
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? "auto" : "none",
          cursor: linkMode ? "crosshair" : "default",
          zIndex: 7,
        }}
      />
      <Handle
        className="room-link-handle room-link-target-handle"
        type="target"
        position={Position.Left}
        isConnectable={linkMode}
        style={{
          top: 18,
          left: 9,
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "2px solid rgba(154,116,24,.72)",
          background: linkMode ? "var(--rooming-button-bg)" : "transparent",
          boxShadow: linkMode ? "0 0 0 5px rgba(212,175,55,.13), 0 10px 22px rgba(15,23,42,.16)" : "none",
          opacity: linkMode ? 1 : 0,
          pointerEvents: linkMode ? "auto" : "none",
          cursor: linkMode ? "crosshair" : "default",
          zIndex: 7,
        }}
      />
      {linkMode && (
        <>
        <span style={{
          position: "absolute",
          top: 8,
          insetInlineEnd: 8,
          width: 24,
          height: 24,
          borderRadius: 999,
          border: `1px solid ${linkActive ? "rgba(37,99,235,.86)" : "rgba(37,99,235,.48)"}`,
          background: linkActive ? "var(--rooming-button-active-bg)" : "var(--rooming-button-bg)",
          color: linkActive ? "var(--rooming-button-active-text)" : "var(--rooming-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 18px rgba(15,23,42,.12)",
          pointerEvents: "none",
          zIndex: 6,
        }}>
          <Link2 size={12} />
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 9,
            insetInlineStart: 9,
            width: 22,
            height: 22,
            borderRadius: 999,
            border: "1px solid rgba(154,116,24,.58)",
            background: "var(--rooming-button-bg)",
            color: "rgba(154,116,24,.92)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 18px rgba(15,23,42,.12)",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "currentColor", boxShadow: "0 0 0 3px rgba(212,175,55,.16)" }} />
        </span>
        </>
      )}
      {selectionMode && (
        <span style={{
          position: "absolute",
          top: 8,
          insetInlineStart: 8,
          width: 20,
          height: 20,
          borderRadius: 999,
          border: `1px solid ${selectionChecked ? "rgba(212,175,55,.95)" : "rgba(148,163,184,.32)"}`,
          background: selectionChecked ? "#d4af37" : "var(--rooming-button-bg)",
          color: selectionChecked ? "#fff" : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 900,
          boxShadow: "0 8px 18px rgba(15,23,42,.14)",
          pointerEvents: "none",
          zIndex: 2,
        }}>
          ✓
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
        <span className="rooming-category-badge" style={{
          "--category-dark-bg": accent.darkBg,
          "--category-dark-text": accent.darkText,
          "--category-dark-border": accent.darkBorder,
          color: accent.text,
          background: accent.bg,
          border: `1px solid ${accent.border}`,
          borderRadius: 999,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 900,
        }}>
          {translateRoomCategory(room.category, lang) || getRoomingCategoryLabel(room.category)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--rooming-text)", fontSize: 12, fontWeight: 900 }}>{occupantIds.length}/{capacity}</span>
          {isFull && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid rgba(34,197,94,.32)",
              background: "rgba(22,163,74,.14)",
              color: "var(--rukn-text)",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 9,
              fontWeight: 900,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#16a34a" }} />
              {t.roomingFullBadge || "مكتملة"}
            </span>
          )}
          {room.locked && <Lock size={13} color="var(--rooming-muted)" title={t.roomLocked || "الغرفة مقفلة"} />}
          <div
            className="nodrag"
            onPointerDown={(event) => event.stopPropagation()}
            style={{ position: "relative" }}
          >
            <button
              type="button"
              title={t.roomActions || "إجراءات الغرفة"}
              aria-label={t.roomActions || "إجراءات الغرفة"}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "1px solid var(--rooming-toolbar-border)",
                background: "var(--rooming-button-bg)",
                color: "var(--rooming-button-text)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <MoreHorizontal size={15} />
            </button>
            <RoomingMenu open={menuOpen} align="end" width={168}>
              <div onPointerDown={(event) => event.stopPropagation()}>
                <RoomingMenuItem
                  label={t.addPilgrim || "إضافة معتمر"}
                  icon={<UserPlus size={14} />}
                  onClick={() => {
                    data.onAdd(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.copyRoom || "نسخ الغرفة"}
                  icon={<Copy size={14} />}
                  onClick={() => {
                    data.onCopy(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={room.locked ? (t.unlockRoom || "فتح الغرفة") : (t.lockRoom || "قفل الغرفة")}
                  icon={room.locked ? <Unlock size={14} /> : <Lock size={14} />}
                  onClick={() => {
                    data.onToggleLock(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.editRoom || "تعديل الغرفة"}
                  icon={<Settings size={14} />}
                  onClick={() => {
                    data.onEdit(room.id);
                    setMenuOpen(false);
                  }}
                />
                <RoomingMenuItem
                  label={t.deleteRoom || "حذف الغرفة"}
                  destructive
                  icon={<Trash2 size={14} />}
                  onClick={() => {
                    data.onDelete(room.id);
                    setMenuOpen(false);
                  }}
                />
              </div>
            </RoomingMenu>
          </div>
        </div>
      </div>
      <p style={{ color: "var(--rooming-text)", fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
        {translateRoomType(room.roomType, lang) || getRoomingRoomLabel(room.roomType)}
      </p>
      <p style={{ color: "var(--rooming-muted)", fontSize: 11, marginBottom: 10 }}>{data.hotelName || t.roomingMissingHotel || "فندق غير محدد"}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 54 }}>
        {occupantIds.map((clientId) => {
          const client = data.clientsById[clientId];
          const source = getRoomCardRegistrationSource(client);
          return (
            <div key={clientId} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              color: "var(--rooming-chip-text)",
              fontSize: 12,
              fontWeight: 800,
              padding: "5px 7px",
              borderRadius: 8,
              border: "1px solid var(--rooming-chip-border)",
              background: "var(--rooming-chip-bg)",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {client ? getClientDisplayName(client, lang) : "—"}
                </span>
                {source && (
                  <span style={{
                    flexShrink: 0,
                    maxWidth: 72,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    border: "1px solid var(--rooming-chip-border)",
                    background: "var(--rooming-source-bg)",
                    color: "var(--rooming-source-text)",
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontSize: 9,
                    fontWeight: 800,
                  }}>
                    {source}
                  </span>
                )}
              </span>
              <button
                type="button"
                title={t.remove || "إزالة"}
                className="nodrag"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onRemoveClient(room.id, clientId);
                }}
                style={{
                  width: 20,
                  height: 20,
                  border: "1px solid var(--rooming-chip-border)",
                  background: "var(--rooming-button-bg)",
                  color: "var(--rooming-muted)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  borderRadius: 7,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        {occupantIds.length < capacity && (
          <span style={{ color: "var(--rooming-muted)", fontSize: 12 }}>{t.emptySlot || "مكان شاغر"}</span>
        )}
      </div>
    </article>
  );
}, (prev, next) => (
  prev.selected === next.selected
  && prev.data.room === next.data.room
  && prev.data.clientsById === next.data.clientsById
  && prev.data.draggingClientId === next.data.draggingClientId
  && prev.data.hoveredDropRoomId === next.data.hoveredDropRoomId
  && prev.data.dragInvalid === next.data.dragInvalid
  && prev.data.selectionMode === next.data.selectionMode
  && prev.data.selectionChecked === next.data.selectionChecked
  && prev.data.linkMode === next.data.linkMode
  && prev.data.linkActive === next.data.linkActive
  && prev.data.onAdd === next.data.onAdd
  && prev.data.onEdit === next.data.onEdit
  && prev.data.onCopy === next.data.onCopy
  && prev.data.onToggleLock === next.data.onToggleLock
  && prev.data.onDelete === next.data.onDelete
  && prev.data.onRemoveClient === next.data.onRemoveClient
  && prev.data.onDropClient === next.data.onDropClient
  && prev.data.onDropClients === next.data.onDropClients
  && prev.data.onDragComplete === next.data.onDragComplete
  && prev.data.onDropHoverEnter === next.data.onDropHoverEnter
  && prev.data.onDropHoverLeave === next.data.onDropHoverLeave
  && prev.data.getDropReason === next.data.getDropReason
  && prev.data.getDropVisualStatus === next.data.getDropVisualStatus
));

function RoomingProximityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isSelected = Boolean(selected || data?.selected);
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {isSelected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            title={data?.deleteLabel || "Delete link"}
            aria-label={data?.deleteLabel || "Delete link"}
            className="nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              data?.onDelete?.(data?.linkId || id);
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              width: 24,
              height: 24,
              borderRadius: 999,
              border: "1px solid var(--rooming-popover-border)",
              background: "var(--rooming-popover-bg)",
              color: "var(--rooming-danger-text)",
              boxShadow: "0 10px 24px rgba(15,23,42,.18)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              cursor: "pointer",
              pointerEvents: "all",
              zIndex: 20,
            }}
          >
            <Trash2 size={13} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const ROOMING_NODE_TYPES = Object.freeze({ room: RoomingFlowNode });
const ROOMING_EDGE_TYPES = Object.freeze({ roomProximity: RoomingProximityEdge });
const ROOMING_EDGES = Object.freeze([]);
const ROOMING_FIT_VIEW_OPTIONS = Object.freeze({ padding: 0.18 });
const ROOMING_PRO_OPTIONS = Object.freeze({ hideAttribution: true });

function getRoomingMenuPortalContainer() {
  if (typeof document === "undefined") return null;
  return document.fullscreenElement
    || document.webkitFullscreenElement
    || document.msFullscreenElement
    || document.body;
}

function RoomingMenu({ open, children, align = "start", width = 220, anchorRef = null, portal = false }) {
  const [position, setPosition] = React.useState(null);
  const menuWidth = Number(width) || 220;

  const updatePosition = React.useCallback(() => {
    if (!portal || !anchorRef?.current || typeof window === "undefined" || typeof document === "undefined") return;
    const portalContainer = getRoomingMenuPortalContainer() || document.body;
    const containerIsBody = portalContainer === document.body;
    const rect = anchorRef.current.getBoundingClientRect();
    const containerRect = containerIsBody
      ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight }
      : portalContainer.getBoundingClientRect();
    const direction = window.getComputedStyle(anchorRef.current).direction || "ltr";
    const alignsToInlineEnd = align === "end";
    const rawLeft = alignsToInlineEnd
      ? (direction === "rtl" ? rect.left : rect.right - menuWidth)
      : (direction === "rtl" ? rect.right - menuWidth : rect.left);
    const minLeft = containerRect.left + 8;
    const maxLeft = Math.max(minLeft, containerRect.right - menuWidth - 8);
    const left = Math.min(
      Math.max(minLeft, rawLeft),
      maxLeft
    );
    const top = Math.max(containerRect.top + 8, rect.bottom + 8);
    setPosition({
      left: containerIsBody ? left : left - containerRect.left,
      top: containerIsBody ? top : top - containerRect.top,
      direction,
      strategy: containerIsBody ? "fixed" : "absolute",
    });
  }, [align, anchorRef, menuWidth, portal]);

  React.useLayoutEffect(() => {
    if (!open || !portal) return undefined;
    updatePosition();
    const handleUpdate = () => updatePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    document.addEventListener("fullscreenchange", handleUpdate);
    document.addEventListener("webkitfullscreenchange", handleUpdate);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      document.removeEventListener("fullscreenchange", handleUpdate);
      document.removeEventListener("webkitfullscreenchange", handleUpdate);
    };
  }, [open, portal, updatePosition]);

  if (!open) return null;
  const menu = (
    <div
      className="rooming-menu-panel"
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: portal ? (position?.strategy || "fixed") : "absolute",
        ...(portal
          ? {
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            direction: position?.direction || undefined,
          }
          : {
            top: "calc(100% + 8px)",
            [align === "end" ? "insetInlineEnd" : "insetInlineStart"]: 0,
          }),
        width: menuWidth,
        background: "var(--rooming-popover-bg, #ffffff)",
        border: "1px solid var(--rooming-popover-border, rgba(148,163,184,.22))",
        borderRadius: 12,
        boxShadow: "var(--rooming-popover-shadow, 0 18px 42px rgba(15,23,42,.16))",
        padding: 6,
        zIndex: portal ? 2147483600 : 30,
      }}
    >
      {children}
    </div>
  );
  if (!portal || !anchorRef?.current || typeof document === "undefined") return menu;
  return createPortal(menu, getRoomingMenuPortalContainer() || document.body);
}

function RoomingMenuItem({ label, onClick, icon, destructive = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rooming-menu-item"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: 0,
        borderRadius: 8,
        background: active ? "var(--rooming-button-active-bg, rgba(37,99,235,.08))" : "transparent",
        color: destructive ? "var(--rooming-danger-text, #b91c1c)" : active ? "var(--rooming-button-active-text, #2563eb)" : "var(--rooming-button-text, #334155)",
        padding: "8px 9px",
        cursor: "pointer",
        textAlign: "start",
        fontFamily: "'Cairo',sans-serif",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RoomingFlowSurface({
  nodes,
  edges = ROOMING_EDGES,
  onNodesChange,
  selectedRoomId,
  onNodeClick,
  onConnect,
  onConnectStart,
  onConnectEnd,
  isValidConnection,
  onEdgeClick,
  onEdgeContextMenu,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  onPaneContextMenu,
  onPaneClick,
  onInit,
  panelOpen,
  linkMode = false,
  nodesDraggable = true,
  panOnDrag = true,
}) {
  const flow = useReactFlow();

  React.useEffect(() => {
    onInit?.(flow);
  }, [flow, onInit]);

  return (
    <ReactFlow
      className="rooming-flow-canvas"
      nodes={nodes}
      edges={edges}
      nodeTypes={ROOMING_NODE_TYPES}
      edgeTypes={ROOMING_EDGE_TYPES}
      fitView
      fitViewOptions={ROOMING_FIT_VIEW_OPTIONS}
      minZoom={0.35}
      maxZoom={1.6}
      panOnDrag={panOnDrag}
      zoomOnScroll
      zoomOnPinch
      nodesDraggable={nodesDraggable}
      onlyRenderVisibleElements
      nodeDragThreshold={2}
      nodesConnectable={linkMode}
      connectOnClick={false}
      connectionLineStyle={{
        stroke: "var(--rooming-link-selected)",
        strokeWidth: 1.8,
      }}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      isValidConnection={isValidConnection}
      elementsSelectable
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onEdgeContextMenu={onEdgeContextMenu}
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onPaneContextMenu={onPaneContextMenu}
      onPaneClick={onPaneClick}
      proOptions={ROOMING_PRO_OPTIONS}
      style={{ width: "100%", height: "100%", background: "var(--rooming-canvas-bg)" }}
    >
      <Background variant="dots" color="var(--rooming-canvas-dot)" gap={22} size={1.55} />
      <Controls position="bottom-left" showInteractive={false} />
      <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={2} nodeColor="var(--rooming-button-active-text)" maskColor="var(--rooming-minimap-mask)" />
    </ReactFlow>
  );
}

function RoomingSheetWorkspace({ program, clients, packages, agency, onToast }) {
  const { lang } = useLang();
  const [city, setCity] = React.useState("makkah");
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [borderMenuOpen, setBorderMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCell, setSelectedCell] = React.useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = React.useState([0, 0, 0, 0]);
  const [selectionUi, setSelectionUi] = React.useState({
    merged: false,
    bold: false,
    italic: false,
    align: "right",
    wrap: false,
  });
  const [zoom, setZoom] = React.useState(100);
  const [fontSize, setFontSize] = React.useState(13);
  const [viewportTick, setViewportTick] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [metaTick, setMetaTick] = React.useState(0);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [roomModal, setRoomModal] = React.useState({ open: false, mode: "create", roomId: null });
  const [roomDraft, setRoomDraft] = React.useState({
    roomNumber: "",
    roomType: "double",
    category: "male_only",
    hotel: "",
  });
  const [roomPickerState, setRoomPickerState] = React.useState({ open: false, roomId: null });
  const [selectedPilgrimIds, setSelectedPilgrimIds] = React.useState([]);
  const hostRef = React.useRef(null);
  const gridViewportRef = React.useRef(null);
  const sheetRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const metaRef = React.useRef(normalizeRoomingMeta({}));
  const insertClientsRef = React.useRef(null);
  const uninsertedClientsRef = React.useRef([]);
  const workspaceRef = React.useRef(null);
  const selectedCellRef = React.useRef({ x: 0, y: 0 });
  const selectedRangeRef = React.useRef([0, 0, 0, 0]);
  const viewportSizeRef = React.useRef({ width: 0, height: 0 });

  const storageKey = React.useMemo(
    () => `rukn_rooming_sheet_${program.id}_${city}`,
    [program.id, city]
  );

  const packageByLevel = React.useMemo(() => {
    const map = new Map();
    packages.forEach(pkg => map.set(pkg.level, pkg));
    return map;
  }, [packages]);
  const roomHotelOptions = React.useMemo(
    () => getProgramHotelsForCity(program, packages, city),
    [program, packages, city]
  );

  const readStoredSheet = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return createRoomingHeaderSheet({ program, clients, city, agency, lang });
      const parsed = JSON.parse(raw);
      return {
        version: parsed.version || 2,
        data: normalizeSheetData(parsed.data),
        style: parsed.style || {},
        mergeCells: parsed.mergeCells || {},
        meta: normalizeRoomingMeta(parsed.meta),
      };
    } catch {
      return createRoomingHeaderSheet({ program, clients, city, agency, lang });
    }
  }, [storageKey, program, clients, city, agency, lang]);

  const captureSheet = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return null;
    return {
      version: 2,
      data: normalizeSheetData(sheet.getData(false, false)),
      style: sheet.getStyle?.() || {},
      mergeCells: sheet.getMerge?.() || {},
      meta: normalizeRoomingMeta(metaRef.current),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const saveSheet = React.useCallback((notify = true) => {
    const payload = captureSheet();
    if (!payload) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setDirty(false);
      setSavedAt(new Date());
      if (notify) onToast?.("تم حفظ ورقة التسكين محليًا", "success");
    } catch {
      onToast?.("تعذر حفظ ورقة التسكين محليًا", "error");
    }
  }, [captureSheet, storageKey, onToast]);

  const scheduleSave = React.useCallback(() => {
    setDirty(true);
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => saveSheet(false), 900);
  }, [saveSheet]);

  const clearCellFormatting = React.useCallback((sheet, cell) => {
    if (!sheet || !cell) return;
    [
      "background-color",
      "color",
      "font-weight",
      "font-style",
      "text-align",
      "border",
      "border-top",
      "border-bottom",
      "border-left",
      "border-right",
    ].forEach(prop => sheet.setStyle(cell, prop, "", true));
  }, []);

  const normalizeSelectionRange = React.useCallback((rangeLike, fallback = selectedRangeRef.current) => {
    if (!Array.isArray(rangeLike) || rangeLike.length < 4) return fallback;
    const normalized = rangeLike.slice(0, 4).map((value) => Number(value));
    if (normalized.some((value) => !Number.isFinite(value) || value < 0)) return fallback;
    return normalized;
  }, []);

  const syncSelectionState = React.useCallback((rangeLike) => {
    const range = getRangeBounds(normalizeSelectionRange(rangeLike));
    const nextRange = [range.minX, range.minY, range.maxX, range.maxY];
    selectedRangeRef.current = nextRange;
    selectedCellRef.current = { x: range.minX, y: range.minY };
    setSelectedRange(nextRange);
    setSelectedCell({ x: range.minX, y: range.minY });

    const sheet = sheetRef.current;
    if (!sheet) return nextRange;
    const styleMap = sheet.getStyle?.() || {};
    const activeCell = getCellName(range.minX, range.minY);
    const styles = parseStyleValue(styleMap[activeCell]);
    const merges = sheet.getMerge?.() || {};
    const merged = Object.entries(merges).some(([cell, spans]) => {
      const coords = getCellCoords(cell);
      if (!coords) return false;
      const maxX = coords.x + Math.max(1, Number(spans?.[0]) || 1) - 1;
      const maxY = coords.y + Math.max(1, Number(spans?.[1]) || 1) - 1;
      return range.minX >= coords.x && range.minX <= maxX && range.minY >= coords.y && range.minY <= maxY;
    });
    setSelectionUi({
      merged,
      bold: String(styles["font-weight"] || "").includes("700") || String(styles["font-weight"] || "").includes("bold"),
      italic: String(styles["font-style"] || "").includes("italic"),
      align: styles["text-align"] || "right",
      wrap: String(styles["white-space"] || "").includes("pre-wrap"),
    });
    const nextFontSize = Number.parseInt(String(styles["font-size"] || ""), 10);
    if (Number.isFinite(nextFontSize)) setFontSize(nextFontSize);
    return nextRange;
  }, [normalizeSelectionRange]);

  const getCurrentSelection = React.useCallback(() => {
    return selectedRangeRef.current || [0, 0, 0, 0];
  }, []);

  const refreshSelectionFromSheet = React.useCallback(() => {
    const live = normalizeSelectionRange(sheetRef.current?.getSelection?.(), null);
    if (!live) return getCurrentSelection();
    return syncSelectionState(live);
  }, [getCurrentSelection, normalizeSelectionRange, syncSelectionState]);

  const getLiveSelection = React.useCallback(() => {
    return getCurrentSelection();
  }, [getCurrentSelection]);

  const rememberCellFromEvent = React.useCallback((event) => {
    const cell = event.target?.closest?.("td[data-x][data-y]");
    if (!cell) return;
    const x = Number(cell.getAttribute("data-x"));
    const y = Number(cell.getAttribute("data-y"));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return;
    syncSelectionState([x, y, x, y]);
  }, [syncSelectionState]);

  const getActiveCell = React.useCallback(() => {
    const range = getLiveSelection();
    return { x: range?.[0] ?? selectedCellRef.current.x, y: range?.[1] ?? selectedCellRef.current.y };
  }, [getLiveSelection]);

  const getActiveMerge = React.useCallback((rangeLike) => {
    const range = getRangeBounds(rangeLike || getLiveSelection());
    const merges = sheetRef.current?.getMerge?.() || {};
    return Object.entries(merges).find(([cell, spans]) => {
      const coords = getCellCoords(cell);
      if (!coords) return false;
      const maxX = coords.x + Math.max(1, Number(spans?.[0]) || 1) - 1;
      const maxY = coords.y + Math.max(1, Number(spans?.[1]) || 1) - 1;
      return range.minX >= coords.x && range.minX <= maxX && range.minY >= coords.y && range.minY <= maxY;
    }) || null;
  }, [getLiveSelection]);

  const applyFormattingToRange = React.useCallback((styleMap, rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    forEachCellInBounds(bounds, (_x, _y, cell) => {
      Object.entries(styleMap).forEach(([prop, value]) => {
        sheet.setStyle(cell, prop, value, true);
      });
    });
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  const clearRangeFormatting = React.useCallback((rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    forEachCellInBounds(bounds, (_x, _y, cell) => clearCellFormatting(sheet, cell));
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, clearCellFormatting, scheduleSave, syncSelectionState]);

  const applyBorder = React.useCallback((mode, rangeLike) => {
    const sheet = sheetRef.current;
    if (!sheet || !mode) return;
    const range = rangeLike || getLiveSelection();
    const bounds = getRangeBounds(range);
    const setBorder = (cell, side, value = ROOMING_BORDER) => {
      sheet.setStyle(cell, `border-${side}`, value, true);
    };
    forEachCellInBounds(bounds, (x, y, cell) => {
      if (mode === "remove") {
        ["top", "bottom", "left", "right"].forEach(side => setBorder(cell, side, "none"));
        return;
      }
      if (mode === "all") {
        ["top", "bottom", "left", "right"].forEach(side => setBorder(cell, side));
        return;
      }
      if (mode === "outer") {
        if (y === bounds.minY) setBorder(cell, "top");
        if (y === bounds.maxY) setBorder(cell, "bottom");
        if (x === bounds.minX) setBorder(cell, "left");
        if (x === bounds.maxX) setBorder(cell, "right");
        return;
      }
      if (mode === "inner") {
        if (x < bounds.maxX) setBorder(cell, "right");
        if (y < bounds.maxY) setBorder(cell, "bottom");
        return;
      }
      if (mode === "top" && y === bounds.minY) setBorder(cell, "top");
      if (mode === "bottom" && y === bounds.maxY) setBorder(cell, "bottom");
      if (mode === "left" && x === bounds.minX) setBorder(cell, "left");
      if (mode === "right" && x === bounds.maxX) setBorder(cell, "right");
    });
    scheduleSave();
    syncSelectionState(range);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  React.useEffect(() => () => window.clearTimeout(saveTimerRef.current), []);

  React.useEffect(() => {
    if (!sheetRef.current) return;
    if (searchQuery.trim()) sheetRef.current.search(searchQuery.trim());
    else sheetRef.current.resetSearch?.();
  }, [searchQuery, refreshKey]);

  React.useEffect(() => {
    if (!moreMenuOpen && !borderMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (workspaceRef.current?.contains(event.target)) return;
      setMoreMenuOpen(false);
      setBorderMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [moreMenuOpen, borderMenuOpen]);

  React.useEffect(() => {
    if (!fullscreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const payload = readStoredSheet();
    metaRef.current = normalizeRoomingMeta(payload.meta);
    host.innerHTML = "";

    const colCount = Math.max(ROOMING_COLS, payload.data?.[0]?.length || 0);
    const rowCount = Math.max(ROOMING_ROWS, payload.data?.length || 0);
    const columns = Array.from({ length: colCount }, (_, i) => ({
      type: "text",
      title: getColumnName(i),
      width: i === 0 ? ROOMING_BASE_FIRST_COL_WIDTH : ROOMING_BASE_CELL_WIDTH,
      wordWrap: true,
    }));
    const buildContextMenu = (instance, colIndex, rowIndex, event, _items, role) => {
      const col = Number(colIndex);
      const row = Number(rowIndex);
      const setSelectionFromRole = () => {
        if (Number.isFinite(col) && Number.isFinite(row)) {
          instance.updateSelectionFromCoords(col, row, col, row);
          syncSelectionState([col, row, col, row]);
        }
      };
      const clearRow = () => {
        const data = normalizeSheetData(instance.getData(false, false));
        const cols = data[0]?.length || ROOMING_COLS;
        for (let x = 0; x < cols; x += 1) instance.setValueFromCoords(x, row, "", true);
        scheduleSave();
      };
      const clearColumn = () => {
        const data = normalizeSheetData(instance.getData(false, false));
        for (let y = 0; y < data.length; y += 1) instance.setValueFromCoords(col, y, "", true);
        scheduleSave();
      };
      const clearCellRange = () => {
        const range = Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection();
        const bounds = getRangeBounds(range);
        forEachCellInBounds(bounds, (x, y) => instance.setValueFromCoords(x, y, "", true));
        scheduleSave();
        syncSelectionState(range);
      };
      const clearFormatRange = () => {
        const range = Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection();
        const bounds = getRangeBounds(range);
        forEachCellInBounds(bounds, (_x, _y, cell) => clearCellFormatting(instance, cell));
        scheduleSave();
        syncSelectionState(range);
      };

      if (role === "header") {
        return [
          { title:"إدراج عمود قبل", onclick:() => { instance.insertColumn(1, col, true); scheduleSave(); } },
          { title:"إدراج عمود بعد", onclick:() => { instance.insertColumn(1, col, false); scheduleSave(); } },
          { title:"حذف العمود", onclick:() => { instance.deleteColumn(col, 1); scheduleSave(); } },
          { title:"مسح العمود", onclick:clearColumn },
          { title:"عرض العمود", onclick:() => {
            const nextWidth = Number(window.prompt("عرض العمود بالبكسل", "140"));
            if (Number.isFinite(nextWidth) && nextWidth > 30) {
              instance.setWidth(col, nextWidth);
              scheduleSave();
            }
          } },
        ];
      }
      if (role === "row") {
        return [
          { title:"إدراج صف أعلى", onclick:() => { instance.insertRow(1, row, true); scheduleSave(); } },
          { title:"إدراج صف أسفل", onclick:() => { instance.insertRow(1, row, false); scheduleSave(); } },
          { title:"حذف الصف", onclick:() => { instance.deleteRow(row, 1); scheduleSave(); } },
          { title:"مسح الصف", onclick:clearRow },
          { title:"ارتفاع الصف", onclick:() => {
            const nextHeight = Number(window.prompt("ارتفاع الصف بالبكسل", "36"));
            if (Number.isFinite(nextHeight) && nextHeight > 18) {
              instance.setHeight(row, nextHeight);
              scheduleSave();
            }
          } },
        ];
      }
      if (role === "cell" || role === "grid") {
        return [
          { title:"مسح المحتوى", onclick:() => { setSelectionFromRole(); clearCellRange(); } },
          { title:"مسح التنسيق", onclick:() => { setSelectionFromRole(); clearFormatRange(); } },
          { title:"كل الحدود", onclick:() => { setSelectionFromRole(); applyBorder("all", Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"إزالة الحدود", onclick:() => { setSelectionFromRole(); applyBorder("remove", Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"تلوين ذهبي", onclick:() => { setSelectionFromRole(); applyFormattingToRange({ "background-color": "#fef3c7", color: "#111827" }, Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection()); } },
          { title:"دمج الخلايا", onclick:() => { setSelectionFromRole(); instance.setMerge(); scheduleSave(); } },
          { title:"إلغاء الدمج", onclick:() => {
            const merge = getActiveMerge(Number.isFinite(col) && Number.isFinite(row) ? [col, row, col, row] : getLiveSelection());
            try { if (merge) instance.removeMerge(merge[0]); scheduleSave(); } catch {}
          } },
          { title:"إدراج المعتمرين هنا", onclick:() => {
            setSelectionFromRole();
            insertClientsRef.current?.(uninsertedClientsRef.current, true);
          } },
        ];
      }
      return null;
    };
    const handleSheetMouseUp = () => window.requestAnimationFrame(refreshSelectionFromSheet);

    let workbook;
    try {
      workbook = jspreadsheet(host, {
        about: false,
        contextMenu: buildContextMenu,
        worksheets: [{
          data: payload.data,
          columns,
          minDimensions: [colCount, rowCount],
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: 620,
          defaultRowHeight: ROOMING_BASE_ROW_HEIGHT,
          wordWrap: true,
          columnSorting: false,
          filters: false,
          allowInsertColumn: true,
          allowInsertRow: true,
          allowDeleteColumn: true,
          allowDeleteRow: true,
          mergeCells: payload.mergeCells,
          style: payload.style,
          onchange: scheduleSave,
          onchangestyle: scheduleSave,
          onmerge: scheduleSave,
          onselection: (_instance, x1, y1, x2, y2) => {
            syncSelectionState(normalizeSelectionRange([x1, y1, x2 ?? x1, y2 ?? y1]));
          },
        }],
      });
      sheetRef.current = Array.isArray(workbook) ? workbook[0] : workbook?.[0] || workbook;
      syncSelectionState([0, 0, 0, 0]);
      host.addEventListener("mousedown", rememberCellFromEvent, true);
      host.addEventListener("mouseup", handleSheetMouseUp, true);
      host.addEventListener("keyup", refreshSelectionFromSheet, true);
      setDirty(false);
      setSavedAt(null);
    } catch (err) {
      console.error("[RoomingSheet] init failed:", err);
      onToast?.("تعذر فتح ورقة التسكين", "error");
    }

    return () => {
      window.clearTimeout(saveTimerRef.current);
      host.removeEventListener("mousedown", rememberCellFromEvent, true);
      host.removeEventListener("mouseup", handleSheetMouseUp, true);
      host.removeEventListener("keyup", refreshSelectionFromSheet, true);
      try { if (host) jspreadsheet.destroy(host); } catch {}
      if (host) host.innerHTML = "";
      sheetRef.current = null;
    };
  }, [readStoredSheet, refreshKey, scheduleSave, onToast, syncSelectionState, normalizeSelectionRange, getLiveSelection, applyBorder, clearCellFormatting, applyFormattingToRange, getActiveMerge, rememberCellFromEvent, refreshSelectionFromSheet]);

  const insertedClientIds = React.useMemo(() => {
    const inserted = metaRef.current?.insertedClients || {};
    return new Set(Object.keys(inserted));
  }, [city, metaTick, dirty, savedAt]);

  const uninsertedClients = clients.filter(client => !insertedClientIds.has(client.id));
  uninsertedClientsRef.current = uninsertedClients;

  const getClientContext = React.useCallback((client) => {
    const level = client.packageLevel || client.hotelLevel || "";
    const pkg = packageByLevel.get(level);
    const hotel = city === "makkah"
      ? (client.hotelMecca || pkg?.hotelMecca || program.hotelMecca || "")
      : (client.hotelMadina || pkg?.hotelMadina || program.hotelMadina || "");
    const roomTypeKey = client.roomType || "";
    return {
      name: getClientDisplayName(client, lang),
      level,
      roomType: client.roomTypeLabel || getRoomTypeLabel(roomTypeKey) || roomTypeKey || "",
      roomTypeKey,
      phone: client.phone || "",
      hotel,
      gender: client.gender || "",
      genderLabel: client.gender === "male" ? "ذكر" : client.gender === "female" ? "أنثى" : "",
      familyKey: getRoomingFamilyKey(client),
    };
  }, [city, lang, packageByLevel, program]);

  const clientsById = React.useMemo(
    () => Object.fromEntries(clients.map((client) => [client.id, client])),
    [clients]
  );

  const getRooms = React.useCallback(() => metaRef.current?.rooms || {}, []);

  const getRoomById = React.useCallback((roomId) => {
    if (!roomId) return null;
    return getRooms()[roomId] || null;
  }, [getRooms]);

  const getRoomFromSelection = React.useCallback((rangeLike) => {
    const range = getRangeBounds(rangeLike || getLiveSelection());
    return Object.values(getRooms()).find((room) => isCoordsInsideRoom(room, range.minX, range.minY)) || null;
  }, [getLiveSelection, getRooms]);

  const selectedRoom = React.useMemo(
    () => getRoomFromSelection(selectedRange),
    [getRoomFromSelection, selectedRange, metaTick, city]
  );

  const setRoomMeta = React.useCallback((updater) => {
    const current = normalizeRoomingMeta(metaRef.current);
    const next = typeof updater === "function" ? updater(current) : normalizeRoomingMeta(updater);
    metaRef.current = normalizeRoomingMeta(next);
    setMetaTick((value) => value + 1);
  }, []);

  const clearRoomArea = React.useCallback((room) => {
    const sheet = sheetRef.current;
    if (!sheet || !room) return;
    const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
    const height = Number(room.height) || getRoomBlockHeight(room.capacity);
    clearRoomBlockMerges(sheet, room);
    for (let y = room.startY; y < room.startY + height; y += 1) {
      for (let x = room.startX; x < room.startX + width; x += 1) {
        const cell = getCellName(x, y);
        sheet.setValueFromCoords(x, y, "", true);
        [
          "background-color",
          "color",
          "font-weight",
          "font-style",
          "text-align",
          "font-size",
          "white-space",
          "overflow-wrap",
          "word-break",
          "border-top",
          "border-right",
          "border-bottom",
          "border-left",
        ].forEach((prop) => sheet.setStyle(cell, prop, "", true));
      }
    }
  }, []);

  const renderRoom = React.useCallback((room) => {
    const sheet = sheetRef.current;
    if (!sheet || !room) return;
    renderStructuredRoomBlock(sheet, room, clientsById);
  }, [clientsById]);

  const getNextRoomNumber = React.useCallback(() => {
    const values = Object.values(getRooms())
      .map((room) => Number(String(room.roomNumber || "").replace(/[^\d]/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    return String((values.length ? Math.max(...values) : 0) + 1).padStart(2, "0");
  }, [getRooms]);

  const getRoomCompatibleClients = React.useCallback((room) => {
    if (!room) return [];
    const occupants = (room.occupantIds || []).map((id) => clientsById[id]).filter(Boolean);
    const occupantGenders = new Set(occupants.map((client) => client.gender).filter(Boolean));
    const occupantFamilyKeys = new Set(occupants.map((client) => getRoomingFamilyKey(client)).filter(Boolean));
    return uninsertedClientsRef.current.filter((client) => {
      const context = getClientContext(client);
      if (room.category === "male_only" && context.gender !== "male") return false;
      if (room.category === "female_only" && context.gender !== "female") return false;
      if (room.hotel && context.hotel && room.hotel !== context.hotel) return false;
      if (room.category === "family" && occupants.length) {
        if (!occupantGenders.size || occupantGenders.has(context.gender)) return true;
        const familyKey = context.familyKey;
        if (!familyKey) return false;
        if (!occupantFamilyKeys.size) return false;
        return occupantFamilyKeys.has(familyKey);
      }
      return true;
    }).sort((left, right) => {
      const leftExact = left.roomType === room.roomType ? 1 : 0;
      const rightExact = right.roomType === room.roomType ? 1 : 0;
      if (leftExact !== rightExact) return rightExact - leftExact;
      return getClientDisplayName(left, lang).localeCompare(getClientDisplayName(right, lang), lang === "fr" ? "fr" : lang === "en" ? "en" : "ar");
    });
  }, [clientsById, getClientContext, lang]);

  const pickerRoom = roomPickerState.open ? getRoomById(roomPickerState.roomId) : null;
  const compatiblePilgrims = React.useMemo(
    () => getRoomCompatibleClients(pickerRoom),
    [getRoomCompatibleClients, pickerRoom, metaTick, city]
  );

  const findEmptyCell = React.useCallback((startX, startY) => {
    const sheet = sheetRef.current;
    const data = normalizeSheetData(sheet?.getData(false, false));
    const rowCount = data.length;
    const colCount = data[0]?.length || ROOMING_COLS;
    for (let y = Math.max(0, startY); y < rowCount; y += 1) {
      for (let x = y === startY ? Math.max(0, startX) : 0; x < colCount; x += 1) {
        const value = String(data[y]?.[x] || "").trim();
        if (!value || /^اسم\s*\d+$/i.test(value)) return { x, y };
      }
    }
    return { x: 0, y: Math.max(0, rowCount - 1) };
  }, []);

  const insertClients = React.useCallback((items, useSelection = true) => {
    const sheet = sheetRef.current;
    if (!sheet || !items.length) return;
    let cursor = useSelection ? getActiveCell() : findEmptyCell(0, 4);
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const inserted = { ...currentMeta.insertedClients };

    items.forEach((client, index) => {
      cursor = index === 0 && useSelection ? cursor : findEmptyCell(cursor.x, cursor.y + (index ? 1 : 0));
      const context = getClientContext(client);
      const value = [
        context.name,
        [context.level, context.roomType].filter(Boolean).join(" / "),
        context.phone,
        context.hotel,
      ].filter(Boolean).join("\n");
      const cellName = getCellName(cursor.x, cursor.y);
      sheet.setValueFromCoords(cursor.x, cursor.y, value, true);
      sheet.setMeta(cellName, "clientId", client.id);
      sheet.setMeta(cellName, "city", city);
      sheet.setMeta(cellName, "packageLevel", context.level);
      sheet.setMeta(cellName, "roomType", context.roomType);
      sheet.setMeta(cellName, "hotel", context.hotel);
      sheet.setStyle(cellName, "background-color", ROOMING_COLORS[index % ROOMING_COLORS.length], true);
      sheet.setStyle(cellName, "color", "#111827", true);
      sheet.setStyle(cellName, "font-weight", "700", true);
      inserted[client.id] = {
        cell: cellName,
        city,
        name: context.name,
        packageLevel: context.level,
        roomType: context.roomType,
        hotel: context.hotel,
        roomId: null,
        insertedAt: new Date().toISOString(),
      };
    });

    metaRef.current = { ...currentMeta, insertedClients: inserted };
    scheduleSave();
    syncSelectionState([cursor.x, cursor.y, cursor.x, cursor.y]);
    setMetaTick(k => k + 1);
    onToast?.(`تم إدراج ${items.length} معتمر في ورقة التسكين`, "success");
  }, [city, getActiveCell, findEmptyCell, getClientContext, scheduleSave, onToast, syncSelectionState]);
  insertClientsRef.current = insertClients;

  const openCreateRoomModal = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const activeCell = getActiveCell();
    if (!Number.isFinite(activeCell?.x) || !Number.isFinite(activeCell?.y)) {
      onToast?.("اختر خلية أولا لإنشاء الغرفة", "info");
      return;
    }
    if (getRoomFromSelection([activeCell.x, activeCell.y, activeCell.x, activeCell.y])) {
      onToast?.("الموضع المحدد يحتوي على غرفة بالفعل", "info");
      return;
    }
    setRoomDraft({
      roomNumber: getNextRoomNumber(),
      roomType: "double",
      category: "male_only",
      hotel: roomHotelOptions[0] || (city === "makkah" ? program.hotelMecca || "" : program.hotelMadina || ""),
    });
    setRoomModal({ open: true, mode: "create", roomId: null });
  }, [getActiveCell, getNextRoomNumber, roomHotelOptions, city, program, onToast, getRoomFromSelection]);

  const openEditRoomModal = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لتعديلها", "info");
      return;
    }
    setRoomDraft({
      roomNumber: room.roomNumber || "",
      roomType: room.roomType || "double",
      category: room.category || "male_only",
      hotel: room.hotel || "",
    });
    setRoomModal({ open: true, mode: "edit", roomId: room.id });
  }, [selectedRoom, onToast]);

  const upsertRoom = React.useCallback(() => {
    const activeCell = getActiveCell();
    const roomType = roomDraft.roomType || "double";
    const capacity = getRoomingCapacity(roomType);
    const category = roomDraft.category || "male_only";
    const hotel = String(roomDraft.hotel || "").trim();
    const roomNumber = String(roomDraft.roomNumber || "").trim();
    if (!roomNumber) {
      onToast?.("يرجى إدخال رقم الغرفة", "error");
      return;
    }
    if (!hotel) {
      onToast?.("يرجى اختيار الفندق", "error");
      return;
    }
    const existing = roomModal.mode === "edit" ? getRoomById(roomModal.roomId) : null;
    const startX = existing ? existing.startX : activeCell.x;
    const startY = existing ? existing.startY : activeCell.y;
    const nextRoom = {
      ...(existing || {}),
      id: existing?.id || createRoomId(),
      city,
      startX,
      startY,
      width: ROOMING_BLOCK_WIDTH,
      roomNumber,
      roomType,
      category,
      hotel,
      capacity,
      height: getRoomBlockHeight(capacity),
      occupantIds: Array.isArray(existing?.occupantIds) ? existing.occupantIds.slice(0, capacity) : [],
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const nextInserted = { ...normalizeRoomingMeta(metaRef.current).insertedClients };
    let removedCount = 0;
    if (existing && (existing.category !== category || existing.capacity !== capacity)) {
      const kept = [];
      (nextRoom.occupantIds || []).forEach((clientId) => {
        const client = clientsById[clientId];
        if (!client) return;
        if (category === "male_only" && client.gender !== "male") {
          delete nextInserted[clientId];
          removedCount += 1;
          return;
        }
        if (category === "female_only" && client.gender !== "female") {
          delete nextInserted[clientId];
          removedCount += 1;
          return;
        }
        if (kept.length < capacity) kept.push(clientId);
        else {
          delete nextInserted[clientId];
          removedCount += 1;
        }
      });
      nextRoom.occupantIds = kept;
    }

    if (existing) clearRoomArea(existing);
    setRoomMeta((current) => ({
      ...current,
      insertedClients: nextInserted,
      rooms: {
        ...current.rooms,
        [nextRoom.id]: nextRoom,
      },
    }));
    renderRoom(nextRoom);
    scheduleSave();
    setRoomModal({ open: false, mode: "create", roomId: null });
    if (removedCount) {
      if (category === "male_only") onToast?.("تم نقل المعتمرات غير المتوافقات إلى غير المدرجين", "info");
      else if (category === "female_only") onToast?.("تم نقل المعتمرين غير المتوافقين إلى غير المدرجين", "info");
    } else {
      onToast?.(existing ? "تم تحديث الغرفة" : "تم إنشاء الغرفة", "success");
    }
  }, [getActiveCell, roomDraft, roomModal, getRoomById, city, clientsById, clearRoomArea, setRoomMeta, renderRoom, scheduleSave, onToast]);

  const deleteRoom = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لحذفها", "info");
      return;
    }
    if (!window.confirm(`سيتم حذف الغرفة ${room.roomNumber || ""} وإرجاع المعتمرين إلى غير المدرجين. هل تريد المتابعة؟`)) return;
    const nextInserted = { ...normalizeRoomingMeta(metaRef.current).insertedClients };
    (room.occupantIds || []).forEach((clientId) => {
      delete nextInserted[clientId];
    });
    clearRoomArea(room);
    setRoomMeta((current) => {
      const rooms = { ...current.rooms };
      delete rooms[room.id];
      return {
        ...current,
        insertedClients: nextInserted,
        rooms,
      };
    });
    scheduleSave();
    onToast?.("تم حذف الغرفة", "info");
  }, [selectedRoom, onToast, clearRoomArea, setRoomMeta, scheduleSave]);

  const openRoomPicker = React.useCallback((room = selectedRoom) => {
    if (!room) {
      onToast?.("اختر غرفة أولا لإضافة معتمرين", "info");
      return;
    }
    if ((room.occupantIds || []).length >= room.capacity) {
      onToast?.("الغرفة ممتلئة بالفعل", "info");
      return;
    }
    setSelectedPilgrimIds([]);
    setRoomPickerState({ open: true, roomId: room.id });
  }, [selectedRoom, onToast]);

  const insertPilgrimsIntoRoom = React.useCallback(() => {
    const room = getRoomById(roomPickerState.roomId);
    if (!room) return;
    if (!selectedPilgrimIds.length) {
      onToast?.("اختر معتمرًا واحدًا على الأقل", "info");
      return;
    }
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const insertedClients = { ...currentMeta.insertedClients };
    const rooms = { ...currentMeta.rooms };
    const nextRoom = { ...room, occupantIds: [...(room.occupantIds || [])] };
    const remaining = Math.max(0, nextRoom.capacity - nextRoom.occupantIds.length);
    const idsToInsert = selectedPilgrimIds.slice(0, remaining || selectedPilgrimIds.length);
    if (selectedPilgrimIds.length > remaining && remaining > 0 && !window.confirm("عدد المعتمرين المحدد أكبر من سعة الغرفة. سيتم إدراج العدد المسموح فقط. هل تريد المتابعة؟")) {
      return;
    }
    idsToInsert.forEach((clientId) => {
      const client = clientsById[clientId];
      if (!client || nextRoom.occupantIds.includes(clientId)) return;
      const context = getClientContext(client);
      nextRoom.occupantIds.push(clientId);
      insertedClients[clientId] = {
        roomId: nextRoom.id,
        city,
        name: context.name,
        packageLevel: context.level,
        roomType: context.roomType,
        hotel: context.hotel,
        insertedAt: new Date().toISOString(),
      };
    });
    rooms[nextRoom.id] = nextRoom;
    metaRef.current = { ...currentMeta, insertedClients, rooms };
    renderRoom(nextRoom);
    scheduleSave();
    setRoomPickerState({ open: false, roomId: null });
    setSelectedPilgrimIds([]);
    setMetaTick((value) => value + 1);
    onToast?.("تم إدراج المعتمرين في الغرفة", "success");
  }, [roomPickerState.roomId, selectedPilgrimIds, getRoomById, clientsById, getClientContext, city, renderRoom, scheduleSave, onToast]);

  const generateTemplateBlocks = React.useCallback(() => {
    if (!window.confirm("سيتم إعادة توليد التسكين من بيانات المعتمرين الحالية مع مسح الغرف الحالية داخل هذه الورقة. هل تريد المتابعة؟")) return;
    const activeCell = getActiveCell();
    const groupedRooms = buildRoomingGroupsFromClients(clients, city);
    const payload = createRoomingHeaderSheet({ program, clients, city, agency, lang });
    const rooms = {};
    const insertedClients = {};
    groupedRooms.forEach((room, index) => {
      const colOffset = index % 3;
      const rowOffset = Math.floor(index / 3);
      const startX = activeCell.x + (colOffset * (ROOMING_BLOCK_WIDTH + 1));
      const startY = activeCell.y + (rowOffset * 8);
      const nextRoom = {
        ...room,
        startX,
        startY,
      };
      rooms[nextRoom.id] = nextRoom;
      (nextRoom.occupantIds || []).forEach((clientId) => {
        const client = clientsById[clientId];
        insertedClients[clientId] = {
          roomId: nextRoom.id,
          city,
          name: client ? getClientDisplayName(client) : clientId,
          packageLevel: client?.packageLevel || client?.hotelLevel || "",
          roomType: client?.roomTypeLabel || getRoomTypeLabel(client?.roomType) || "",
          hotel: city === "makkah" ? client?.hotelMecca || "" : client?.hotelMadina || "",
          insertedAt: new Date().toISOString(),
        };
      });
    });
    payload.meta = normalizeRoomingMeta({
      ...payload.meta,
      rooms,
      insertedClients,
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
    metaRef.current = payload.meta;
    setMetaTick((value) => value + 1);
    setRefreshKey((value) => value + 1);
    onToast?.("تم توليد التسكين من مجموعات المعتمرين الحالية", "success");
  }, [getActiveCell, clients, city, program, agency, lang, storageKey, onToast, clientsById]);

  const resetSheet = React.useCallback(() => {
    if (!window.confirm("سيتم حذف ورقة التسكين المحلية لهذا الفندق. هل أنت متأكد؟")) return;
    localStorage.removeItem(storageKey);
    metaRef.current = normalizeRoomingMeta({});
    setMetaTick((value) => value + 1);
    setRefreshKey(k => k + 1);
    onToast?.("تمت إعادة ضبط ورقة التسكين", "info");
  }, [storageKey, onToast]);

  const clearWholeSheet = React.useCallback(() => {
    if (!window.confirm("سيتم مسح الورقة الحالية وإرجاعها إلى ترويسة البرنامج فقط. هل تريد المتابعة؟")) return;
    const payload = createRoomingHeaderSheet({ program, clients, city, agency, lang });
    localStorage.setItem(storageKey, JSON.stringify(payload));
    metaRef.current = normalizeRoomingMeta(payload.meta);
    setMetaTick((value) => value + 1);
    setRefreshKey(k => k + 1);
    onToast?.("تم مسح الورقة", "info");
  }, [program, clients, city, agency, lang, storageKey, onToast]);

  const clearSelection = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const [x1, y1, x2, y2] = getLiveSelection();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const currentMeta = normalizeRoomingMeta(metaRef.current);
    const inserted = { ...currentMeta.insertedClients };
    const rooms = { ...currentMeta.rooms };
    const merges = sheet.getMerge?.() || {};
    Object.keys(merges).forEach((cell) => {
      const match = cell.match(/^([A-Z]+)(\d+)$/);
      if (!match) return;
      const x = match[1].split("").reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const y = Number(match[2]) - 1;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        try { sheet.removeMerge(cell); } catch {}
      }
    });
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const cell = getCellName(x, y);
        sheet.setValueFromCoords(x, y, "", true);
        try { sheet.resetStyle?.(cell); } catch {}
        Object.entries(inserted).forEach(([clientId, meta]) => {
          if (meta?.cell === cell) delete inserted[clientId];
        });
      }
    }
    Object.values(rooms).forEach((room) => {
      const width = Number(room.width) || ROOMING_BLOCK_WIDTH;
      const height = Number(room.height) || getRoomBlockHeight(room.capacity);
      const overlaps = !(room.startX + width - 1 < minX || room.startX > maxX || room.startY + height - 1 < minY || room.startY > maxY);
      if (!overlaps) return;
      (room.occupantIds || []).forEach((clientId) => delete inserted[clientId]);
      delete rooms[room.id];
    });
    metaRef.current = { ...currentMeta, insertedClients: inserted, rooms };
    scheduleSave();
    syncSelectionState([minX, minY, maxX, maxY]);
    setMetaTick(k => k + 1);
  }, [getLiveSelection, scheduleSave, syncSelectionState]);

  const addRows = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertRow(10);
    scheduleSave();
  }, [scheduleSave]);

  const addColumns = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.insertColumn(4);
    scheduleSave();
  }, [scheduleSave]);

  const applyColor = React.useCallback((color) => {
    applyFormattingToRange({
      "background-color": color,
      color: color === "#111827" ? "#f8fafc" : "#111827",
    });
  }, [applyFormattingToRange]);

  const applyTextColor = React.useCallback((color) => {
    applyFormattingToRange({ color });
  }, [applyFormattingToRange]);

  const applyFontSize = React.useCallback((size) => {
    setFontSize(size);
    applyFormattingToRange({ "font-size": `${size}px` });
  }, [applyFormattingToRange]);

  const applyTextAlign = React.useCallback((align) => {
    applyFormattingToRange({ "text-align": align });
  }, [applyFormattingToRange]);

  const applyWrapText = React.useCallback(() => {
    applyFormattingToRange(selectionUi.wrap
      ? {
          "white-space": "",
          "overflow-wrap": "",
          "word-break": "",
        }
      : {
          "white-space": "pre-wrap",
          "overflow-wrap": "anywhere",
          "word-break": "break-word",
        });
  }, [applyFormattingToRange, selectionUi.wrap]);

  const toggleBold = React.useCallback(() => {
    applyFormattingToRange({ "font-weight": selectionUi.bold ? "" : "700" });
  }, [applyFormattingToRange, selectionUi.bold]);

  const toggleItalic = React.useCallback(() => {
    applyFormattingToRange({ "font-style": selectionUi.italic ? "" : "italic" });
  }, [applyFormattingToRange, selectionUi.italic]);

  const undoSheet = React.useCallback(() => {
    sheetRef.current?.undo?.();
    window.requestAnimationFrame(() => syncSelectionState(getLiveSelection()));
  }, [getLiveSelection, syncSelectionState]);

  const redoSheet = React.useCallback(() => {
    sheetRef.current?.redo?.();
    window.requestAnimationFrame(() => syncSelectionState(getLiveSelection()));
  }, [getLiveSelection, syncSelectionState]);

  const toggleMergeSelection = React.useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const range = getLiveSelection();
    const merge = getActiveMerge(range);
    try {
      if (merge) sheet.removeMerge(merge[0]);
      else sheet.setMerge();
      scheduleSave();
      syncSelectionState(range);
    } catch {
      onToast?.("اختر الخلية الرئيسية للدمج لإلغائه", "info");
    }
  }, [getLiveSelection, getActiveMerge, scheduleSave, syncSelectionState, onToast]);

  const exportExcel = React.useCallback(async (selectedOnly = false) => {
    const payload = selectedOnly ? cropSheetPayload(captureSheet(), getLiveSelection()) : captureSheet();
    if (!payload) return;
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(payload.data);
    ws["!merges"] = Object.entries(payload.mergeCells || {}).map(([cell, spans]) => {
      const start = XLSX.utils.decode_cell(cell);
      return {
        s: start,
        e: { r: start.r + (spans?.[1] || 1) - 1, c: start.c + (spans?.[0] || 1) - 1 },
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedOnly ? "Selected" : (city === "makkah" ? "Makkah" : "Madinah"));
    XLSX.writeFile(wb, `rooming-${city}${selectedOnly ? "-selected" : ""}-${slugifyFilePart(program.name)}.xlsx`);
  }, [captureSheet, getLiveSelection, city, program.name]);

  const printSheet = React.useCallback((selectedOnly = false) => {
    const payload = selectedOnly ? cropSheetPayload(captureSheet(), getLiveSelection()) : captureSheet();
    if (!payload) return;
    const hidden = new Set();
    const mergeMap = payload.mergeCells || {};
    Object.entries(mergeMap).forEach(([cell, spans]) => {
      const match = cell.match(/^([A-Z]+)(\d+)$/);
      if (!match) return;
      const col = match[1].split("").reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const row = Number(match[2]) - 1;
      for (let y = row; y < row + (spans?.[1] || 1); y += 1) {
        for (let x = col; x < col + (spans?.[0] || 1); x += 1) {
          if (x !== col || y !== row) hidden.add(`${x}:${y}`);
        }
      }
    });
    const rows = payload.data.map((row, y) => `<tr>${row.map((value, x) => {
      if (hidden.has(`${x}:${y}`)) return "";
      const cell = getCellName(x, y);
      const merge = mergeMap[cell];
      const colspan = Math.max(1, Math.min(200, Number.parseInt(merge?.[0], 10) || 1));
      const rowspan = Math.max(1, Math.min(2000, Number.parseInt(merge?.[1], 10) || 1));
      const attrs = merge ? ` colspan="${colspan}" rowspan="${rowspan}"` : "";
      const style = payload.style?.[cell] || "";
      return `<td${attrs} style="${escapeHtml(style)}">${escapeHtml(value).replace(/\n/g, "<br/>")}</td>`;
    }).join("")}</tr>`).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(ROOMING_CITY_LABELS[city])}</title>
      <style>
        @page{size:A4 landscape;margin:10mm}
        body{font-family:Arial,sans-serif;color:#111;background:#fff}
        table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}
        td{border:1px solid #888;min-height:22px;padding:5px;white-space:pre-wrap;vertical-align:top}
      </style></head><body><table>${rows}</table><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }, [captureSheet, getLiveSelection, city]);

  React.useEffect(() => {
    const viewport = gridViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      const previous = viewportSizeRef.current;
      if (Math.abs(previous.width - width) < 2 && Math.abs(previous.height - height) < 2) return;
      viewportSizeRef.current = { width, height };
      setViewportTick((value) => value + 1);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const sheet = sheetRef.current;
    const viewport = gridViewportRef.current;
    if (!sheet || !viewport) return undefined;

    const zoomFactor = zoom / 100;
    const scaledFirstColWidth = Math.max(96, Math.round(ROOMING_BASE_FIRST_COL_WIDTH * zoomFactor));
    const scaledCellWidth = Math.max(72, Math.round(ROOMING_BASE_CELL_WIDTH * zoomFactor));
    const scaledRowHeight = Math.max(24, Math.round(ROOMING_BASE_ROW_HEIGHT * zoomFactor));
    const scaledFontSize = Math.max(11, Math.round(ROOMING_BASE_FONT_SIZE * zoomFactor));

    const data = normalizeSheetData(sheet.getData(false, false));
    const rowCount = data.length;
    const colCount = data[0]?.length || ROOMING_COLS;
    const previousIgnoreHistory = sheet.ignoreHistory;
    const previousIgnoreEvents = sheet.parent?.ignoreEvents;

    sheet.ignoreHistory = true;
    if (sheet.parent) sheet.parent.ignoreEvents = true;
    for (let x = 0; x < colCount; x += 1) {
      sheet.setWidth(x, x === 0 ? scaledFirstColWidth : scaledCellWidth);
    }
    for (let y = 0; y < rowCount; y += 1) {
      sheet.setHeight(y, scaledRowHeight);
    }
    sheet.ignoreHistory = previousIgnoreHistory;
    if (sheet.parent) sheet.parent.ignoreEvents = previousIgnoreEvents;

    if (workspaceRef.current) {
      workspaceRef.current.style.setProperty("--rooming-grid-font-size", `${scaledFontSize}px`);
      workspaceRef.current.style.setProperty("--rooming-grid-line-height", zoomFactor > 1 ? "1.5" : "1.4");
    }

    const content = hostRef.current?.querySelector?.(".jss_content");
    if (content) {
      content.style.width = `${Math.max(320, viewport.clientWidth)}px`;
      content.style.maxWidth = `${Math.max(320, viewport.clientWidth)}px`;
      content.style.height = `${Math.max(240, viewport.clientHeight)}px`;
      content.style.maxHeight = `${Math.max(240, viewport.clientHeight)}px`;
      content.style.overflow = "auto";
      content.style.overflowX = "auto";
      content.style.overflowY = "auto";
    }

    return undefined;
  }, [zoom, fullscreen, panelOpen, refreshKey, viewportTick]);

  const roomingViewportHeight = fullscreen ? "calc(100vh - 214px)" : "min(72vh, 680px)";

  return (
    <div
      ref={workspaceRef}
      style={fullscreen ? {
        position: "fixed",
        inset: 0,
        zIndex: 90,
        padding: 0,
      } : undefined}
    >
      <GlassCard
        gold
        style={{
          padding: 12,
          marginBottom: fullscreen ? 0 : 24,
          height: fullscreen ? "100vh" : "auto",
          width: fullscreen ? "100vw" : "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f3f5f8",
          border: "1px solid rgba(203,213,225,.85)",
          boxShadow: fullscreen ? "none" : "0 10px 30px rgba(15,23,42,.08)",
          overflow: "hidden",
        }}
      >
        <style>{`
          .rooming-workspace .jss_container { width: 100% !important; max-width: 100% !important; }
          .rooming-workspace .jss_container,
          .rooming-workspace .jss_content {
            direction: ltr;
          }
          .rooming-workspace .jss_content,
          .rooming-workspace .jss_container,
          .rooming-workspace .jexcel,
          .rooming-workspace .jexcel > div {
            min-width: 100% !important;
          }
          .rooming-workspace .jss_content {
            background: #ffffff;
            border-radius: 0;
            border: 0;
            box-shadow: none !important;
            overscroll-behavior: contain;
          }
          .rooming-workspace .jss_worksheet { background: #fff; color: #111827; direction: ltr; }
          .rooming-workspace .jss_worksheet > thead > tr > td,
          .rooming-workspace .jss_worksheet > tbody > tr > td:first-child {
            background: #f8fafc !important;
            color: #475569 !important;
            border-color: #dbe3ee !important;
            font-weight: 700;
            font-size: var(--rooming-grid-font-size, 13px) !important;
            direction: ltr;
            text-align: center;
          }
          .rooming-workspace .jss_worksheet > tbody > tr > td:not(:first-child) {
            border-color: #e2e8f0 !important;
            background-color: #ffffff;
            color: #111827;
            white-space: pre-wrap;
            line-height: var(--rooming-grid-line-height, 1.45);
            font-size: var(--rooming-grid-font-size, 13px) !important;
            direction: rtl;
            text-align: right;
            box-sizing: border-box;
          }
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-top"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-right"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-bottom"],
          .rooming-workspace .jss_worksheet > tbody > tr > td[style*="border-left"] {
            border-style: solid !important;
            border-color: #111827 !important;
            position: relative;
            z-index: 1;
          }
          .rooming-workspace .jss_worksheet .highlight,
          .rooming-workspace .jss_worksheet .highlight-selected {
            border-color: #2563eb !important;
            box-shadow: inset 0 0 0 1px #2563eb;
          }
          .rooming-workspace .jss_corner { background: #2563eb !important; }
          .rooming-workspace .jss_textarea { background: transparent; }
          .rooming-workspace .jss_worksheet > tbody > tr > td > input,
          .rooming-workspace .jss_worksheet > tbody > tr > td > textarea {
            color: #111827 !important;
            background: #fff !important;
            font-size: var(--rooming-grid-font-size, 13px) !important;
          }
          .rooming-workspace .jss_selectall {
            background: #eef2ff !important;
          }
        `}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#0f172a", fontWeight: 900, fontSize: 16 }}>ورقة التسكين</p>
            <p style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
              معتمرون غير مدرجين: <strong style={{ color: uninsertedClients.length ? "#b45309" : "#15803d" }}>{uninsertedClients.length}</strong>
              {dirty ? " • تغييرات غير محفوظة" : savedAt ? ` • آخر حفظ ${savedAt.toLocaleTimeString("ar-MA")}` : ""}
            </p>
          </div>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "#fff", border: "1px solid rgba(148,163,184,.22)" }}>
            {Object.entries(ROOMING_CITY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCity(key)}
                style={{
                  border: 0,
                  background: city === key ? "#e8eefc" : "transparent",
                  color: city === key ? "#1d4ed8" : "#475569",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'Cairo',sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: 8,
          marginBottom: 10,
          borderRadius: 12,
          background: "#ffffff",
          border: "1px solid rgba(148,163,184,.2)",
          position: "sticky",
          top: 0,
          zIndex: 6,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minWidth: 170,
            height: 34,
            paddingInline: 10,
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,.24)",
            background: "#fff",
          }}>
            <Search size={15} color="#64748b" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث داخل الورقة"
              style={{
                border: 0,
                outline: 0,
                width: "100%",
                background: "transparent",
                color: "#0f172a",
                fontSize: 12,
                fontFamily: "'Cairo',sans-serif",
              }}
            />
          </div>

          <RoomingToolbarButton title="تراجع" onClick={undoSheet} icon={<Undo2 size={15} />} />
          <RoomingToolbarButton title="إعادة" onClick={redoSheet} icon={<Redo2 size={15} />} />
          <RoomingToolbarButton title="طباعة" onClick={() => printSheet(false)} icon={<AppIcon name="print" size={15} />} />
          <RoomingToolbarButton title="تصدير Excel" onClick={() => exportExcel(false)} icon={<FileSpreadsheet size={15} />} />
          <RoomingToolbarButton title="حفظ الورقة" onClick={() => saveSheet(true)} active={dirty} icon={<AppIcon name="save" size={15} />} />
          <RoomingToolbarButton title="إنشاء غرفة" onClick={openCreateRoomModal} icon={<AppIcon name="plus" size={15} />}>
            <span>إنشاء غرفة</span>
          </RoomingToolbarButton>

          <select
            value={zoom}
            title="التكبير"
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.24)",
              background: "#fff",
              color: "#334155",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Cairo',sans-serif",
              outline: "none",
            }}
          >
            {[50, 75, 90, 100, 125, 150].map(value => <option key={value} value={value}>{value}%</option>)}
          </select>

          <select
            value={fontSize}
            title="حجم الخط"
            onChange={(e) => applyFontSize(Number(e.target.value))}
            style={{
              height: 34,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,.24)",
              background: "#fff",
              color: "#334155",
              padding: "0 10px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Cairo',sans-serif",
              outline: "none",
            }}
          >
            {[11, 12, 13, 14, 16, 18, 20].map(value => <option key={value} value={value}>{value}px</option>)}
          </select>

          <RoomingToolbarButton title="عريض" onClick={toggleBold} active={selectionUi.bold} icon={<Bold size={15} />} />
          <RoomingToolbarButton title="مائل" onClick={toggleItalic} active={selectionUi.italic} icon={<Italic size={15} />} />

          <label title="لون النص" style={{ display: "inline-flex" }}>
            <RoomingToolbarButton title="لون النص" icon={<Type size={15} />} style={{ position: "relative", overflow: "hidden" }}>
              <input
                type="color"
                onChange={(e) => applyTextColor(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                aria-label="لون النص"
              />
            </RoomingToolbarButton>
          </label>

          <label title="لون الخلفية" style={{ display: "inline-flex" }}>
            <RoomingToolbarButton title="لون الخلفية" icon={<PaintBucket size={15} />} style={{ position: "relative", overflow: "hidden" }}>
              <input
                type="color"
                onChange={(e) => applyColor(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                aria-label="لون الخلفية"
              />
            </RoomingToolbarButton>
          </label>

          <div style={{ position: "relative" }}>
            <RoomingToolbarButton
              title="الحدود"
              onClick={() => {
                setMoreMenuOpen(false);
                setBorderMenuOpen(open => !open);
              }}
              active={borderMenuOpen}
              icon={<Columns3 size={15} />}
            />
            <RoomingMenu open={borderMenuOpen} width={164}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
                {[
                  { title: "كل الحدود", mode: "all", icon: <Square size={15} /> },
                  { title: "الحد الخارجي", mode: "outer", icon: <Columns3 size={15} /> },
                  { title: "الحدود الداخلية", mode: "inner", icon: <TableCellsMerge size={15} /> },
                  { title: "إزالة الحدود", mode: "remove", icon: <SquareSlash size={15} /> },
                  { title: "حد علوي", mode: "top", icon: <PanelTop size={15} /> },
                  { title: "حد سفلي", mode: "bottom", icon: <PanelBottom size={15} /> },
                  { title: "حد أيسر", mode: "left", icon: <PanelLeft size={15} /> },
                  { title: "حد أيمن", mode: "right", icon: <PanelRight size={15} /> },
                ].map(({ title, mode, icon }) => (
                  <RoomingToolbarButton
                    key={mode}
                    title={title}
                    onClick={() => {
                      applyBorder(mode);
                      setBorderMenuOpen(false);
                    }}
                    icon={icon}
                    style={{ width: "100%" }}
                  />
                ))}
              </div>
            </RoomingMenu>
          </div>

          <RoomingToolbarButton title={selectionUi.merged ? "إلغاء دمج الخلايا" : "دمج الخلايا"} onClick={toggleMergeSelection} active={selectionUi.merged} icon={<Merge size={15} />} />
          <RoomingToolbarButton title="محاذاة يمين" onClick={() => applyTextAlign("right")} active={selectionUi.align === "right"} icon={<AlignRight size={15} />} />
          <RoomingToolbarButton title="محاذاة وسط" onClick={() => applyTextAlign("center")} active={selectionUi.align === "center"} icon={<AlignCenter size={15} />} />
          <RoomingToolbarButton title="محاذاة يسار" onClick={() => applyTextAlign("left")} active={selectionUi.align === "left"} icon={<AlignLeft size={15} />} />
          <RoomingToolbarButton title="التفاف النص" onClick={applyWrapText} active={selectionUi.wrap} icon={<WrapText size={15} />} />
          <RoomingToolbarButton
            title={selectedRoom ? "إضافة معتمرين إلى الغرفة المحددة" : "إدراج المعتمرين"}
            onClick={() => (selectedRoom ? openRoomPicker(selectedRoom) : insertClients(uninsertedClients, true))}
            disabled={!uninsertedClients.length}
            icon={<AppIcon name="users" size={15} />}
          />
          <RoomingToolbarButton
            title={panelOpen ? "إخفاء لوحة المعتمرين" : "إظهار لوحة المعتمرين"}
            onClick={() => setPanelOpen(open => !open)}
            icon={panelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            active={panelOpen}
          />
          <RoomingToolbarButton
            title={fullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            onClick={() => {
              setMoreMenuOpen(false);
              setBorderMenuOpen(false);
              setFullscreen(open => !open);
            }}
            icon={fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            active={fullscreen}
          />

          <div style={{ position: "relative", marginInlineStart: "auto" }}>
            <RoomingToolbarButton
              title="المزيد"
              onClick={() => {
                setBorderMenuOpen(false);
                setMoreMenuOpen(open => !open);
              }}
              active={moreMenuOpen}
              icon={<MoreHorizontal size={16} />}
            />
            <RoomingMenu open={moreMenuOpen} align="end" width={220}>
              <RoomingMenuItem label="توليد نموذج تسكين" icon={<AppIcon name="refresh" size={14} />} onClick={() => { generateTemplateBlocks(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="طباعة المحدد" icon={<AppIcon name="print" size={14} />} onClick={() => { printSheet(true); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="تصدير المحدد" icon={<FileSpreadsheet size={14} />} onClick={() => { exportExcel(true); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="حذف المحدد" icon={<AppIcon name="trash" size={14} />} onClick={() => { clearSelection(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح التنسيق" icon={<AppIcon name="x" size={14} />} onClick={() => { clearRangeFormatting(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح لون الخلايا" icon={<PaintBucket size={14} />} onClick={() => { applyFormattingToRange({ "background-color": "" }); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إضافة صفوف" icon={<TableRowsSplit size={14} />} onClick={() => { addRows(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إضافة أعمدة" icon={<TableColumnsSplit size={14} />} onClick={() => { addColumns(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="مسح الورقة" destructive icon={<AppIcon name="x" size={14} />} onClick={() => { clearWholeSheet(); setMoreMenuOpen(false); }} />
              <RoomingMenuItem label="إعادة ضبط" destructive icon={<AppIcon name="restore" size={14} />} onClick={() => { resetSheet(); setMoreMenuOpen(false); }} />
            </RoomingMenu>
          </div>
        </div>

        {selectedRoom && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#ffffff",
            border: "1px solid rgba(148,163,184,.2)",
          }}>
            <div>
              <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>
                غرفة {selectedRoom.roomNumber || "—"} • {getRoomingRoomLabel(selectedRoom.roomType)} • {getRoomingCategoryLabel(selectedRoom.category)}
              </p>
              <p style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
                {selectedRoom.hotel || "—"} • {(selectedRoom.occupantIds || []).length}/{selectedRoom.capacity}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <RoomingToolbarButton title="إضافة معتمر" onClick={() => openRoomPicker(selectedRoom)} icon={<AppIcon name="users" size={14} />}>
                <span>إضافة معتمر</span>
              </RoomingToolbarButton>
              <RoomingToolbarButton title="تعديل الغرفة" onClick={() => openEditRoomModal(selectedRoom)} icon={<AppIcon name="edit" size={14} />}>
                <span>تعديل الغرفة</span>
              </RoomingToolbarButton>
              <RoomingToolbarButton title="حذف الغرفة" onClick={() => deleteRoom(selectedRoom)} icon={<AppIcon name="trash" size={14} />}>
                <span>حذف الغرفة</span>
              </RoomingToolbarButton>
            </div>
          </div>
        )}

        <div
          className="rooming-workspace"
          style={{
            display: "grid",
            gridTemplateColumns: panelOpen ? "minmax(0,1fr) 248px" : "1fr",
            gap: 10,
            alignItems: "stretch",
            flex: 1,
            minHeight: 0,
            height: roomingViewportHeight,
            maxHeight: roomingViewportHeight,
          }}
        >
          <div
            ref={gridViewportRef}
            style={{
              minWidth: 0,
              minHeight: 0,
              height: roomingViewportHeight,
              maxHeight: roomingViewportHeight,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,.2)",
              background: "#fff",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            }}
          >
            <div
              style={{
                height: "100%",
                minHeight: 0,
                background: "#fff",
              }}
            >
              <div ref={hostRef} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          {panelOpen && (
            <div style={{
              border: "1px solid rgba(148,163,184,.2)",
              background: "#fff",
              borderRadius: 12,
              padding: 10,
              height: roomingViewportHeight,
              maxHeight: roomingViewportHeight,
              overflow: "auto",
              boxShadow: "0 12px 28px rgba(15,23,42,.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>المعتمرون غير المدرجين</p>
                <RoomingToolbarButton
                  title="إخفاء اللوحة"
                  onClick={() => setPanelOpen(false)}
                  icon={<PanelRightClose size={14} />}
                  style={{ minWidth: 28, height: 28 }}
                />
              </div>
              {!uninsertedClients.length ? (
                <p style={{ color: "#64748b", fontSize: 12 }}>كل المعتمرين مدرجون في هذه الورقة.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {uninsertedClients.map(client => {
                    const context = getClientContext(client);
                    const isCompatibleWithSelectedRoom = !selectedRoom || compatiblePilgrims.some((item) => item.id === client.id);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          if (selectedRoom) {
                            if (!isCompatibleWithSelectedRoom) {
                              onToast?.("هذا المعتمر غير متوافق مع الغرفة المحددة", "info");
                              return;
                            }
                            setSelectedPilgrimIds([client.id]);
                            setRoomPickerState({ open: true, roomId: selectedRoom.id });
                            return;
                          }
                          insertClients([client], true);
                        }}
                        style={{
                          border: `1px solid ${selectedRoom && !isCompatibleWithSelectedRoom ? "rgba(239,68,68,.18)" : "rgba(148,163,184,.18)"}`,
                          background: selectedRoom && !isCompatibleWithSelectedRoom ? "#fff1f2" : "#f8fafc",
                          borderRadius: 10,
                          padding: 9,
                          color: "#0f172a",
                          cursor: "pointer",
                          fontFamily: "'Cairo',sans-serif",
                          textAlign: "start",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 12 }}>{context.name}</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>
                          {[context.genderLabel, context.roomType, context.hotel].filter(Boolean).join(" • ") || "بدون تفاصيل"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <Modal
          open={roomModal.open}
          onClose={() => setRoomModal({ open: false, mode: "create", roomId: null })}
          title={roomModal.mode === "edit" ? "تعديل الغرفة" : "إنشاء غرفة"}
          width={520}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="رقم الغرفة"
              value={roomDraft.roomNumber}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, roomNumber: e.target.value }))}
            />
            <Select
              label="نوع الغرفة"
              value={roomDraft.roomType}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, roomType: e.target.value }))}
              options={ROOMING_ROOM_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
            <Select
              label="تصنيف الغرفة"
              value={roomDraft.category}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, category: e.target.value }))}
              options={ROOMING_CATEGORY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
            <Select
              label="الفندق"
              value={roomDraft.hotel}
              onChange={(e) => setRoomDraft((prev) => ({ ...prev, hotel: e.target.value }))}
              options={(roomHotelOptions.length ? roomHotelOptions : [roomDraft.hotel || "—"]).map((hotel) => ({ value: hotel, label: hotel }))}
            />
            {roomDraft.category === "family" && (
              <p style={{ color: "#64748b", fontSize: 12 }}>
                الغرفة العائلية تسمح بالمزج بين الذكور والإناث فقط عند توفر بيانات عائلة/مجموعة واضحة.
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => setRoomModal({ open: false, mode: "create", roomId: null })}>
                إلغاء
              </Button>
              <Button onClick={upsertRoom}>
                {roomModal.mode === "edit" ? "حفظ التعديل" : "إنشاء"}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={roomPickerState.open}
          onClose={() => {
            setRoomPickerState({ open: false, roomId: null });
            setSelectedPilgrimIds([]);
          }}
          title="إضافة معتمر"
          width={560}
        >
          {pickerRoom && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassCard style={{ padding: 12, background: "rgba(248,250,252,.95)", borderColor: "rgba(148,163,184,.18)" }}>
                <p style={{ color: "#0f172a", fontWeight: 800, fontSize: 13 }}>
                  غرفة {pickerRoom.roomNumber || "—"} • {getRoomingRoomLabel(pickerRoom.roomType)} • {getRoomingCategoryLabel(pickerRoom.category)}
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                  {pickerRoom.hotel || "—"} • المتاح {Math.max(0, pickerRoom.capacity - (pickerRoom.occupantIds || []).length)} من {pickerRoom.capacity}
                </p>
              </GlassCard>
              {!compatiblePilgrims.length ? (
                <p style={{ color: "#64748b", fontSize: 12 }}>
                  لا يوجد معتمرون متوافقون غير مدرجين لهذه الغرفة حاليًا.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                  {compatiblePilgrims.map((client) => {
                    const context = getClientContext(client);
                    const checked = selectedPilgrimIds.includes(client.id);
                    const remaining = Math.max(0, pickerRoom.capacity - (pickerRoom.occupantIds || []).length);
                    const disabled = !checked && selectedPilgrimIds.length >= remaining;
                    return (
                      <label
                        key={client.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,.18)",
                          background: checked ? "rgba(37,99,235,.07)" : "#f8fafc",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.55 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedPilgrimIds((prev) => {
                              if (isChecked) return [...prev, client.id];
                              return prev.filter((id) => id !== client.id);
                            });
                          }}
                          style={{ marginTop: 2 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{context.name}</strong>
                          <span style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>
                            {[context.genderLabel, context.roomType, context.hotel].filter(Boolean).join(" • ") || "بدون تفاصيل"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRoomPickerState({ open: false, roomId: null });
                    setSelectedPilgrimIds([]);
                  }}
                >
                  إلغاء
                </Button>
                <Button onClick={insertPilgrimsIntoRoom} disabled={!selectedPilgrimIds.length}>
                  إدراج المحدد
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </GlassCard>
    </div>
  );
}

// ═══════════════════════════════════════
// HEADER SELECT CHECKBOX
// ═══════════════════════════════════════
function HeaderSelectCheckbox({ checked, indeterminate, onChange, label }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        style={{
          width: 18,
          height: 18,
          accentColor: "#fff",
          cursor: "pointer",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))",
        }}
      />
    </span>
  );
}
