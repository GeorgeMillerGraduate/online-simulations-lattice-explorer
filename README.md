# Lattice Explorer — Jenga Code

## Install

Extract the `lattice-explorer` folder into `public_html/apps/`.
The resulting page is `/apps/lattice-explorer/`.
Keep `index.html`, `style.css`, `js/`, `assets/` and the supplied `.htaccess` together. The Apache rule supplies the JavaScript MIME type for `.mjs` modules where needed.

This is a new app. It does not overwrite Encryption Studio or modify your homepage/application catalogue. Add a link to `/apps/lattice-explorer/` when ready.

The app runs entirely in the browser, including its calculation worker. It needs no server API, external JavaScript library, CDN, account, npm installation or GPU. Run it over HTTP/HTTPS, not by double-clicking index.html.

For a local preview, run `python -m http.server 8791` inside this folder, then visit http://localhost:8791/.

## Use your own work

Paste a square, full-rank integer basis with 2–6 dimensions. Rows are basis vectors. Both formats below work:

```json
[[6, 2], [4, 2]]
```

```text
6 2
4 2
```

Choose the task and an enabled algorithm, then click **Run your example**. Ctrl+Enter or Command+Enter also runs it. A closest-point task requires a target vector of the same dimension.

The initial worked example has a shortest vector `[2, 0]` of length 2. Other vectors of equal length are also valid answers. The app uses a deterministic sign/tie convention for its displayed representative, while the answer checker compares distances rather than insisting on identical coordinates.

- Play or single-step through recorded changes. Click any trace row to inspect it.
- The result strip shows the final result; the plot and calculation card show the selected trace step.
- Check your proposed vector: membership is verified through exact rational basis coordinates. A nonmember displays fractional coefficients.
- Expand **Final basis & transformation** to see U, where `U × original B = reduced B`.
- Generate reproducible examples with dimensions, difficulty and seed.
- In 2D, drag an original basis tip; in closest-point mode, drag the target. Inputs snap to integers and the calculation reruns after release.
- Zoom or fit the graph. Higher-dimensional examples offer coordinate-axis selectors; these are projections, not full-dimensional pictures.
- Export your input, result, transformation and trace as JSON. Import that JSON to repeat the calculation.

Input and working remain in your browser. The app makes no analytics or calculation-service requests.

## Algorithms

1. **Gauss reduction:** exact shortest-vector result for two-dimensional Euclidean lattices. Also reduces a 2D basis. Dot products and the rounded quotient use integer arithmetic.
2. **LLL:** delta 0.75, floating-point Gram–Schmidt, integer row operations. Reduces a basis; the shortest output row is an unproven SVP candidate.
3. **Babai nearest plane:** first LLL-reduces the basis, then projects and rounds in reverse Gram–Schmidt order. Approximate CVP result.
4. **Coordinate rounding:** first LLL-reduces the basis, then rounds the target’s coordinates in that basis. Approximate CVP baseline.
5. **Exact enumeration:** first obtains a candidate using LLL/Babai, then enumerates a rigorously bounded integer coefficient box. This teaching implementation uses a box search, not Fincke–Pohst sphere enumeration. It proves optimality only if the whole box is checked. Otherwise it reports the best candidate found.

BKZ, sieving, lattice encryption and realistic cryptographic dimensions are not implemented in this edition.

## Bounds and arithmetic

The convention is `v = zB`. Let `A = adj(B)` and `d = det(B)`. An initial candidate bounds the target distance by R, the integer ceiling of its Euclidean distance. Every improving point satisfies

```text
|z_i| <= floor((R * sum_j |A_ji| + |sum_j t_j A_ji|) / |d|).
```

For SVP, the target t is zero and the zero vector is excluded. BigInt arithmetic supplies determinants, adjugates, membership fractions, search bounds and squared search distances. Bound construction is independent of floating-point Gram–Schmidt quality, provided the integer row transformations succeed.

Input entries are integers from -10000 to 10000; target/answer entries from -100000 to 100000. Intermediate row arithmetic is checked for safe integer operations. Ill-conditioned floating-point reduction, excessive intermediate values, or overly long reduction traces produce an error instead of a result.

Enumeration has a selected 1-, 3- or 10-second search budget and a ceiling of two million coefficient tuples. The search budget applies to enumeration after preprocessing, with checks every 512 tuples; it is not a strict total wall-clock deadline. The worker can be stopped independently. At most about 1500 working steps are retained; excessive enumeration improvements are omitted with a note in the final trace step. The final answer still reflects all checked candidates.

Displayed points are a bounded visual sample, possibly decimated in dense 2D views. Higher-dimensional views sample combinations of up to four basis rows. No visual sample is used to prove a result.

## Validation

Run `node tests/math.test.mjs` with Node 20 or later. Checks cover parsing and singular matrices, integer membership, unimodular row transformations, seeded examples, two-dimensional agreement between Gauss and enumeration, independent small 3D closest-point searches and incomplete-search labels.

Real-browser checks covered the worked example, member/nonmember answers, 3D generation, closest-point enumeration, and a narrow phone layout.
