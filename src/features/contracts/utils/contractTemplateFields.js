export const CONTRACT_TEMPLATE_TYPES = ["umrah", "hajj"];

export const CONTRACT_TEMPLATE_LABELS = {
  umrah: {
    ar: "قالب عقد العمرة",
    fr: "Modèle de contrat Omra",
    en: "Umrah contract template",
  },
  hajj: {
    ar: "قالب عقد الحج",
    fr: "Modèle de contrat Hajj",
    en: "Hajj contract template",
  },
};

export const CONTRACT_TEMPLATE_FIELD_GROUPS = [
  {
    key: "pilgrim",
    title: { ar: "المعتمر", fr: "Pèlerin", en: "Pilgrim" },
    fields: [
      {
        placeholder: "{{pilgrim.full_name}}",
        description: {
          ar: "الاسم الكامل من الاسم الشخصي والعائلي",
          fr: "Nom complet à partir du prénom et du nom",
          en: "Full name from first name + last name",
        },
      },
      {
        placeholder: "{{pilgrim.first_name}}",
        description: { ar: "الاسم الشخصي", fr: "Prénom", en: "First name" },
      },
      {
        placeholder: "{{pilgrim.last_name}}",
        description: { ar: "الاسم العائلي", fr: "Nom", en: "Last name" },
      },
      {
        placeholder: "{{pilgrim.cin}}",
        description: { ar: "رقم البطاقة الوطنية", fr: "CIN", en: "National ID / CIN" },
      },
      {
        placeholder: "{{pilgrim.passport_number}}",
        description: { ar: "رقم جواز السفر", fr: "Numéro de passeport", en: "Passport number" },
      },
      {
        placeholder: "{{pilgrim.address}}",
        description: { ar: "عنوان المعتمر", fr: "Adresse du pèlerin", en: "Pilgrim address" },
      },
      {
        placeholder: "{{pilgrim.birth_date}}",
        description: { ar: "تاريخ الازدياد", fr: "Date de naissance", en: "Birth date" },
      },
      {
        placeholder: "{{pilgrim.phone}}",
        description: { ar: "رقم الهاتف", fr: "Téléphone", en: "Phone" },
      },
      {
        placeholder: "{{pilgrim.room_type}}",
        description: {
          ar: "نوع الغرفة المختار للمعتمر",
          fr: "Type de chambre choisi pour le pèlerin",
          en: "Room type selected for the pilgrim",
        },
      },
    ],
  },
  {
    key: "program",
    title: { ar: "البرنامج", fr: "Programme", en: "Program" },
    fields: [
      { placeholder: "{{program.name}}", description: { ar: "اسم البرنامج", fr: "Nom du programme", en: "Program name" } },
      { placeholder: "{{program.type}}", description: { ar: "نوع البرنامج", fr: "Type de programme", en: "Program type" } },
      { placeholder: "{{program.departure_date}}", description: { ar: "تاريخ الذهاب", fr: "Date de départ", en: "Departure date" } },
      { placeholder: "{{program.return_date}}", description: { ar: "تاريخ الرجوع", fr: "Date de retour", en: "Return date" } },
      { placeholder: "{{program.airline}}", description: { ar: "شركة الطيران", fr: "Compagnie aérienne", en: "Airline" } },
    ],
  },
  {
    key: "hotels",
    title: { ar: "الفنادق", fr: "Hôtels", en: "Hotels" },
    fields: [
      { placeholder: "{{program.madinah_hotel}}", description: { ar: "فندق المدينة", fr: "Hôtel à Médine", en: "Madinah hotel" } },
      { placeholder: "{{program.madinah_checkin}}", description: { ar: "دخول فندق المدينة", fr: "Arrivée hôtel Médine", en: "Madinah check-in" } },
      { placeholder: "{{program.madinah_checkout}}", description: { ar: "خروج فندق المدينة", fr: "Départ hôtel Médine", en: "Madinah check-out" } },
      { placeholder: "{{program.makkah_hotel}}", description: { ar: "فندق مكة", fr: "Hôtel à La Mecque", en: "Makkah hotel" } },
      { placeholder: "{{program.makkah_checkin}}", description: { ar: "دخول فندق مكة", fr: "Arrivée hôtel La Mecque", en: "Makkah check-in" } },
      { placeholder: "{{program.makkah_checkout}}", description: { ar: "خروج فندق مكة", fr: "Départ hôtel La Mecque", en: "Makkah check-out" } },
    ],
  },
  {
    key: "payment",
    title: { ar: "الأداء", fr: "Paiement", en: "Payment" },
    fields: [
      { placeholder: "{{payment.sale_price}}", description: { ar: "ثمن البيع", fr: "Prix de vente", en: "Sale price" } },
      { placeholder: "{{payment.paid_amount}}", description: { ar: "المبلغ المؤدى", fr: "Montant payé", en: "Paid amount" } },
      { placeholder: "{{payment.remaining_amount}}", description: { ar: "المبلغ المتبقي", fr: "Montant restant", en: "Remaining amount" } },
    ],
  },
  {
    key: "representation",
    title: { ar: "النيابة", fr: "Représentation", en: "Representation" },
    fields: [
      {
        placeholder: "{{represented_minors_list}}",
        description: {
          ar: "قائمة القاصرين الذين ينوب عنهم هذا المعتمر",
          fr: "Liste des mineurs représentés par ce pèlerin",
          en: "List of minors represented by this pilgrim",
        },
      },
      {
        placeholder: "{{represented_minors_count}}",
        description: {
          ar: "عدد القاصرين الذين ينوب عنهم هذا المعتمر",
          fr: "Nombre de mineurs représentés par ce pèlerin",
          en: "Number of minors represented by this pilgrim",
        },
      },
      {
        placeholder: "{{represented_minors_details}}",
        description: {
          ar: "تفاصيل القاصرين مع أرقام الجواز أو البطاقة إن وجدت",
          fr: "Détails des mineurs avec passeport ou CIN si disponible",
          en: "Minor details with passport or national ID if available",
        },
      },
    ],
  },
  {
    key: "agency",
    title: { ar: "الوكالة", fr: "Agence", en: "Agency" },
    fields: [
      { placeholder: "{{agency.name}}", description: { ar: "اسم الوكالة", fr: "Nom de l’agence", en: "Agency name" } },
      { placeholder: "{{agency.address}}", description: { ar: "عنوان الوكالة", fr: "Adresse de l’agence", en: "Agency address" } },
      { placeholder: "{{agency.phone}}", description: { ar: "هاتف الوكالة", fr: "Téléphone de l’agence", en: "Agency phone" } },
      { placeholder: "{{agency.email}}", description: { ar: "بريد الوكالة", fr: "Email de l’agence", en: "Agency email" } },
      { placeholder: "{{agency.ice}}", description: { ar: "رقم ICE", fr: "ICE", en: "ICE" } },
      { placeholder: "{{agency.bank_name}}", description: { ar: "اسم البنك", fr: "Nom de la banque", en: "Bank name" } },
      { placeholder: "{{agency.rib}}", description: { ar: "رقم RIB", fr: "RIB", en: "RIB" } },
    ],
  },
];
