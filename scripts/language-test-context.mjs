import { readFileSync } from "node:fs";
import vm from "node:vm";

// Existing renderer tests execute selected functions in isolated VM contexts.
// Supply their new presentation dependency using the real German localisation.
const window = { location: { href: "https://example.test/?lang=de" }, localStorage: { getItem: () => null } };
vm.runInNewContext(readFileSync(new URL("../i18n.js", import.meta.url), "utf8"), { window, URL, Intl });
export const germanUi = window.BRUCHLAST_I18N;
