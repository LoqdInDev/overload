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

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "const http=require('http');const r=http.get('http://localhost:'+process.env.PORT+'/api/health',res=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

CMD ["node", "server/index.js"]
