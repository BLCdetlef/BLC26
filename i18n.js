(function (root) {
  "use strict";
  const supported = new Set(["de", "en", "zh-Hans"]);
  const url = new URL(root.location.href);
  let saved = "de";
  try { saved = root.localStorage.getItem("blc-language") || "de"; } catch { }
  const requested = url.searchParams.get("lang");
  const language = supported.has(requested) ? requested : supported.has(saved) ? saved : "de";
  const locale = language === "zh-Hans" ? "zh-CN" : language === "en" ? "en-GB" : "de-DE";
  const dictionary = (language === "zh-Hans" ? root.BRUCHLAST_ZH_HANS : root.BRUCHLAST_EN) || {};
  function t(text, ...values) {
    const translated = language !== "de" && Object.hasOwn(dictionary, text) ? dictionary[text] : text;
    return String(translated).replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
  }
  // Translate presentation fields only. IDs, source quotations, numeric values,
  // model names and the signed import remain independent of the chosen language.
  const textFields = new Set(["label", "domainLabel", "metric", "unit", "geography", "uncertainty", "methodNote", "method", "scenarioLabel", "display", "detail", "value", "locator", "extraction", "transformation", "rule", "axisNote", "sourceLocator", "calculationText", "note", "fields", "sourceUnit"]);
  function localize(value, key = "") {
    if (typeof value === "string") return textFields.has(key) ? t(value) : value;
    if (Array.isArray(value)) return value.map(item => localize(item, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, localize(item, field)]));
    return value;
  }
  function localizeCurve(curve) {
    if (language === "de") return curve;
    const translated = localize(curve);
    function formatPoints(value) {
      if (!value || typeof value !== "object") return;
      if (Number.isFinite(value.year) && Number.isFinite(value.value) && typeof value.display === "string") {
        const original = value.display.replace(new RegExp('^' + value.year + '\\s*[:·]\\s*'), '');
        const decimal = original.match(/\d+[,.](\d+)/);
        const digits = decimal ? Math.min(12, decimal[1].length) : 0;
        const prefix = original.includes('≈') ? '≈ ' : original.trim().startsWith('+') ? '+' : '';
        // Use the source's displayed precision; scientific values remain untouched.
        const unit = t(curve.unit === 'million_tonnes_per_year' ? 'Mio. t/Jahr' : curve.unit === 'billion_tonnes_per_year' ? 'Mrd. t/Jahr' : curve.unit === 'TWh_per_year' ? 'TWh/Jahr' : curve.unit);
        value.display = prefix + new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value.value) + ' ' + unit;
      }
      for (const child of Object.values(value)) if (child && typeof child === 'object') formatPoints(child);
    }
    formatPoints(translated);
    return translated;
  }
  function translatePage() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(element => element.setAttribute("aria-label", t(element.dataset.i18nAria)));
    document.querySelectorAll("[data-i18n-tooltip]").forEach(element => element.setAttribute("data-tooltip", t(element.dataset.i18nTooltip)));
    document.title = t("BRUCHLASTchart – digitale Arbeitsfassung");
    document.querySelector('meta[name="description"]').content = t("Digitale, interaktive Fassung des BRUCHLASTcharts.");
  }
  root.BRUCHLAST_I18N = Object.freeze({ language, locale, t, localize, localizeCurve, translatePage });
})(window);
