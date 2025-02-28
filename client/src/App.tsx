import type { CylinderArgs, CylinderProps, PlaneProps } from '@react-three/cannon'
import { Debug, Physics, useCylinder, usePlane } from '@react-three/cannon'
import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import type { Group, Mesh } from 'three'

import { useToggledControl } from './use-toggled-control'
import Vehicle from './RaycastVehicle/Vehicle'
import { HideMouse, Keyboard } from './controls'

function Plane(props: PlaneProps) {
  const [ref] = usePlane(() => ({
    material: 'ground',
    type: 'Static',
    ...props
  }), useRef<Group>(null))
  return (
    <group ref={ref}>
      <mesh receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#303030" />
      </mesh>
    </group>
  )
}


function Pillar(props: CylinderProps) {
  const args: CylinderArgs = [0.7, 0.7, 5, 16]
  const [ref] = useCylinder(
    () => ({
      args,
      mass: 10,
      ...props,
    }),
    useRef<Mesh>(null),
  )
  return (
    <mesh ref={ref} castShadow>
      <cylinderGeometry args={args} />
      <meshNormalMaterial />
    </mesh>
  )
}

const style = {
  color: 'white',
  fontSize: '1.2em',
  left: 50,
  position: 'absolute',
  top: 20,
} as const


export function App(): JSX.Element {

  const ToggledDebug = useToggledControl(Debug, '?')
  return <>
    <Canvas camera={{ fov: 50, position: [0, 5, 15] }} shadows>
      <fog attach="fog" args={['#171720', 10, 50]} />
      <color attach="background" args={['#171720']} />
      <ambientLight intensity={0.1 * Math.PI} />
      <spotLight
        angle={0.5}
        castShadow
        decay={0}
        intensity={Math.PI}
        penumbra={1}
        position={[10, 10, 10]}
      />
      <Physics
        broadphase="SAP"
        defaultContactMaterial={{
          contactEquationRelaxation: 4,
          friction: 1e-3
        }}
        allowSleep
      >
        <ToggledDebug>
          <Plane position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ id: 'floor' }} />
          <Vehicle
          //position={[0, 2, 0]}
          //rotation={[0, -Math.PI / 4, 0]}
          //angularVelocity={[0, 0, 0]}
          />
          <Pillar position={[-5, 2.5, -5]} userData={{ id: 'pillar-1' }} />
          <Pillar position={[0, 2.5, -5]} userData={{ id: 'pillar-2' }} />
          <Pillar position={[5, 2.5, -5]} userData={{ id: 'pillar-3' }} />
        </ToggledDebug>
      </Physics>
      <Suspense fallback={null}>
        <Environment preset="night" />
      </Suspense>
      <OrbitControls />
    </Canvas>
    <HideMouse />
    <Keyboard />
    <div style={style}>
      <pre>
        * WASD to drive, space to brake
        <br />r to reset
        <br />? to debug
      </pre>
    </div>
  </>
}

