FROM node:25-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

COPY tests ./tests
COPY .env.example ./

EXPOSE 3002

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
