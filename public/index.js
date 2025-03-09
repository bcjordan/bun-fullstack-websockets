// src/client/index.ts
var messagesContainer = document.getElementById("messages");
var chatForm = document.getElementById("chat-form");
var messageInput = document.getElementById("message-input");
var connectionStatus = document.getElementById("connection-status");
var serverInfoPanel = document.getElementById("server-info");
var toggleDebugButton = document.getElementById("toggle-debug");
var refreshStatsButton = document.getElementById("refresh-stats");
var machineIdElement = document.getElementById("machine-id");
var machineRegionElement = document.getElementById("machine-region");
var bunProcessesElement = document.getElementById("bun-processes");
var connectedClientsElement = document.getElementById("connected-clients");
var totalConnectionsElement = document.getElementById("total-connections");
var peakConnectionsElement = document.getElementById("peak-connections");
var serverUptimeElement = document.getElementById("server-uptime");
var memoryUsageElement = document.getElementById("memory-usage");
var systemPlatformElement = document.getElementById("system-platform");
var systemArchElement = document.getElementById("system-arch");
var systemNodeVersionElement = document.getElementById("system-node-version");
var systemLoadElement = document.getElementById("system-load");
var systemMemoryElement = document.getElementById("system-memory");
var socket;
var reconnectTimeout;
function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;
  socket = new WebSocket(wsUrl);
  socket.addEventListener("open", () => {
    console.log("WebSocket connected");
    connectionStatus.textContent = "Connected";
    connectionStatus.classList.remove("disconnected");
    connectionStatus.classList.add("connected");
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  });
  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
      if (data.type === "welcome") {
        addMessage("System", data.message);
        updateServerInfo(data);
      } else if (data.type === "chat") {
        addMessage("User", data.message, data.timestamp);
      } else if (data.type === "stats_update") {
        updateServerInfo(data);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });
  socket.addEventListener("close", () => {
    console.log("WebSocket disconnected");
    connectionStatus.textContent = "Disconnected (reconnecting...)";
    connectionStatus.classList.remove("connected");
    connectionStatus.classList.add("disconnected");
    reconnectTimeout = setTimeout(connectWebSocket, 3000);
  });
  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
}
function addMessage(sender, text, timestamp) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  const messageContent = document.createElement("div");
  messageContent.textContent = `${sender}: ${text}`;
  messageElement.appendChild(messageContent);
  if (timestamp) {
    const timeElement = document.createElement("div");
    timeElement.classList.add("message-time");
    timeElement.textContent = new Date(timestamp).toLocaleTimeString();
    messageElement.appendChild(timeElement);
  }
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
function sendMessage(message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const messageData = {
      type: "chat",
      message
    };
    socket.send(JSON.stringify(messageData));
    messageInput.value = "";
    messageInput.focus();
  }
}
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
  }
});
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
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
    systemPlatformElement.textContent = data.system.platform || "-";
    systemArchElement.textContent = data.system.arch || "-";
    systemNodeVersionElement.textContent = data.system.nodeVersion || "-";
    systemLoadElement.textContent = data.system.loadAvg || "-";
    systemMemoryElement.textContent = data.system.memory || "-";
  }
}
async function fetchServerStats() {
  try {
    const response = await fetch("/status");
    if (response.ok) {
      const data = await response.json();
      updateServerInfo({
        machine: data.machine,
        debug: data.stats
      });
    }
  } catch (error) {
    console.error("Error fetching server stats:", error);
  }
}
toggleDebugButton.addEventListener("click", () => {
  if (serverInfoPanel.style.display === "none") {
    serverInfoPanel.style.display = "block";
    fetchServerStats();
  } else {
    serverInfoPanel.style.display = "none";
  }
});
refreshStatsButton.addEventListener("click", fetchServerStats);
connectWebSocket();
