// Get DOM elements
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const connectionStatus = document.getElementById('connection-status');
const serverInfoPanel = document.getElementById('server-info');
const toggleDebugButton = document.getElementById('toggle-debug');
const refreshStatsButton = document.getElementById('refresh-stats');

// Debug info elements
const machineIdElement = document.getElementById('machine-id');
const machineRegionElement = document.getElementById('machine-region');
const bunProcessesElement = document.getElementById('bun-processes');
const connectedClientsElement = document.getElementById('connected-clients');
const totalConnectionsElement = document.getElementById('total-connections');
const peakConnectionsElement = document.getElementById('peak-connections');
const serverUptimeElement = document.getElementById('server-uptime');
const memoryUsageElement = document.getElementById('memory-usage');

// System info elements
const systemPlatformElement = document.getElementById('system-platform');
const systemArchElement = document.getElementById('system-arch');
const systemNodeVersionElement = document.getElementById('system-node-version');
const systemLoadElement = document.getElementById('system-load');
const systemMemoryElement = document.getElementById('system-memory');

// WebSocket connection
let socket;
let reconnectTimeout;

// Connect to the WebSocket server
function connectWebSocket() {
  // Get the current host and use it to connect to the WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  socket = new WebSocket(wsUrl);
  
  // WebSocket event handlers
  socket.addEventListener('open', () => {
    console.log('WebSocket connected');
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('disconnected');
    connectionStatus.classList.add('connected');
    
    // Clear any reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  });
  
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
      
      if (data.type === 'welcome') {
        addMessage('System', data.message);
        
        // Update server info with the received data
        updateServerInfo(data);
      } else if (data.type === 'chat') {
        addMessage('User', data.message, data.timestamp);
      } else if (data.type === 'stats_update') {
        // Update server info when receiving periodic stats
        updateServerInfo(data);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  socket.addEventListener('close', () => {
    console.log('WebSocket disconnected');
    connectionStatus.textContent = 'Disconnected (reconnecting...)';
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');
    
    // Attempt to reconnect after a delay
    reconnectTimeout = setTimeout(connectWebSocket, 3000);
  });
  
  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// Add a message to the chat
function addMessage(sender, text, timestamp) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  
  const messageContent = document.createElement('div');
  messageContent.textContent = `${sender}: ${text}`;
  messageElement.appendChild(messageContent);
  
  if (timestamp) {
    const timeElement = document.createElement('div');
    timeElement.classList.add('message-time');
    timeElement.textContent = new Date(timestamp).toLocaleTimeString();
    messageElement.appendChild(timeElement);
  }
  
  messagesContainer.appendChild(messageElement);
  
  // Scroll to the bottom of the messages container
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a chat message
function sendMessage(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const messageData = {
      type: 'chat',
      message
    };
    
    socket.send(JSON.stringify(messageData));
    messageInput.value = '';
    messageInput.focus();
  }
}

// Event listeners
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  
  if (message) {
    sendMessage(message);
  }
});

// Function to format time in HH:MM:SS format
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Function to update server debug info
function updateServerInfo(data) {
  if (data.machine) {
    machineIdElement.textContent = `${data.machine.id} (${data.machine.name})`;
    machineRegionElement.textContent = data.machine.region;
  }
  
  if (data.debug) {
    bunProcessesElement.textContent = data.debug.bunProcesses.toString();
    connectedClientsElement.textContent = data.debug.connectedClients.toString();
    totalConnectionsElement.textContent = data.debug.totalConnectionsReceived.toString();
    peakConnectionsElement.textContent = data.debug.peakConcurrentConnections.toString();
    serverUptimeElement.textContent = formatUptime(data.debug.uptime);
    memoryUsageElement.textContent = data.debug.memoryUsageMB.toString();
  }
  
  if (data.system) {
    systemPlatformElement.textContent = data.system.platform || '-';
    systemArchElement.textContent = data.system.arch || '-';
    systemNodeVersionElement.textContent = data.system.nodeVersion || '-';
    systemLoadElement.textContent = data.system.loadAvg || '-';
    systemMemoryElement.textContent = data.system.memory || '-';
  }
}

// Function to fetch latest server stats
async function fetchServerStats() {
  try {
    const response = await fetch('/status');
    if (response.ok) {
      const data = await response.json();
      updateServerInfo({
        machine: data.machine,
        debug: data.stats,
        system: data.system
      });
    }
  } catch (error) {
    console.error('Error fetching server stats:', error);
  }
}

// Toggle debug panel visibility
toggleDebugButton.addEventListener('click', () => {
  if (serverInfoPanel.style.display === 'none') {
    serverInfoPanel.style.display = 'block';
    fetchServerStats(); // Fetch latest stats when showing
  } else {
    serverInfoPanel.style.display = 'none';
  }
});

// Refresh stats button
refreshStatsButton.addEventListener('click', fetchServerStats);

// Initialize the WebSocket connection
connectWebSocket();
