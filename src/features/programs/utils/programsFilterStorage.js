export const PROGRAMS_FILTERS_STORAGE_VERSION = 1;
export const PROGRAMS_TYPE_FILTER_KEYS = new Set(["all", "umrah", "hajj"]);
export const PROGRAMS_STATUS_FILTER_KEYS = new Set(["all", "cleared", "not_cleared", "full", "not_full"]);

export const getProgramsFiltersStorageKey = (agencyId = null) => (
  `rukn_programs_filters_${String(agencyId || "local")}`
);

export const normalizeProgramsYearFilter = (value, currentYear) => {
  const text = String(value ?? "").trim();
  if (text === "all") return "all";
  if (/^\d{4}$/.test(text)) return text;
  return String(currentYear);
};

export const normalizeProgramsFilterOption = (value, allowedKeys, fallback = "all") => {
  const text = String(value ?? "").trim();
  return allowedKeys.has(text) ? text : fallback;
};

export const getDefaultProgramsFilters = (currentYear) => ({
  search: "",
  selectedYear: String(currentYear),
  programTypeFilter: "all",
  programStatusFilter: "all",
});

export const normalizeProgramsFilters = (value, currentYear) => {
  const source = value && typeof value === "object" ? value : {};
  return {
    search: typeof source.search === "string" ? source.search : "",
    selectedYear: normalizeProgramsYearFilter(
      source.selectedYear ?? source.yearFilter ?? source.year,
      currentYear
    ),
    programTypeFilter: normalizeProgramsFilterOption(
      source.programTypeFilter ?? source.typeFilter ?? source.type,
      PROGRAMS_TYPE_FILTER_KEYS
    ),
    programStatusFilter: normalizeProgramsFilterOption(
      source.programStatusFilter ?? source.statusFilter ?? source.status,
      PROGRAMS_STATUS_FILTER_KEYS
    ),
  };
};

export const readProgramsFiltersFromStorage = (storageKey, currentYear) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return getDefaultProgramsFilters(currentYear);
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return getDefaultProgramsFilters(currentYear);
    return normalizeProgramsFilters(JSON.parse(raw), currentYear);
  } catch (error) {
    console.warn("[ProgramsPage] Failed to read saved filters", error);
    return getDefaultProgramsFilters(currentYear);
  }
};

export const writeProgramsFiltersToStorage = (storageKey, filters, currentYear) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: PROGRAMS_FILTERS_STORAGE_VERSION,
        ...normalizeProgramsFilters(filters, currentYear),
      })
    );
  } catch (error) {
    console.warn("[ProgramsPage] Failed to save filters", error);
  }
};
