# =============================================================================
# PRODUCTION MULTI-STAGE DOCKERFILE FOR ANTIGRAVITY PLATFORM
# =============================================================================

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm ci --only=production

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root security user
RUN addgroup -S antigravity && adduser -S appuser -G antigravity

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Change ownership to non-root appuser
RUN chown -R appuser:antigravity /app
USER appuser

EXPOSE 3000

# Health check instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/system/health || exit 1

CMD ["node", "server.js"]
