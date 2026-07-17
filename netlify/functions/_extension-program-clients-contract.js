const { calculateAgeAtDate } = require("../../src/utils/ageCore");
const relationshipDefinitions = require("../../src/data/clientRepresentationRelationships.json");

const NUSUK_CLIENT_PAYLOAD_VERSION = 2;

const NUSUK_RELATIONSHIPS = Object.freeze(relationshipDefinitions.reduce((result, item) => {
  const code = typeof item?.value === "string" ? item.value.trim() : "";
  const nusukValue = typeof item?.nusukValue === "string" ? item.nusukValue.trim() : "";
  const allowedCompanionGenders = Array.isArray(item?.allowedCompanionGenders)
    ? item.allowedCompanionGenders.filter((gender) => gender === "male" || gender === "female")
    : [];
  if (code && nusukValue) {
    result[code] = Object.freeze({
      code,
      nusukValue,
      allowedCompanionGenders: Object.freeze(allowedCompanionGenders),
      legacy: item?.legacy === true,
    });
  }
  return result;
}, {}));

const RELATIONSHIP_CODE_BY_VALUE = Object.values(NUSUK_RELATIONSHIPS).reduce((result, item) => {
  result[item.code.toLowerCase()] = item.code;
  result[item.nusukValue] = item.code;
  return result;
}, {});

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePassport(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanString(value);
    if (text) return text;
  }
  return "";
}

function getPassportNumber(row = {}) {
  const passport = parsePassport(row.passport);
  return firstText(passport.number, row.passport_number, row.passportNumber, row.passport_no);
}

function getPassportNationality(row = {}) {
  const passport = parsePassport(row.passport);
  return firstText(passport.nationality, row.nationality, row.passport_nationality);
}

function getBirthDate(row = {}) {
  const passport = parsePassport(row.passport);
  return firstText(passport.birthDate, passport.birth_date, row.birth_date, row.birthDate, row.date_of_birth);
}

function getGender(row = {}) {
  const passport = parsePassport(row.passport);
  const value = firstText(row.gender, passport.gender).toLowerCase();
  if (value === "male" || value === "m" || value === "ذكر") return "male";
  if (value === "female" || value === "f" || value === "أنثى") return "female";
  return "";
}

function getClientFullName(row = {}) {
  return firstText(
    row.name,
    [cleanString(row.first_name), cleanString(row.last_name)].filter(Boolean).join(" "),
    [cleanString(row.prenom), cleanString(row.nom)].filter(Boolean).join(" ")
  );
}

function normalizeRelationship(value) {
  const text = cleanString(value);
  const code = RELATIONSHIP_CODE_BY_VALUE[text.toLowerCase()] || RELATIONSHIP_CODE_BY_VALUE[text] || "";
  return code ? NUSUK_RELATIONSHIPS[code] : null;
}

function isInactiveClient(row = {}) {
  return row.deleted === true
    || Boolean(row.deleted_at)
    || row.archived === true
    || Boolean(row.archived_at);
}

function isSameTravelGroup(minor = {}, companion = {}) {
  const minorGroupId = cleanString(minor.travel_group_id || minor.travelGroupId);
  const companionGroupId = cleanString(companion.travel_group_id || companion.travelGroupId);
  return minorGroupId === companionGroupId;
}

function makeValidationError(code, row = {}, message, extra = {}) {
  return {
    code,
    clientId: cleanString(row.id),
    clientName: getClientFullName(row) || cleanString(row.id),
    message,
    ...extra,
  };
}

function insertByOriginalIndex(queue, item, indexById) {
  const itemIndex = indexById.get(item) ?? Number.MAX_SAFE_INTEGER;
  const targetIndex = queue.findIndex((queuedId) => (
    (indexById.get(queuedId) ?? Number.MAX_SAFE_INTEGER) > itemIndex
  ));
  if (targetIndex === -1) queue.push(item);
  else queue.splice(targetIndex, 0, item);
}

function stableDependencyOrder(items = [], dependencyByClientId = new Map()) {
  const ids = items.map((item) => cleanString(item.clientId)).filter(Boolean);
  const idSet = new Set(ids);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const indegree = new Map(ids.map((id) => [id, 0]));
  const dependents = new Map(ids.map((id) => [id, []]));

  ids.forEach((clientId) => {
    const dependencyId = cleanString(dependencyByClientId.get(clientId));
    if (!dependencyId || dependencyId === clientId || !idSet.has(dependencyId)) return;
    indegree.set(clientId, (indegree.get(clientId) || 0) + 1);
    dependents.get(dependencyId).push(clientId);
  });

  dependents.forEach((dependentIds) => {
    dependentIds.sort((left, right) => (
      (indexById.get(left) ?? 0) - (indexById.get(right) ?? 0)
    ));
  });

  const queue = ids.filter((id) => indegree.get(id) === 0);
  const orderedIds = [];
  while (queue.length) {
    const clientId = queue.shift();
    orderedIds.push(clientId);
    (dependents.get(clientId) || []).forEach((dependentId) => {
      const nextIndegree = (indegree.get(dependentId) || 0) - 1;
      indegree.set(dependentId, nextIndegree);
      if (nextIndegree === 0) insertByOriginalIndex(queue, dependentId, indexById);
    });
  }

  return {
    orderedIds,
    cycleClientIds: ids.filter((id) => !orderedIds.includes(id)),
  };
}

function buildNusukClientBatch({
  clients = [],
  agencyId = "",
  programId = "",
  selectedClientIds,
  enforceTravelGroup = false,
  referenceDate = new Date(),
} = {}) {
  const normalizedAgencyId = cleanString(agencyId);
  const normalizedProgramId = cleanString(programId);
  const errors = [];
  const clientsById = new Map();

  (Array.isArray(clients) ? clients : []).forEach((row) => {
    const clientId = cleanString(row?.id);
    if (!clientId || isInactiveClient(row)) return;
    if (cleanString(row.agency_id) !== normalizedAgencyId) return;
    if (cleanString(row.program_id) !== normalizedProgramId) return;
    if (clientsById.has(clientId)) {
      errors.push(makeValidationError(
        "DUPLICATE_CLIENT",
        row,
        `يوجد تكرار غير صالح للمعتمر ${getClientFullName(row) || clientId}.`
      ));
      return;
    }
    clientsById.set(clientId, row);
  });

  let batchRows = [...clientsById.values()];
  if (Array.isArray(selectedClientIds)) {
    const seenRequestedIds = new Set();
    batchRows = [];
    selectedClientIds.forEach((value) => {
      const clientId = cleanString(value);
      if (!clientId) return;
      if (seenRequestedIds.has(clientId)) {
        errors.push({
          code: "DUPLICATE_CLIENT",
          clientId,
          clientName: clientId,
          message: `تكرر المعتمر ${clientId} في دفعة الرفع.`,
        });
        return;
      }
      seenRequestedIds.add(clientId);
      const row = clientsById.get(clientId);
      if (!row) {
        errors.push({
          code: "INVALID_CLIENT_ID",
          clientId,
          clientName: clientId,
          message: "تحتوي دفعة الرفع على معتمر غير موجود أو غير مسموح به في هذا البرنامج.",
        });
        return;
      }
      batchRows.push(row);
    });
  }

  const dependencyByClientId = new Map();
  const items = batchRows.map((row) => {
    const clientId = cleanString(row.id);
    const fullName = getClientFullName(row);
    const passportNumber = getPassportNumber(row);
    const age = calculateAgeAtDate(getBirthDate(row), referenceDate);
    const isMinor = age !== null && age < 18;
    let companionPayload = null;

    if (isMinor) {
      if (!passportNumber) {
        errors.push(makeValidationError(
          "MINOR_PASSPORT_REQUIRED",
          row,
          `يجب إدخال رقم جواز القاصر ${fullName || clientId}.`
        ));
      }

      const companionId = cleanString(row.represented_by_client_id || row.representedByClientId);
      const relationshipValue = cleanString(
        row.represented_by_relationship || row.representedByRelationship
      );
      const relationship = normalizeRelationship(relationshipValue);
      if (relationshipValue && !relationship) {
        errors.push(makeValidationError(
          "RELATIONSHIP_UNSUPPORTED",
          row,
          `صلة القرابة المحددة للقاصر ${fullName || clientId} غير مدعومة.`
        ));
      }
      if (companionId && companionId === clientId) {
        errors.push(makeValidationError(
          "SELF_COMPANION",
          row,
          `لا يمكن أن يكون القاصر ${fullName || clientId} مرافقًا لنفسه.`
        ));
      }

      const companion = companionId && companionId !== clientId
        ? clientsById.get(companionId)
        : null;
      if (companionId && companionId !== clientId && !companion) {
        errors.push(makeValidationError(
          "COMPANION_NOT_ALLOWED",
          row,
          `المرافق المحدد للقاصر ${fullName || clientId} غير موجود أو لا ينتمي إلى هذا البرنامج.`,
          { companionClientId: companionId }
        ));
      }

      if (companion) {
        dependencyByClientId.set(clientId, companionId);
        const companionGender = getGender(companion);
        const minorTravelGroupId = cleanString(row.travel_group_id || row.travelGroupId);
        if (enforceTravelGroup && minorTravelGroupId && !isSameTravelGroup(row, companion)) {
          errors.push(makeValidationError(
            "COMPANION_TRAVEL_GROUP_MISMATCH",
            row,
            `المرافق المحدد للقاصر ${fullName || clientId} لا ينتمي إلى فوج السفر نفسه.`,
            { companionClientId: companionId }
          ));
        }

        const companionAge = calculateAgeAtDate(getBirthDate(companion), referenceDate);
        if (companionAge === null) {
          errors.push(makeValidationError(
            "COMPANION_BIRTH_DATE_REQUIRED",
            row,
            `يجب إدخال تاريخ ميلاد مرافق القاصر ${fullName || clientId}.`,
            { companionClientId: companionId }
          ));
        } else if (companionAge < 18) {
          errors.push(makeValidationError(
            "COMPANION_NOT_ADULT",
            row,
            `المرافق المحدد للقاصر ${fullName || clientId} ليس بالغًا صالحًا كمرافق.`,
            { companionClientId: companionId }
          ));
        }

        if (!companionGender) {
          errors.push(makeValidationError(
            "COMPANION_GENDER_REQUIRED",
            row,
            `يجب تحديد جنس مرافق القاصر ${fullName || clientId}.`,
            { companionClientId: companionId }
          ));
        }

        if (
          relationship
          && companionGender
          && (
            relationship.legacy === true
            || !relationship.allowedCompanionGenders.includes(companionGender)
          )
        ) {
          errors.push(makeValidationError(
            "COMPANION_RELATIONSHIP_GENDER_MISMATCH",
            row,
            "صلة القرابة المختارة غير متوافقة مع جنس المرافق.",
            {
              companionClientId: companionId,
              companionGender,
              relationshipCode: relationship.code,
            }
          ));
        }

        const companionPassportNumber = getPassportNumber(companion);
        if (!companionPassportNumber) {
          errors.push(makeValidationError(
            "COMPANION_PASSPORT_REQUIRED",
            row,
            `يجب إدخال رقم جواز مرافق القاصر ${fullName || clientId}.`,
            { companionClientId: companionId }
          ));
        }

        const companionNationality = getPassportNationality(companion);
        companionPayload = {
          clientId: companionId,
          fullName: getClientFullName(companion),
          passportNumber: companionPassportNumber,
          gender: companionGender,
          ...(companionNationality ? { nationality: companionNationality } : {}),
          relationshipCode: relationship?.code || null,
          relationshipToMinor: relationship?.nusukValue || null,
        };
      }
    }

    return {
      clientId,
      passportNumber,
      expectedPassportNumber: passportNumber,
      arabicFirstName: cleanString(row.first_name),
      arabicLastName: cleanString(row.last_name),
      arabicFullName: fullName,
      isMinor,
      ...(isMinor ? { companion: companionPayload } : {}),
    };
  });

  const ordering = stableDependencyOrder(items, dependencyByClientId);
  if (ordering.cycleClientIds.length) {
    const cycleNames = ordering.cycleClientIds.map((id) => (
      getClientFullName(clientsById.get(id)) || id
    ));
    errors.push({
      code: "COMPANION_CYCLE",
      clientId: ordering.cycleClientIds[0],
      clientName: cycleNames[0],
      relatedClientIds: ordering.cycleClientIds,
      message: `توجد علاقة دورية غير صالحة بين القاصر والمرافق: ${cycleNames.join("، ")}.`,
    });
  }

  const itemById = new Map(items.map((item) => [item.clientId, item]));
  const orderedItems = ordering.cycleClientIds.length
    ? items
    : ordering.orderedIds.map((id) => itemById.get(id)).filter(Boolean);

  return {
    payloadVersion: NUSUK_CLIENT_PAYLOAD_VERSION,
    agencyId: normalizedAgencyId,
    programId: normalizedProgramId,
    executionOrder: orderedItems.map((item) => item.clientId),
    clients: orderedItems,
    errors,
  };
}

module.exports = {
  NUSUK_CLIENT_PAYLOAD_VERSION,
  NUSUK_RELATIONSHIPS,
  buildNusukClientBatch,
  calculateAgeAtDate,
  normalizeRelationship,
  stableDependencyOrder,
};
