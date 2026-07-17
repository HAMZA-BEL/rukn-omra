import {
  REPRESENTED_BY_RELATIONSHIPS,
  evaluateRepresentativeEligibility,
  getClientGender,
  getRepresentativeCandidateOptions,
  getRepresentativeDisabledReasonLabel,
  getRepresentativeRelationshipFieldState,
  getRelationshipsForCompanionGender,
  getSameProgramRepresentativeOptions,
  isRepresentativeRelationshipAllowedForGender,
  reconcileRepresentativeRelationshipForCompanionGender,
} from "./clientRepresentation";

const REFERENCE_DATE = new Date(2026, 6, 17);

const makeClient = (overrides = {}) => ({
  id: "adult-1",
  agencyId: "agency-1",
  programId: "program-1",
  travelGroupId: null,
  gender: "male",
  active: true,
  archived: false,
  deleted: false,
  passport: {
    number: "P123456",
    birthDate: "1990-01-01",
  },
  ...overrides,
});

const scope = (overrides = {}) => ({
  agencyId: "agency-1",
  programId: "program-1",
  travelGroupId: null,
  enforceTravelGroup: false,
  currentClientId: "minor-1",
  referenceDate: REFERENCE_DATE,
  ...overrides,
});

const candidates = (clients, overrides = {}) => getRepresentativeCandidateOptions({
  clients,
  ...scope(overrides),
});

test("a complete adult is visible and selectable", () => {
  const [candidate] = candidates([makeClient()]);
  expect(candidate.visible).toBe(true);
  expect(candidate.selectable).toBe(true);
  expect(candidate.disabledReason).toBe("");
});

test.each([
  [
    "missing_birth_date",
    "تاريخ الميلاد غير مسجل",
    { passport: { number: "P1", birthDate: "" } },
  ],
  [
    "missing_gender",
    "الجنس غير مسجل",
    { gender: "", passport: { number: "P1", birthDate: "1990-01-01", gender: "" } },
  ],
  [
    "minor",
    "قاصر — لا يمكن اختياره مرافقًا",
    { passport: { number: "P1", birthDate: "2010-01-01" } },
  ],
  [
    "missing_passport",
    "رقم الجواز غير مسجل",
    { passport: { number: "", birthDate: "1990-01-01" } },
  ],
  [
    "inactive",
    "العميل غير نشط",
    { active: false },
  ],
])("shows but disables a candidate for %s", (reason, arabicLabel, patch) => {
  const [candidate] = candidates([makeClient(patch)]);
  expect(candidate.visible).toBe(true);
  expect(candidate.selectable).toBe(false);
  expect(candidate.disabledReason).toBe(reason);
  expect(getRepresentativeDisabledReasonLabel(reason, "ar")).toBe(arabicLabel);
});

test.each([
  ["agency_mismatch", { agencyId: "agency-2" }],
  ["program_mismatch", { programId: "program-2" }],
  ["self_candidate", { id: "minor-1" }],
  ["deleted_client", { deleted: true }],
  ["archived_client", { archived: true }],
])("hides a candidate for %s", (reason, patch) => {
  const evaluation = evaluateRepresentativeEligibility(makeClient(patch), scope());
  expect(evaluation.visible).toBe(false);
  expect(evaluation.hiddenReason).toBe(reason);
  expect(candidates([makeClient(patch)])).toHaveLength(0);
});

test("does not enforce travel groups for an Umrah context without an actual group", () => {
  const candidate = makeClient({ travelGroupId: "legacy-or-unrelated-group" });
  const [evaluation] = candidates([candidate], {
    travelGroupId: null,
    enforceTravelGroup: false,
  });
  expect(evaluation.selectable).toBe(true);
  expect(evaluation.disabledReason).not.toBe("travel_group_mismatch");
});

test("shows a different-group Hajj candidate disabled when an actual group is enforced", () => {
  const [candidate] = candidates([makeClient({ travelGroupId: "group-2" })], {
    travelGroupId: "group-1",
    enforceTravelGroup: true,
  });
  expect(candidate.visible).toBe(true);
  expect(candidate.selectable).toBe(false);
  expect(candidate.disabledReason).toBe("travel_group_mismatch");
  expect(getRepresentativeDisabledReasonLabel(candidate.disabledReason, "ar")).toBe("ليس ضمن فوج السفر الحالي");
});

test("normalizes string and numeric travel group identifiers safely", () => {
  const [candidate] = candidates([makeClient({ travelGroupId: 42 })], {
    travelGroupId: "42",
    enforceTravelGroup: true,
  });
  expect(candidate.selectable).toBe(true);
});

test("uses the snake-case group id when the camel-case alias is empty", () => {
  const [candidate] = candidates([makeClient({ travelGroupId: "", travel_group_id: "group-1" })], {
    travelGroupId: "group-1",
    enforceTravelGroup: true,
  });
  expect(candidate.selectable).toBe(true);
});

test("adding a birth date recomputes a visible candidate from disabled to selectable", () => {
  const incomplete = makeClient({ passport: { number: "P1", birthDate: "" } });
  expect(candidates([incomplete])[0].disabledReason).toBe("missing_birth_date");
  const completed = { ...incomplete, passport: { ...incomplete.passport, birthDate: "1990-01-01" } };
  expect(candidates([completed])[0].selectable).toBe(true);
});

test("adding gender recomputes a visible candidate from disabled to selectable", () => {
  const incomplete = makeClient({ gender: "" });
  expect(candidates([incomplete])[0].disabledReason).toBe("missing_gender");
  expect(candidates([{ ...incomplete, gender: "female" }])[0].selectable).toBe(true);
});

test("a previously selected companion remains visible when birth date is removed", () => {
  const selectedId = "adult-1";
  const incomplete = makeClient({ passport: { number: "P1", birthDate: "" } });
  const selected = candidates([incomplete]).find((candidate) => candidate.clientId === selectedId);
  expect(selected).toBeDefined();
  expect(selected.selectable).toBe(false);
  expect(selected.disabledReason).toBe("missing_birth_date");
});

test("disabled reason priority is birth date, gender, minor, passport, inactive, then group", () => {
  const candidate = makeClient({
    gender: "",
    active: false,
    travelGroupId: "group-2",
    passport: { number: "", birthDate: "" },
  });
  const evaluation = evaluateRepresentativeEligibility(candidate, scope({
    travelGroupId: "group-1",
    enforceTravelGroup: true,
  }));
  expect(evaluation.disabledReason).toBe("missing_birth_date");
});

test("the compatibility helper still returns selectable clients only", () => {
  const complete = makeClient({ id: "complete" });
  const incomplete = makeClient({ id: "incomplete", passport: { number: "P2", birthDate: "" } });
  expect(getSameProgramRepresentativeOptions({
    clients: [complete, incomplete],
    ...scope(),
  }).map((client) => client.id)).toEqual(["complete"]);
});

test("eligibility changes do not mutate the deferred relationship list", () => {
  const originalRelationships = REPRESENTED_BY_RELATIONSHIPS.map((item) => item.value);
  candidates([makeClient()]);
  expect(REPRESENTED_BY_RELATIONSHIPS.map((item) => item.value)).toEqual(originalRelationships);
});

test("relationship catalog has unique stable values, exact Nusuk labels, and gender metadata", () => {
  const values = REPRESENTED_BY_RELATIONSHIPS.map((item) => item.value);
  const nusukValues = REPRESENTED_BY_RELATIONSHIPS.map((item) => item.nusukValue);
  expect(new Set(values).size).toBe(values.length);
  expect(new Set(nusukValues).size).toBe(nusukValues.length);
  REPRESENTED_BY_RELATIONSHIPS.forEach((item) => {
    expect(typeof item.value).toBe("string");
    expect(typeof item.nusukValue).toBe("string");
    expect(Array.isArray(item.allowedCompanionGenders)).toBe(true);
  });
  expect(REPRESENTED_BY_RELATIONSHIPS).toEqual(expect.arrayContaining([
    expect.objectContaining({
      value: "father",
      nusukValue: "أب",
      allowedCompanionGenders: ["male"],
    }),
    expect.objectContaining({
      value: "mother",
      nusukValue: "أم",
      allowedCompanionGenders: ["female"],
    }),
  ]));
});

test("male relationship list is gender-scoped and excludes female relationships", () => {
  const maleRelationships = getRelationshipsForCompanionGender("male");
  expect(maleRelationships).toHaveLength(16);
  expect(maleRelationships.map((item) => item.nusukValue)).toContain("أب");
  expect(maleRelationships.map((item) => item.nusukValue)).not.toContain("أم");
  expect(maleRelationships.map((item) => item.nusukValue)).not.toContain("أخت");
});

test("female relationship list excludes the three relationships removed from female compatibility", () => {
  const femaleRelationships = getRelationshipsForCompanionGender("female");
  expect(femaleRelationships.map((item) => item.nusukValue)).toEqual([
    "أم",
    "ابنة",
    "أخت",
    "جدة",
    "حفيدة",
    "الخالة",
    "ابنة الأخت",
    "الحماة",
    "عصبة النساء",
    "زوجة الابن",
    "زوجة الأب",
    "العمة",
    "زوجة",
    "والدة الزوج",
  ]);
  expect(femaleRelationships.map((item) => item.nusukValue)).not.toContain("أب");
  expect(femaleRelationships.map((item) => item.nusukValue)).not.toContain("ابن الأخ");
  expect(femaleRelationships.map((item) => item.nusukValue)).not.toContain("ابن الأخت");
  expect(femaleRelationships.map((item) => item.nusukValue)).not.toContain("والد الزوج");
});

test("no relationship is currently classified as shared by both companion genders", () => {
  const sharedRelationships = REPRESENTED_BY_RELATIONSHIPS.filter((item) => (
    item.allowedCompanionGenders.includes("male")
    && item.allowedCompanionGenders.includes("female")
  ));
  expect(sharedRelationships).toEqual([]);
});

test("removed female relationships stay in the catalog without being remapped", () => {
  expect(REPRESENTED_BY_RELATIONSHIPS.find((item) => item.value === "brothers_son")).toEqual(
    expect.objectContaining({ nusukValue: "ابن الأخ", allowedCompanionGenders: ["male"] })
  );
  expect(REPRESENTED_BY_RELATIONSHIPS.find((item) => item.value === "sisters_son")).toEqual(
    expect.objectContaining({ nusukValue: "ابن الأخت", allowedCompanionGenders: [] })
  );
  expect(REPRESENTED_BY_RELATIONSHIPS.find((item) => item.value === "husbands_father")).toEqual(
    expect.objectContaining({ nusukValue: "والد الزوج", allowedCompanionGenders: [] })
  );
  ["brothers_son", "sisters_son", "husbands_father"].forEach((relationship) => {
    expect(isRepresentativeRelationshipAllowedForGender(relationship, "female")).toBe(false);
    expect(reconcileRepresentativeRelationshipForCompanionGender(relationship, "female")).toBe("");
    expect(getRepresentativeRelationshipFieldState({
      companionId: "female-companion",
      companionSelectable: true,
      companionGender: "female",
      relationshipValue: relationship,
    }).relationshipCompatible).toBe(false);
  });
});

test("relationship field is disabled until a selectable companion with known gender exists", () => {
  expect(getRepresentativeRelationshipFieldState()).toEqual(expect.objectContaining({
    enabled: false,
    disabled: true,
    disabledReason: "missing_companion",
  }));
  expect(getRepresentativeRelationshipFieldState({
    companionId: "adult-1",
    companionSelectable: false,
    companionGender: "",
  })).toEqual(expect.objectContaining({
    enabled: false,
    disabledReason: "missing_gender",
  }));
  expect(getRepresentativeRelationshipFieldState({
    companionId: "adult-1",
    companionSelectable: true,
    companionGender: "M",
  })).toEqual(expect.objectContaining({
    enabled: true,
    disabled: false,
    gender: "male",
  }));
});

test("changing companion gender clears only an incompatible relationship without substituting another", () => {
  expect(reconcileRepresentativeRelationshipForCompanionGender("mother", "female")).toBe("mother");
  expect(reconcileRepresentativeRelationshipForCompanionGender("mother", "male")).toBe("");
  expect(reconcileRepresentativeRelationshipForCompanionGender("father", "male")).toBe("father");
  expect(reconcileRepresentativeRelationshipForCompanionGender("father", "female")).toBe("");
  expect(reconcileRepresentativeRelationshipForCompanionGender("", "male")).toBe("");
});

test("a saved incompatible relationship is preserved by normalization but marked incompatible", () => {
  const state = getRepresentativeRelationshipFieldState({
    companionId: "adult-1",
    companionSelectable: true,
    companionGender: "female",
    relationshipValue: "father",
  });
  expect(state.enabled).toBe(true);
  expect(state.relationshipCompatible).toBe(false);
  expect(isRepresentativeRelationshipAllowedForGender("father", "female")).toBe(false);
});

test("legacy relationship values remain readable but are never silently mapped into a gender list", () => {
  expect(reconcileRepresentativeRelationshipForCompanionGender("guardian", "male")).toBe("");
  expect(reconcileRepresentativeRelationshipForCompanionGender("relative", "female")).toBe("");
  expect(reconcileRepresentativeRelationshipForCompanionGender("other", "male")).toBe("");
});

test("a store gender update recomputes relationship availability without a page reload", () => {
  const storedCompanion = makeClient({ gender: "female" });
  const femaleGender = getClientGender(storedCompanion);
  expect(getRelationshipsForCompanionGender(femaleGender).map((item) => item.nusukValue)).toContain("أم");
  const updatedCompanion = { ...storedCompanion, gender: "male" };
  const maleGender = getClientGender(updatedCompanion);
  expect(getRelationshipsForCompanionGender(maleGender).map((item) => item.nusukValue)).toContain("أب");
  expect(getRelationshipsForCompanionGender(maleGender).map((item) => item.nusukValue)).not.toContain("أم");
});
