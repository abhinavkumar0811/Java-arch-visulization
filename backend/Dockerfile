FROM node:20-slim

# Install OpenJDK for javac, java, javap commands
RUN apt-get update && apt-get install -y default-jdk-headless && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy application source files
COPY . .

# Compile TraceGenerator with container's OpenJDK
RUN javac -g TraceGenerator.java

# SECURITY: Create and switch to a non-root user.
# Running as root means container breakout = host compromise.
RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/sh --create-home appuser && \
    chown -R appuser:appuser /app
USER appuser

# SECURITY NOTE: Java SecurityManager was removed in Java 21.
# The Docker run command must include these flags for process-level isolation:
#
#   docker run \
#     --security-opt no-new-privileges \
#     --security-opt seccomp=unconfined \
#     --ulimit cpu=30 \
#     --ulimit nofile=512:512 \
#     --read-only \
#     --tmpfs /tmp \
#     --cap-drop ALL \
#     <image>
#
# For AWS ECS, add these to the task definition's "linuxParameters":
#   {
#     "capabilities": { "drop": ["ALL"] },
#     "initProcessEnabled": true
#   }
# And in containerDefinitions:
#   "ulimits": [{ "name": "cpu", "softLimit": 30, "hardLimit": 30 }]

EXPOSE 80 4000

ENV PORT=80

CMD ["node", "server.js"]
