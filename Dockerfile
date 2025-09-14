FROM node:18-alpine

WORKDIR /app

# Install dependencies for SQLite
RUN apk add --no-cache sqlite python3 make g++

# Copy and install backend dependencies
COPY server/package.json ./server/
RUN cd server && npm install --only=production

# Copy and install frontend dependencies  
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build frontend
RUN npm run build

# Create necessary directories
RUN mkdir -p data uploads

# Expose port
EXPOSE 8080

# Start the server with migration
CMD ["sh", "-c", "cd server && node src/migrate.js && node src/index.js"]