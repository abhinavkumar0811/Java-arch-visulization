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

EXPOSE 80 4000

ENV PORT=80

CMD ["node", "server.js"]
