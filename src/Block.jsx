import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "react-three-fiber";
import { Text } from "@react-three/drei";
import { Interactive, useXR } from "@react-three/xr";
import { Vector3 } from "three";

export default ({ id, type, position, moveHandler, color }) => {
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
    <group ref={ref} position={position}>
      <Text
        color={"#EC2D2D"}
        fontSize={0.25}
        maxWidth={200}
        lineHeight={1}
        letterSpacing={0.02}
        position={new Vector3(0, 0.25, 1)}
      >
        {type}
      </Text>

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
        <mesh>
          <boxGeometry></boxGeometry>
          <meshStandardMaterial color={color}></meshStandardMaterial>
        </mesh>
      </Interactive>
    </group>
  );
};
