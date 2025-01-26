import type { BoxProps, WheelInfoOptions } from '@react-three/cannon'
import { useBox, useRaycastVehicle } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { SetStateAction, useEffect, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'

import { Chassis } from './Chassis'
import { useControls } from './use-controls'
import { Wheel } from './Wheel'
import socket from '../socket';
import { MathUtils, Vector3, Quaternion } from 'three'

interface PhysicsData {
  chassisBody: {
    position: Vector3, quaternion: Quaternion
  },
  wheels: [
    { position: { x: number; y: number; z: number }, quaternion: Quaternion },
    { position: { x: number; y: number; z: number }, quaternion: Quaternion },
    { position: { x: number; y: number; z: number }, quaternion: Quaternion },
    { position: { x: number; y: number; z: number }, quaternion: Quaternion },
  ]
}

export type VehicleProps = {
  back?: number
  force?: number
  front?: number
  height?: number
  radius?: number
  steer?: number
  width?: number
  maxBrake?: number
}

function Vehicle({
  // angularVelocity,
  back = -1.15,
  width = 1.2,
  front = 1.3,
  height = -0.04,
  // force = 1500,
  // maxBrake = 50,
  // position,
  radius = 0.7,
  // rotation,
  // steer = 0.5,
}: VehicleProps) {
  // const { lerp } = MathUtils

  const wheels = [useRef<Group>(null), useRef<Group>(null), useRef<Group>(null), useRef<Group>(null)]

  // store backend data
  const [vehicleData, setVehicleData] = useState<PhysicsData | undefined>();



  const wheelInfo: WheelInfoOptions = {
    axleLocal: [-1, 0, 0], // This is inverted for asymmetrical wheel models (left v. right sided)
    customSlidingRotationalSpeed: -30,
    dampingCompression: 4.4,
    dampingRelaxation: 10,
    directionLocal: [0, -1, 0], // set to same as Physics Gravity
    frictionSlip: 2,
    maxSuspensionForce: 1e4,
    maxSuspensionTravel: 0.3,
    radius,
    suspensionRestLength: 0.3,
    suspensionStiffness: 30,
    useCustomSlidingRotationalSpeed: true,
  }

  const wheelInfo1: WheelInfoOptions = {
    ...wheelInfo,
    chassisConnectionPointLocal: [-width / 2, height, front],
    isFrontWheel: true,
  }
  const wheelInfo2: WheelInfoOptions = {
    ...wheelInfo,
    chassisConnectionPointLocal: [width / 2, height, front],
    isFrontWheel: true,
  }
  const wheelInfo3: WheelInfoOptions = {
    ...wheelInfo,
    chassisConnectionPointLocal: [-width / 2, height, back],
    isFrontWheel: false,
  }
  const wheelInfo4: WheelInfoOptions = {
    ...wheelInfo,
    chassisConnectionPointLocal: [width / 2, height, back],
    isFrontWheel: false,
  }

  // chassisBody: A reference to the box's mesh, used to attach it to the scene.
  // chassisApi: An API to programmatically control the physics body, such as 
  // updating position, applying forces, or manipulating rotations.

  const [chassisBody, chassisApi] = useBox(
    () => ({
      allowSleep: false,
      // angularVelocity,
      args: [1.7, 1, 4],
      mass: 500,
      onCollide: (e) => console.log('bonk', e.body.userData),
      position: [0, 2, 0],
      // rotation,
    }),
    useRef<Mesh>(null),
  )

  // The chassisBody is the central physics body, and wheelInfos 
  // provides properties for each wheel.
  // vehicleApi allows controlling the vehicle, such as 
  // applying engine force, steering, and braking.

  const [vehicle, vehicleApi] = useRaycastVehicle(
    () => ({
      chassisBody,
      wheelInfos: [wheelInfo1, wheelInfo2, wheelInfo3, wheelInfo4],
      wheels,
    }),
    useRef<Group>(null),
  )

  // useEffect(() => vehicleApi.sliding.subscribe((v) => console.log('sliding', v)), [])

  // Manage data received from backend
  const [isConnected, setIsConnected] = useState(socket.connected);
  // console.log("isconnected ", isConnected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('connected: ', socket.connected)
    }
    function onDisconnect() {
      setIsConnected(false);
      console.log('disconnected')
    }
    // Listen for physics updates from the server
    function onPhysicsUpdate(physics: PhysicsData) {
      // console.log('physics: ', physics)
      setVehicleData({
        chassisBody: physics.chassisBody,
        wheels: physics.wheels
      }
      );
    };

    // socket.on('move', onMove);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('physicsUpdate', onPhysicsUpdate);

    return () => {
      socket.off('physicsUpdate', onPhysicsUpdate);
    };
  }, []);

  useEffect(() => {
    if (!vehicleData) return;
    const { position, quaternion } = vehicleData.chassisBody;

    // const posVector = new Vector3(...position);
    // const quaVector = new Quaternion(...quaternion);
    // const rotVector = new Vector3(...rotation);

    chassisApi.position.set(position.x, position.y, position.z);
    chassisApi.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    // chassisApi.rotation.set(rotVector.x, rotVector.y, rotVector.z);
  }, [vehicleData, chassisApi]);

  useEffect(() => {
    if (!vehicleData) return;
    vehicleData.wheels.forEach((wheel, index) => {
      if (wheels[index].current) {
        // const posVector = new Vector3(...wheel.position);
        // const quaVector = new Quaternion(...wheel.quaternion);
        // const rotVector = new Vector3(...wheel.rotation);
        wheels[index].current.position.set(wheel.position.x, wheel.position.y, wheel.position.z);
        wheels[index].current.quaternion.set(wheel.quaternion.x, wheel.quaternion.y, wheel.quaternion.z, wheel.quaternion.w);
        // wheels[index].current.rotation.set(rotVector.x, rotVector.y, rotVector.z);
      }
    });
  }, [vehicleData, wheels]);

  useFrame(() => {
    // Optional: Add custom animations or smooth transitions here
    // // Create Vector3 instances
    // const currentPos = new Vector3();
    // const targetPos = new Vector3(...vehicleData.chassis.position);

    // // Subscribe to the current position
    // chassisApi.position.subscribe((pos) => currentPos.set(...pos));

    // // Interpolate between current and target position
    // const smoothedPos = currentPos.lerp(targetPos, 0.1);
    // chassisApi.position.set(smoothedPos.x, smoothedPos.y, smoothedPos.z);

    // // Similarly, handle rotation if needed
    // const currentRot = new Vector3();
    // const targetRot = new Vector3(...vehicleData.chassis.rotation);

    // chassisApi.rotation.subscribe((rot) => currentRot.set(...rot));

    // const smoothedRot = currentRot.lerp(targetRot, 0.1);
    // chassisApi.rotation.set(smoothedRot.x, smoothedRot.y, smoothedRot.z);

    // // animate wheels 
    // vehicleData.wheels.forEach((wheelData, index) => {
    //   const wheel = wheels[index].current;
    //   if (!wheel) return;

    //   // Smooth position
    //   const currentPos = new Vector3();
    //   const targetPos = new Vector3(...wheelData.position);
    //   currentPos.copy(wheel.position);
    //   const smoothedPos = currentPos.lerp(targetPos, 0.1);
    //   wheel.position.set(smoothedPos.x, smoothedPos.y, smoothedPos.z);

    //   // Smooth rotation
    //   const currentRot = new Vector3();
    //   const targetRot = new Vector3(...wheelData.rotation);
    //   currentRot.copy(wheel.rotation);
    //   const smoothedRot = currentRot.lerp(targetRot, 0.1);
    //   wheel.rotation.set(smoothedRot.x, smoothedRot.y, smoothedRot.z);
    // });


    // constrols
    // const controls = useControls()
    // Apply physics
    // const { backward, brake, forward, left, reset, right } = controls.current
    //   for (let e = 2; e < 4; e++) {
    //     vehicleApi.applyEngineForce(forward || backward ? force * (forward && !backward ? -1 : 1) : 0, 2)
    //   }
    //   for (let s = 0; s < 2; s++) {
    //     vehicleApi.setSteeringValue(left || right ? steer * (left && !right ? 1 : -1) : 0, s)
    //   }
    //   for (let b = 2; b < 4; b++) {
    //     vehicleApi.setBrake(brake ? maxBrake : 0, b)
    //   }
    //   if (reset) {
    //     chassisApi.position.set(...position)
    //     chassisApi.velocity.set(0, 0, 0)
    //     chassisApi.angularVelocity.set(...angularVelocity)
    //     chassisApi.rotation.set(...rotation)
    //   }
  })

  return (
    <group ref={vehicle} //position={[0, -0.4, 0]}
    >
      <Chassis ref={chassisBody} />
      <Wheel ref={wheels[0]} radius={radius} leftSide />
      <Wheel ref={wheels[1]} radius={radius} />
      <Wheel ref={wheels[2]} radius={radius} leftSide />
      <Wheel ref={wheels[3]} radius={radius} />
    </group>
  )
}

export default Vehicle
