export const MEAL_PLAN_OPTIONS = Object.freeze([
  { value: "none", label: "بدون" },
  { value: "breakfast", label: "إفطار" },
  { value: "half_board", label: "نصف إعاشة — إفطار وعشاء" },
  { value: "full_board", label: "إعاشة كاملة — إفطار وغداء وعشاء" },
]);

const labels = new Map(MEAL_PLAN_OPTIONS.map((option) => [option.value, option.label]));
const aliases = new Map([
  ["بدون", "none"], ["بدون وجبات", "none"], ["no meals", "none"], ["none", "none"],
  ["إفطار", "breakfast"], ["فطور", "breakfast"], ["breakfast", "breakfast"],
  ["نصف إعاشة", "half_board"], ["نصف إعاشة — إفطار وعشاء", "half_board"], ["half board", "half_board"], ["half_board", "half_board"],
  ["إعاشة كاملة", "full_board"], ["إعاشة كاملة — إفطار وغداء وعشاء", "full_board"], ["full board", "full_board"], ["full_board", "full_board"],
]);

const clean = (value) => String(value ?? "").trim();

export const normalizeMealPlan = (value) => {
  const text = clean(value);
  if (!text) return "";
  return aliases.get(text.toLowerCase()) || text;
};

export const formatMealPlan = (value) => {
  const normalized = normalizeMealPlan(value);
  return labels.get(normalized) || normalized;
};

export const getMealPlanSelectOptions = (currentValue = "") => {
  const normalized = normalizeMealPlan(currentValue);
  if (!normalized || labels.has(normalized)) return MEAL_PLAN_OPTIONS;
  return [{ value: normalized, label: normalized }, ...MEAL_PLAN_OPTIONS];
};
