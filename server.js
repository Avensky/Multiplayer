const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const path = require('path');
const PORT = 4000;
const {
  World,
  Body,
  Vec3,
  Box,
  Cylinder,
  Material,
  ContactMaterial,
  Heightfield,
  Plane,
  RaycastVehicle,
  SAPBroadphase,
  Quaternion
} = require('cannon-es');

// parse json data sent to frontend
app.use(bodyParser.json());

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Adjust 'public' to your project folder
app.use(express.static(path.join(__dirname, '')));

// set up socket connection to client
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite client URL
    methods: ['GET', 'POST']
  }
});

const players = []; // Store player states

console.log("try socket")
io.on("connect", (socket) => {

  // Create a physics world
  const world = new World({ gravity: new Vec3(0, -9.82, 0), });

  // Create a ground plane
  const groundMaterial = new Material('ground')
  const ground = new Body({
    mass: 0, // Static object
    material: groundMaterial, // Material
    shape: new Box(new Vec3(50, 1, 50)), // Large ground box
  });
  ground.position.set(0, -.4, 0);
  world.addBody(ground);


  // add player
  socket.join(`${socket.id}`);
  console.log('Player Connected: ', socket.id);
  const player = socket.id;
  players.push(player);


  // Create a chassis body
  const chassisBody = new Body({
    mass: 500,
    rotation: new Vec3(0, -Math.PI / 4, 0),
    // position: new Vec3(0, 4, 0),
  })
  const chassisShape = new Box(new Vec3(2, 0.5, 1))
  chassisBody.addShape(chassisShape)
  chassisBody.angularVelocity.set(0, 0.5, 0)
  world.addBody(chassisBody);

  // Create the vehicle
  const vehicle = new RaycastVehicle({
    position: [0, -0.4, 0],
    chassisBody,
  })

  // const back = -1.15
  // const width = 1.2
  // const front = 1.3
  // const height = -0.04
  const radius = 0.7

  //define wheel options
  const wheelOptions = {
    directionLocal: new Vec3(0, -1, 0), // set to same as Physics Gravity
    axleLocal: new Vec3(0, 0, 1), // This is inverted for asymmetrical
    customSlidingRotationalSpeed: -30,
    dampingCompression: 4.4,
    dampingRelaxation: 10,
    frictionSlip: 2,
    maxSuspensionForce: 1e4,
    maxSuspensionTravel: 0.3,
    radius,
    suspensionRestLength: 0.3,
    suspensionStiffness: 30,
    useCustomSlidingRotationalSpeed: true,
    chassisConnectionPointLocal: new Vec3(-1, 0, 1)
    // rollInfluence: 0.01, // only in cannon-es
  }

  //add wheels
  vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new Vec3(-1, 0, 1) }); // front left
  vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new Vec3(-1, 0, -1) }); // front right
  vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new Vec3(1, 0, 1) }); // rear left
  vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: new Vec3(1, 0, -1) }); // rear right

  vehicle.addToWorld(world)

  // Add the wheel bodies
  const wheelBodies = []
  const wheelMaterial = new Material('wheel')
  vehicle.wheelInfos.forEach((wheel) => {
    const cylinderShape = new Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20)
    const wheelBody = new Body({
      mass: 0,
      material: wheelMaterial,
    })
    wheelBody.type = Body.KINEMATIC
    wheelBody.collisionFilterGroup = 0 // turn off collisions
    const quaternion = new Quaternion().setFromEuler(-Math.PI / 2, 0, 0)
    wheelBody.addShape(cylinderShape, new Vec3(), quaternion)
    wheelBodies.push(wheelBody)
    // demo.addVisual(wheelBody)
    world.addBody(wheelBody)
  })


  // Update the wheel bodies
  // Function to update the wheel positions after physics step
  world.addEventListener('postStep', () => {
    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
      vehicle.updateWheelTransform(i)
      // Use `transform.position` and `transform.quaternion` to update visuals
      const transform = vehicle.wheelInfos[i].worldTransform
      const wheelBody = wheelBodies[i]
      wheelBody.position.copy(transform.position)
      wheelBody.quaternion.copy(transform.quaternion)
    }
  })

  // Add the ground
  // const sizeX = 64
  // const sizeZ = 64
  // const matrix = []
  // for (let i = 0; i < sizeX; i++) {
  //   matrix.push([])
  //   for (let j = 0; j < sizeZ; j++) {
  //     if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeZ - 1) {
  //       const height = 3
  //       matrix[i].push(height)
  //       continue
  //     }
  //     const height = Math.cos((i / sizeX) * Math.PI * 5) * Math.cos((j / sizeZ) * Math.PI * 5) * 2 + 2
  //     matrix[i].push(height)
  //   }
  // }

  // const heightfieldShape = new Heightfield(matrix, {
  //   elementSize: 100 / sizeX,
  // })
  // const heightfieldBody = new Body({ mass: 0, material: groundMaterial })
  // heightfieldBody.addShape(heightfieldShape)
  // heightfieldBody.position.set(
  //   // -((sizeX - 1) * heightfieldShape.elementSize) / 2,
  //   -(sizeX * heightfieldShape.elementSize) / 2,
  //   -1,
  //   // ((sizeZ - 1) * heightfieldShape.elementSize) / 2
  //   (sizeZ * heightfieldShape.elementSize) / 2
  // )
  // heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  // world.addBody(heightfieldBody)
  // demo.addVisual(heightfieldBody)

  // const groundShape = new Box(new Vec3(50, 0.5, 50)); // Create a box shape for the ground
  // const groundShape = new Plane(); // Create a shape for the ground

  // const groundBody = new Body({ mass: 0, material: groundMaterial }); // Static ground body
  // Add the plane shape to the body
  // groundBody.addShape(groundShape);

  // Rotate the plane so it lies flat along the y-axis
  // groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

  // Add the body to the world
  // world.addBody(groundBody);

  // Define interactions between wheels and ground
  const wheel_ground = new ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 0.3,
    restitution: 0,
    contactEquationStiffness: 1000,
  })

  world.addContactMaterial(wheel_ground)

  // Reset force on keyup
  // socket.on('keyup', (event) => {
  //   switch (event.key) {
  //     case 'w':
  //     case 'ArrowUp':
  //       vehicle.applyEngineForce(0, 2)
  //       vehicle.applyEngineForce(0, 3)
  //       break

  //     case 's':
  //     case 'ArrowDown':
  //       vehicle.applyEngineForce(0, 2)
  //       vehicle.applyEngineForce(0, 3)
  //       break

  //     case 'a':
  //     case 'ArrowLeft':
  //       vehicle.setSteeringValue(0, 0)
  //       vehicle.setSteeringValue(0, 1)
  //       break

  //     case 'd':
  //     case 'ArrowRight':
  //       vehicle.setSteeringValue(0, 0)
  //       vehicle.setSteeringValue(0, 1)
  //       break

  //     case 'b':
  //       vehicle.setBrake(0, 0)
  //       vehicle.setBrake(0, 1)
  //       vehicle.setBrake(0, 2)
  //       vehicle.setBrake(0, 3)
  //       break
  //   }
  // })

  // world.gravity.set(0, -10, 0)
  // Sweep and prune broadphase
  world.broadphase = new SAPBroadphase(world)
  // Disable friction by default
  // world.defaultContactMaterial.friction = 0
  // Step the physics world
  const fixedTimeStep = 1.0 / 60.0; // 60 Hz
  // Function to simulate physics and emit data

  let forward, backward, left, right
  socket.on('controls', (controls) => {
    // const maxSteerVal = 0.5
    // const maxForce = 1000
    // const brakeForce = 1000000
    console.log("Controls: ", controls)

    //controls = { forward, backward, left, right };
    forward = controls.forward
    backward = controls.backward
    left = controls.left
    right = controls.right
  })
  const simulate = () => {
    // Keybindings
    // Add force on keydown
    // Apply forces to the vehicle
    const engineForce = forward ? -1500 : backward ? 1500 : 0;
    if (forward || backward) {
      console.log("applyEngineForce")
      vehicle.applyEngineForce(engineForce, 2); // Rear-left
      vehicle.applyEngineForce(engineForce, 3); // Rear-right

    }

    const steeringValue = left ? 0.5 : right ? -0.5 : 0;
    if (left || right) {
      console.log("setSteeringValue")
      vehicle.setSteeringValue(steeringValue, 0); // Front-left
      vehicle.setSteeringValue(steeringValue, 1); // Front-right
    }

    world.step(1 / 60); // Simulate physics at 60Hz
    const vehicleData = {
      wheels: [
        vehicle.wheelInfos[0].worldTransform,
        vehicle.wheelInfos[1].worldTransform,
        vehicle.wheelInfos[2].worldTransform,
        vehicle.wheelInfos[3].worldTransform
      ],
      chassisBody: {
        position: vehicle.chassisBody.position,
        quaternion: vehicle.chassisBody.quaternion,
        // velocity: vehicle.chassisBody.velocity,
        // angularVelocity: vehicle.chassisBody.angularVelocity,
        // quaternion: vehicle.chassisBody.quaternion
      }
      // Add more properties as needed
    };
    // console.log('data: ', vehicle);
    // console.log('data: ', vehicle.chassisBody.position.y);
    socket.emit('physicsUpdate', vehicleData);
  };

  // Set up the simulation loop
  setInterval(simulate, 1 * fixedTimeStep); // 60 times per second

  // console transport name
  socket.conn.on("upgrade", (transport) => {
    console.log(`transport upgraded to ${transport.name}`);
    socket.emit('cmdData', `[SocketIO]: transport upgraded to ${transport.name}`)
  });

  socket.on("disconnect", (reason) => {
    // Clean up on disconnect
    // world.removeBody(players[socket.id]);
    // `delete players[socket.id];
    console.log(`disconnected due to ${reason}`);
    console.log('Player disconnected:', socket.id);
    socket.emit('cmdData', `[SocketIO]: disconnected due to ${reason}`)
  });

  // handler errors
  socket.on('error', (err) => {
    console.error(`Socket.IO error: ${err}`);
    socket.emit('cmdData', `[SocketIO]: Socket.IO error: ${err}`)
  });


});

// Routes
// app.get('/', (req, res) => {
//   res.send('Welcome to the WebSocket-enabled Express server!');
// });

// sendFile will go here
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/raycast_vehicle.html'));
});

// launch server in production mode
if (process.env.NODE_ENV === 'production') {
  // Serve production assets
  app.use(express.static('../client/dist'))
  // Express will serve up the index.html file
  const filepath = path.join(__dirname, '../client/dist/index.html');
  app.get('/', (req, res) => {
    res.sendFile(filepath, function (err) {
      if (err) res.status(err.status).end();
      else res.status(200).end();
    })
  })
}

// start the server
server.listen(PORT, (err) => {
  if (!err) {
    console.log('server started running on: ', PORT);
    console.log('NODE_ENV: ' + process.env.NODE_ENV);
  } else {
    console.log('unable to start server');
  }
});