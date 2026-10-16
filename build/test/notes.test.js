const test = require("node:test");
const assert = require("node:assert/strict");
const { notesFor, ORIGINAL } = require("../notes.js");

test("ORIGINAL has 58 scenes with narrative and source", () => {
  assert.equal(Object.keys(ORIGINAL).length, 58);
  assert.match(ORIGINAL[1].narrative, /Hal Finney was a mathematically gifted teenager/);
  assert.match(ORIGINAL[1].source, /Photo attribution/);
});

test("notesFor prefers explicit notes, then say, then the original narrative", () => {
  assert.equal(notesFor({ notes: "X" }), "X");
  assert.match(notesFor({ scene: 1, say: "Custom." }), /^Custom\.\n\nSource: /);
  assert.match(notesFor({ scene: 1 }), /^In 1972, Hal Finney/);
  assert.match(notesFor({ scene: 1 }), /\(Original scene 1\)$/);
  assert.equal(notesFor({}), "");
});

test("notesFor throws on a scene with no original notes", () => {
  assert.throws(() => notesFor({ scene: 999 }), /no original notes for scene 999/);
});
