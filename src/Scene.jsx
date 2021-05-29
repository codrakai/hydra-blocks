import { DefaultXRControllers } from "@react-three/xr";
import React, { useEffect, useMemo } from "react";
import { useFrame, useResource, useThree } from "react-three-fiber";
import { Color, Vector3 } from "three";

import { canvasSource, hydra } from "./hydra";
import { createMoveHandler, useStore } from "./logic";

import Block from "./Block";

const Scene = () => {
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
            type={block.template}
            position={block.position}
            color={block.color}
            moveHandler={moveHandler}
          ></Block>
        );
      })}
    </>
  );
};

export default Scene;
