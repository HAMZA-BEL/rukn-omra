import { generateOfficialRuknPosterPng } from "../../../services/officialRuknPosterGenerator";
import { RUKN_OFFICIAL_LIGHT_META } from "../../registry";

export const templateMeta = RUKN_OFFICIAL_LIGHT_META;

export const renderPoster = async ({
  program,
  agency = {},
  locale = "ar",
  lang,
} = {}) => (
  generateOfficialRuknPosterPng({
    program,
    agency,
    agencyLogoUrl: agency?.logoUrl || agency?.logo_url || "",
    lang: lang || locale || "ar",
  })
);
