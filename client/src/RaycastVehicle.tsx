import React, { useRef, useEffect } from "react";
import * as CANNON from "cannon-es";
import {Demo}  from "./js/Demo";
// import * as THREE from "three";

export const RaycastVehicle = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const demo = new Demo();

    const setupWorld = (demo) => {
      const world = demo.getWorld();
      world.gravity.set(0, -10, 0);
      world.broadphase = new CANNON.SAPBroadphase(world);
      world.defaultContactMaterial.friction = 0;
      return world;
    };

    demo.addScene("Car", () => {
      const world = setupWorld(demo);

      // Create the car chassis
      const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 1));
      const chassisBody = new CANNON.Body({ mass: 150 });
      chassisBody.addShape(chassisShape);
      chassisBody.position.set(0, 4, 0);
      chassisBody.angularVelocity.set(0, 0.5, 0);
      demo.addVisual(chassisBody);

      // Create the vehicle
      const vehicle = new CANNON.RaycastVehicle({
        chassisBody,
      });

      const wheelOptions = {
        radius: 0.5,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        suspensionStiffness: 30,
        suspensionRestLength: 0.3,
        frictionSlip: 1.4,
        dampingRelaxation: 2.3,
        dampingCompression: 4.4,
        maxSuspensionForce: 100000,
        rollInfluence: 0.01,
        axleLocal: new CANNON.Vec3(0, 0, 1),
        chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
        maxSuspensionTravel: 0.3,
        customSlidingRotationalSpeed: -30,
        useCustomSlidingRotationalSpeed: true,
      };

      // Add wheels to the vehicle
      [-1, 1].forEach((x) => {
        [-1, 1].forEach((z) => {
          wheelOptions.chassisConnectionPointLocal.set(x, 0, z);
          vehicle.addWheel(wheelOptions);
        });
      });

      vehicle.addToWorld(world);

      // Add ground and define interactions
      const sizeX = 64;
      const sizeZ = 64;
      const matrix = Array.from({ length: sizeX }, (_, i) =>
        Array.from({ length: sizeZ }, (_, j) => {
          if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeZ - 1) {
            return 3;
          }
          return (
            Math.cos((i / sizeX) * Math.PI * 5) *
              Math.cos((j / sizeZ) * Math.PI * 5) *
              2 +
            2
          );
        })
      );

      const groundMaterial = new CANNON.Material("ground");
      const heightfieldShape = new CANNON.Heightfield(matrix, {
        elementSize: 100 / sizeX,
      });
      const heightfieldBody = new CANNON.Body({ mass: 0, material: groundMaterial });
      heightfieldBody.addShape(heightfieldShape);
      heightfieldBody.position.set(
        -(sizeX * heightfieldShape.elementSize) / 2,
        -1,
        (sizeZ * heightfieldShape.elementSize) / 2
      );
      heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      world.addBody(heightfieldBody);
      demo.addVisual(heightfieldBody);
    });

    demo.start();

    return () => {
      demo.dispose();
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default RaycastVehicle;
