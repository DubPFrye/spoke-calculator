# Spoke length calculator

Works out left and right spoke lengths for a wheel from the hub and rim measurements.
Handles small road hubs and large-flange hub motors, offset (asymmetric) rims, zig-zag
drilled rims, and a different cross pattern on each side. Published on
[fryepower.com/spoke-length-calculator/](https://fryepower.com/spoke-length-calculator/).

Plain HTML, CSS and JavaScript: no build step and no package manager.

## Files

- `index.html`, `styles.css`: the page. The header and colours match fryepower.com; the styles
  are copied in so the page also works on its own.
- `spoke.js`: the geometry, with no DOM access. Loads as `window.Spoke` in the browser and with
  `require()` in Node.
- `app.js`: the form, results, diagrams and shareable link (state lives in the URL hash).
- `tests/spoke.test.js`: unit tests. `tests/index.html` runs them in a browser.

## Run locally

```
python -m http.server 8030 --bind 127.0.0.1
```

Open http://localhost:8030/ for the calculator and http://localhost:8030/tests/ for the tests.
The header links (`../`, `../configurator/`) only resolve once the page is inside the website.

To run the tests from a terminal (needs Node, any recent version):

```
node tests/spoke.test.js
```

## The geometry

Looking along the axle, a hub hole sits at radius `r = flange diameter / 2` and its rim hole at
`R = ERD / 2`, turned by `α = 720° × cross / spokes` (each side has `spokes / 2` holes, and every
cross moves the rim hole two hole-steps further round). Seen from the front, the flange is
`d` from the centre plane and the rim hole `h` from it toward the same flange. So

```
L = sqrt(R² + r² − 2·R·r·cos α + (d − h)²) − hub hole diameter / 2
```

`h` is `stagger + rim offset` on the left and `stagger − rim offset` on the right, with the rim
offset measured toward the left (non-drive) side.

The results also show:

- **Relative tension**: the sideways pulls of the two sides must cancel, so
  `T_left · sin(bracing_left) = T_right · sin(bracing_right)`; the tighter side is 100%.
- **Exit angle at hub**: angle between the flange radius and the spoke. Over 90° means the spoke
  would wrap over the flange, which is the usual limit on big hub-motor flanges.
- **Max cross (tangent)**: the most crosses that keep the exit angle at or below 90°.

The expected values in the tests come from exact Pythagorean cases you can check by hand and from
placing both holes as 3D points and measuring between them, not from `spoke.js` itself.

## Publishing

`.github/workflows/publish.yml` runs the tests on every push to `main` and copies `index.html`,
`styles.css`, `app.js` and `spoke.js` into the website repo's `spoke-length-calculator/` folder. It needs
the `WEBSITE_REPO` variable and `WEBSITE_TOKEN` secret set in this repo (see the comments at the
top of the workflow); without them it only tests. Don't edit `spoke-length-calculator/` in the website
repo by hand, because the next publish overwrites it.

## Ideas

- Hub and rim database (pick a motor or rim instead of measuring).
- Spoke stretch allowance and nipple length choice.
- Inch input for ERD and flange measurements.
