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
    hidden: true,
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
    key: "represented_minors_loop",
    hidden: true,
    title: {
      ar: "القاصرون الذين ينوب عنهم هذا المعتمر",
      fr: "Mineurs représentés par ce pèlerin",
      en: "Minors represented by this pilgrim",
    },
    fields: [
      {
        token: "{{#represented_minors}}\n{{full_name}} - {{cin}} - {{passport_number}}\n{{/represented_minors}}",
        description: {
          ar: "مثال حلقة تكرار القاصرين الذين ينوب عنهم هذا المعتمر",
          fr: "Exemple de boucle répétable pour les mineurs représentés par ce pèlerin",
          en: "Example repeatable loop for minors represented by this pilgrim",
        },
      },
      {
        token: "{{#represented_minors}}",
        description: {
          ar: "بداية حلقة تكرار القاصرين. داخل جدول Word ضعها في أول خلية من الصف المراد تكراره.",
          fr: "Début de la boucle des mineurs. Dans un tableau Word, placez-la dans la première cellule de la ligne à répéter.",
          en: "Start of the minors loop. In a Word table, put it in the first cell of the row to repeat.",
        },
      },
      {
        token: "{{full_name}}",
        description: {
          ar: "داخل الحلقة: الاسم الكامل للقاصر",
          fr: "Dans la boucle : nom complet du mineur",
          en: "Inside the loop: minor full name",
        },
      },
      {
        token: "{{first_name}}",
        description: {
          ar: "داخل الحلقة: الاسم الشخصي للقاصر",
          fr: "Dans la boucle : prénom du mineur",
          en: "Inside the loop: minor first name",
        },
      },
      {
        token: "{{last_name}}",
        description: {
          ar: "داخل الحلقة: الاسم العائلي للقاصر",
          fr: "Dans la boucle : nom du mineur",
          en: "Inside the loop: minor last name",
        },
      },
      {
        token: "{{cin}}",
        description: {
          ar: "داخل الحلقة: رقم بطاقة التعريف للقاصر",
          fr: "Dans la boucle : CIN du mineur",
          en: "Inside the loop: minor national ID / CIN",
        },
      },
      {
        token: "{{passport_number}}",
        description: {
          ar: "داخل الحلقة: رقم جواز سفر القاصر",
          fr: "Dans la boucle : numéro de passeport du mineur",
          en: "Inside the loop: minor passport number",
        },
      },
      {
        token: "{{birth_date}}",
        description: {
          ar: "داخل الحلقة: تاريخ ميلاد القاصر",
          fr: "Dans la boucle : date de naissance du mineur",
          en: "Inside the loop: minor birth date",
        },
      },
      {
        token: "{{phone}}",
        description: {
          ar: "داخل الحلقة: هاتف القاصر",
          fr: "Dans la boucle : téléphone du mineur",
          en: "Inside the loop: minor phone",
        },
      },
      {
        token: "{{address}}",
        description: {
          ar: "داخل الحلقة: عنوان القاصر",
          fr: "Dans la boucle : adresse du mineur",
          en: "Inside the loop: minor address",
        },
      },
      {
        token: "{{gender}}",
        description: {
          ar: "داخل الحلقة: جنس القاصر",
          fr: "Dans la boucle : sexe du mineur",
          en: "Inside the loop: minor gender",
        },
      },
      {
        token: "{{nationality}}",
        description: {
          ar: "داخل الحلقة: جنسية القاصر",
          fr: "Dans la boucle : nationalité du mineur",
          en: "Inside the loop: minor nationality",
        },
      },
      {
        token: "{{file_number}}",
        description: {
          ar: "داخل الحلقة: رقم ملف القاصر",
          fr: "Dans la boucle : numéro de dossier du mineur",
          en: "Inside the loop: minor file number",
        },
      },
      {
        token: "{{/represented_minors}}",
        description: {
          ar: "نهاية حلقة التكرار. داخل جدول Word ضعها في آخر خلية من نفس الصف.",
          fr: "Fin de la boucle. Dans un tableau Word, placez-la dans la dernière cellule de la même ligne.",
          en: "End of the loop. In a Word table, put it in the last cell of the same row.",
        },
      },
      {
        token: "{{#represented_minors}} | {{full_name}} | {{cin}} | {{passport_number}} | {{/represented_minors}}",
        description: {
          ar: "مثال صف جدول Word: ضع بداية الحلقة في أول خلية ونهايتها في آخر خلية من نفس الصف ليتم تكرار الصف لكل قاصر.",
          fr: "Exemple de ligne de tableau Word : placez le début de la boucle dans la première cellule et la fin dans la dernière cellule de la même ligne.",
          en: "Word table row example: place the loop start in the first cell and the loop end in the last cell of the same row.",
        },
      },
    ],
  },
  {
    key: "represented_numbered_fields",
    title: { ar: "حقول النيابة", fr: "Champs de représentation", en: "Representation fields" },
    help: {
      ar: "استبدل number بـ 1 أو 2 أو 3 حسب ترتيب الشخص الذي ينوب عنه المعتمر. مثال: {{represented_1.full_name}}",
      fr: "Remplacez number par 1, 2 ou 3 selon l’ordre de la personne représentée. Exemple : {{represented_1.full_name}}",
      en: "Replace number with 1, 2, or 3 based on the represented person order. Example: {{represented_1.full_name}}",
    },
    fields: [
      {
        token: "{{represented_number.full_name}}",
        description: { ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" },
      },
      {
        token: "{{represented_number.first_name}}",
        description: { ar: "الاسم الشخصي", fr: "Prénom", en: "First name" },
      },
      {
        token: "{{represented_number.last_name}}",
        description: { ar: "الاسم العائلي", fr: "Nom", en: "Last name" },
      },
      {
        token: "{{represented_number.passport_number}}",
        description: { ar: "رقم جواز السفر", fr: "Numéro de passeport", en: "Passport number" },
      },
      {
        token: "{{represented_number.cin}}",
        description: { ar: "رقم البطاقة الوطنية", fr: "CIN", en: "National ID / CIN" },
      },
      {
        token: "{{represented_number.nationality}}",
        description: { ar: "الجنسية", fr: "Nationalité", en: "Nationality" },
      },
      {
        token: "{{represented_number.address}}",
        description: { ar: "العنوان", fr: "Adresse", en: "Address" },
      },
      {
        token: "{{represented_number.birth_date}}",
        description: { ar: "تاريخ الازدياد", fr: "Date de naissance", en: "Birth date" },
      },
      {
        token: "{{represented_number.file_number}}",
        description: { ar: "رقم الملف", fr: "Numéro de dossier", en: "File number" },
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
