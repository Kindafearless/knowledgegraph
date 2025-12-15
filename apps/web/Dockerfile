# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Build arguments for environment variables
ARG NEXT_PUBLIC_AUTH_SERVICE_URL
ARG NEXT_PUBLIC_GRAPH_SERVICE_URL
ARG NEXT_PUBLIC_LLM_SERVICE_URL
ARG NEXT_PUBLIC_CCV_SERVICE_URL
ARG NEXT_PUBLIC_CCV_WS_URL

# Set environment variables for build
ENV NEXT_PUBLIC_AUTH_SERVICE_URL=$NEXT_PUBLIC_AUTH_SERVICE_URL
ENV NEXT_PUBLIC_GRAPH_SERVICE_URL=$NEXT_PUBLIC_GRAPH_SERVICE_URL
ENV NEXT_PUBLIC_LLM_SERVICE_URL=$NEXT_PUBLIC_LLM_SERVICE_URL
ENV NEXT_PUBLIC_CCV_SERVICE_URL=$NEXT_PUBLIC_CCV_SERVICE_URL
ENV NEXT_PUBLIC_CCV_WS_URL=$NEXT_PUBLIC_CCV_WS_URL

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
