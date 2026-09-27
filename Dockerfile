# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/Frontend

# Install frontend dependencies
COPY Frontend/package*.json ./
RUN npm install

# Copy frontend source and build production bundle
COPY Frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend application source
COPY Backend/ ./Backend/

# Copy compiled frontend from builder
COPY --from=frontend-builder /app/Frontend/dist ./Frontend/dist

# Expose application port
EXPOSE 5000

# Start server
CMD ["node", "Backend/main.js"]
