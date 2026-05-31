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
    const result=await db.query('SELECT id, name, path_coordinates FROM routes ORDER BY id ASC');
    res.json(result.rows);
  }
  catch(e){
    console.error('db error', e);
    res.status(500).json({error: 'fialed to fetch routes'});
  }
});

app.get('/api/bookmarks/:uid', async (req, res) => {
    try {
        const { uid } = req.params;
        const result = await db.query(`
            SELECT r.id, r.name 
            FROM routes r
            JOIN user_bookmarks ub ON r.id = ub.route_id
            WHERE ub.user_uid = $1
            ORDER BY r.name ASC
        `, [uid]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to fetch bookmarks:', err);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
});

app.post('/api/bookmarks/toggle', async (req, res) => {
    try {
        const { uid, routeId } = req.body;
        if (!uid || !routeId) return res.status(400).json({ error: 'Missing parameters' });

        const check = await db.query('SELECT id FROM user_bookmarks WHERE user_uid = $1 AND route_id = $2', [uid, routeId]);
        
        if (check.rows.length > 0) {

            await db.query('DELETE FROM user_bookmarks WHERE id = $1', [check.rows[0].id]);
            res.json({ status: 'removed' });
        } else {

            await db.query(`
                INSERT INTO users (firebase_uid, email, role) 
                VALUES ($1, 'demo@user.com', 'passenger') 
                ON CONFLICT (firebase_uid) DO NOTHING;
            `, [uid]);

            await db.query('INSERT INTO user_bookmarks (user_uid, route_id) VALUES ($1, $2)', [uid, routeId]);
            res.json({ status: 'added' });
        }
    } catch (err) {
        console.error('Failed to toggle bookmark:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/driver/verify', async (req, res) => {
    try {
        const { busNumber } = req.body;
        if (busNumber && busNumber.toUpperCase().startsWith('BUS-')) {
            res.json({ verified: true, message: 'Driver clearance granted.' });
        } else {
            res.status(403).json({ verified: false, message: 'Invalid Fleet Number.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Verification server error' });
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
  console.log(`New client connected: ${socket.id}`);

  socket.on('subscribeToRoute', (routeId) => {
    const roomName = `route-${routeId}`;
    socket.join(roomName);
    console.log(`Passenger ${socket.id} subscribed to ${roomName}`);
  });

  socket.on('driverLocationUpdate', (data) => {
    const roomName = `route-${data.routeId}`;

    socket.to(roomName).emit('busLocation', {
      driverId: socket.id,
      coordinates: data.coordinates,
      speed: data.speed,
      timestamp: new Date().toISOString()
    });

    console.log(`Driver ${socket.id} on ${roomName} moved to ${data.coordinates.lat}, ${data.coordinates.lng} | Speed: ${data.speed ? data.speed.toFixed(2) : 0} m/s`);
  });

  socket.on('passengerReport', async (data) => {
    try {
      const roomName = `route-${data.routeId}`;
      
      const routeRes = await db.query('SELECT path_coordinates FROM routes WHERE id = $1', [data.routeId]);
      if (routeRes.rows.length === 0) return;
      const routeCoordinates = routeRes.rows[0].path_coordinates;

      const { isLocationValid } = await import('./utils/spatial.js');
      const isValid = isLocationValid(data.coordinates, routeCoordinates, 150);

      if (!isValid) {
        console.log(`Trust Verification Failed: Passenger ${socket.id} is too far from route.`);
        return;
      }

      console.log(`Trust Verification Passed for Passenger ${socket.id}`);

      if (!passengerReportBuffer[roomName]) {
        passengerReportBuffer[roomName] = [];

        setTimeout(() => {
          const reports = passengerReportBuffer[roomName];
          if (!reports || reports.length === 0) return;

          console.log(`Aggregating ${reports.length} passenger reports for ${roomName}...`);


          let sumLat = 0;
          let sumLng = 0;
          for (const coord of reports) {
              sumLat += coord.lat;
              sumLng += coord.lng;
          }
          const averageLat = sumLat / reports.length;
          const averageLng = sumLng / reports.length;

          io.to(roomName).emit('busLocation', {
            driverId: `aggregated-crowd-${data.routeId}`,
            coordinates: { lat: averageLat, lng: averageLng },
            reporterCount: reports.length,
            timestamp: new Date().toISOString()
          });

          delete passengerReportBuffer[roomName];
          console.log(`Cleared buffer window for ${roomName}`);

        }, 5000);
      }

      passengerReportBuffer[roomName].push(data.coordinates);

    } catch (err) {
      console.error('- Error processing aggregated passenger report:', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Transit backend streaming live on port ${PORT}`);
});