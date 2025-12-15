# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy source code first (needed for go mod tidy)
COPY . .

# Download dependencies and generate go.sum if missing
RUN go mod tidy && go mod download

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /auth-service \
    ./...

# Runtime stage - using distroless for security
FROM gcr.io/distroless/static-debian12:nonroot

# Copy binary from builder
COPY --from=builder /auth-service /auth-service
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Run as non-root user
USER nonroot:nonroot

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/auth-service", "healthcheck"] || exit 1

ENTRYPOINT ["/auth-service"]
