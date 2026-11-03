// Row-basis convention: a lattice vector is z * B for an integer row vector z.
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const norm2 = (a) => dot(a, a);
const clone = (a) => a.map((r) => r.slice());

export function determinant(A) {
  const n = A.length;
  if (n === 1) return BigInt(A[0][0]);
  return A[0].reduce(
    (s, x, j) =>
      s +
      (j % 2 ? -1n : 1n) *
        BigInt(x) *
        determinant(A.slice(1).map((r) => r.filter((_, k) => k !== j))),
    0n,
  );
}
export function adjugate(B) {
  const n = B.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      (i + j) % 2
        ? -determinant(
            B.filter((_, r) => r !== j).map((r) => r.filter((_, c) => c !== i)),
          )
        : determinant(
            B.filter((_, r) => r !== j).map((r) => r.filter((_, c) => c !== i)),
          ),
    ),
  );
}
export function parseMatrix(text) {
  let a;
  try {
    a = JSON.parse(text);
  } catch {
    a = text
      .trim()
      .split(/[;\n]+/)
      .filter((x) => x.trim())
      .map((r) =>
        r
          .replace(/[\[\]()]/g, "")
          .trim()
          .split(/[\s,]+/)
          .map(Number),
      );
  }
  if (
    !Array.isArray(a) ||
    a.length < 2 ||
    a.length > 6 ||
    a.some((r) => !Array.isArray(r) || r.length !== a.length)
  )
    throw Error(
      "Enter a square basis with 2 to 6 rows. Each row is one basis vector.",
    );
  if (
    a.some((r) =>
      r.some((x) => !Number.isSafeInteger(x) || Math.abs(x) > 10000),
    )
  )
    throw Error("Use integer entries from −10000 to 10000.");
  if (determinant(a) === 0n)
    throw Error(
      "This matrix is singular: its rows are dependent and do not form a full-rank basis.",
    );
  return a;
}
export function parseVector(s, n) {
  let a;
  try {
    a = JSON.parse(s);
  } catch {
    a = s
      .replace(/[\[\]()]/g, "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
  }
  if (
    !Array.isArray(a) ||
    a.length !== n ||
    a.some((x) => !Number.isSafeInteger(x) || Math.abs(x) > 100000)
  )
    throw Error(`Enter ${n} integer coordinates from −100000 to 100000.`);
  return a;
}
export function coordinates(B, v) {
  const d = determinant(B),
    a = adjugate(B),
    nums = a.map((_, i) => v.reduce((s, x, j) => s + BigInt(x) * a[j][i], 0n));
  return {
    numerators: nums.map(String),
    denominator: String(d),
    integers: nums.every((x) => x % d === 0n),
    values: nums.map((x) => Number(x) / Number(d)),
    exact: nums.map((x) => {
      let a = x,
        b = d;
      if (b < 0n) {
        a = -a;
        b = -b;
      }
      let u = a < 0n ? -a : a,
        v = b;
      while (v) {
        [u, v] = [v, u % v];
      }
      return b === u ? String(a / b) : `${a / u}/${b / u}`;
    }),
  };
}
export const combine = (z, B) =>
  B[0].map((_, j) =>
    z.reduce((s, x, i) => {
      const p = x * B[i][j],
        value = s + p;
      if (
        !Number.isSafeInteger(x) ||
        !Number.isSafeInteger(p) ||
        !Number.isSafeInteger(value)
      )
        throw Error(
          "Vector arithmetic exceeds the safe integer range. Use a smaller example.",
        );
      return value;
    }, 0),
  );
function subtract(a, b, q) {
  return a.map((x, i) => {
    let p = q * b[i],
      v = x - p;
    if (!Number.isSafeInteger(p) || !Number.isSafeInteger(v))
      throw Error(
        "Intermediate arithmetic exceeds the safe integer range. Use smaller entries.",
      );
    return v;
  });
}
function checked(a) {
  if (
    a.some((r) => r.some((x) => !Number.isSafeInteger(x) || Math.abs(x) > 1e12))
  )
    throw Error(
      "Intermediate values exceed this teaching tool’s safe numeric range. Use a smaller or better-conditioned matrix.",
    );
}
export function gramSchmidt(B) {
  const star = [],
    mu = B.map(() => Array(B.length).fill(0)),
    sq = [];
  for (let i = 0; i < B.length; i++) {
    let v = B[i].slice();
    for (let j = 0; j < i; j++) {
      if (sq[j] < 1e-16)
        throw Error(
          "Numerical conditioning is too poor for this floating-point reduction. Try smaller entries.",
        );
      mu[i][j] = dot(B[i], star[j]) / sq[j];
      v = v.map((x, k) => x - mu[i][j] * star[j][k]);
    }
    star.push(v);
    sq.push(norm2(v));
  }
  return { star, mu, sq };
}
const identity = (n) =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => +(i === j)),
  );
const abs = (x) => (x < 0n ? -x : x);
const exactDot = (a, b) =>
  a.reduce((s, x, i) => s + BigInt(x) * BigInt(b[i]), 0n);
const nearest = (p, q) => {
  if (p < 0n) return -nearest(-p, q);
  return (2n * p + q) / (2n * q);
};
function canonical(v) {
  const x = v.find((x) => x !== 0);
  return x < 0 ? v.map((x) => -x) : v.slice();
}
const lexGreater = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};
function recorder(B) {
  let steps = [];
  const push = (
    operation,
    basis,
    explanation,
    calculation = "",
    extra = {},
  ) => {
    if (steps.length >= 1500)
      throw Error(
        "This example exceeds the 1500-step teaching trace limit. Use a smaller or less skewed basis.",
      );
    steps.push({
      operation,
      basis: clone(basis),
      explanation,
      calculation,
      ...extra,
    });
  };
  push(
    "Original basis",
    B,
    "Each row is a basis vector. Integer combinations of these rows form the lattice.",
  );
  return { steps, push };
}
export function gauss(B) {
  let b = clone(B),
    U = identity(2);
  const { steps, push } = recorder(B);
  for (let iter = 0; iter < 1000; iter++) {
    if (exactDot(b[1], b[1]) < exactDot(b[0], b[0])) {
      [b[0], b[1]] = [b[1], b[0]];
      [U[0], U[1]] = [U[1], U[0]];
      push(
        "Swap basis vectors",
        b,
        "Put the shorter vector first.",
        "b₁ ↔ b₂",
      );
    }
    let p = exactDot(b[1], b[0]),
      q = exactDot(b[0], b[0]),
      m = Number(nearest(p, q));
    if (2n * abs(p) <= q) {
      const best = canonical(b[0]);
      push(
        "Gauss reduction complete",
        b,
        "In two dimensions, the first vector of this reduced basis is a shortest nonzero lattice vector.",
        "|⟨b₂,b₁⟩| ≤ ||b₁||² / 2",
        { candidate: best },
      );
      return { basis: b, transform: U, steps, best, exact: true };
    }
    b[1] = subtract(b[1], b[0], m);
    U[1] = subtract(U[1], U[0], m);
    checked(b);
    checked(U);
    push(
      "Size reduction",
      b,
      "Subtract an integer multiple of the first vector from the second. This changes the basis, not the lattice.",
      `μ = round(${p} / ${q}) = ${m}\nb₂ ← b₂ − (${m})b₁`,
    );
  }
  throw Error("Gauss reduction exceeded the iteration limit.");
}
export function lll(B, delta = 0.75) {
  let b = clone(B),
    U = identity(B.length),
    k = 1,
    gs = gramSchmidt(b);
  const { steps, push } = recorder(B);
  for (let iter = 0; k < B.length && iter < 10000; iter++) {
    for (let j = k - 1; j >= 0; j--) {
      let q = Math.round(gs.mu[k][j]);
      if (q) {
        const old = gs.mu[k][j];
        b[k] = subtract(b[k], b[j], q);
        U[k] = subtract(U[k], U[j], q);
        checked(b);
        checked(U);
        push(
          "LLL size reduction",
          b,
          "Remove the rounded projection onto an earlier basis vector.",
          `μ[${k + 1},${j + 1}] = ${old.toPrecision(6)}\nq = ${q}; b${k + 1} ← b${k + 1} − (${q})b${j + 1}`,
        );
        gs = gramSchmidt(b);
      }
    }
    const left = gs.sq[k],
      right = (delta - gs.mu[k][k - 1] ** 2) * gs.sq[k - 1];
    if (left + 1e-12 * Math.max(1, left, right) >= right) {
      push(
        "Lovász test passes",
        b,
        "The adjacent vectors satisfy the reduction condition. Move to the next vector.",
        `${left.toPrecision(6)} ≥ ${right.toPrecision(6)}  (δ = ${delta})`,
      );
      k++;
    } else {
      [b[k], b[k - 1]] = [b[k - 1], b[k]];
      [U[k], U[k - 1]] = [U[k - 1], U[k]];
      push(
        "LLL swap",
        b,
        "The Lovász condition failed. Swap adjacent rows and check again.",
        `b${k} ↔ b${k + 1}`,
      );
      gs = gramSchmidt(b);
      k = Math.max(1, k - 1);
    }
  }
  if (k < B.length)
    throw Error("LLL exceeded its teaching-demo iteration limit.");
  const best = b
    .map(canonical)
    .sort((a, c) => norm2(a) - norm2(c) || (lexGreater(a, c) ? -1 : 1))[0];
  push(
    "LLL reduction complete",
    b,
    "This is a reduced basis. A short basis row is a candidate, not a proof of the shortest vector.",
    `δ = ${delta}`,
    { candidate: best },
  );
  return { basis: b, transform: U, steps, best, exact: false };
}
export function babai(B, target, rounding = false) {
  const reduced = lll(B),
    b = reduced.basis,
    { star, sq } = gramSchmidt(b),
    steps = reduced.steps;
  let z = Array(b.length).fill(0),
    residual = target.slice();
  if (rounding) {
    let cs = coordinates(b, target);
    z = cs.values.map(Math.round);
    steps.push({
      operation: "Coordinate rounding",
      basis: clone(b),
      explanation:
        "Round the target’s coordinates in the reduced basis. This need not select the nearest point.",
      calculation: `coordinates ≈ [${cs.values.map((x) => x.toFixed(5)).join(", ")}]\nrounded = [${z}]`,
      candidate: combine(z, b),
    });
  } else
    for (let i = b.length - 1; i >= 0; i--) {
      const projection = dot(residual, star[i]) / sq[i];
      z[i] = Math.round(projection);
      residual = residual.map((x, j) => x - z[i] * b[i][j]);
      steps.push({
        operation: `Nearest plane · row ${i + 1}`,
        basis: clone(b),
        explanation:
          "Project the remaining target onto this Gram–Schmidt direction, round, then subtract the selected basis multiple.",
        calculation: `c${i + 1} = ${projection.toFixed(6)}\nz${i + 1} = ${z[i]}`,
        candidate: combine(z, b),
        residual: residual.slice(),
      });
    }
  let best = combine(z, b);
  steps.push({
    operation: "Approximate closest point",
    basis: clone(b),
    explanation:
      "This is a valid lattice point. Babai’s method does not in general prove it is the closest.",
    calculation: `point = [${best}]`,
    candidate: best,
  });
  return { basis: b, transform: reduced.transform, steps, best, exact: false };
}
function ceilSqrt(n) {
  if (n <= 0n) return 0n;
  let x = BigInt(Math.ceil(Math.sqrt(Number(n))));
  while (x * x < n) x++;
  while ((x - 1n) * (x - 1n) >= n) x--;
  return x;
}
export function enumerate(B, target, limitMs = 3000, onProgress = () => {}) {
  const cvp = target !== null,
    t = target || B[0].map(() => 0),
    base = cvp ? babai(B, t) : lll(B),
    b = base.basis,
    steps = base.steps;
  let best = cvp ? base.best : canonical(base.best);
  const distance = (v) =>
    exactDot(
      v.map((x, i) => x - t[i]),
      v.map((x, i) => x - t[i]),
    );
  let bestD = distance(best),
    D = determinant(b),
    adj = adjugate(b),
    R = ceilSqrt(bestD),
    bounds = Array.from({ length: b.length }, (_, i) =>
      Number(
        (R * adj.reduce((s, r) => s + abs(r[i]), 0n) +
          abs(t.reduce((s, x, j) => s + BigInt(x) * adj[j][i], 0n))) /
          abs(D),
      ),
    );
  if (bounds.some((x) => !Number.isSafeInteger(x)))
    throw Error(
      "The exact-search coefficient bounds exceed the supported range.",
    );
  if (
    b[0].some(
      (_, j) =>
        b.reduce((n, row, i) => n + Math.abs(row[j]) * bounds[i], 0) >
        Number.MAX_SAFE_INTEGER,
    )
  )
    throw Error(
      "The exact search would exceed safe coordinate arithmetic. Use smaller entries.",
    );
  let total = bounds.reduce((p, x) => p * BigInt(2 * x + 1), 1n),
    visited = 0,
    omitted = 0,
    halt = false,
    start = performance.now(),
    z = Array(b.length).fill(0);
  steps.push({
    operation: "Certified search bounds",
    basis: clone(b),
    explanation:
      "These integer coefficient bounds include every point that could improve or tie the initial candidate. Completing this entire box proves the result for the supplied integer basis.",
    calculation: `|zᵢ| ≤ [${bounds}]\n${total} coefficient tuples`,
    candidate: best,
  });
  const report = () =>
    onProgress({
      basis: b,
      steps: steps.slice(),
      best: best.slice(),
      exact: false,
      visited,
      total: String(total),
      bounds,
      elapsed: performance.now() - start,
      transform: base.transform,
    });
  function visit(k) {
    if (halt) return;
    if (k === b.length) {
      visited++;
      if (visited % 512 === 0) {
        if (performance.now() - start >= limitMs || visited >= 2000000) {
          halt = true;
          return;
        }
        if (visited % 8192 === 0) report();
      }
      const v = combine(z, b);
      if (!cvp && v.every((x) => x === 0)) return;
      let d = distance(v),
        cand = cvp ? v : canonical(v);
      if (d < bestD || (d === bestD && lexGreater(cand, best))) {
        best = cand;
        bestD = d;
        if (steps.length < 1498)
          steps.push({
            operation: "Better candidate",
            basis: clone(b),
            explanation:
              "This lattice point improves the distance, or uses the canonical tie-breaking order.",
            calculation: `coefficients [${z}]\nsquared distance = ${d}`,
            candidate: best.slice(),
            visited,
          });
        else omitted++;
      }
      return;
    }
    for (let i = -bounds[k]; i <= bounds[k] && !halt; i++) {
      z[k] = i;
      visit(k + 1);
    }
  }
  visit(0);
  steps.push({
    operation: halt ? "Search stopped · best found" : "Exact search complete",
    basis: clone(b),
    explanation: halt
      ? "The time or candidate limit was reached. This is the best result found, without an optimality proof."
      : "Every coefficient tuple in the certified box has been checked. No lattice point outside that box can improve the initial bound.",
    calculation: `${visited} / ${total} tuples checked\nsquared distance = ${bestD}${omitted ? `\n${omitted} intermediate improvements omitted from the recorded trace` : ""}`,
    candidate: best.slice(),
  });
  return {
    basis: b,
    transform: base.transform,
    steps,
    best,
    exact: !halt,
    visited,
    total: String(total),
    bounds,
    elapsed: performance.now() - start,
  };
}
export function solve(
  { basis, task, algorithm, target, limitMs = 3000 },
  progress,
) {
  let r;
  if (algorithm === "gauss") {
    if (basis.length !== 2 || task === "cvp")
      throw Error(
        "Gauss reduction is available for 2D shortest-vector and basis-reduction tasks.",
      );
    r = gauss(basis);
  } else if (algorithm === "lll") {
    if (task === "cvp")
      throw Error("Choose Babai or enumeration for a closest-point task.");
    r = lll(basis);
  } else if (algorithm === "babai" || algorithm === "round") {
    if (task !== "cvp")
      throw Error("Choose a closest-point task to use Babai or rounding.");
    r = babai(basis, target, algorithm === "round");
  } else if (algorithm === "enum") {
    if (task === "basis")
      throw Error("Choose Gauss or LLL for basis reduction.");
    r = enumerate(basis, task === "cvp" ? target : null, limitMs, progress);
  } else throw Error("Unknown algorithm.");
  r.task = task;
  r.algorithm = algorithm;
  r.original = clone(basis);
  r.target = task === "cvp" ? target : null;
  return r;
}
export function generated(n, difficulty, seed) {
  let state = seed >>> 0;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  let B = identity(n).map((r) =>
    r.map((x) => x * (1 + Math.floor(rand() * 3))),
  );
  for (let k = 0; k < (difficulty === "skewed" ? n * 5 : n); k++) {
    let i = Math.floor(rand() * n),
      j = (i + 1 + Math.floor(rand() * (n - 1))) % n,
      m =
        (rand() < 0.5 ? -1 : 1) *
        (difficulty === "skewed" ? 1 + Math.floor(rand() * 3) : 1);
    const next = B[i].map((x, c) => x + m * B[j][c]);
    if (next.every((x) => Math.abs(x) <= 500)) B[i] = next;
  }
  let target = Array.from({ length: n }, () => Math.floor(rand() * 15) - 7);
  return { basis: B, target };
}
