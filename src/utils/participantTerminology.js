const normalizeText = (value) => String(value || "").trim().toLowerCase();

const getDeletedProgramSnapshot = (program, client) => (
  client?.docs?.deletedProgramSnapshot
  || program?.docs?.deletedProgramSnapshot
  || null
);

const normalizeProgramKind = (value) => {
  const text = normalizeText(value);
  if (!text) return "";
  if (text === "hajj" || text === "hadj" || text === "حج" || text === "الحج") return "hajj";
  if (text === "umrah" || text === "omra" || text === "omrah" || text === "عمرة" || text === "العمرة") return "umrah";
  if (text.includes("حج") || text.includes("hajj") || text.includes("hadj")) return "hajj";
  if (text.includes("عمرة") || text.includes("umrah") || text.includes("omra") || text.includes("omrah")) return "umrah";
  return "";
};

export const getProgramKind = (program = null, client = null, options = {}) => {
  const {
    allowNameFallback = true,
    defaultKind = "umrah",
  } = options || {};
  const snapshot = getDeletedProgramSnapshot(program, client);
  const type = (
    program?.type
    || program?.program_type
    || program?.programType
    || program?.programKind
    || program?.programCategory
    || program?.program_category
    || program?.category
    || snapshot?.type
    || snapshot?.program_type
    || snapshot?.programType
    || snapshot?.programKind
    || snapshot?.programCategory
    || snapshot?.program_category
    || snapshot?.category
  );

  const directKind = normalizeProgramKind(type);
  if (directKind) return directKind;

  if (!allowNameFallback) return defaultKind;

  const sourceKind = normalizeProgramKind(
    program?.name
    || program?.nameFr
    || program?.name_fr
    || snapshot?.name
    || snapshot?.programName
    || snapshot?.programNameFr
  );
  return sourceKind || defaultKind;
};

export const getExplicitProgramKind = (program = null, client = null) => (
  getProgramKind(program, client, { allowNameFallback: false, defaultKind: "" })
);

export const getParticipantTerminology = (program = null, clientOrLang = "ar", maybeLang) => {
  const client = typeof clientOrLang === "string" ? null : clientOrLang;
  const lang = typeof clientOrLang === "string" ? clientOrLang : (maybeLang || "ar");
  const kind = getProgramKind(program, client);
  const isHajj = kind === "hajj";

  if (lang === "fr") {
    return {
      kind,
      singular: isHajj ? "pèlerin Hajj" : "pèlerin Omra",
      plural: isHajj ? "pèlerins Hajj" : "pèlerins Omra",
      fileTitle: isHajj ? "Dossier pèlerin Hajj" : "Dossier pèlerin Omra",
      receiptTitle: isHajj ? "Reçu pèlerin Hajj" : "Reçu pèlerin Omra",
      cardTitle: isHajj ? "Carte pèlerin Hajj" : "Carte pèlerin Omra",
      listTitle: isHajj ? "Liste des pèlerins Hajj" : "Liste des pèlerins Omra",
      exportListAction: isHajj ? "Exporter la liste des pèlerins Hajj" : "Exporter la liste des pèlerins Omra",
      listExportReady: isHajj ? "Liste des pèlerins Hajj exportée" : "Liste des pèlerins Omra exportée",
      addAction: isHajj ? "Ajouter un pèlerin Hajj" : "Ajouter un pèlerin Omra",
      importAction: isHajj ? "Importer des pèlerins Hajj" : "Importer des pèlerins Omra",
      passportImport: isHajj ? "Importer les passeports des pèlerins Hajj" : "Importer les passeports des pèlerins Omra",
      noMatching: isHajj ? "Aucun pèlerin Hajj ne correspond aux filtres actuels" : "Aucun pèlerin Omra ne correspond aux filtres actuels",
      emptyTitle: isHajj ? "Aucun pèlerin Hajj" : "Aucun pèlerin Omra",
      emptySub: isHajj ? "Ajoutez des pèlerins Hajj à ce programme" : "Ajoutez des pèlerins Omra à ce programme",
      emptyFiltered: isHajj ? "Aucun pèlerin Hajj pour ce statut" : "Aucun pèlerin Omra pour ce statut",
      totalLabel: (count) => `Total — ${count} ${isHajj ? "pèlerin(s) Hajj" : "pèlerin(s) Omra"}`,
      signatureLabel: "Signature du client",
    };
  }

  if (lang === "en") {
    return {
      kind,
      singular: isHajj ? "Hajj pilgrim" : "Umrah pilgrim",
      plural: isHajj ? "Hajj pilgrims" : "Umrah pilgrims",
      fileTitle: isHajj ? "Hajj Pilgrim File" : "Umrah Pilgrim File",
      receiptTitle: isHajj ? "Hajj pilgrim receipt" : "Umrah pilgrim receipt",
      cardTitle: isHajj ? "Hajj Pilgrim Card" : "Umrah Pilgrim Card",
      listTitle: isHajj ? "Hajj pilgrims list" : "Umrah pilgrims list",
      exportListAction: isHajj ? "Export Hajj pilgrims list" : "Export Umrah pilgrims list",
      listExportReady: isHajj ? "Hajj pilgrims list exported" : "Umrah pilgrims list exported",
      addAction: isHajj ? "Add Hajj pilgrim" : "Add Umrah pilgrim",
      importAction: isHajj ? "Import Hajj pilgrims" : "Import Umrah pilgrims",
      passportImport: isHajj ? "Import Hajj pilgrims passports" : "Import Umrah pilgrims passports",
      noMatching: isHajj ? "No Hajj pilgrims match the current filters" : "No Umrah pilgrims match the current filters",
      emptyTitle: isHajj ? "No Hajj pilgrims" : "No Umrah pilgrims",
      emptySub: isHajj ? "Start by adding Hajj pilgrims to this program" : "Start by adding Umrah pilgrims to this program",
      emptyFiltered: isHajj ? "No Hajj pilgrims match this status" : "No Umrah pilgrims match this status",
      totalLabel: (count) => `Total — ${count} ${isHajj ? "Hajj pilgrim(s)" : "Umrah pilgrim(s)"}`,
      signatureLabel: "Client Signature",
    };
  }

  return {
    kind,
    singular: isHajj ? "حاج" : "معتمر",
    plural: isHajj ? "حجاج" : "معتمرون",
    fileTitle: isHajj ? "ملف الحاج" : "ملف المعتمر",
    receiptTitle: isHajj ? "وصل الحاج" : "وصل المعتمر",
    cardTitle: isHajj ? "بطاقة الحاج" : "بطاقة المعتمر",
    listTitle: isHajj ? "لائحة الحجاج" : "لائحة المعتمرين",
    exportListAction: isHajj ? "تصدير لائحة الحجاج" : "تصدير لائحة المعتمرين",
    listExportReady: isHajj ? "تم تصدير لائحة الحجاج" : "تم تصدير لائحة المعتمرين",
    addAction: isHajj ? "إضافة حاج" : "إضافة معتمر",
    importAction: isHajj ? "استيراد حجاج" : "استيراد معتمرين",
    passportImport: isHajj ? "استيراد جوازات الحجاج" : "استيراد جوازات المعتمرين",
    noMatching: isHajj ? "لا يوجد حجاج مطابقون للفلاتر الحالية" : "لا يوجد معتمرون مطابقون للفلاتر الحالية",
    emptyTitle: isHajj ? "لا يوجد حجاج" : "لا يوجد معتمرون",
    emptySub: isHajj ? "ابدأ بإضافة حجاج لهذا البرنامج" : "ابدأ بإضافة معتمرين لهذا البرنامج",
    emptyFiltered: isHajj ? "لا يوجد حجاج بهذه الحالة" : "لا يوجد معتمرون بهذه الحالة",
    totalLabel: (count) => `الإجمالي — ${count} ${isHajj ? "حاج" : "معتمر"}`,
    signatureLabel: isHajj ? "توقيع الحاج" : "توقيع المعتمر",
  };
};
