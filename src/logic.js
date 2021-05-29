import { Color, Vector3 } from "three";
import create from "zustand";
import { v4 as uuid } from "uuid";

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

const renderValidChains = () => {
  let renderString = "";
  const renderOuts = [];
  Object.values(outputs).forEach((o) => {
    if (hasValidChain(o)) {
      console.log(`${o.id} has a valid render chain`);
      renderString = buildChainFrom(o);
      renderOuts.push(o.id);
    }
  });
  console.log(renderString);

  eval(renderString);

  switch (renderOuts.length) {
    case 0:
      return;
    case 1:
      const renderString = `window.render(${renderOuts[0]})`;
      eval(renderString);
      break;
    default:
      window.render();
      break;
  }
};

// Data stuff
const blockTemplates = {
  osc: {
    type: "src",
    color: "red",
    params: [
      { name: "freq", type: "float", default: 60 },
      { name: "sync", type: "float", default: 0.1 },
      { name: "offset", type: "float", default: 0 },
    ],
    toRenderString: (block) => "osc().",
  },
  diff: {
    type: "mod",
    color: "blue",
    params: [{ name: "texture", type: "texture" }],
    toRenderString: (block) => "diff().",
  },
  output: {
    type: "output",
    color: "purple",
    params: [],
    toRenderString: (block) => `out(${block.id})`,
  },
};

const createBlock = (templateName, { id, createPosition }) => {
  id ||= uuid();
  createPosition ||= new Vector3(0, 0, 0);

  if (!blockTemplates[templateName])
    throw new Error(`Invalid block template ${templateName} supplied`);

  return {
    id,
    template: templateName,
    args: blockTemplates[templateName].params.map((p) => p.default),
    position: createPosition,
    color: new Color(blockTemplates[templateName].color),
    type: blockTemplates[templateName].type,
  };
};

const outputs = {
  o1: createBlock("output", {
    id: "o1",
    createPosition: new Vector3(-2, 1, -5),
  }),
};

const useStore = create((set, get) => ({
  blocks: {
    ...outputs,
  },
  addBlock: (...args) => {
    const newBlock = createBlock(...args);
    // console.log(newBlock);
    set({ blocks: { ...get().blocks, [newBlock.id]: newBlock } });
  },
  updateBlocks: (freshBlockData) => {
    set({ blocks: { ...get().blocks, ...freshBlockData } });
  },
}));

useStore.getState().addBlock("osc", { createPosition: new Vector3(0, 1, -5) });
useStore.getState().addBlock("diff", { createPosition: new Vector3(2, 1, -5) });

const moveIsInvalid = (left, right) => {
  if (left.type === "output") return true;
  if (right.type === "src") return true;

  return false;
};

const moveIsNoop = (left, right) => {
  return left.next === right;
};

const createMoveHandler = (scene) => (blockDataId, blockThreeId) => {
  let dropped = scene.getObjectById(blockThreeId);
  let overlapped;

  scene.traverse((o) => {
    if (o.type === "Scene") return;
    if (o.id === blockThreeId) return;

    if (o.position.clone().sub(dropped.position).length() < 1) {
      overlapped = o;
      console.log(o);
    }
  });

  if (!overlapped) return;

  const { blocks } = useStore.getState();

  const droppedData = blocks[blockDataId];
  const overlappedData = blocks[overlapped.dataId];

  const overlappedRight = new Vector3(1, 0, 0);
  overlappedRight.applyQuaternion(overlapped.quaternion).normalize();
  const droppedToOverlapped = dropped.position
    .clone()
    .sub(overlapped.position)
    .normalize();
  const droppedToTheRight = overlappedRight.dot(droppedToOverlapped) > 0;

  let left, right, leftData, rightData;
  if (droppedToTheRight) {
    left = overlapped;
    leftData = overlappedData;
    right = dropped;
    rightData = droppedData;
  } else {
    left = dropped;
    leftData = droppedData;
    right = overlapped;
    rightData = overlappedData;
  }

  if (!moveIsInvalid(leftData, rightData) && !moveIsNoop(leftData, rightData)) {
    rightData.next = leftData.next;
    rightData.prev = leftData;
    leftData.next = rightData;

    rightData.position = new Vector3(1, 0, 0)
      .applyQuaternion(left.quaternion)
      .add(left.position);
  } else {
    droppedData.position = droppedData.position.clone();
  }

  useStore.getState().updateBlocks({
    [droppedData.id]: droppedData,
    [overlappedData.id]: overlappedData,
  });

  renderValidChains();
};

export { createMoveHandler, useStore };
