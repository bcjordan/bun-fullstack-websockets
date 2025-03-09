// Get DOM elements
const messagesContainer = document.getElementById('messages') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const connectionStatus = document.getElementById('connection-status') as HTMLDivElement;

// WebSocket connection
let socket: WebSocket;
let reconnectTimeout: number;

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
      } else if (data.type === 'chat') {
        addMessage('User', data.message, data.timestamp);
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
    reconnectTimeout = setTimeout(connectWebSocket, 3000) as unknown as number;
  });
  
  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// Add a message to the chat
function addMessage(sender: string, text: string, timestamp?: string) {
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
function sendMessage(message: string) {
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

// Initialize the WebSocket connection
connectWebSocket();