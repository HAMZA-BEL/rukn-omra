const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NUSUK_RELATIONSHIPS,
  buildNusukClientBatch,
} = require("../_extension-program-clients-contract");

const AGENCY_ID = "agency-1";
const PROGRAM_ID = "program-1";
const REFERENCE_DATE = "2026-07-17";

function client(id, options = {}) {
  return {
    id,
    agency_id: options.agencyId || AGENCY_ID,
    program_id: options.programId || PROGRAM_ID,
    travel_group_id: options.travelGroupId || null,
    first_name: options.firstName || id,
    last_name: options.lastName || "Test",
    name: options.name || `${options.firstName || id} ${options.lastName || "Test"}`,
    represented_by_client_id: options.companionId || null,
    represented_by_relationship: options.relationship || "",
    passport: {
      number: options.passportNumber === undefined ? `P-${id}` : options.passportNumber,
      nationality: options.nationality || "MAR",
      birthDate: options.birthDate === undefined ? "1980-01-01" : options.birthDate,
      gender: options.gender === undefined ? "M" : options.gender,
    },
    archived: false,
    deleted: false,
  };
}

function build(clients, selectedClientIds, options = {}) {
  return buildNusukClientBatch({
    clients,
    agencyId: AGENCY_ID,
    programId: PROGRAM_ID,
    selectedClientIds,
    enforceTravelGroup: options.enforceTravelGroup === true,
    referenceDate: REFERENCE_DATE,
  });
}

function errorCodes(result) {
  return result.errors.map((error) => error.code);
}

test("adult payload remains backward compatible and omits companion", () => {
  const result = build([client("adult")]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.payloadVersion, 2);
  assert.deepEqual(result.executionOrder, ["adult"]);
  assert.equal(result.clients[0].clientId, "adult");
  assert.equal(result.clients[0].passportNumber, "P-adult");
  assert.equal(result.clients[0].expectedPassportNumber, "P-adult");
  assert.equal(result.clients[0].isMinor, false);
  assert.equal("companion" in result.clients[0], false);
});

test("minor payload contains verified companion metadata and canonical relationship", () => {
  const companion = client("parent", { firstName: "الأم", nationality: "MAR", gender: "F" });
  const minor = client("minor", {
    firstName: "القاصر",
    birthDate: "2015-05-10",
    companionId: "parent",
    relationship: "mother",
  });
  const result = build([companion, minor]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.clients[1].companion, {
    clientId: "parent",
    fullName: companion.name,
    passportNumber: "P-parent",
    gender: "female",
    nationality: "MAR",
    relationshipCode: "mother",
    relationshipToMinor: "أم",
  });
});

test("shared contract catalog retains the final allowed companion genders", () => {
  assert.deepEqual(NUSUK_RELATIONSHIPS.father.allowedCompanionGenders, ["male"]);
  assert.deepEqual(NUSUK_RELATIONSHIPS.mother.allowedCompanionGenders, ["female"]);
  assert.deepEqual(NUSUK_RELATIONSHIPS.brothers_son.allowedCompanionGenders, ["male"]);
  assert.deepEqual(NUSUK_RELATIONSHIPS.sisters_son.allowedCompanionGenders, []);
  assert.deepEqual(NUSUK_RELATIONSHIPS.husbands_father.allowedCompanionGenders, []);
});

test("backend accepts relationships compatible with the companion record gender", () => {
  const maleResult = build([
    client("father", { gender: "M" }),
    client("minor-male", {
      birthDate: "2014-01-01",
      companionId: "father",
      relationship: "father",
    }),
  ]);
  assert.deepEqual(maleResult.errors, []);
  assert.equal(maleResult.clients.find((item) => item.clientId === "minor-male").companion.gender, "male");

  const maleBrothersSon = build([
    client("male-nephew", { gender: "M" }),
    client("minor-nephew", {
      birthDate: "2014-01-01",
      companionId: "male-nephew",
      relationship: "brothers_son",
    }),
  ]);
  assert.deepEqual(maleBrothersSon.errors, []);

  const femaleResult = build([
    client("mother", { gender: "أنثى" }),
    client("minor-female", {
      birthDate: "2014-01-01",
      companionId: "mother",
      relationship: "mother",
    }),
  ]);
  assert.deepEqual(femaleResult.errors, []);
  assert.equal(femaleResult.clients.find((item) => item.clientId === "minor-female").companion.gender, "female");
});

test("backend rejects a relationship that conflicts with the companion record gender", () => {
  const femaleFather = build([
    client("female-companion", { gender: "F" }),
    client("minor-1", {
      birthDate: "2014-01-01",
      companionId: "female-companion",
      relationship: "father",
    }),
  ]);
  const femaleFatherError = femaleFather.errors.find((error) => (
    error.code === "COMPANION_RELATIONSHIP_GENDER_MISMATCH"
  ));
  assert.ok(femaleFatherError);
  assert.equal(femaleFatherError.message, "صلة القرابة المختارة غير متوافقة مع جنس المرافق.");
  assert.equal(femaleFatherError.companionGender, "female");

  const maleMother = build([
    client("male-companion", { gender: "M" }),
    client("minor-2", {
      birthDate: "2014-01-01",
      companionId: "male-companion",
      relationship: "mother",
    }),
  ]);
  assert.ok(errorCodes(maleMother).includes("COMPANION_RELATIONSHIP_GENDER_MISMATCH"));
});

test("backend rejects the three removed relationships for a female companion", () => {
  ["brothers_son", "sisters_son", "husbands_father"].forEach((relationship, index) => {
    const companionId = `female-companion-${index}`;
    const result = build([
      client(companionId, { gender: "F" }),
      client(`minor-${index}`, {
        birthDate: "2014-01-01",
        companionId,
        relationship,
      }),
    ]);
    assert.ok(
      errorCodes(result).includes("COMPANION_RELATIONSHIP_GENDER_MISMATCH"),
      `${relationship} must be rejected for a female companion`
    );
  });
});

test("legacy relationships remain recognizable but cannot pass gender compatibility", () => {
  const result = build([
    client("parent", { gender: "M" }),
    client("minor", {
      birthDate: "2014-01-01",
      companionId: "parent",
      relationship: "guardian",
    }),
  ]);
  assert.ok(errorCodes(result).includes("COMPANION_RELATIONSHIP_GENDER_MISMATCH"));
});

test("preflight rejects missing companion, relationship, and minor passport", () => {
  const result = build([client("minor", {
    birthDate: "2015-05-10",
    passportNumber: "",
  })]);
  assert.deepEqual(errorCodes(result).sort(), [
    "COMPANION_REQUIRED",
    "MINOR_PASSPORT_REQUIRED",
    "RELATIONSHIP_REQUIRED",
  ]);
});

test("stable dependency ordering delays minors only until their companion", () => {
  const rows = [
    client("A"),
    client("B", { birthDate: "2014-01-01", companionId: "D", relationship: "father" }),
    client("C"),
    client("D"),
    client("E", { birthDate: "2016-01-01", companionId: "D", relationship: "father" }),
  ];
  const result = build(rows);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.executionOrder, ["A", "C", "D", "B", "E"]);
  assert.equal(result.executionOrder.filter((id) => id === "D").length, 1);
});

test("ordering is unchanged when the companion already precedes the minor", () => {
  const result = build([
    client("parent"),
    client("minor", { birthDate: "2014-01-01", companionId: "parent", relationship: "father" }),
    client("adult"),
  ]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.executionOrder, ["parent", "minor", "adult"]);
});

test("companion outside the selected batch is not injected but metadata is included", () => {
  const result = build([
    client("parent"),
    client("minor", { birthDate: "2014-01-01", companionId: "parent", relationship: "father" }),
  ], ["minor"]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.executionOrder, ["minor"]);
  assert.equal(result.clients.length, 1);
  assert.equal(result.clients[0].companion.clientId, "parent");
});

test("backend scope rejects a companion from another agency or program", () => {
  const minor = client("minor", {
    birthDate: "2014-01-01",
    companionId: "outside",
    relationship: "father",
  });
  const crossAgency = build([minor, client("outside", { agencyId: "agency-2" })]);
  assert.ok(errorCodes(crossAgency).includes("COMPANION_NOT_ALLOWED"));

  const crossProgram = build([minor, client("outside", { programId: "program-2" })]);
  assert.ok(errorCodes(crossProgram).includes("COMPANION_NOT_ALLOWED"));
});

test("preflight rejects travel-group mismatch in an enforced Hajj group, self links, and minor companions", () => {
  const groupMismatch = build([
    client("parent", { travelGroupId: "group-2" }),
    client("minor", {
      birthDate: "2014-01-01",
      travelGroupId: "group-1",
      companionId: "parent",
      relationship: "father",
    }),
  ], undefined, { enforceTravelGroup: true });
  assert.ok(errorCodes(groupMismatch).includes("COMPANION_TRAVEL_GROUP_MISMATCH"));

  const self = build([client("minor", {
    birthDate: "2014-01-01",
    companionId: "minor",
    relationship: "father",
  })]);
  assert.ok(errorCodes(self).includes("SELF_COMPANION"));

  const minorCompanion = build([
    client("minor-parent", { birthDate: "2012-01-01" }),
    client("minor", {
      birthDate: "2014-01-01",
      companionId: "minor-parent",
      relationship: "sister",
    }),
  ]);
  assert.ok(errorCodes(minorCompanion).includes("COMPANION_NOT_ADULT"));
});

test("preflight does not enforce travel groups for Umrah without a group context", () => {
  const result = build([
    client("parent", { travelGroupId: "group-2" }),
    client("minor", {
      birthDate: "2014-01-01",
      travelGroupId: "group-1",
      companionId: "parent",
      relationship: "father",
    }),
  ]);
  assert.equal(errorCodes(result).includes("COMPANION_TRAVEL_GROUP_MISMATCH"), false);
});

test("preflight rejects a companion with a missing birth date or gender", () => {
  const missingBirthDate = build([
    client("parent", { birthDate: "" }),
    client("minor", { birthDate: "2014-01-01", companionId: "parent", relationship: "father" }),
  ]);
  assert.ok(errorCodes(missingBirthDate).includes("COMPANION_BIRTH_DATE_REQUIRED"));

  const missingGender = build([
    client("parent", { gender: "" }),
    client("minor", { birthDate: "2014-01-01", companionId: "parent", relationship: "father" }),
  ]);
  assert.ok(errorCodes(missingGender).includes("COMPANION_GENDER_REQUIRED"));
});

test("preflight detects cyclic relationships", () => {
  const result = build([
    client("minor-a", {
      birthDate: "2012-01-01",
      companionId: "minor-b",
      relationship: "brother",
    }),
    client("minor-b", {
      birthDate: "2013-01-01",
      companionId: "minor-a",
      relationship: "sister",
    }),
  ]);
  assert.ok(errorCodes(result).includes("COMPANION_CYCLE"));
});

test("preflight rejects missing companion passport and duplicate or invalid selected ids", () => {
  const missingPassport = build([
    client("parent", { passportNumber: "" }),
    client("minor", { birthDate: "2014-01-01", companionId: "parent", relationship: "father" }),
  ]);
  assert.ok(errorCodes(missingPassport).includes("COMPANION_PASSPORT_REQUIRED"));

  const invalidSelection = build([client("adult")], ["adult", "adult", "missing"]);
  assert.equal(errorCodes(invalidSelection).filter((code) => code === "DUPLICATE_CLIENT").length, 1);
  assert.ok(errorCodes(invalidSelection).includes("INVALID_CLIENT_ID"));
});

test("unsupported free-text relationships are rejected", () => {
  const result = build([
    client("parent"),
    client("minor", {
      birthDate: "2014-01-01",
      companionId: "parent",
      relationship: "probably-parent",
    }),
  ]);
  assert.ok(errorCodes(result).includes("RELATIONSHIP_REQUIRED"));
});
