const WEB_SOURCE = "rukn-web";
const ASSISTANT_SOURCE = "rukn-assistant";
const PROTOCOL_VERSION = 1;

export const RUKN_ASSISTANT_READY = "RUKN_ASSISTANT_READY";
export const RUKN_ASSISTANT_PING = "RUKN_ASSISTANT_PING";
export const RUKN_ASSISTANT_PONG = "RUKN_ASSISTANT_PONG";
export const RUKN_OPEN_NUSUK = "RUKN_OPEN_NUSUK";
export const RUKN_SWITCH_PROGRAM_ACCEPTED = "RUKN_SWITCH_PROGRAM_ACCEPTED";
export const RUKN_SWITCH_PROGRAM_REJECTED = "RUKN_SWITCH_PROGRAM_REJECTED";

const DEFAULT_CHECK_TIMEOUT_MS = 900;
const DEFAULT_OPEN_TIMEOUT_MS = 1200;

let assistantReady = false;
let bridgeInitialized = false;
let bridgeMessageHandler = null;
let pendingCheck = null;
let pendingCheckPromise = null;
const pendingOpenRequestsByProgramId = new Map();
const pendingOpenRequestsByRequestId = new Map();

const isBrowserWindow = () => (
  typeof window !== "undefined"
  && typeof window.addEventListener === "function"
  && typeof window.postMessage === "function"
);

const getMessageType = (payload = {}) => (
  payload.type || payload.message || payload.event || ""
);

const isValidAssistantEvent = (event) => {
  if (!isBrowserWindow()) return false;
  if (event.source !== window) return false;
  if (event.origin !== window.location.origin) return false;

  const payload = event.data;
  return Boolean(
    payload
    && typeof payload === "object"
    && payload.source === ASSISTANT_SOURCE
    && payload.protocolVersion === PROTOCOL_VERSION
  );
};

const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rukn-nusuk-${crypto.randomUUID()}`;
  }
  return `rukn-nusuk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const resolvePendingCheck = (value) => {
  const current = pendingCheck;
  if (!current) {
    pendingCheckPromise = null;
    return;
  }

  pendingCheck = null;
  pendingCheckPromise = null;

  if (current.timeoutId) {
    window.clearTimeout(current.timeoutId);
  }

  current.resolve(Boolean(value));
};

const makeOpenResult = (status, payload = {}) => ({
  status,
  ok: status === "accepted",
  message: typeof payload.message === "string" ? payload.message : (typeof payload.error === "string" ? payload.error : ""),
  reason: typeof payload.reason === "string" ? payload.reason : (typeof payload.code === "string" ? payload.code : ""),
});

const resolvePendingOpenRequest = (request, result) => {
  if (!request || request.settled) return;
  request.settled = true;
  if (request.timeoutId) window.clearTimeout(request.timeoutId);
  pendingOpenRequestsByProgramId.delete(request.programId);
  pendingOpenRequestsByRequestId.delete(request.requestId);
  request.resolve(result);
};

const handleBridgeMessage = (event) => {
  if (!isValidAssistantEvent(event)) return;

  const payload = event.data;
  const type = getMessageType(payload);

  if (type === RUKN_ASSISTANT_READY) {
    assistantReady = true;
    return;
  }

  if (type === RUKN_SWITCH_PROGRAM_ACCEPTED || type === RUKN_SWITCH_PROGRAM_REJECTED) {
    assistantReady = true;
    const request = pendingOpenRequestsByRequestId.get(payload.requestId);
    if (!request) return;
    resolvePendingOpenRequest(
      request,
      makeOpenResult(type === RUKN_SWITCH_PROGRAM_ACCEPTED ? "accepted" : "rejected", payload)
    );
    return;
  }

  if (type !== RUKN_ASSISTANT_PONG) return;

  if (pendingCheck && payload.requestId === pendingCheck.requestId) {
    assistantReady = true;
    resolvePendingCheck(true);
    return;
  }

  if (!pendingCheck) assistantReady = true;
};

export function initializeNusukAssistantBridge() {
  if (!isBrowserWindow()) return false;
  if (bridgeInitialized) return true;

  bridgeMessageHandler = handleBridgeMessage;
  window.addEventListener("message", bridgeMessageHandler);
  bridgeInitialized = true;
  return true;
}

export function disposeNusukAssistantBridge() {
  if (!isBrowserWindow()) return;

  if (bridgeInitialized && bridgeMessageHandler) {
    window.removeEventListener("message", bridgeMessageHandler);
  }

  bridgeInitialized = false;
  bridgeMessageHandler = null;
  assistantReady = false;
  resolvePendingCheck(false);
  pendingOpenRequestsByProgramId.forEach((request) => {
    resolvePendingOpenRequest(request, makeOpenResult("unavailable"));
  });
  pendingOpenRequestsByProgramId.clear();
  pendingOpenRequestsByRequestId.clear();
}

export function isNusukAssistantReady() {
  return assistantReady;
}

export function checkNusukAssistant(options = {}) {
  if (!isBrowserWindow()) return Promise.resolve(false);
  if (assistantReady) return Promise.resolve(true);
  if (pendingCheckPromise) return pendingCheckPromise;

  initializeNusukAssistantBridge();
  if (assistantReady) return Promise.resolve(true);

  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(200, Number(options.timeoutMs))
    : DEFAULT_CHECK_TIMEOUT_MS;
  const requestId = createRequestId();

  pendingCheckPromise = new Promise((resolve) => {
    pendingCheck = {
      requestId,
      resolve,
      timeoutId: window.setTimeout(() => resolvePendingCheck(false), timeoutMs),
    };
  });

  try {
    window.postMessage(
      {
        source: WEB_SOURCE,
        protocolVersion: PROTOCOL_VERSION,
        type: RUKN_ASSISTANT_PING,
        requestId,
      },
      window.location.origin
    );
  } catch {
    resolvePendingCheck(false);
  }

  return pendingCheckPromise;
}

export function warmupNusukAssistant(options = {}) {
  try {
    checkNusukAssistant(options).catch(() => false);
  } catch {}
}

export function openNusukWithAssistant(programId, options = {}) {
  if (!isBrowserWindow()) return Promise.resolve(makeOpenResult("unavailable"));

  const normalizedProgramId = String(programId || "").trim();
  if (!normalizedProgramId) return Promise.resolve(makeOpenResult("invalid"));

  const existingRequest = pendingOpenRequestsByProgramId.get(normalizedProgramId);
  if (existingRequest?.promise) return existingRequest.promise;

  initializeNusukAssistantBridge();

  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(300, Number(options.timeoutMs))
    : DEFAULT_OPEN_TIMEOUT_MS;
  const requestId = createRequestId();
  let resolvePromise = null;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  const request = {
    programId: normalizedProgramId,
    requestId,
    promise,
    resolve: resolvePromise,
    settled: false,
    timeoutId: null,
  };

  pendingOpenRequestsByProgramId.set(normalizedProgramId, request);
  pendingOpenRequestsByRequestId.set(requestId, request);
  request.timeoutId = window.setTimeout(() => {
    resolvePendingOpenRequest(request, makeOpenResult("timeout"));
  }, timeoutMs);

  try {
    window.postMessage(
      {
        source: WEB_SOURCE,
        type: RUKN_OPEN_NUSUK,
        protocolVersion: PROTOCOL_VERSION,
        requestId,
        programId: normalizedProgramId,
      },
      window.location.origin
    );
  } catch {
    resolvePendingOpenRequest(request, makeOpenResult("unavailable"));
  }

  return promise;
}
