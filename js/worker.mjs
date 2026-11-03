import { solve } from "./math.mjs";
onmessage = (e) => {
  try {
    const result = solve(e.data, (p) =>
      postMessage({ type: "progress", result: p }),
    );
    postMessage({ type: "result", result });
  } catch (e) {
    postMessage({ type: "error", message: e.message });
  }
};
