FROM golang:1.26.1-alpine AS builder

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
COPY .env.example ./

EXPOSE 8080

CMD ["/usr/local/bin/data-search"]
