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

# Generate Prisma client
# Note: DATABASE_URL is required by prisma.config.ts, but prisma generate 
# doesn't actually connect to the database, so we use a dummy URL for build
ENV DATABASE_URL="postgres://postgres:password@postgres:5432/micro_ecom"
RUN npx prisma generate

# -------------------------------
# 2️⃣ Production image
# -------------------------------
FROM node:20-alpine

WORKDIR /app

# Copy only needed files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/index.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/db ./db
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 4001

# Run with tsx (TypeScript execution) - no build step needed
CMD ["npx", "tsx", "index.ts"]
