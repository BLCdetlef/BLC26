(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BRUCHLAST_REFERENCE = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const t = globalThis.BRUCHLAST_I18N?.t || ((text, ...values) => text.replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match));
  const allowedRoles = new Set(["boundary"]);
  const allowedQualifiers = new Set(["exact", "approximate"]);
  const allowedOperators = new Set([">", "<"]);
  const allowedThresholdStatuses = new Set(["crossed", "already_crossed_at_start", "not_crossed", "series_ends_before_known_crossing", "not_assessable"]);

  function fail(message) { throw new Error(message); }

  function validateReference(curve) {
    const reference = curve?.reference;
    if (reference == null) return null;
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) fail(`${curve.curveId}: ungültige Referenz.`);
    if (["no_global_quantity_boundary", "no_planetary_threshold"].includes(reference.type)) {
      if (typeof reference.display !== "string" || !reference.display.trim()) fail(`${curve.curveId}: fehlende Erläuterung zur nicht quantifizierbaren Grenze.`);
      return reference;
    }
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
    if (!reference) return { state: "missing", label: t("Für diese Kurve ist noch kein vergleichbarer Grenzwert hinterlegt.") };
    if (["no_global_quantity_boundary", "no_planetary_threshold"].includes(reference.type)) return { state: "missing", label: reference.display };
    if (!("role" in reference) || !("qualifier" in reference) || !("exceedanceOperator" in reference)) {
      return { state: "reference-only", label: t("Für diese Modellreferenz ist keine Statusbewertung freigegeben."), reference };
    }
    const observation = latestObservation(curve.observations);
    if (!observation) return { state: "unknown", label: t("Für diese Kurve ist keine aktuelle Bewertung möglich.") };
    const assessment = curve.thresholdAssessments?.boundary;
    if (assessment && allowedThresholdStatuses.has(assessment.status)) {
      if (assessment.status === "already_crossed_at_start") return { state: "exceeded", label: t("Beim ersten Messpunkt {0} bereits überschritten", assessment.firstCrossingPoint.year), observation, reference };
      if (assessment.status === "crossed") return { state: "exceeded", label: t("Erstmals im Datensatz {0} überschritten", assessment.firstCrossingPoint.year), observation, reference };
      if (assessment.status === "not_crossed") return { state: "not-exceeded", label: t("In der geprüften Reihe bis {0} nicht überschritten", assessment.lastCheckedPoint.year), observation, reference };
      if (assessment.status === "series_ends_before_known_crossing") return { state: "external-crossing", label: t("Reihe endet {0} vor der separat belegten Überschreitung {1}", assessment.lastCheckedPoint.year, assessment.knownCrossingPoint.year), observation, reference };
      return { state: "unknown", label: t("Mit dieser Reihe nicht beurteilbar"), observation, reference };
    }
    const value = Number(observation.value);
    const threshold = Number(reference.value);
    const exceeded = reference.exceedanceOperator === ">" ? value > threshold : value < threshold;
    if (exceeded) return { state: "exceeded", label: t("Modellreferenz überschritten"), observation, reference };
    if (value === threshold) return { state: "reached", label: t("Modellreferenz erreicht"), observation, reference };
    return { state: "not-exceeded", label: t("Modellreferenz nicht überschritten"), observation, reference };
  }

  return { latestObservation, referenceStatus, validateReference };
});
