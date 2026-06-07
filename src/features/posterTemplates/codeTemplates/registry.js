import { getProgramKind } from "../../../utils/participantTerminology";

export const OFFICIAL_RUKN_CODE_TEMPLATE_KEY = "rukn_official_light";
export const TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY = "tiznit_voyages_signature";
export const TIZNIT_VOYAGES_HAJJ_TEMPLATE_KEY = "tiznit_voyages_hajj";

export const RUKN_OFFICIAL_LIGHT_META = {
  key: OFFICIAL_RUKN_CODE_TEMPLATE_KEY,
  type: "official",
  name: {
    ar: "قالب ركن الرسمي",
    fr: "Modèle officiel Rukn",
    en: "Official Rukn Template",
  },
  supportedProgramTypes: ["umrah", "hajj"],
  maxLevels: 5,
};

export const TIZNIT_VOYAGES_SIGNATURE_META = {
  key: TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY,
  type: "agency_private",
  name: {
    ar: "قالب تيزنيت أسفار",
    fr: "Modèle Tiznit Voyages",
    en: "Tiznit Voyages Template",
  },
  supportedProgramTypes: ["umrah"],
  maxLevels: 5,
};

export const TIZNIT_VOYAGES_HAJJ_META = {
  key: TIZNIT_VOYAGES_HAJJ_TEMPLATE_KEY,
  type: "agency_private",
  name: {
    ar: "قالب تيزنيت أسفار للحج",
    fr: "Modèle Hajj Tiznit Voyages",
    en: "Tiznit Voyages Hajj Template",
  },
  supportedProgramTypes: ["hajj"],
  maxLevels: 4,
};

const CODE_POSTER_TEMPLATE_REGISTRY = {
  [OFFICIAL_RUKN_CODE_TEMPLATE_KEY]: {
    meta: RUKN_OFFICIAL_LIGHT_META,
    load: () => import("./official/ruknOfficialLight"),
  },
  [TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY]: {
    meta: TIZNIT_VOYAGES_SIGNATURE_META,
    load: () => import("./agencies/tiznitVoyages"),
  },
  [TIZNIT_VOYAGES_HAJJ_TEMPLATE_KEY]: {
    meta: TIZNIT_VOYAGES_HAJJ_META,
    load: () => import("./agencies/tiznitVoyages/hajj"),
  },
};

const warnUnknownTemplateKey = (templateKey) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[CodePosterTemplates] Unknown code poster template key: ${templateKey}`);
  }
};

export const getCodePosterTemplateMeta = (templateKey = "") => {
  if (!templateKey) {
    return Object.values(CODE_POSTER_TEMPLATE_REGISTRY).map((entry) => entry.meta);
  }
  const entry = CODE_POSTER_TEMPLATE_REGISTRY[String(templateKey || "")];
  if (!entry) return null;
  return entry.meta;
};

export const getCodePosterTemplateByKey = (templateKey) => {
  const key = String(templateKey || "");
  const entry = CODE_POSTER_TEMPLATE_REGISTRY[key];
  if (!entry) {
    warnUnknownTemplateKey(key);
    return null;
  }
  return entry;
};

export const resolveCodePosterTemplateKey = (templateKey, options = {}) => {
  const key = String(templateKey || "");
  if (
    key === TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY
    || key === TIZNIT_VOYAGES_HAJJ_TEMPLATE_KEY
  ) {
    const programKind = getProgramKind(options?.program, null, {
      allowNameFallback: true,
      defaultKind: "",
    });
    if (programKind === "hajj") return TIZNIT_VOYAGES_HAJJ_TEMPLATE_KEY;
    if (programKind === "umrah") return TIZNIT_VOYAGES_SIGNATURE_TEMPLATE_KEY;
  }
  return key;
};

export const loadCodePosterTemplate = async (templateKey, options = {}) => {
  const entry = getCodePosterTemplateByKey(resolveCodePosterTemplateKey(templateKey, options));
  if (!entry) return null;
  return entry.load();
};
