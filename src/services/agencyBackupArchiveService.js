import PizZip from "pizzip";
import { getClientDisplayName } from "../utils/clientNames";
import { getRoomTypeLabel } from "../utils/programPackages";

const ROOMING_CITIES = [
  { key: "makkah", label: "مكة" },
  { key: "madinah", label: "المدينة" },
];

const README_BY_LANG = {
  ar: "هذه نسخة احتياطية من بيانات وكالتك في Rukn.\nيمكنك فتح ملفات Excel للمراجعة.\nملف backup-data.json مخصص للنظام ولا يجب تعديله إذا كنت تريد استيراد النسخة لاحقًا.",
  fr: "Ceci est une sauvegarde des données de votre agence dans Rukn.\nVous pouvez ouvrir les fichiers Excel pour consultation.\nLe fichier backup-data.json est destiné au système et ne doit pas être modifié si vous souhaitez restaurer la sauvegarde plus tard.",
  en: "This is a backup of your agency data from Rukn.\nYou can open the Excel files for review.\nThe backup-data.json file is used by the system and should not be edited if you want to restore this backup later.",
};

const text = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value).trim();
};

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstText = (...values) => {
  for (const value of values) {
    const normalized = text(value);
    if (normalized !== "") return normalized;
  }
  return "";
};

const normalizeLang = (lang) => (lang === "fr" || lang === "en" ? lang : "ar");

const safeSheetName = (name) => String(name || "Sheet")
  .replace(/[:\\/?*[\]]/g, " ")
  .trim()
  .slice(0, 31) || "Sheet";

const sanitizeFilePart = (value, fallback = "Agency") => {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
  return cleaned || fallback;
};

const dateStamp = () => new Date().toISOString().slice(0, 10);

const agencyDisplayName = (agency = {}) => firstText(
  agency.nameAr,
  agency.nameFr,
  agency.nameEn,
  agency.name,
  agency.agencyName,
  agency.companyName
);

const programDisplayName = (program = {}) => firstText(program.name, program.title, program.programName);

const programType = (program = {}) => firstText(
  program.typeLabel,
  program.programTypeLabel,
  program.programType,
  program.program_type,
  program.type,
  program.category
);

const programDeparture = (program = {}) => firstText(
  program.departure,
  program.departureDate,
  program.departure_date,
  program.startDate
);

const programReturn = (program = {}) => firstText(
  program.returnDate,
  program.return_date,
  program.endDate
);

const programHotel = (program = {}, city) => (
  city === "madinah"
    ? firstText(program.hotelMadina, program.hotel_madina, program.madinahHotel)
    : firstText(program.hotelMecca, program.hotel_mecca, program.makkahHotel)
);

const clientPassportNumber = (client = {}) => firstText(
  client.passport?.number,
  client.passportNumber,
  client.passportNo,
  client.passport_no
);

const clientCin = (client = {}) => firstText(
  client.cin,
  client.nationalId,
  client.national_id,
  client.passport?.cin,
  client.passport?.nationalId,
  client.passport?.national_id
);

const clientNationality = (client = {}) => firstText(client.nationality, client.passport?.nationality);
const clientBirthDate = (client = {}) => firstText(client.birthDate, client.birth_date, client.passport?.birthDate);

const genderLabel = (gender) => {
  const normalized = String(gender || "").toLowerCase();
  if (normalized === "male" || normalized === "m") return "ذكر";
  if (normalized === "female" || normalized === "f") return "أنثى";
  return text(gender);
};

const statusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "cleared" || normalized === "paid") return "مدفوع";
  if (normalized === "partial") return "جزئي";
  if (normalized === "unpaid") return "غير مدفوع";
  if (normalized === "issued" || normalized === "active") return "نشط";
  if (normalized === "trashed") return "في السلة";
  if (normalized === "deleted") return "محذوف";
  if (normalized === "archived") return "مؤرشف";
  return text(status);
};

const paymentClientId = (payment = {}) => firstText(payment.clientId, payment.client_id);

const paymentAmount = (payment = {}) => asNumber(payment.amount);

const paymentReceiptNumber = (payment = {}) => firstText(
  payment.receiptNo,
  payment.receiptNumber,
  payment.receipt_no,
  payment.receipt_number
);

const paymentMethod = (payment = {}) => firstText(payment.method, payment.paymentMethod, payment.payment_method);

const paymentNote = (payment = {}) => firstText(payment.note, payment.notes);

const clientRooming = (client = {}) => ({
  groupId: firstText(client.roomingGroupId, client.docs?.rooming?.groupId),
  groupName: firstText(client.roomingGroupName, client.docs?.rooming?.groupName),
  category: firstText(client.roomCategoryLabel, client.docs?.rooming?.categoryLabel, client.roomCategory, client.docs?.rooming?.category),
  groupSize: asNumber(client.roomingGroupSize ?? client.docs?.rooming?.groupSize),
  seatIndex: asNumber(client.roomingSeatIndex ?? client.docs?.rooming?.seatIndex),
});

const invoiceRecipientName = (invoice = {}) => {
  const recipient = invoice.recipientSnapshot || {};
  return firstText(
    recipient.companyName,
    recipient.clientName,
    recipient.name,
    invoice.recipientName,
    invoice.clientName
  );
};

const invoiceProgramName = (invoice = {}, programsById = new Map()) => {
  const program = programsById.get(firstText(invoice.programId, invoice.program_id));
  return firstText(invoice.programSnapshot?.programName, programDisplayName(program));
};

const invoiceAmount = (invoice = {}) => asNumber(
  invoice.amountSnapshot?.total ?? invoice.total ?? invoice.amount
);

const invoiceCurrency = (invoice = {}) => firstText(invoice.amountSnapshot?.currency, invoice.currency, "MAD");

const roomTypeLabel = (value) => firstText(getRoomTypeLabel(value), value);

const roomingCategoryLabel = (value) => {
  const normalized = String(value || "").trim();
  if (normalized === "male_only") return "رجال";
  if (normalized === "female_only") return "نساء";
  if (normalized === "family") return "عائلة";
  if (normalized === "mixed") return "مختلط";
  return text(value);
};

const buildProgramRows = ({ programs = [], clients = [] }) => {
  const counts = clients.reduce((map, client) => {
    const programId = firstText(client.programId, client.program_id);
    if (!programId) return map;
    map.set(programId, (map.get(programId) || 0) + 1);
    return map;
  }, new Map());

  return [
    ["معرف البرنامج", "اسم البرنامج", "النوع", "تاريخ الذهاب", "تاريخ الرجوع", "عدد المقاعد", "فندق مكة", "فندق المدينة", "شركة الطيران", "الحالة", "عدد المسجلين"],
    ...programs.map((program) => [
      text(program.id),
      programDisplayName(program),
      programType(program),
      programDeparture(program),
      programReturn(program),
      asNumber(program.seats ?? program.capacity),
      programHotel(program, "makkah"),
      programHotel(program, "madinah"),
      firstText(program.carrier, program.airline, program.airlineName),
      statusLabel(program.status || (program.archived ? "archived" : "active")),
      counts.get(text(program.id)) || 0,
    ]),
  ];
};

const buildClientRows = ({ clients = [], programsById = new Map(), paymentsByClient = new Map() }) => [
  ["معرف العميل", "الاسم", "البرنامج", "الهاتف", "الجنس", "رقم الجواز", "CIN", "الجنسية", "تاريخ الميلاد", "نوع الغرفة", "فندق مكة", "فندق المدينة", "السعر", "المدفوع", "المتبقي", "الحالة"],
  ...clients.map((client) => {
    const programId = firstText(client.programId, client.program_id);
    const program = programsById.get(programId);
    const total = asNumber(client.salePrice ?? client.sale_price ?? client.price);
    const paid = paymentsByClient.get(text(client.id)) || 0;
    return [
      text(client.id),
      getClientDisplayName(client),
      programDisplayName(program),
      firstText(client.phone, client.telephone, client.mobile),
      genderLabel(client.gender),
      clientPassportNumber(client),
      clientCin(client),
      clientNationality(client),
      clientBirthDate(client),
      firstText(client.roomTypeLabel, roomTypeLabel(client.roomType), client.room),
      firstText(client.hotelMecca, client.hotel_mecca),
      firstText(client.hotelMadina, client.hotel_madina),
      total,
      paid,
      Math.max(0, total - paid),
      statusLabel(client.archived ? "archived" : client.status),
    ];
  }),
];

const buildPaymentRows = ({ payments = [], clientsById = new Map(), programsById = new Map() }) => [
  ["معرف الدفعة", "رقم الوصل", "التاريخ", "المعتمر/الحاج", "البرنامج", "المبلغ", "طريقة الدفع", "المدفوع من طرف", "رقم الشيك", "الحالة", "ملاحظات"],
  ...payments.map((payment) => {
    const client = clientsById.get(paymentClientId(payment));
    const program = programsById.get(firstText(client?.programId, client?.program_id));
    return [
      text(payment.id),
      paymentReceiptNumber(payment),
      firstText(payment.date, payment.createdAt, payment.created_at),
      client ? getClientDisplayName(client) : "",
      programDisplayName(program),
      paymentAmount(payment),
      paymentMethod(payment),
      firstText(payment.paidBy, payment.paid_by),
      firstText(payment.chequeNumber, payment.checkNumber, payment.cheque_number, payment.check_number),
      statusLabel(payment.status),
      paymentNote(payment),
    ];
  }),
];

const buildInvoiceRows = ({ invoices = [], programsById = new Map() }) => [
  ["معرف الفاتورة", "رقم الفاتورة", "تاريخ الإصدار", "المستلم", "نوع المستلم", "البرنامج", "المبلغ", "العملة", "الحالة", "مراجع الأداء"],
  ...invoices.map((invoice) => [
    text(invoice.id),
    firstText(invoice.invoiceDisplayNumber, invoice.invoiceNumber, invoice.invoice_number),
    firstText(invoice.issueDate, invoice.issue_date, invoice.date),
    invoiceRecipientName(invoice),
    invoice.recipientType === "company" ? "شركة" : "عميل",
    invoiceProgramName(invoice, programsById),
    invoiceAmount(invoice),
    invoiceCurrency(invoice),
    statusLabel(invoice.status),
    Array.isArray(invoice.paymentReferences)
      ? invoice.paymentReferences.map((payment) => paymentReceiptNumber(payment) || text(payment.id)).filter(Boolean).join("، ")
      : "",
  ]),
];

const buildRoomingRowsFromClients = ({ clients = [], programsById = new Map() }) => clients
  .map((client) => {
    const rooming = clientRooming(client);
    if (!rooming.groupId && !rooming.groupName && !rooming.category) return null;
    const program = programsById.get(firstText(client.programId, client.program_id));
    return [
      "بيانات المعتمر",
      "",
      programDisplayName(program),
      "",
      firstText(client.roomTypeLabel, roomTypeLabel(client.roomType), client.room),
      rooming.category,
      rooming.groupName || rooming.groupId,
      rooming.groupSize || "",
      rooming.seatIndex || "",
      getClientDisplayName(client),
      genderLabel(client.gender),
      "",
    ];
  })
  .filter(Boolean);

const buildRoomingRowsFromSnapshots = ({ roomingSnapshots = [], clientsById = new Map(), programsById = new Map() }) => {
  const rows = [];
  roomingSnapshots.forEach((snapshot) => {
    const cityLabel = ROOMING_CITIES.find((item) => item.key === snapshot.location || item.key === snapshot.city)?.label
      || text(snapshot.location || snapshot.city);
    const program = programsById.get(firstText(snapshot.programId, snapshot.program_id));
    const programName = firstText(snapshot.programName, programDisplayName(program));
    (Array.isArray(snapshot.rooms) ? snapshot.rooms : []).forEach((room) => {
      const occupantIds = Array.isArray(room.occupantIds) ? room.occupantIds : [];
      if (!occupantIds.length) {
        rows.push([
          "مصمم التسكين",
          cityLabel,
          programName,
          text(room.hotel),
          roomTypeLabel(room.roomType),
          roomingCategoryLabel(room.category),
          firstText(room.roomNumber, room.roomingGroupName, room.id),
          asNumber(room.capacity),
          "",
          "",
          "",
          "",
        ]);
        return;
      }
      occupantIds.forEach((clientId, index) => {
        const client = clientsById.get(text(clientId));
        rows.push([
          "مصمم التسكين",
          cityLabel,
          programName,
          text(room.hotel),
          roomTypeLabel(room.roomType),
          roomingCategoryLabel(room.category),
          firstText(room.roomNumber, room.roomingGroupName, room.id),
          asNumber(room.capacity),
          index + 1,
          client ? getClientDisplayName(client) : text(clientId),
          client ? genderLabel(client.gender) : "",
          "",
        ]);
      });
    });
    (Array.isArray(snapshot.unassigned) ? snapshot.unassigned : []).forEach((item) => {
      const clientId = text(item.clientId || item.id);
      const client = clientsById.get(clientId);
      rows.push([
        "غير مدرج",
        cityLabel,
        programName,
        "",
        "",
        "",
        "",
        "",
        "",
        client ? getClientDisplayName(client) : clientId,
        client ? genderLabel(client.gender) : "",
        firstText(item.reason, item.note),
      ]);
    });
  });
  return rows;
};

const buildRoomingRows = ({ clients = [], roomingSnapshots = [], clientsById = new Map(), programsById = new Map() }) => [
  ["المصدر", "المدينة", "البرنامج", "الفندق", "نوع الغرفة", "تصنيف الغرفة", "رقم/اسم الغرفة", "السعة", "المقعد", "المعتمر/الحاج", "الجنس", "ملاحظة"],
  ...buildRoomingRowsFromClients({ clients, programsById }),
  ...buildRoomingRowsFromSnapshots({ roomingSnapshots, clientsById, programsById }),
];

const buildAgencyRows = ({ agency = {}, payload = {}, invoices = [], roomingSnapshots = [] }) => [
  ["الحقل", "القيمة"],
  ["اسم الوكالة", agencyDisplayName(agency)],
  ["الهاتف", firstText(agency.phone, agency.telephone)],
  ["البريد الإلكتروني", firstText(agency.email)],
  ["العنوان", firstText(agency.address, agency.addressAr, agency.addressFr)],
  ["المدينة", firstText(agency.city)],
  ["ICE", firstText(agency.ice, agency.ICE)],
  ["RC", firstText(agency.rc, agency.RC)],
  ["تاريخ التصدير", firstText(payload.exportedAt, new Date().toISOString())],
  ["إصدار النسخة", text(payload.version)],
  ["عدد البرامج", Array.isArray(payload.programs) ? payload.programs.length : 0],
  ["عدد المعتمرين والحجاج", Array.isArray(payload.clients) ? payload.clients.length : 0],
  ["عدد المدفوعات", Array.isArray(payload.payments) ? payload.payments.length : 0],
  ["عدد الفواتير", invoices.length],
  ["ملفات التسكين", roomingSnapshots.length],
];

const addEmptyHintIfNeeded = (rows) => {
  if (rows.length > 1) return rows;
  return [...rows, ["لا توجد بيانات"]];
};

const addWorkbook = (zip, XLSX, filename, sheetName, rows, widths = []) => {
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  const ws = XLSX.utils.aoa_to_sheet(addEmptyHintIfNeeded(rows));
  ws["!cols"] = widths.length
    ? widths.map((wch) => ({ wch }))
    : rows[0].map((header) => ({ wch: Math.max(14, Math.min(32, String(header || "").length + 8)) }));
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheetName));
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array", compression: true });
  zip.file(filename, Array.isArray(data) ? new Uint8Array(data) : data);
};

export const buildBackupArchiveFilename = (agency = {}) => (
  `Rukn-Backup-${sanitizeFilePart(agencyDisplayName(agency), "Agency")}-${dateStamp()}.zip`
);

export const collectLocalRoomingBackupSnapshots = ({ programs = [], agencyId = null } = {}) => {
  if (typeof window === "undefined" || !window.localStorage) return [];
  const snapshots = [];
  programs.forEach((program) => {
    ROOMING_CITIES.forEach(({ key }) => {
      const storageKeys = [
        agencyId ? `rukn_rooming_sheet_${agencyId}_${program.id}_${key}` : "",
        `rukn_rooming_sheet_${program.id}_${key}`,
      ].filter(Boolean);
      for (const storageKey of storageKeys) {
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.rooms)) continue;
          snapshots.push({
            source: "local",
            programId: program.id,
            programName: programDisplayName(program),
            location: key,
            rooms: parsed.rooms,
            unassigned: Array.isArray(parsed.unassigned) ? parsed.unassigned : [],
            roomLinks: Array.isArray(parsed.roomLinks) ? parsed.roomLinks : [],
            updatedAt: parsed.updatedAt || parsed.savedAt || "",
          });
          break;
        } catch {
          // Backup export should continue even if one local rooming cache is invalid.
        }
      }
    });
  });
  return snapshots;
};

export const mergeRoomingBackupSnapshots = (primary = [], fallback = []) => {
  const merged = new Map();
  [...fallback, ...primary].forEach((snapshot) => {
    const key = `${firstText(snapshot.programId, snapshot.program_id)}:${firstText(snapshot.location, snapshot.city)}`;
    if (!key || key === ":") return;
    const hasData = (Array.isArray(snapshot.rooms) && snapshot.rooms.length)
      || (Array.isArray(snapshot.unassigned) && snapshot.unassigned.length);
    if (hasData || !merged.has(key)) merged.set(key, snapshot);
  });
  return Array.from(merged.values());
};

export async function buildAgencyBackupArchive({
  payload,
  agency = {},
  programs = [],
  clients = [],
  payments = [],
  invoices = [],
  roomingSnapshots = [],
  lang = "ar",
}) {
  const XLSX = await import("xlsx");
  const zip = new PizZip();
  const programsById = new Map(programs.map((program) => [text(program.id), program]));
  const clientsById = new Map(clients.map((client) => [text(client.id), client]));
  const paymentsByClient = payments.reduce((map, payment) => {
    const clientId = paymentClientId(payment);
    if (!clientId) return map;
    map.set(clientId, (map.get(clientId) || 0) + paymentAmount(payment));
    return map;
  }, new Map());

  addWorkbook(zip, XLSX, "01-البرامج.xlsx", "البرامج", buildProgramRows({ programs, clients }), [18, 28, 16, 16, 16, 12, 24, 24, 18, 14, 14]);
  addWorkbook(zip, XLSX, "02-المعتمرون-والحجاج.xlsx", "المعتمرون والحجاج", buildClientRows({ clients, programsById, paymentsByClient }), [18, 28, 28, 16, 12, 18, 16, 16, 16, 16, 24, 24, 14, 14, 14, 14]);
  addWorkbook(zip, XLSX, "03-المدفوعات-والوصولات.xlsx", "المدفوعات والوصولات", buildPaymentRows({ payments, clientsById, programsById }), [18, 16, 16, 28, 28, 14, 18, 20, 18, 14, 28]);
  addWorkbook(zip, XLSX, "04-الفواتير.xlsx", "الفواتير", buildInvoiceRows({ invoices, programsById }), [18, 18, 16, 28, 14, 28, 14, 12, 14, 28]);
  addWorkbook(zip, XLSX, "05-التسكين.xlsx", "التسكين", buildRoomingRows({ clients, roomingSnapshots, clientsById, programsById }), [16, 12, 28, 24, 16, 16, 18, 10, 10, 28, 12, 28]);
  addWorkbook(zip, XLSX, "06-إعدادات-الوكالة.xlsx", "إعدادات الوكالة", buildAgencyRows({ agency, payload, invoices, roomingSnapshots }), [24, 42]);

  zip.file("backup-data.json", JSON.stringify(payload, null, 2));
  zip.file("README.txt", README_BY_LANG[normalizeLang(lang)]);

  return zip.generate({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
  });
}

const readAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(String(event.target?.result || ""));
  reader.onerror = () => reject(reader.error || new Error("تعذر قراءة الملف"));
  reader.readAsText(file);
});

const readAsArrayBuffer = (file) => {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result);
    reader.onerror = () => reject(reader.error || new Error("تعذر قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
};

const isZipFile = (file) => (
  /\.zip$/i.test(file?.name || "")
  || String(file?.type || "").toLowerCase().includes("zip")
);

export async function readBackupPayloadFromFile(file) {
  if (!isZipFile(file)) {
    return JSON.parse(await readAsText(file));
  }

  const zip = new PizZip(await readAsArrayBuffer(file));
  const backupEntry = zip.file("backup-data.json")
    || zip.file(/(^|\/)backup-data\.json$/i)[0];
  if (!backupEntry) throw new Error("ملف غير صالح");
  return JSON.parse(backupEntry.asText());
}
