import React from "react";
import { Text } from "@react-three/drei";
import { Interactive } from "@react-three/xr";
import { Vector3 } from "three";

const TWO_PI = 2 * Math.PI;

const Knob = ({ label, value, singleTurnRange, onTurn }) => {
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
        {label}
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
        onHover={() => console.log(`hover ${label} ${value}`)}
        onBlur={() => console.log(`blur ${label} ${value}`)}
      >
        <mesh rotateZ={(value / singleTurnRange) * TWO_PI}>
          <boxGeometry></boxGeometry>
          <meshStandardMaterial color={color}></meshStandardMaterial>
        </mesh>
      </Interactive>
    </group>
  );
};

export default Knob;
