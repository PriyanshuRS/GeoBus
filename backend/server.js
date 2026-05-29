import express from "express";
import http from "http";
import cors from "cors";
import {Server} from "socket.io";
import {db} from "./db.js";


const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/routes', async (req, res)=>{
  try{
    const result=await db.query('SELECT id, name FROM routes ORDER BY id ASC');
    res.json(result.rows);
  }
  catch(e){
    console.error('db error', e);
    res.status(500).json({error: 'fialed to fetch routes'});
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingInterval: 10000,
  pingTimeout: 10000    
});

io.on('connection', (socket) => {
  console.log(`[+] New client connected: ${socket.id}`);

  socket.on('subscribeToRoute', (routeId) => {
    const roomName = `route-${routeId}`;
    socket.join(roomName);
    console.log(`[🎧] Passenger ${socket.id} subscribed to ${roomName}`);
  });

  socket.on('driverLocationUpdate', (data) => {
    const roomName = `route-${data.routeId}`;

    socket.to(roomName).emit('busLocation', {
      driverId: socket.id,
      coordinates: data.coordinates,
      timestamp: new Date().toISOString()
    });

    console.log(`[📍] Driver ${socket.id} on ${roomName} moved to ${data.coordinates.lat}, ${data.coordinates.lng}`);
  });

  socket.on('passengerReport', async (data) => {
    try {
      const roomName = `route-${data.routeId}`;
      const routeRes = await db.query('SELECT path_coordinates FROM routes WHERE id = $1', [data.routeId]);
      
      if (routeRes.rows.length === 0) return;
      
      const routeCoordinates = routeRes.rows[0].path_coordinates;
      const { isLocationValid } = await import('./utils/spatial.js');
      const isValid = isLocationValid(data.coordinates, routeCoordinates, 150);

      if (isValid) {
        console.log(`[+] Trust Verification Passed: Passenger ${socket.id} is physically on Route ${data.routeId}`);
        io.to(roomName).emit('busLocation', {
          driverId: `crowd-${socket.id}`, 
          coordinates: data.coordinates,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[-] Trust Verification Failed: Passenger ${socket.id} is spoofing Route ${data.routeId}. Dropping data.`);
      }
    } catch (err) {
      console.error(' Error processing passenger report:', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[-] Client disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Transit backend streaming live on port ${PORT}`);
});