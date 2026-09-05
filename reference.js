(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BRUCHLAST_REFERENCE = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const allowedRoles = new Set(["boundary"]);
  const allowedQualifiers = new Set(["exact", "approximate"]);
  const allowedOperators = new Set([">", "<"]);

  function fail(message) { throw new Error(message); }

  function validateReference(curve) {
    const reference = curve?.reference;
    if (reference == null) return null;
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) fail(`${curve.curveId}: ungültige Referenz.`);
    if (!Number.isFinite(Number(reference.value))) fail(`${curve.curveId}: ungültiger Referenzwert.`);
    if (reference.unit !== curve.unit) fail(`${curve.curveId}: Referenz- und Kurveneinheit stimmen nicht überein.`);
    if (reference.type === "planetary_boundaries_model" && reference.modelName !== "Planetare Grenzen") fail(`${curve.curveId}: Modellreferenz ist unvollständig.`);
    const sourceIds = new Set((curve.sources || []).map(source => source?.id).filter(Boolean));
    if (!Array.isArray(reference.sourceRefs) || !reference.sourceRefs.length) fail(`${curve.curveId}: Referenzquelle fehlt.`);
    for (const sourceRef of reference.sourceRefs) if (!sourceIds.has(sourceRef)) fail(`${curve.curveId}: unbekannte Referenzquelle ${sourceRef}.`);
    const statusFields = ["role", "qualifier", "exceedanceOperator"];
    const hasStatusField = statusFields.some(field => field in reference);
    const hasAllStatusFields = statusFields.every(field => field in reference);
    if (hasStatusField && !hasAllStatusFields) fail(`${curve.curveId}: unvollständige Statusmetadaten.`);
    if (hasAllStatusFields) {
      if (!allowedRoles.has(reference.role)) fail(`${curve.curveId}: ungültige Referenzrolle.`);
      if (!allowedQualifiers.has(reference.qualifier)) fail(`${curve.curveId}: ungültige Referenzgenauigkeit.`);
      if (!allowedOperators.has(reference.exceedanceOperator)) fail(`${curve.curveId}: ungültiger Überschreitungsoperator.`);
    }
    return reference;
  }

  function latestObservation(observations) {
    return (Array.isArray(observations) ? observations : [])
      .filter(point => Number.isFinite(Number(point?.year)) && Number.isFinite(Number(point?.value)))
      .reduce((latest, point) => !latest || Number(point.year) > Number(latest.year) ? point : latest, null);
  }

  function referenceStatus(curve) {
    const reference = validateReference(curve);
    if (!reference) return { state: "missing", label: "Für diese Kurve ist noch kein vergleichbarer Grenzwert hinterlegt." };
    if (!("role" in reference) || !("qualifier" in reference) || !("exceedanceOperator" in reference)) {
      return { state: "reference-only", label: "Für diese Modellreferenz ist keine Statusbewertung freigegeben.", reference };
    }
    const observation = latestObservation(curve.observations);
    if (!observation) return { state: "unknown", label: "Für diese Kurve ist keine aktuelle Bewertung möglich." };
    const value = Number(observation.value);
    const threshold = Number(reference.value);
    const exceeded = reference.exceedanceOperator === ">" ? value > threshold : value < threshold;
    if (exceeded) return { state: "exceeded", label: "Modellreferenz überschritten", observation, reference };
    if (value === threshold) return { state: "reached", label: "Modellreferenz erreicht", observation, reference };
    return { state: "not-exceeded", label: "Modellreferenz nicht überschritten", observation, reference };
  }

  return { latestObservation, referenceStatus, validateReference };
});
