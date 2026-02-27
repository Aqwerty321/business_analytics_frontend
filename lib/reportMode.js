export const STRICT_REPORT_TRIGGER = "generate full structured business analytics report";

export function isStrictReportTrigger(message) {
  return String(message || "").trim().toLowerCase() === STRICT_REPORT_TRIGGER;
}
