// src/client/index.ts
var messagesContainer = document.getElementById("messages");
var chatForm = document.getElementById("chat-form");
var messageInput = document.getElementById("message-input");
var connectionStatus = document.getElementById("connection-status");
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
      } else if (data.type === "chat") {
        addMessage("User", data.message, data.timestamp);
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
connectWebSocket();
