# -------------------------------
# 1️⃣ Base image
# -------------------------------
FROM node:20-alpine AS builder
# Set working directory
WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire source code
COPY . .

# -------------------------------
# 2️⃣ Production image
# -------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy only needed files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/index.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

# Run with tsx (TypeScript execution) - no build step needed
CMD ["npx", "tsx", "index.ts"]

