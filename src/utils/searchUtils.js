export const normalizeSearchText = (value) => String(value ?? "").trim().toLowerCase();

export const includesSearch = (value, query) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  return normalizeSearchText(value).includes(normalizedQuery);
};

const flattenSearchValues = (values) => values.flatMap((value) => (
  Array.isArray(value) ? flattenSearchValues(value) : [value]
));

export const buildSearchText = (...values) => (
  flattenSearchValues(values)
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ")
);
