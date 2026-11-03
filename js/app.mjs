import {
  parseMatrix,
  parseVector,
  coordinates,
  generated,
  norm2,
  determinant,
} from "./math.mjs";
import { makePlot } from "./plot.mjs";
const $ = (id) => document.getElementById(id),
  names = {
    gauss: "Gauss reduction",
    lll: "LLL reduction",
    babai: "Babai nearest plane",
    round: "Coordinate rounding",
    enum: "Exact enumeration",
  };
const guides = {
  gauss: [
    "Exact in two dimensions",
    "Gauss reduction repeatedly shortens and swaps two basis vectors. For a full-rank 2D lattice, the shorter vector in the reduced basis is a shortest nonzero vector.",
    "https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch17.pdf",
  ],
  lll: [
    "A reduced basis, not an exact SVP solution",
    "LLL uses Gram–Schmidt projections, size reduction and the Lovász condition. It efficiently improves a basis. The shortest row it finds is a candidate; it need not be the shortest vector in the whole lattice.",
    "https://cims.nyu.edu/~regev/papers/pqc.pdf",
  ],
  babai: [
    "A nearby lattice point",
    "Nearest plane first reduces the basis with LLL, then projects and rounds from the last Gram–Schmidt direction backwards. It returns a lattice point, but does not in general prove it is the closest.",
    "https://cims.nyu.edu/~regev/teaching/lattices_fall_2004/ln/cvp.pdf",
  ],
  round: [
    "Round the basis coordinates",
    "This baseline reduces the basis with LLL, expresses the target in that basis, then rounds each coordinate. It is fast, but nearest integer coordinates need not give the nearest lattice point.",
    "https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch18.pdf",
  ],
  enum: [
    "Prove the answer by finishing the search",
    "After reduction, an initial candidate sets a distance bound. Exact inverse-basis bounds enclose every coefficient tuple that could improve it. Checking the whole box proves optimality. A time or tuple limit leaves an unproven best-found answer.",
    "https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch18.pdf",
  ],
};
let result = null,
  position = 0,
  timer = null,
  worker = null,
  lastProgress = null,
  runConfig = null,
  busy = false,
  dirty = false,
  runId = 0;
const task = () => document.querySelector("input[name=task]:checked").value;
const plot = makePlot($("plot"), (kind, basis, target) => {
  pause();
  $("matrix").value = JSON.stringify(basis);
  if (target) $("target").value = JSON.stringify(target);
  run();
});
function pause() {
  clearTimeout(timer);
  timer = null;
  $("play").textContent = "▶ Play";
}
function markDirty() {
  dirty = true;
  pause();
  $("validation").textContent =
    "Input changed. Run your example to update the result.";
  $("validation").className = "hint";
}
function configure() {
  const t = task(),
    n = (() => {
      try {
        return parseMatrix($("matrix").value).length;
      } catch {
        return 2;
      }
    })();
  const allowed =
    t === "cvp"
      ? ["babai", "round", "enum"]
      : t === "basis"
        ? ["gauss", "lll"]
        : ["gauss", "lll", "enum"];
  for (const o of $("algorithm").options)
    o.disabled = !allowed.includes(o.value) || (o.value === "gauss" && n !== 2);
  if ($("algorithm").selectedOptions[0].disabled)
    $("algorithm").value = t === "cvp" ? "babai" : n === 2 ? "gauss" : "lll";
  $("target").disabled = t !== "cvp";
  $("seconds").disabled = $("algorithm").value !== "enum";
  $("algorithm-note").textContent = {
    gauss: "Exact shortest-vector result in two dimensions.",
    lll: "Reduced basis; shortest-vector result is approximate.",
    babai: "Approximate closest point after LLL reduction.",
    round: "Round target coordinates in the reduced basis.",
    enum: "Complete the bounded search to prove optimality.",
  }[$("algorithm").value];
}
function validate() {
  try {
    const B = parseMatrix($("matrix").value);
    if (task() === "cvp") parseVector($("target").value, B.length);
    $("validation").textContent =
      `Valid ${B.length} × ${B.length} basis · determinant ${determinant(B)}.`;
    $("validation").className = "hint valid";
    $("error").textContent = "";
    configure();
    return B;
  } catch (e) {
    $("error").textContent = e.message;
    $("validation").textContent = "";
    return null;
  }
}
function setupAxes(n) {
  for (const id of ["axis-x", "axis-y"]) {
    $(id).replaceChildren();
    for (let i = 0; i < n; i++) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = `x${i + 1}`;
      $(id).append(o);
    }
  }
  $("axis-x").value = 0;
  $("axis-y").value = 1;
  $("projection").hidden = n === 2;
  $("view-label").textContent =
    n === 2
      ? "Two-dimensional lattice"
      : "Coordinate projection · sampled points";
  $("plot-help").textContent =
    n === 2
      ? "Drag an original vector’s tip to edit the basis. In closest-point mode, drag the target too."
      : "This is a projection of sampled points. Lengths and answers use all coordinates.";
  plot.axes(0, 1);
}
function run() {
  dirty = true;
  const thisRun = ++runId;
  pause();
  if (worker) worker.terminate();
  busy = false;
  configure();
  const B = validate();
  if (!B) return;
  runConfig = {
    basis: B,
    task: task(),
    algorithm: $("algorithm").value,
    target: task() === "cvp" ? parseVector($("target").value, B.length) : null,
    limitMs: Number($("seconds").value),
  };
  dirty = false;
  lastProgress = null;
  $("answer-result").textContent =
    "Enter a vector to check membership and length.";
  $("answer-result").className = "";
  $("error").textContent = "";
  $("search-status").textContent = "Calculating…";
  $("stop").hidden = false;
  busy = true;
  worker = new Worker(new URL("./worker.mjs", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e) => {
    if (thisRun !== runId) return;
    if (e.data.type === "error") {
      dirty = true;
      busy = false;
      $("stop").hidden = true;
      $("error").textContent = e.data.message;
      $("search-status").textContent = "Calculation stopped.";
      worker.terminate();
      return;
    }
    if (e.data.type === "progress") {
      lastProgress = {
        ...e.data.result,
        original: B,
        target: runConfig.target,
        algorithm: runConfig.algorithm,
        task: runConfig.task,
      };
      $("search-status").textContent =
        `Searching · ${lastProgress.visited.toLocaleString()} / ${lastProgress.total} tuples checked`;
      return;
    }
    result = e.data.result;
    position = 0;
    busy = false;
    $("stop").hidden = true;
    worker.terminate();
    setupAxes(B.length);
    table();
    render();
    plot.fit();
  };
  worker.onerror = () => {
    if (thisRun !== runId) return;
    dirty = true;
    busy = false;
    $("stop").hidden = true;
    $("error").textContent =
      "The calculation worker could not start. Serve this folder over HTTP/HTTPS; do not open index.html directly.";
  };
  worker.postMessage(runConfig);
}
function table() {
  const body = $("trace");
  body.replaceChildren();
  result.steps.forEach((s, i) => {
    let tr = document.createElement("tr"),
      td = document.createElement("td"),
      detail = document.createElement("td"),
      b = document.createElement("button"),
      code = document.createElement("code");
    td.textContent = i;
    b.className = "trace-link";
    b.textContent = s.operation;
    b.onclick = () => {
      pause();
      position = i;
      render();
    };
    code.textContent = JSON.stringify(s.basis);
    detail.append(b, code);
    tr.append(td, detail);
    body.append(tr);
  });
  $("seek").max = result.steps.length - 1;
}
function render() {
  if (!result) return;
  const s = result.steps[position],
    n = result.original.length,
    t = result.task;
  plot.update({
    original: result.original,
    basis: s.basis,
    candidate: s.candidate,
    target: result.target,
  });
  $("page-title").textContent =
    t === "cvp"
      ? "Find the nearest lattice point."
      : t === "basis"
        ? "Same lattice. A better basis."
        : "Find the shortest vector.";
  $("badge").textContent = `${n}D · ${names[result.algorithm]}`;
  $("step-title").textContent = `Step ${position} · ${s.operation}`;
  $("calculation").textContent =
    (s.calculation ? s.calculation + "\n\n" : "") +
    "B = " +
    JSON.stringify(s.basis);
  $("step-explanation").textContent = s.explanation;
  $("position").textContent = `Step ${position} / ${result.steps.length - 1}`;
  $("seek").value = position;
  $("previous").disabled = position === 0;
  $("first").disabled = position === 0;
  $("next").disabled = position === result.steps.length - 1;
  [...$("trace").children].forEach((r, i) =>
    r.classList.toggle("current", i === position),
  );
  $("result-label").textContent =
    t === "basis"
      ? "Final reduced basis"
      : t === "cvp"
        ? "Final closest-point result"
        : "Final shortest-vector result";
  $("result-vector").textContent = JSON.stringify(
    t === "basis" ? result.basis : result.best,
  );
  $("result-vector").style.fontSize = t === "basis" ? "14px" : "";
  $("length-label").textContent =
    t === "cvp"
      ? "Distance to target"
      : t === "basis"
        ? "|determinant|"
        : "Length";
  $("result-length").textContent =
    t === "basis"
      ? String(determinant(result.basis)).replace("-", "")
      : Math.sqrt(
          norm2(result.best.map((x, i) => x - (result.target?.[i] || 0))),
        ).toLocaleString("en-GB", { maximumFractionDigits: 6 });
  $("status").textContent =
    t === "basis"
      ? "Reduced basis"
      : result.exact
        ? "Optimal · " +
          (result.algorithm === "gauss" ? "2D Gauss" : "complete search")
        : "Best found · unproven";
  $("status").className =
    "status" + (!result.exact && t !== "basis" ? " approx" : "");
  $("search-status").textContent =
    result.visited !== undefined
      ? `${result.visited.toLocaleString()} / ${result.total} tuples checked · ${(result.elapsed / 1000).toFixed(3)} seconds${!result.exact ? " · limit reached" : ""}`
      : `${result.steps.length} recorded steps. Use Play or click a trace row.`;
  $("provenance").textContent =
    `Results above are from the completed run; the plot and working show the selected trace step. Input basis: ${JSON.stringify(result.original)}${result.target ? " · target " + JSON.stringify(result.target) : ""}.`;
  $("guide-title").textContent = guides[result.algorithm][0];
  $("guide-text").textContent = guides[result.algorithm][1];
  $("notes").href = guides[result.algorithm][2];
  $("transform").textContent =
    "Reduced basis B′ = " +
    JSON.stringify(result.basis) +
    "\n\nU = " +
    JSON.stringify(result.transform) +
    "\n\nU × original B = B′";
  $("answer-label").textContent =
    t === "cvp" ? "Your closest lattice point" : "Your lattice vector";
}
function tick() {
  if (position >= result.steps.length - 1) {
    pause();
    return;
  }
  position++;
  render();
  timer = setTimeout(tick, Number($("speed").value));
}
function checkAnswer() {
  try {
    if (busy)
      throw Error(
        "Wait for the calculation to finish, or stop the search first.",
      );
    if (!result) throw Error("Run an example first.");
    if (dirty)
      throw Error("Your input has changed. Run it before comparing an answer.");
    const v = parseVector($("answer").value, result.original.length),
      c = coordinates(result.original, v),
      box = $("answer-result");
    if (!c.integers) {
      box.className = "no";
      box.textContent = `Not on this lattice. Basis coefficients: [${c.exact.join(", ")}]. Every coefficient must be an integer.`;
      return;
    }
    if (result.task !== "cvp" && v.every((x) => x === 0)) {
      box.className = "no";
      box.textContent =
        "The zero vector belongs to every lattice, but SVP requires a nonzero vector.";
      return;
    }
    const dist2 = (a) =>
        a.reduce((s, x, i) => {
          const d = BigInt(x) - BigInt(result.target?.[i] || 0);
          return s + d * d;
        }, 0n),
      d = dist2(v),
      best = dist2(result.best),
      length = Math.sqrt(Number(d)).toFixed(6);
    box.className = "ok";
    let verdict =
      result.task === "basis"
        ? "Membership verified; this does not check whether an entire proposed basis is reduced."
        : d === best
          ? result.exact
            ? "Matches the proven optimal distance."
            : "Matches the best distance found; optimality is unproven."
          : d > best
            ? `A shorter ${result.task === "cvp" ? "target distance" : "nonzero vector"} was found.`
            : "Improves on the app’s candidate.";
    box.textContent = `On the lattice. Integer coefficients [${c.exact.join(", ")}]. ${result.target ? "Distance" : "Length"} ${length}; squared ${d}. ${verdict}`;
  } catch (e) {
    $("answer-result").className = "no";
    $("answer-result").textContent = e.message;
  }
}
$("settings").onsubmit = (e) => {
  e.preventDefault();
  run();
};
$("validate").onclick = validate;
document.querySelectorAll("input[name=task]").forEach(
  (x) =>
    (x.onchange = () => {
      markDirty();
      configure();
      run();
    }),
);
$("algorithm").onchange = () => {
  markDirty();
  configure();
  run();
};
$("matrix").oninput = () => {
  markDirty();
  configure();
};
$("target").oninput = markDirty;
$("generate").onclick = () => {
  const n = Number($("dimensions").value),
    seed = Number($("seed").value);
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
    $("error").textContent = "Use an integer seed from 0 to 4294967295.";
    return;
  }
  let g = generated(n, $("difficulty").value, seed);
  $("matrix").value = JSON.stringify(g.basis);
  $("target").value = JSON.stringify(g.target);
  configure();
  run();
};
$("worked").onclick = () => {
  $("matrix").value = "[[6, 2],\n [4, 2]]";
  $("target").value = "[3, 2]";
  $("dimensions").value = 2;
  document.querySelector("input[name=task][value=svp]").checked = true;
  $("algorithm").value = "gauss";
  run();
};
$("check-answer").onclick = checkAnswer;
$("answer").onkeydown = (e) => {
  if (e.key === "Enter") checkAnswer();
};
$("play").onclick = () => {
  if (!result || busy) return;
  if (timer) {
    pause();
    return;
  }
  if (position === result.steps.length - 1) position = 0;
  $("play").textContent = "Ⅱ Pause";
  timer = setTimeout(tick, Number($("speed").value));
};
$("previous").onclick = () => {
  pause();
  position = Math.max(0, position - 1);
  render();
};
$("next").onclick = () => {
  pause();
  position = Math.min(result.steps.length - 1, position + 1);
  render();
};
$("first").onclick = () => {
  pause();
  position = 0;
  render();
};
$("last").onclick = () => {
  pause();
  position = result.steps.length - 1;
  render();
};
$("seek").oninput = () => {
  pause();
  position = Number($("seek").value);
  render();
};
$("zoom-in").onclick = () => plot.zoom(0.75);
$("zoom-out").onclick = () => plot.zoom(1.33);
$("fit").onclick = () => plot.fit();
for (const id of ["axis-x", "axis-y"])
  $(id).onchange = () => {
    if ($("axis-x").value === $("axis-y").value) {
      $("axis-y").value =
        (Number($("axis-x").value) + 1) % result.original.length;
    }
    plot.axes(Number($("axis-x").value), Number($("axis-y").value));
  };
$("stop").onclick = () => {
  worker?.terminate();
  busy = false;
  $("stop").hidden = true;
  if (lastProgress) {
    result = lastProgress;
    result.exact = false;
    position = result.steps.length - 1;
    setupAxes(result.original.length);
    table();
    render();
    plot.fit();
    $("search-status").textContent += " · manually stopped";
  } else {
    dirty = true;
    $("search-status").textContent =
      "Search stopped before the first progress checkpoint. Reduce the search limit or try a smaller example.";
  }
};
$("copy").onclick = async () => {
  if (!result || busy) return;
  const s = JSON.stringify(
    {
      basis: result.original,
      task: result.task,
      algorithm: result.algorithm,
      result: result.task === "basis" ? result.basis : result.best,
      optimal: result.task === "basis" ? null : result.exact,
      target: result.target,
    },
    null,
    2,
  );
  try {
    await navigator.clipboard.writeText(s);
    $("copy").textContent = "Copied";
  } catch {
    $("error").textContent =
      "Clipboard access was unavailable. Export the working as JSON instead.";
  }
  setTimeout(() => ($("copy").textContent = "Copy result"), 1800);
};
$("export").onclick = () => {
  if (!result || busy) return;
  const blob = new Blob([JSON.stringify({ ...runConfig, result }, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "lattice-working.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("import").onclick = () => $("file").click();
$("file").onchange = async () => {
  try {
    const file = $("file").files[0];
    if (!file) return;
    if (file.size > 2e6) throw Error("Use a JSON file smaller than 2 MB.");
    const d = JSON.parse(await file.text());
    parseMatrix(JSON.stringify(d.basis));
    $("matrix").value = JSON.stringify(d.basis);
    if (d.target) $("target").value = JSON.stringify(d.target);
    if (["svp", "cvp", "basis"].includes(d.task))
      document.querySelector(`input[name=task][value=${d.task}]`).checked =
        true;
    if (Object.keys(names).includes(d.algorithm))
      $("algorithm").value = d.algorithm;
    configure();
    run();
  } catch (e) {
    $("error").textContent = e.message;
  }
  $("file").value = "";
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
});
configure();
run();
