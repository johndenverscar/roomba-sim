# Roomba POV

A robot vacuum's-eye view of a four-room house: camera 8 cm off the floor, 110° FOV. One self-contained `index.html` (Three.js r128 from cdnjs). Open it in a browser.

It drives straight, bumps, backs up and turns; spirals on dirt; follows walls. `M` toggles a top-down coverage map.

## Control

In the page, `window.roomba`:

```js
roomba.state()                      // pose, mode, coverage, bumps…
roomba.tick({ seconds: 600 })       // fast-forward the sim
roomba.drive({ v: 0.3, w: 0.5, seconds: 2 })
roomba.teleport({ x: 1.8, z: 5.6, heading: 90 })
roomba.map({ cell: 0.25 })          // ASCII coverage map
roomba.on('bump', e => console.log(e))
```

Also `pause`, `resume`, `speed({x})`, `view({mode})`, `reset({seed})`, `spiral`, `auto`, `stop`, `dirt({x,z})`.

When published as a claude.ai artifact, documents added to its `commands` collection (`{cmd, args, ts}`) are run by an open view, which writes back `status` and `result`.

## Tests

```sh
cd test && npm i && node run.mjs && node remote.mjs && node jitter.mjs ../index.html
```

Headless Chrome via puppeteer-core (expects Chrome at the default macOS path).
