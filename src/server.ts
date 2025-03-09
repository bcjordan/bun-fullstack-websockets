// Get machine information for debugging
const MACHINE_ID = process.env.FLY_MACHINE_ID || "local";
const MACHINE_NAME = process.env.FLY_MACHINE_NAME || "local";
const REGION = process.env.FLY_REGION || "local";

// Log startup information
console.log(`Server starting on machine: ${MACHINE_ID} (${MACHINE_NAME}) in region: ${REGION}`);

// Keep track of all connected WebSocket clients
const clients = new Set<WebSocket>();
let connectedClients = 0;

// Create a websocket server
const server = Bun.serve({
  port: parseInt(process.env.PORT || "3002"),
  fetch(req, server) {
    // Upgrade the request to a WebSocket connection
    if (server.upgrade(req)) {
      return;
    }

    // Handle HTTP requests
    const url = new URL(req.url);
    
    if (url.pathname === "/") {
      // Serve the HTML file
      return new Response(Bun.file("public/index.html"));
    }
    
    if (url.pathname === "/status") {
      // Return machine status for debugging
      return new Response(JSON.stringify({
        machine: {
          id: MACHINE_ID,
          name: MACHINE_NAME,
          region: REGION
        },
        stats: {
          connectedClients,
          uptime: process.uptime()
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Serve static files
    return new Response(Bun.file("public" + url.pathname));
  },
  websocket: {
    // Called when a WebSocket connects
    open(ws) {
      connectedClients++;
      console.log(`WebSocket connected (${connectedClients} total clients)`);
      clients.add(ws);
      ws.send(JSON.stringify({ 
        type: "welcome", 
        message: `Hello from server ${MACHINE_NAME} in ${REGION}!`,
        machine: {
          id: MACHINE_ID,
          name: MACHINE_NAME,
          region: REGION
        }
      }));
    },
    // Called when a WebSocket disconnects
    close(ws) {
      connectedClients = Math.max(0, connectedClients - 1);
      console.log(`WebSocket disconnected (${connectedClients} clients remaining)`);
      clients.delete(ws);
    },
    // Called when a WebSocket receives a message
    message(ws, message) {
      try {
        // Parse the message
        const data = JSON.parse(message as string);
        console.log(`Received message:`, data);
        
        // Broadcast the message to all connected clients
        if (data.type === "chat") {
          for (const client of clients) {
            client.send(JSON.stringify({
              type: "chat",
              message: data.message,
              timestamp: new Date().toISOString()
            }));
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);