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
    help: {
      ar: "pilgrim.* تخص العميل الرئيسي في العقد. في عقد القاصر المرتبط بولي/ممثل تعرض بيانات الولي أو الممثل.",
      fr: "pilgrim.* correspond au client principal du contrat. Pour un mineur lié à un tuteur/représentant, ces champs affichent le tuteur ou représentant.",
      en: "pilgrim.* is the main client in the contract. For a minor linked to a guardian/representative, these fields show the guardian or representative.",
    },
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
    key: "main_client_aliases",
    title: { ar: "أسماء بديلة للعميل الرئيسي", fr: "Alias du client principal", en: "Main client aliases" },
    help: {
      ar: "هذه الحقول مرادفات آمنة لبيانات العميل الرئيسي حتى تبقى القوالب القديمة متوافقة.",
      fr: "Ces champs sont des alias sûrs des données du client principal pour garder les anciens modèles compatibles.",
      en: "These fields are safe aliases for the main client data to keep older templates compatible.",
    },
    fields: [
      {
        placeholder: "{{client.full_name}}",
        description: { ar: "الاسم الكامل للعميل الرئيسي", fr: "Nom complet du client principal", en: "Main client full name" },
      },
      {
        placeholder: "{{guardian.full_name}}",
        description: { ar: "الاسم الكامل للولي/الممثل عند وجود قاصر", fr: "Nom complet du tuteur/représentant si mineur", en: "Guardian/representative full name when a minor is involved" },
      },
      {
        placeholder: "{{representative.full_name}}",
        description: { ar: "الاسم الكامل لمن ينوب عن القاصر", fr: "Nom complet du représentant du mineur", en: "Full name of the minor representative" },
      },
      {
        placeholder: "{{full_name}}",
        description: { ar: "الاسم الكامل للعميل الرئيسي بدون بادئة", fr: "Nom complet du client principal sans préfixe", en: "Main client full name without a prefix" },
      },
      {
        placeholder: "{{passport_number}}",
        description: { ar: "رقم جواز سفر العميل الرئيسي بدون بادئة", fr: "Passeport du client principal sans préfixe", en: "Main client passport number without a prefix" },
      },
      {
        placeholder: "{{cin}}",
        description: { ar: "رقم البطاقة الوطنية للعميل الرئيسي بدون بادئة", fr: "CIN du client principal sans préfixe", en: "Main client CIN without a prefix" },
      },
      {
        placeholder: "{{birth_date}}",
        description: { ar: "تاريخ ازدياد العميل الرئيسي بدون بادئة", fr: "Date de naissance du client principal sans préfixe", en: "Main client birth date without a prefix" },
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
      { placeholder: "{{program.route}}", description: { ar: "خط الرحلة", fr: "Itinéraire", en: "Travel route" } },
      { placeholder: "{{program.travel_route}}", description: { ar: "خط الرحلة", fr: "Itinéraire", en: "Travel route" } },
      { placeholder: "{{program.itinerary}}", description: { ar: "مسار الرحلة", fr: "Itinéraire", en: "Itinerary" } },
      { placeholder: "{{program.route_text}}", description: { ar: "نص خط الرحلة", fr: "Texte de l’itinéraire", en: "Route text" } },
      { placeholder: "{{program.travelRoute}}", description: { ar: "خط الرحلة", fr: "Itinéraire", en: "Travel route" } },
      { placeholder: "{{program.routeText}}", description: { ar: "نص خط الرحلة", fr: "Texte de l’itinéraire", en: "Route text" } },
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
    help: {
      ar: "represented_minors تخص قائمة القاصرين الذين ينوب عنهم العميل الرئيسي.",
      fr: "represented_minors correspond à la liste des mineurs représentés par le client principal.",
      en: "represented_minors is the list of minors represented by the main client.",
    },
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
    key: "minor_aliases",
    title: { ar: "القاصر الأول", fr: "Premier mineur", en: "First minor" },
    help: {
      ar: "minor.* يعرض بيانات أول قاصر في قائمة النيابة. إذا لم يوجد قاصر تبقى هذه الحقول فارغة.",
      fr: "minor.* affiche les données du premier mineur représenté. S’il n’y a pas de mineur, ces champs restent vides.",
      en: "minor.* shows the first represented minor. If there is no minor, these fields stay empty.",
    },
    fields: [
      {
        placeholder: "{{minor.full_name}}",
        description: { ar: "الاسم الكامل لأول قاصر", fr: "Nom complet du premier mineur", en: "First minor full name" },
      },
      {
        placeholder: "{{minor.birth_date}}",
        description: { ar: "تاريخ ازدياد أول قاصر", fr: "Date de naissance du premier mineur", en: "First minor birth date" },
      },
      {
        placeholder: "{{minor.passport_number}}",
        description: { ar: "رقم جواز سفر أول قاصر", fr: "Passeport du premier mineur", en: "First minor passport number" },
      },
      {
        placeholder: "{{minor.cin}}",
        description: { ar: "رقم البطاقة الوطنية لأول قاصر إن وجد", fr: "CIN du premier mineur si disponible", en: "First minor CIN if available" },
      },
      {
        placeholder: "{{minor.age}}",
        description: { ar: "سن أول قاصر", fr: "Âge du premier mineur", en: "First minor age" },
      },
      {
        placeholder: "{{minor.relationship}}",
        description: { ar: "صلة أول قاصر بالولي/الممثل", fr: "Lien du premier mineur avec le tuteur/représentant", en: "First minor relationship to guardian/representative" },
      },
    ],
  },
  {
    key: "represented_minors_loop",
    title: {
      ar: "القاصرون الذين ينوب عنهم هذا المعتمر",
      fr: "Mineurs représentés par ce pèlerin",
      en: "Minors represented by this pilgrim",
    },
    help: {
      ar: "داخل الحلقة استعمل الحقول بدون بادئة مثل {{full_name}} و {{relationship}}.",
      fr: "Dans la boucle, utilisez les champs sans préfixe comme {{full_name}} et {{relationship}}.",
      en: "Inside the loop, use fields without a prefix such as {{full_name}} and {{relationship}}.",
    },
    fields: [
      {
        token: "{{#represented_minors}}\n{{full_name}} - {{relationship}} - {{cin}} - {{passport_number}}\n{{/represented_minors}}",
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
        token: "{{age}}",
        description: {
          ar: "داخل الحلقة: سن القاصر",
          fr: "Dans la boucle : âge du mineur",
          en: "Inside the loop: minor age",
        },
      },
      {
        token: "{{relationship}}",
        description: {
          ar: "داخل الحلقة: صلة القاصر بالولي/الممثل",
          fr: "Dans la boucle : lien avec le tuteur/représentant",
          en: "Inside the loop: relationship to guardian/representative",
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
        token: "{{#represented_minors}} | {{full_name}} | {{relationship}} | {{cin}} | {{passport_number}} | {{/represented_minors}}",
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
      ar: "هذه أمثلة للقاصر الأول. لاستعمال القاصر الثاني أو الثالث غيّر الرقم 1 إلى 2 أو 3 حسب الترتيب.",
      fr: "Ces exemples concernent le premier mineur. Pour le deuxième ou troisième mineur, remplacez 1 par 2 ou 3 selon l’ordre.",
      en: "These examples target the first minor. For the second or third minor, change 1 to 2 or 3 based on order.",
    },
    fields: [
      {
        token: "{{represented_1.full_name}}",
        description: { ar: "الاسم الكامل", fr: "Nom complet", en: "Full name" },
      },
      {
        token: "{{represented_1.first_name}}",
        description: { ar: "الاسم الشخصي", fr: "Prénom", en: "First name" },
      },
      {
        token: "{{represented_1.last_name}}",
        description: { ar: "الاسم العائلي", fr: "Nom", en: "Last name" },
      },
      {
        token: "{{represented_1.passport_number}}",
        description: { ar: "رقم جواز السفر", fr: "Numéro de passeport", en: "Passport number" },
      },
      {
        token: "{{represented_1.cin}}",
        description: { ar: "رقم البطاقة الوطنية", fr: "CIN", en: "National ID / CIN" },
      },
      {
        token: "{{represented_1.nationality}}",
        description: { ar: "الجنسية", fr: "Nationalité", en: "Nationality" },
      },
      {
        token: "{{represented_1.address}}",
        description: { ar: "العنوان", fr: "Adresse", en: "Address" },
      },
      {
        token: "{{represented_1.birth_date}}",
        description: { ar: "تاريخ الازدياد", fr: "Date de naissance", en: "Birth date" },
      },
      {
        token: "{{represented_1.age}}",
        description: { ar: "السن", fr: "Âge", en: "Age" },
      },
      {
        token: "{{represented_1.relationship}}",
        description: { ar: "صلة القاصر بالولي/الممثل", fr: "Lien avec le tuteur/représentant", en: "Relationship to guardian/representative" },
      },
      {
        token: "{{represented_1.file_number}}",
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
