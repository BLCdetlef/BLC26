import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Exercise the actual chart handlers with mouse, touch and pen event sequences.
const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const handlers = source.slice(source.indexOf("    let touchSelection = null;"), source.indexOf("    renderHistoricalEvents(svg,"));
assert.ok(handlers.includes("const bindTouchTarget"));
class Element {
  constructor(attributes = {}) { this.attributes = attributes; this.children = []; this.listeners = {}; this.style = {}; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren() { this.children = []; }
  remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  querySelector(selector) { return this.children.find(child => `.${child.attributes.class}` === selector); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  fire(type, pointerType, clientX = 20, clientY = 30) {
    const event = { pointerType, clientX, clientY, target: { closest: () => null }, preventDefault() { this.prevented = true; }, stopPropagation() {} };
    (this.listeners[type] || []).forEach(handler => handler(event));
    return event;
  }
}
function setup() {
  const svg = new Element(), group = new Element(), valuePopover = new Element();
  valuePopover.hidden = true;
  const calls = [];
  let now = 10000;
  const context = vm.createContext({
    svg, valuePopover, width: 100, height: 100, x: value => value,
    document: { createElement: () => new Element() },
    svgElement: (_, attributes) => new Element(attributes),
    pointDisplay: (point, unit) => `${point.year} · ${point.value} ${unit}`,
    chooseSegment: (...args) => calls.push(args), Date: { now: () => now }
  });
  vm.runInContext(`${handlers}\nthis.bind = bindTouchTarget;`, context);
  context.bind(group, { curveId: "example", unit: "%" }, "observed", "observations", "Beispiel", [{ year: 20, value: 30 }, { year: 80, value: 70 }], "red", value => value, "M20 30 L80 70");
  return { svg, target: group.children[0], valuePopover, calls, advance: delta => { now += delta; } };
}
const mouse = setup();
mouse.target.fire("pointerenter", "mouse");
assert.equal(mouse.valuePopover.hidden, false);
assert.equal(mouse.valuePopover.children[1].textContent, "20 · 30 %");
mouse.target.fire("pointermove", "mouse", 80, 70);
assert.equal(mouse.valuePopover.children[1].textContent, "80 · 70 %");
assert.equal(mouse.calls.length, 0, "Hover must not open details");
mouse.target.fire("pointerleave", "mouse");
assert.equal(mouse.valuePopover.hidden, true);
assert.equal(mouse.svg.children.length, 0);
mouse.target.fire("click", "mouse");
assert.equal(mouse.calls.length, 1);

for (const pointer of ["touch", "pen"]) {
  const test = setup();
  test.target.fire("pointerenter", pointer);
  test.target.fire("pointermove", pointer);
  assert.equal(test.valuePopover.hidden, true);
  test.target.fire("pointerup", pointer);
  test.target.fire("pointerleave", pointer);
  test.target.fire("click", pointer);
  assert.equal(test.valuePopover.hidden, false, "First tap keeps value visible");
  assert.equal(test.calls.length, 0, "Synthetic click must not open details");
  test.advance(200);
  test.target.fire("pointerup", pointer);
  assert.equal(test.calls.length, 1, "Second tap opens details");
  assert.equal(test.valuePopover.hidden, true);
  const slow = setup();
  slow.target.fire("pointerup", pointer);
  slow.advance(600);
  slow.target.fire("pointerup", pointer);
  assert.equal(slow.calls.length, 0, "Separate taps keep showing values");
  slow.svg.fire("pointerdown", pointer);
  assert.equal(slow.valuePopover.hidden, true, "Tap outside dismisses value");
}
console.log("PASS: mouse hover/move/leave/click and touch/pen single/double tap.");
