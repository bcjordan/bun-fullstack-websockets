// Get machine information for debugging
const MACHINE_ID = process.env.FLY_MACHINE_ID || "local";
const MACHINE_NAME = process.env.FLY_MACHINE_NAME || "local";
const REGION = process.env.FLY_REGION || "local";

// Get number of Bun processes running on the machine
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);
let bunProcessCount = 0;

// Function to count Bun processes
async function updateBunProcessCount() {
  try {
    // Different command based on platform
    const cmd = process.platform === "win32" 
      ? "tasklist | findstr /i bun | find /c /v \"\"" 
      : "ps -e | grep -c '[b]un'";
    
    const { stdout } = await execPromise(cmd);
    bunProcessCount = parseInt(stdout.trim()) || 1;
  } catch (error) {
    console.error("Error counting Bun processes:", error);
    bunProcessCount = 1; // Default to 1 on error
  }
}

// Update process count on startup and periodically
updateBunProcessCount();
setInterval(updateBunProcessCount, 60000); // Update every minute

// Function to broadcast server stats to all connected clients
async function broadcastServerStats() {
  const systemInfo = await getSystemInfo();
  
  const statsMessage = JSON.stringify({
    type: "stats_update",
    debug: {
      bunProcesses: bunProcessCount,
      connectedClients,
      totalConnectionsReceived,
      peakConcurrentConnections,
      uptime: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    system: systemInfo
  });
  
  for (const client of clients) {
    client.send(statsMessage);
  }
}

// Periodically broadcast stats to all clients
setInterval(broadcastServerStats, 10000); // Broadcast every 10 seconds

// Log startup information
console.log(`Server starting on machine: ${MACHINE_ID} (${MACHINE_NAME}) in region: ${REGION}`);

// Keep track of all connected WebSocket clients
const clients = new Set<WebSocket>();
let connectedClients = 0;
let totalConnectionsReceived = 0;
let peakConcurrentConnections = 0;

// Function to get system information
async function getSystemInfo() {
  try {
    let cpuInfo = "";
    let memInfo = "";
    
    if (process.platform === "linux") {
      // Linux-specific commands
      const cpuCmd = "cat /proc/loadavg";
      const memCmd = "free -m | grep Mem";
      
      try {
        const { stdout: cpuStdout } = await execPromise(cpuCmd);
        cpuInfo = cpuStdout.trim();
      } catch (e) {
        cpuInfo = "Error getting CPU info";
      }
      
      try {
        const { stdout: memStdout } = await execPromise(memCmd);
        memInfo = memStdout.trim();
      } catch (e) {
        memInfo = "Error getting memory info";
      }
    } else if (process.platform === "darwin") {
      // macOS-specific commands
      const cpuCmd = "sysctl -n vm.loadavg | tr -d '{}'";
      const memCmd = "vm_stat | grep 'Pages free:'";
      
      try {
        const { stdout: cpuStdout } = await execPromise(cpuCmd);
        cpuInfo = cpuStdout.trim();
      } catch (e) {
        cpuInfo = "Error getting CPU info";
      }
      
      try {
        const { stdout: memStdout } = await execPromise(memCmd);
        memInfo = memStdout.trim();
      } catch (e) {
        memInfo = "Error getting memory info";
      }
    } else if (process.platform === "win32") {
      // Windows-specific logic
      cpuInfo = "Windows CPU info not implemented";
      memInfo = "Windows memory info not implemented";
    }
    
    return {
      loadAvg: cpuInfo,
      memory: memInfo,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
  } catch (error) {
    console.error("Error getting system info:", error);
    return {
      error: "Failed to get system information",
      platform: process.platform
    };
  }
}

// Create a websocket server
const server = Bun.serve({
  port: parseInt(process.env.PORT || "3002"),
  async fetch(req, server) {
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
      // Get system info and return machine status for debugging
      const systemInfo = await getSystemInfo();
      
      return new Response(JSON.stringify({
        machine: {
          id: MACHINE_ID,
          name: MACHINE_NAME,
          region: REGION
        },
        stats: {
          bunProcesses: bunProcessCount,
          connectedClients,
          totalConnectionsReceived,
          peakConcurrentConnections,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        },
        system: systemInfo
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Serve static files
    return new Response(Bun.file("public" + url.pathname));
  },
  websocket: {
    // Called when a WebSocket connects
    async open(ws) {
      connectedClients++;
      totalConnectionsReceived++;
      
      // Update peak concurrent connections if needed
      if (connectedClients > peakConcurrentConnections) {
        peakConcurrentConnections = connectedClients;
      }
      
      console.log(`WebSocket connected (${connectedClients} total clients)`);
      clients.add(ws);
      
      // Get system info for welcome message
      const systemInfo = await getSystemInfo();
      
      // Send welcome message with server debug info
      ws.send(JSON.stringify({ 
        type: "welcome", 
        message: `Hello from server ${MACHINE_NAME} in ${REGION}!`,
        machine: {
          id: MACHINE_ID,
          name: MACHINE_NAME,
          region: REGION
        },
        debug: {
          bunProcesses: bunProcessCount,
          connectedClients,
          totalConnectionsReceived,
          peakConcurrentConnections,
          uptime: Math.floor(process.uptime()),
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        },
        system: systemInfo
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