import React from "react";
import { VRCanvas, DefaultXRControllers } from "@react-three/xr";
import { Color, Vector3 } from "three";

import Scene from "./Scene";

import "./App.css";

// const blockExampleFloats = {
//   template: blockTemplates.osc,
//   args: [60, 0.1, 0],
// };

// const blockExampleWithTexture = {
//   template: blockTemplates.diff,
//   args: [],
// };

// TODO: evaluate blocks for okayness
const isValidForRender = (block) => true;

const hasValidChain = (output) => {
  let current = output;
  while (current.prev && isValidForRender(current.prev)) current = current.prev;
  if (current.type === "src") return true;

  return false;
};

const buildChainFrom = (o) => {
  if (!o) return "";
  return `${buildChainFrom(o.prev)}${blockTemplates[o.template].toRenderString(
    o
  )}`;
};

function App() {
  return (
    <VRCanvas>
      <Scene />
    </VRCanvas>
  );
}

export default App;
