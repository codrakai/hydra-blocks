import React, { useEffect, useMemo, useRef, useState } from "react";
import create from "zustand";

import logo from "./logo.svg";
import "./App.css";

import { v4 as uuid } from "uuid";

import { render, useFrame, useResource, useThree } from "react-three-fiber";
import {
  VRCanvas,
  DefaultXRControllers,
  Interactive,
  useXR,
} from "@react-three/xr";
import { Color, CubeTexture, Vector3 } from "three";

/*
design notes
everything is blocks
doubly linked list
can branch with children on some args
  e.g. diff requires one arg that is a texture
check for valid connections on drop
  src has no prev
  out has no next
all blocks exist in world hash
on drop
  if added to something traverse new chain prev and up to redraw chain
  if removed from something traverse old chain prev and up to redraw chain

how to eval to string
  find all outputs (separate collection?)
  traverse back to head
  stringify from head
*/

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

const blockExampleFloats = {
  template: blockTemplates.osc,
  args: [60, 0.1, 0],
};

const blockExampleWithTexture = {
  template: blockTemplates.diff,
  args: [],
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

const addBefore = (rootBlock, addedBlock) => {};
const addAfter = (rootBlock, addedBlock) => {};
const destroyBlock = (blockId) => {};

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

function Block({ id, position, moveHandler, color }) {
  const [moveState, setMoveState] = useState(undefined);
  const [currentController, setCurrentController] = useState(undefined);
  const ref = useRef();
  const { controllers } = useXR();

  // useEffect :: set the position when the param changes
  useEffect(() => {
    if (!ref) return;

    ref.current.position.copy(position);
    ref.current.dataId = id;
  }, [ref, position, id]);

  // useEffect :: change current controller when moving starts or stops
  useEffect(() => {
    if (!moveState) {
      setCurrentController(undefined);
      moveHandler(id, ref.current.id);
      return;
    }

    const controller = controllers.find(
      (c) => c.controller.uuid === moveState.controller
    );

    setCurrentController(controller);
  }, [moveState]);

  // useFrame :: update object position on drag
  useFrame(() => {
    if (!moveState) return;
    if (!currentController) return;

    console.log(ref.current.position);

    const rotatedOffset = moveState.offset
      .clone()
      .applyQuaternion(currentController.controller.quaternion);

    ref.current.position.copy(
      currentController.controller.position.clone().add(rotatedOffset)
    );
  });

  console.log(`rendering ${id}`);

  return (
    <Interactive
      onSqueezeStart={(e) => {
        console.log(e);
        setMoveState({
          controller: e.controller.controller.uuid,
          offset: ref.current.position
            .clone()
            .sub(e.controller.controller.position),
          initialRotation: e.controller.controller.quaternion,
        });
      }}
      onSqueezeEnd={() => {
        console.log("squozend");
        setMoveState(undefined);
      }}
      onHover={() => console.log("hover")}
      onBlur={() => console.log("blur")}
    >
      <mesh ref={ref} position={position}>
        <boxGeometry></boxGeometry>
        <meshStandardMaterial color={color}></meshStandardMaterial>
      </mesh>
    </Interactive>
  );
}

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

function Scene() {
  useFrame((_, delta) => {
    hydra.tick(delta * 1000);
    sourceTexture.current.needsUpdate = true;
  });

  const { scene } = useThree();
  const { blocks } = useStore();

  const sourceTexture = useResource();

  const moveHandler = useMemo(() => createMoveHandler(scene), [scene]);

  useEffect(() => {
    if (!scene) return;
    if (!sourceTexture.current) return;

    scene.background = sourceTexture.current;
  }, [scene, sourceTexture]);

  console.log(blocks);

  return (
    <>
      <DefaultXRControllers />

      <directionalLight position={new Vector3(2, 3, 1)} />

      <cubeTexture
        ref={sourceTexture}
        images={[
          canvasSource,
          canvasSource,
          canvasSource,
          canvasSource,
          canvasSource,
          canvasSource,
        ]}
      />

      {Object.values(blocks).map((block) => {
        return (
          <Block
            key={block.id}
            id={block.id}
            position={block.position}
            color={block.color}
            moveHandler={moveHandler}
          ></Block>
        );
      })}
    </>
  );
}

function App() {
  return (
    <VRCanvas>
      <Scene />
    </VRCanvas>
  );
}

export default App;
