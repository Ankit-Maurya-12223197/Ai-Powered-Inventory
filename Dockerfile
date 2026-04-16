# Multi-stage build for Asset Verifier System with AI capabilities
FROM node:20-alpine AS builder

# Install Python and build dependencies
RUN apk add --no-cache python3 py3-pip python3-dev build-base linux-headers

WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --no-cache

# Copy source code
COPY . .

# Build the application
RUN npm run vercel-build

FROM node:20-alpine AS production

# Install Python and runtime dependencies for AI services
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-opencv \
    python3-dev \
    build-base \
    linux-headers \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Node.js production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-cache

# Copy built application and Python services
COPY --from=builder /app/dist ./dist
COPY ai_services/ ./ai_services/
COPY vision_engine.py ./
COPY main.py ./

# Create uploads directory for file handling
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]