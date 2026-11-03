import assert from "node:assert/strict";
import {
  parseMatrix,
  parseVector,
  determinant,
  coordinates,
  gauss,
  lll,
  babai,
  enumerate,
  generated,
  combine,
} from "../js/math.mjs";
let tests = 0;
function check(x, msg) {
  assert.ok(x, msg);
  tests++;
}
assert.throws(() => parseMatrix("[[1,2],[2,4]]"));
assert.throws(() => parseMatrix("[[1.2,0],[0,1]]"));
assert.throws(() => parseMatrix("[[1,0,0],[0,1,0]]"));
assert.throws(() => parseVector("[1]", 2));
tests += 4;
assert.deepEqual(parseMatrix("6 2\n4 2"), [
  [6, 2],
  [4, 2],
]);
tests++;
const norm = (a) => a.reduce((n, x) => n + x * x, 0),
  brute = (B, t = null, r = 14) => {
    let best = Infinity;
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++) {
        if (!t && i === 0 && j === 0) continue;
        let v = combine([i, j], B);
        best = Math.min(best, norm(v.map((x, k) => x - (t?.[k] || 0))));
      }
    return best;
  };
for (let seed = 0; seed < 70; seed++) {
  const { basis: B, target: t } = generated(
      2,
      seed % 2 ? "skewed" : "easy",
      seed,
    ),
    g = gauss(B);
  check(coordinates(B, g.best).integers);
  check(norm(g.best) <= brute(B));
  let l = lll(B);
  check(
    determinant(l.basis) === determinant(B) ||
      determinant(l.basis) === -determinant(B),
  );
  for (let i = 0; i < 2; i++)
    assert.deepEqual(combine(l.transform[i], B), l.basis[i]);
  let e = enumerate(B, null, 1000),
    cv = enumerate(B, t, 1000);
  check(e.exact && norm(e.best) === norm(g.best));
  check(cv.exact && norm(cv.best.map((x, k) => x - t[k])) <= brute(B, t));
  check(coordinates(B, babai(B, t).best).integers);
}
assert.deepEqual(
  gauss([
    [6, 2],
    [4, 2],
  ]).best,
  [2, 0],
);
tests++;
check(
  coordinates(
    [
      [6, 2],
      [4, 2],
    ],
    [2, 0],
  ).integers,
);
check(
  !coordinates(
    [
      [6, 2],
      [4, 2],
    ],
    [1, 0],
  ).integers,
);
for (let n = 3; n <= 6; n++) {
  const B = generated(n, "skewed", 32).basis,
    l = lll(B);
  for (let i = 0; i < n; i++)
    assert.deepEqual(combine(l.transform[i], B), l.basis[i]);
  check(determinant(l.transform) === 1n || determinant(l.transform) === -1n);
}
let e = enumerate(
  [
    [1, 0],
    [0, 1],
  ],
  [0, 0],
);
check(e.exact && norm(e.best) === 0);
assert.deepEqual(generated(3, "skewed", 1042), generated(3, "skewed", 1042));
tests++;
console.log(
  `${tests} checks passed: integer parsing, membership, reduction transforms, 2D optimality, enumeration and seeded generation.`,
);
// Independent 3D coefficient search on small, well-conditioned instances.
for (let seed = 1; seed <= 12; seed++) {
  let B = [
      [2, seed % 3, 0],
      [0, 3, 1],
      [0, 0, 2],
    ],
    target = [seed % 4, 2, -1],
    e = enumerate(B, target, 1000),
    ground = Infinity;
  for (let i = -5; i <= 5; i++)
    for (let j = -5; j <= 5; j++)
      for (let k = -5; k <= 5; k++)
        ground = Math.min(
          ground,
          norm(combine([i, j, k], B).map((x, l) => x - target[l])),
        );
  assert.equal(norm(e.best.map((x, l) => x - target[l])), ground);
  assert.ok(e.exact);
}
let stopped = enumerate(
  [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ],
  [30, 30, 30, 30],
  0,
);
assert.equal(stopped.exact, false);
assert.ok(stopped.visited <= 512);
console.log(
  "14 further checks passed: independent 3D CVP comparisons and search-limit status.",
);
