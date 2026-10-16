// The original deck's presenter notes, extracted verbatim to source/original-notes.md,
// and the rule for which text becomes a slide's notes. Shared by build.js and site.js.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function parseOriginalNotes() {
  const md = fs.readFileSync(path.join(ROOT, "source/original-notes.md"), "utf8");
  const scenes = {};
  for (const block of md.split(/\n## Slide /).slice(1)) {
    const n = parseInt(block, 10);
    const paras = block.split("\n").map((l) => l.trim()).filter(Boolean).slice(1);
    const iN = paras.indexOf("NARRATIVE");
    const iS = paras.indexOf("SOURCE AND INTERPRETATION");
    const narrative = paras.slice(iN + 1, iS).join("\n\n");
    const source = paras
      .slice(iS + 1)
      .filter((p) => !p.startsWith("The photograph/document") && !p.startsWith("PRESENTATION GUIDANCE"))
      .join(" ");
    scenes[n] = { narrative, source };
  }
  return scenes;
}
const ORIGINAL = parseOriginalNotes();

// notes > say + source > original narrative + source. Scenes without notes are an error.
function notesFor(s) {
  if (s.notes) return s.notes;
  if (!s.scene) return "";
  const o = ORIGINAL[s.scene];
  if (!o) throw new Error(`no original notes for scene ${s.scene}`);
  const say = s.say ?? o.narrative;
  return `${say}\n\nSource: ${o.source}\n\n(Original scene ${s.scene})`;
}

module.exports = { notesFor, ORIGINAL };
