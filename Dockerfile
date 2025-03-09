FROM oven/bun:latest

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN bun install

# Copy application code
COPY . .

# Build the client-side bundle
RUN bun run build

# Expose the port the server uses
EXPOSE 3002

# Run the server
CMD ["bun", "run", "start"]