import { getRequestContext } from './request-context.js';

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    // Fallback in case of circular refs
    return JSON.stringify({ ts: new Date().toISOString(), level: 'error', event: 'logger.stringify_failed' });
  }
}

export function log(level, event, payload = {}) {
  const ctx = getRequestContext();
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(ctx || {}),
    ...payload,
  };

  // Always write structured logs as single-line JSON
  // eslint-disable-next-line no-console
  console.log(safeJson(line));
}

export function logInfo(event, payload) {
  log('info', event, payload);
}

export function logWarn(event, payload) {
  log('warn', event, payload);
}

export function logError(event, error, payload = {}) {
  const err = error || {};
  log('error', event, {
    ...payload,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      where: err.where,
      schema: err.schema,
      table: err.table,
      column: err.column,
      constraint: err.constraint,
      position: err.position,
      routine: err.routine,
    },
  });
}
