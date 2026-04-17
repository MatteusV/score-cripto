FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/data-search ./cmd

FROM alpine:3.21
RUN adduser -D -g '' appuser
USER appuser
WORKDIR /app

COPY --from=builder /bin/data-search /usr/local/bin/data-search
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["/usr/local/bin/data-search"]
