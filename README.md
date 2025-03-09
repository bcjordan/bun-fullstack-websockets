# Bun Full-Stack Example

A simple end-to-end example of a full-stack application built with Bun, featuring:

- Backend server with Bun's native HTTP server
- WebSocket communication between frontend and backend
- Frontend bundling with Bun's built-in bundler

## Project Structure

```
bun-full-stack/
├── public/            # Static files served by the backend
│   ├── index.html     # Main HTML page
│   ├── app.js         # Bundled JavaScript (generated)
│   └── favicon.ico    # Site favicon
├── src/
│   ├── client/        # Frontend code
│   │   └── index.ts   # Client-side TypeScript entry point
│   └── server.ts      # Backend server code
├── Dockerfile         # Docker container configuration
├── docker-compose.yml # Docker Compose configuration
├── .dockerignore      # Files to exclude from Docker build
└── package.json       # Project configuration
```

## Features

- Real-time chat application with WebSockets
- Automatic reconnection if connection drops
- Message broadcasting to all connected clients
- Simple UI for sending and displaying messages

## Getting Started

You can run this application either locally with Bun or using Docker.

### Option 1: Run with Bun

#### Prerequisites

Make sure you have Bun installed on your system. If not, install it from [https://bun.sh](https://bun.sh).

```bash
curl -fsSL https://bun.sh/install | bash
```

#### Installation

1. Clone this repository
2. Run `bun install` to install dependencies

#### Development

1. Build the client code:

```bash
bun run build
```

2. Start the server:

```bash
bun run dev
```

3. Open your browser and navigate to `http://localhost:3002`

### Option 2: Run with Docker

#### Prerequisites

Make sure you have Docker and Docker Compose installed on your system.

#### Using Docker Compose (recommended)

1. Clone this repository
2. Build and start the container:

```bash
docker-compose up
```

3. Open your browser and navigate to `http://localhost:3002`

#### Using Docker directly

1. Clone this repository
2. Build the Docker image:

```bash
docker build -t bun-full-stack .
```

3. Run the container:

```bash
docker run -p 3002:3002 bun-full-stack
```

4. Open your browser and navigate to `http://localhost:3002`

## How It Works

- The server uses Bun's native `Bun.serve()` API to create an HTTP/WebSocket server
- When a client connects, it's added to a Set of active WebSocket connections
- Messages sent by one client are broadcast to all connected clients
- The frontend code bundled with Bun's bundler handles the WebSocket connection lifecycle

## License

MIT