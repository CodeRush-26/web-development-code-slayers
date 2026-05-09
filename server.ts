import { createServer } from 'http';
import { Server } from 'socket.io';
import { Simulator } from './src/services/simulator';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Simulation Engine Running');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST']
  }
});

const simulator = new Simulator(io);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Automatically join the fleet-update room upon connection
  socket.join('fleet-update');
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`WebSocket Simulation Server listening on port ${PORT}`);
  simulator.start();
});
