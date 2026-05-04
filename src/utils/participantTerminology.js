const normalizeText = (value) => String(value || "").trim().toLowerCase();

export const getProgramKind = (program = {}) => {
  const direct = normalizeText(
    program.type
    || program.program_type
    || program.programType
    || program.category
    || program.programCategory
    || program.program_category
  );
  const source = direct || normalizeText(program.name);
  if (source.includes("عمرة") || source.includes("umrah") || source.includes("omra") || source.includes("omrah")) return "umrah";
  if (source.includes("حج") || source.includes("hajj") || source.includes("hadj")) return "hajj";
  return "umrah";
};

export const getParticipantTerminology = (program = {}, lang = "ar") => {
  const kind = getProgramKind(program);
  const isHajj = kind === "hajj";

  if (lang === "fr") {
    return {
      kind,
      singular: "pèlerin",
      plural: "pèlerins",
      fileTitle: "Dossier pèlerin",
      receiptTitle: "Reçu pèlerin",
      cardTitle: "Carte pèlerin",
      listTitle: "Liste des pèlerins",
      exportListAction: "Exporter la liste des pèlerins",
      listExportReady: "Liste des pèlerins exportée",
      addAction: "Ajouter pèlerin",
      noMatching: "Aucun pèlerin ne correspond aux filtres actuels",
      emptyTitle: "Aucun pèlerin",
      emptySub: "Ajoutez des pèlerins à ce programme",
      emptyFiltered: "Aucun pèlerin pour ce statut",
      totalLabel: (count) => `Total — ${count} pèlerin(s)`,
      signatureLabel: "Signature du client",
    };
  }

  if (lang === "en") {
    return {
      kind,
      singular: isHajj ? "Hajj pilgrim" : "Pilgrim",
      plural: isHajj ? "Hajj pilgrims" : "Pilgrims",
      fileTitle: isHajj ? "Hajj Pilgrim File" : "Pilgrim File",
      receiptTitle: isHajj ? "Hajj pilgrim receipt" : "Pilgrim receipt",
      cardTitle: isHajj ? "Hajj Pilgrim Card" : "Pilgrim Card",
      listTitle: isHajj ? "Hajj pilgrims list" : "Pilgrims list",
      exportListAction: isHajj ? "Export Hajj pilgrims list" : "Export pilgrims list",
      listExportReady: isHajj ? "Hajj pilgrims list exported" : "Pilgrims list exported",
      addAction: isHajj ? "Add Hajj pilgrim" : "Add Pilgrim",
      noMatching: isHajj ? "No Hajj pilgrims match the current filters" : "No pilgrims match the current filters",
      emptyTitle: isHajj ? "No Hajj pilgrims" : "No pilgrims",
      emptySub: isHajj ? "Start by adding Hajj pilgrims to this program" : "Start by adding pilgrims to this program",
      emptyFiltered: isHajj ? "No Hajj pilgrims match this status" : "No pilgrims match this status",
      totalLabel: (count) => `Total — ${count} ${isHajj ? "Hajj pilgrim(s)" : "pilgrim(s)"}`,
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
    noMatching: isHajj ? "لا يوجد حجاج مطابقون للفلاتر الحالية" : "لا يوجد معتمرون مطابقون للفلاتر الحالية",
    emptyTitle: isHajj ? "لا يوجد حجاج" : "لا يوجد معتمرون",
    emptySub: isHajj ? "ابدأ بإضافة حجاج لهذا البرنامج" : "ابدأ بإضافة معتمرين لهذا البرنامج",
    emptyFiltered: isHajj ? "لا يوجد حجاج بهذه الحالة" : "لا يوجد معتمرون بهذه الحالة",
    totalLabel: (count) => `الإجمالي — ${count} ${isHajj ? "حاج" : "معتمر"}`,
    signatureLabel: isHajj ? "توقيع الحاج" : "توقيع المعتمر",
  };
};
