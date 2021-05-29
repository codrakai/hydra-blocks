// HTML stuff
const canvasDim = 256;
const canvasSource = document.getElementById("source");
canvasSource.width = canvasDim;
canvasSource.height = canvasDim;

// Hydra stuff
var hydra = new Hydra({
  canvas: canvasSource,
  autoLoop: false,
  precision: "mediump",
});

export { canvasSource, hydra };
