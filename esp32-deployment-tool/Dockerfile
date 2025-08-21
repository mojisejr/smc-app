# Build stage
FROM node:18-alpine AS builder

# Install system dependencies for PlatformIO and USB access
RUN apk add --no-cache \
    python3 py3-pip py3-virtualenv \
    build-base linux-headers \
    udev eudev-dev libusb-dev \
    curl \
    git

# Create and activate virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages in virtual environment
RUN . /opt/venv/bin/activate && \
    pip install --upgrade pip setuptools wheel

# Install PlatformIO CLI with robust error handling in virtual environment
RUN echo "Installing PlatformIO in virtual environment..." && \
    . /opt/venv/bin/activate && \
    pip install --timeout=600 --retries=3 --no-cache-dir platformio || \
    { echo "Primary installation failed, trying alternative method..."; \
      pip install --timeout=600 --no-cache-dir git+https://github.com/platformio/platformio-core.git; } || \
    { echo "Git installation failed, trying direct download..."; \
      wget -O /tmp/platformio.tar.gz https://pypi.org/packages/source/p/platformio/platformio-6.1.15.tar.gz && \
      pip install /tmp/platformio.tar.gz && \
      rm /tmp/platformio.tar.gz; } && \
    echo "PlatformIO installation completed" && \
    pio --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL Node.js dependencies (including devDependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Set build environment variables
ENV NODE_ENV=production
ENV DOCKER_CONTAINER=true
ENV PLATFORMIO_CORE_DIR=/app/.platformio

# Build Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install runtime system dependencies
RUN apk add --no-cache \
    python3 py3-pip py3-virtualenv \
    curl

# Create and setup virtual environment for runtime
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy PlatformIO installation from builder stage
COPY --from=builder /opt/venv /opt/venv

# Verify PlatformIO is working
RUN pio --version

# Create app directory
WORKDIR /app

# Create directories for volumes
RUN mkdir -p /app/exports /app/temp /app/.platformio

# Copy package.json for npm start
COPY --from=builder /app/package*.json ./

# Install production dependencies for next command
RUN npm ci --only=production

# Copy built application from builder stage  
COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public  # public directory doesn't exist
COPY --from=builder /app/templates ./templates

# Set runtime environment variables
ENV NODE_ENV=development
ENV DOCKER_CONTAINER=true
ENV PLATFORMIO_CORE_DIR=/app/.platformio

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# For development/testing: use npm run dev instead of npm start
CMD ["npm", "run", "dev"]