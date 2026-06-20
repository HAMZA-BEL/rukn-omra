export const PROGRAM_ACTION_SCOPES = Object.freeze({
  CURRENT_FILTERED: "current_filtered",
  ALL_PROGRAM: "all_program",
  MAIN_PROGRAM: "main_program",
  SELECTED: "selected",
});

export const TRAVEL_GROUP_SCOPE_PREFIX = "travel_group:";

export const PROGRAM_ACTION_SCOPE_LABELS_AR = Object.freeze({
  [PROGRAM_ACTION_SCOPES.CURRENT_FILTERED]: "النتائج المفلترة حاليا",
  [PROGRAM_ACTION_SCOPES.ALL_PROGRAM]: "كل البرنامج",
  [PROGRAM_ACTION_SCOPES.MAIN_PROGRAM]: "البرنامج الأساسي",
  [PROGRAM_ACTION_SCOPES.SELECTED]: "المحددون فقط",
  missingTravelGroup: "فوج سفر غير متاح",
});

const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeClientList = (clients) => (Array.isArray(clients) ? clients.filter(Boolean) : []);

const getClientTravelGroupId = (client = {}) => {
  if (hasOwn(client, "travelGroupId")) return client.travelGroupId;
  if (hasOwn(client, "travel_group_id")) return client.travel_group_id;
  return null;
};

const normalizeCheckedIds = (checkedIds) => {
  if (!checkedIds) return new Set();

  if (checkedIds instanceof Set) {
    return new Set(Array.from(checkedIds).map(normalizeId).filter(Boolean));
  }

  if (checkedIds instanceof Map) {
    return new Set(
      Array.from(checkedIds.entries())
        .filter(([, value]) => Boolean(value))
        .map(([key]) => normalizeId(key))
        .filter(Boolean)
    );
  }

  if (Array.isArray(checkedIds)) {
    return new Set(checkedIds.map(normalizeId).filter(Boolean));
  }

  if (typeof checkedIds === "object") {
    return new Set(
      Object.entries(checkedIds)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => normalizeId(key))
        .filter(Boolean)
    );
  }

  const singleId = normalizeId(checkedIds);
  return singleId ? new Set([singleId]) : new Set();
};

const getTravelGroupLabel = (group = {}) => {
  const label = String(group.name || group.label || group.nameAr || group.nameFr || "").trim();
  return label || normalizeId(group.id);
};

const getTravelGroupById = (travelGroups = [], groupId = "") => {
  const normalizedGroupId = normalizeId(groupId);
  if (!normalizedGroupId || !Array.isArray(travelGroups)) return null;
  return travelGroups.find((group) => normalizeId(group?.id) === normalizedGroupId) || null;
};

const buildResult = ({ clients = [], scope, isValid = true, reason = null, label = "" }) => {
  const safeClients = normalizeClientList(clients);
  return {
    clients: safeClients,
    scope,
    isValid,
    reason,
    label,
    count: safeClients.length,
  };
};

export const isTravelGroupScope = (scope) => (
  typeof scope === "string" && scope.startsWith(TRAVEL_GROUP_SCOPE_PREFIX)
);

export const getTravelGroupScopeId = (scope) => {
  if (!isTravelGroupScope(scope)) return "";
  return normalizeId(scope.slice(TRAVEL_GROUP_SCOPE_PREFIX.length));
};

export const createTravelGroupScope = (groupId) => (
  `${TRAVEL_GROUP_SCOPE_PREFIX}${normalizeId(groupId)}`
);

export const buildProgramActionScopeOptions = ({
  checkedIds,
  travelGroups = [],
  includeCurrentFiltered = true,
} = {}) => {
  const selectedIds = normalizeCheckedIds(checkedIds);
  const groups = Array.isArray(travelGroups) ? travelGroups.filter((group) => normalizeId(group?.id)) : [];

  return [
    ...(includeCurrentFiltered ? [{
      scope: PROGRAM_ACTION_SCOPES.CURRENT_FILTERED,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[PROGRAM_ACTION_SCOPES.CURRENT_FILTERED],
    }] : []),
    {
      scope: PROGRAM_ACTION_SCOPES.ALL_PROGRAM,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[PROGRAM_ACTION_SCOPES.ALL_PROGRAM],
    },
    {
      scope: PROGRAM_ACTION_SCOPES.MAIN_PROGRAM,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[PROGRAM_ACTION_SCOPES.MAIN_PROGRAM],
    },
    ...(selectedIds.size > 0 ? [{
      scope: PROGRAM_ACTION_SCOPES.SELECTED,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[PROGRAM_ACTION_SCOPES.SELECTED],
      count: selectedIds.size,
    }] : []),
    ...groups.map((group) => ({
      scope: createTravelGroupScope(group.id),
      label: getTravelGroupLabel(group),
      travelGroupId: normalizeId(group.id),
    })),
  ];
};

export const resolveProgramActionClients = ({
  scope = PROGRAM_ACTION_SCOPES.CURRENT_FILTERED,
  programClients = [],
  filteredClients = [],
  checkedIds,
  travelGroups = [],
} = {}) => {
  const requestedScope = normalizeId(scope) || PROGRAM_ACTION_SCOPES.CURRENT_FILTERED;
  const allClients = normalizeClientList(programClients);
  const currentFilteredClients = normalizeClientList(filteredClients);
  const selectedIds = normalizeCheckedIds(checkedIds);

  if (requestedScope === PROGRAM_ACTION_SCOPES.CURRENT_FILTERED) {
    return buildResult({
      clients: currentFilteredClients,
      scope: requestedScope,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[requestedScope],
    });
  }

  if (requestedScope === PROGRAM_ACTION_SCOPES.ALL_PROGRAM) {
    return buildResult({
      clients: allClients,
      scope: requestedScope,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[requestedScope],
    });
  }

  if (requestedScope === PROGRAM_ACTION_SCOPES.MAIN_PROGRAM) {
    return buildResult({
      clients: allClients.filter((client) => !normalizeId(getClientTravelGroupId(client))),
      scope: requestedScope,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[requestedScope],
    });
  }

  if (requestedScope === PROGRAM_ACTION_SCOPES.SELECTED) {
    if (selectedIds.size === 0) {
      return buildResult({
        clients: [],
        scope: requestedScope,
        isValid: false,
        reason: "empty_selection",
        label: PROGRAM_ACTION_SCOPE_LABELS_AR[requestedScope],
      });
    }

    return buildResult({
      clients: allClients.filter((client) => selectedIds.has(normalizeId(client?.id))),
      scope: requestedScope,
      label: PROGRAM_ACTION_SCOPE_LABELS_AR[requestedScope],
    });
  }

  if (isTravelGroupScope(requestedScope)) {
    const groupId = getTravelGroupScopeId(requestedScope);
    const group = getTravelGroupById(travelGroups, groupId);

    if (!group) {
      return buildResult({
        clients: [],
        scope: requestedScope,
        isValid: false,
        reason: "missing_travel_group",
        label: PROGRAM_ACTION_SCOPE_LABELS_AR.missingTravelGroup,
      });
    }

    return buildResult({
      clients: allClients.filter((client) => normalizeId(getClientTravelGroupId(client)) === groupId),
      scope: requestedScope,
      label: getTravelGroupLabel(group),
    });
  }

  return buildResult({
    clients: [],
    scope: requestedScope,
    isValid: false,
    reason: "unknown_scope",
    label: "",
  });
};
