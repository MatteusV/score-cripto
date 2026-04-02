FROM elixir:1.19-alpine AS builder

RUN apk add --no-cache build-base git

WORKDIR /app

ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force

COPY mix.exs mix.lock ./
COPY config config

RUN mix deps.get --only prod
RUN mix deps.compile

COPY lib lib

RUN mix compile
RUN mix release

FROM elixir:1.19-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY --from=builder /app/_build/prod/rel/data_indexing ./

ENV HOME=/app \
    PORT=4000 \
    PHX_SERVER=true

EXPOSE 4000

CMD ["/app/bin/data_indexing", "start"]
