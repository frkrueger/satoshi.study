const test = require("node:test");
const assert = require("node:assert/strict");
const { parseHash } = require("../../site/app.js");

const stepsOf = (i) => (i === 12 ? 3 : 1);

test("parseHash clamps and defaults", () => {
  assert.deepEqual(parseHash("", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#abc", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#0", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#999", 82, stepsOf), { slide: 82, step: 1 });
  assert.deepEqual(parseHash("#12", 82, stepsOf), { slide: 12, step: 1 });
  assert.deepEqual(parseHash("#12/2", 82, stepsOf), { slide: 12, step: 2 });
  assert.deepEqual(parseHash("#12/9", 82, stepsOf), { slide: 12, step: 3 });
  assert.deepEqual(parseHash("#5/2", 82, stepsOf), { slide: 5, step: 1 }, "no steps → step 1");
});
