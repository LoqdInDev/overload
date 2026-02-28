FROM node:20-alpine

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --build-from-source

# Copy the rest of the server code
COPY server/ ./server/

# Expose the port Railway will set
EXPOSE ${PORT:-3000}

CMD ["node", "server/index.js"]
