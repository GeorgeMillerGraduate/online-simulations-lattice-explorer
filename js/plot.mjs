const NS = "http://www.w3.org/2000/svg";
const node = (tag, attrs = {}, value) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (value !== undefined) el.textContent = value;
  return el;
};
export function makePlot(svg, onEdit) {
  let data = null,
    extent = 8,
    axes = [0, 1],
    drag = null;
  const W = 720,
    H = 500,
    m = 45,
    cx = W / 2,
    cy = H / 2;
  const scale = () =>
    Math.min((W - 2 * m) / (2 * extent), (H - 2 * m) / (2 * extent));
  const pos = (v) => [cx + v[axes[0]] * scale(), cy - v[axes[1]] * scale()];
  function draw(animate = false) {
    if (!data) return;
    svg.replaceChildren();
    const defs = node("defs");
    for (const [id, c] of [
      ["red", "#963d38"],
      ["green", "#197849"],
      ["blue", "#244d61"],
    ]) {
      const marker = node("marker", {
        id: `lattice-${id}`,
        viewBox: "0 0 10 10",
        refX: 9,
        refY: 5,
        markerWidth: 8,
        markerHeight: 8,
        orient: "auto-start-reverse",
      });
      marker.append(node("path", { d: "M0 0L10 5L0 10Z", fill: c }));
      defs.append(marker);
    }
    svg.append(defs);
    const g = node("g");
    svg.append(g);
    const text = (x, y, t, attrs = {}) =>
      g.append(node("text", { x, y, ...attrs }, t));
    const line = (x1, y1, x2, y2, attrs = {}) =>
      g.append(node("line", { x1, y1, x2, y2, ...attrs }));
    const sx = scale(),
      xmax = (W / 2 - m) / sx,
      ymax = (H / 2 - m) / sx;
    let tick =
      extent > 30
        ? Math.pow(10, Math.floor(Math.log10(extent)))
        : extent > 10
          ? 5
          : extent > 4
            ? 2
            : 1;
    for (let x = Math.ceil(-xmax / tick) * tick; x <= xmax; x += tick) {
      line(cx + x * sx, m, cx + x * sx, H - m, { class: "gridline" });
      if (x !== 0)
        text(cx + x * sx, H - m + 18, Number(x.toFixed(3)), {
          "text-anchor": "middle",
        });
    }
    for (let y = Math.ceil(-ymax / tick) * tick; y <= ymax; y += tick) {
      line(m, cy - y * sx, W - m, cy - y * sx, { class: "gridline" });
      if (y !== 0)
        text(m - 9, cy - y * sx + 4, Number(y.toFixed(3)), {
          "text-anchor": "end",
        });
    }
    line(m, cy, W - m, cy, { class: "axis" });
    line(cx, m, cx, H - m, { class: "axis" });
    text(W - m + 7, cy - 7, `x${axes[0] + 1}`);
    text(cx + 7, m - 9, `x${axes[1] + 1}`);
    text(cx - 8, cy + 16, "0");
    let points = [],
      B = data.basis || data.original;
    if (B.length === 2) {
      const det = B[0][0] * B[1][1] - B[0][1] * B[1][0],
        cs = [
          [-xmax, -ymax],
          [-xmax, ymax],
          [xmax, -ymax],
          [xmax, ymax],
        ].map(([x, y]) => [
          (x * B[1][1] - y * B[1][0]) / det,
          (-x * B[0][1] + y * B[0][0]) / det,
        ]),
        lo = [0, 1].map(
          (j) => Math.floor(Math.min(...cs.map((c) => c[j]))) - 1,
        ),
        hi = [0, 1].map((j) => Math.ceil(Math.max(...cs.map((c) => c[j]))) + 1),
        count = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1),
        stride = Math.max(1, Math.ceil(Math.sqrt(count / 12000)));
      for (let i = lo[0]; i <= hi[0]; i += stride)
        for (let j = lo[1]; j <= hi[1]; j += stride)
          points.push([i * B[0][0] + j * B[1][0], i * B[0][1] + j * B[1][1]]);
    } else {
      const n = Math.min(B.length, 4),
        v = Array(B.length).fill(0);
      function sample(k) {
        if (k === n) {
          points.push(v.slice());
          return;
        }
        for (let z = -2; z <= 2; z++) {
          const old = v.slice();
          for (let j = 0; j < v.length; j++) v[j] = old[j] + z * B[k][j];
          sample(k + 1);
          v.splice(0, v.length, ...old);
        }
      }
      sample(0);
    }
    const seen = new Set();
    for (const v of points) {
      const [x, y] = pos(v),
        key = `${Math.round(x)},${Math.round(y)}`;
      if (x < m || x > W - m || y < m || y > H - m || seen.has(key)) continue;
      seen.add(key);
      g.append(node("circle", { cx: x, cy: y, r: 2.3, class: "point" }));
    }
    if (B.length === 2) {
      const p0 = pos([0, 0]),
        p1 = pos(B[0]),
        p2 = pos(B[1]),
        p3 = pos(B[0].map((x, i) => x + B[1][i]));
      g.append(
        node("polygon", {
          points: [p0, p1, p3, p2].map((p) => p.join(",")).join(" "),
          fill: "#197849",
          opacity: 0.07,
          stroke: "#197849",
          "stroke-dasharray": "5 4",
        }),
      );
    }
    function vector(v, c, id, label, handle) {
      const [x, y] = pos(v);
      line(cx, cy, x, y, {
        stroke: c,
        "stroke-width": 2.3,
        "marker-end": `url(#lattice-${id})`,
        class: animate ? "vector-motion" : "",
      });
      if (x >= 10 && x <= W - 10 && y >= 10 && y <= H - 10) {
        text(x + 9, y + (id === "green" ? 18 : -9), label, {
          fill: c,
          class: "vector-label",
          style: `fill:${c};paint-order:stroke;stroke:#fbf8ef;stroke-width:4px`,
        });
        if (handle) {
          const h = node("circle", {
            cx: x,
            cy: y,
            r: 9,
            fill: c,
            "fill-opacity": 0.08,
            stroke: c,
            "stroke-width": 1,
            "data-drag": handle,
            class: "draggable",
          });
          g.append(h);
        }
      }
    }
    for (let i = 0; i < Math.min(data.original.length, 4); i++)
      vector(
        data.original[i],
        "#963d38",
        "red",
        `b${i + 1} [${data.original[i]}]`,
        data.original.length === 2 ? `basis-${i}` : null,
      );
    for (let i = 0; i < Math.min(B.length, 4); i++)
      vector(B[i], "#197849", "green", `r${i + 1} [${B[i]}]`);
    if (data.target) {
      const [x, y] = pos(data.target);
      if (data.candidate) {
        const [a, b] = pos(data.candidate);
        line(x, y, a, b, {
          stroke: "#b7812e",
          "stroke-width": 1.4,
          "stroke-dasharray": "5 4",
        });
      }
      g.append(
        node("path", {
          d: `M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}`,
          stroke: "#b7812e",
          "stroke-width": 2,
        }),
      );
      g.append(
        node("circle", {
          cx: x,
          cy: y,
          r: 12,
          fill: "transparent",
          "data-drag": data.original.length === 2 ? "target" : "",
          class: "draggable",
        }),
      );
      text(x + 10, y - 12, `target [${data.target}]`);
    }
    if (data.candidate) {
      const [x, y] = pos(data.candidate);
      g.append(
        node("circle", {
          cx: x,
          cy: y,
          r: 6,
          fill: "#244d61",
          stroke: "#fffdf7",
          "stroke-width": 2,
        }),
      );
      text(x + 10, y + 30, `candidate [${data.candidate}]`, {
        style:
          "fill:#244d61;paint-order:stroke;stroke:#fbf8ef;stroke-width:4px",
      });
    }
    g.append(node("circle", { cx, cy, r: 3, fill: "#27383b" }));
  }
  function pointer(e) {
    const r = svg.getBoundingClientRect(),
      ratio = Math.min(r.width / W, r.height / H),
      ox = r.left + (r.width - W * ratio) / 2,
      oy = r.top + (r.height - H * ratio) / 2;
    return [
      Math.round(((e.clientX - ox) / ratio - cx) / scale()),
      Math.round((cy - (e.clientY - oy) / ratio) / scale()),
    ];
  }
  svg.addEventListener("pointerdown", (e) => {
    const id = e.target.getAttribute("data-drag");
    if (!id) return;
    drag = id;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    let v = pointer(e);
    if (v.some((x) => Math.abs(x) > 10000)) return;
    if (drag === "target") data.target = v;
    else data.original[Number(drag.split("-")[1])] = v;
    draw();
  });
  svg.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const kind = drag;
    drag = null;
    onEdit(
      kind,
      data.original.map((r) => r.slice()),
      data.target?.slice(),
    );
  });
  svg.addEventListener("pointercancel", () => {
    drag = null;
    draw();
  });
  return {
    update(d) {
      const changed = JSON.stringify(data?.basis) !== JSON.stringify(d.basis);
      data = { ...d, original: d.original.map((r) => r.slice()) };
      draw(changed);
    },
    fit() {
      if (!data) return;
      const vs = [
        ...data.original,
        ...(data.basis || []),
        ...(data.target ? [data.target] : []),
        ...(data.candidate ? [data.candidate] : []),
      ];
      extent =
        Math.max(
          4,
          ...vs.flatMap((v) => axes.map((a) => Math.abs(v[a] || 0))),
        ) * 1.3;
      draw();
    },
    zoom(f) {
      extent = Math.max(1, Math.min(100000, extent * f));
      draw();
    },
    axes(x, y) {
      axes = [x, y];
      this.fit();
    },
    snapshot: () => svg.outerHTML,
  };
}
