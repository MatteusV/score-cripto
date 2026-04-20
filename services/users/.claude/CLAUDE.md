# CLAUDE.md - Users Service

**Service**: User management, authentication, billing, and usage limits

---

## Quick Start

### Install & Setup
```bash
pnpm install                  # Install dependencies
pnpm db:generate              # Generate Prisma client
pnpm keys:generate            # Generate JWT key pair for local development
```

### Development
```bash
pnpm dev                       # Start with hot-reload (tsx watch)
pnpm test                      # Run unit tests
pnpm test:watch               # Watch mode tests
pnpm check                     # Lint with Biome
pnpm fix                       # Fix linting issues with Biome
pnpm build                     # Compile TypeScript
pnpm start                     # Run compiled version
pnpm test:e2e                  # Run end-to-end tests
```

### Database
```bash
npx prisma migrate deploy     # Apply migrations
npx prisma studio            # Open Prisma Studio UI
npx prisma generate          # Regenerate Prisma client
```

---

## Project Structure

```
services/users/
├── src/
│   ├── index.ts                    # Entry point
│   ├── routes/                     # Fastify routes
│   │   ├── auth.ts                # Authentication endpoints
│   │   ├── users.ts               # User CRUD
│   │   └── billing.ts             # Stripe billing integration
│   ├── services/                  # Business logic
│   │   ├── user.service.ts        # User service
│   │   ├── auth.service.ts        # Auth logic
│   │   └── stripe.service.ts      # Stripe integration
│   ├── db/
│   │   └── prisma.ts              # Prisma client singleton
│   ├── types/                     # TypeScript types
│   └── middleware/                # Custom middleware
├── prisma/
│   ├── schema.prisma              # Data model
│   └── migrations/                # Database migrations
├── tests/
│   ├── unit/                      # Unit tests
│   └── e2e/                       # End-to-end tests
├── Dockerfile                     # Container image
├── docker-compose.yml            # Local database setup (PostgreSQL)
├── tsconfig.json                 # TypeScript config
├── biome.json                    # Biome linter config
└── package.json
```

---

## Key Features

### 1. **Authentication**
- JWT-based auth (RS256)
- Private/public key pair for signature verification
- Secure token storage and validation

### 2. **User Management**
- Create, read, update, delete users
- Email verification
- Password hashing with bcryptjs

### 3. **Billing & Stripe Integration**
- Stripe webhook handling
- Subscription management
- Usage limits (FREE_TIER: 5/month, PRO: 15/month)
- Customer Portal for self-service

### 4. **Usage Tracking**
- Track analysis requests per user per month
- Enforce FREE_TIER and PRO limits
- Reset counters monthly

---

## Database Schema

Key tables:
- **users** - User accounts with email, password hash, plan type
- **wallets** - Linked blockchain wallets per user
- **subscriptions** - Stripe subscription records
- **usage_logs** - Monthly analysis request tracking per user
- **api_keys** - Optional API keys for programmatic access

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5435/score_cripto_users

# JWT Keys (generated with pnpm keys:generate)
JWT_PRIVATE_KEY=<base64-encoded-private-key>
JWT_PUBLIC_KEY=<base64-encoded-public-key>

# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Server
PORT=3003
NODE_ENV=development
```

---

## Architecture

### Dependencies
- **Fastify** - Web framework
- **Prisma** - ORM for PostgreSQL
- **Stripe** - Payment processing
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT handling
- **Zod** - Schema validation
- **@score-cripto/observability-node** - Logging & AMQP

### Event Flow
1. Client sends request (signup, login, consume analysis)
2. Middleware validates JWT token
3. Route handler validates input (Zod)
4. Service layer handles business logic
5. Prisma ORM persists to PostgreSQL
6. Response returns to client
7. Optional: Emit event to RabbitMQ for async tasks

---

## Common Mistakes

- ❌ **Don't forget JWT_PRIVATE_KEY**: Generate keys before running `pnpm dev`
- ❌ **Don't update schema.prisma manually**: Always use `prisma migrate create --name description`
- ❌ **Don't hardcode Stripe keys**: Use `.env` and environment variables
- ❌ **Don't skip usage limit checks**: Always validate `FREE_TIER` vs `PRO` before allowing analysis

---

## Testing

### Unit Tests
```bash
pnpm test                      # Run once
pnpm test:watch               # Watch mode
```

### E2E Tests
```bash
pnpm test:e2e                  # Requires Docker compose running
```

Test coverage:
- Auth routes (signup, login, refresh token)
- User CRUD operations
- Billing & usage limits
- Stripe webhook handling
- Error cases and validation

---

## Deployment

### Docker Build
```bash
docker build -f services/users/Dockerfile -t score-cripto-users .
```

### Fly.io Deployment
```bash
flyctl deploy
```

**Pre-deployment checklist:**
- ✅ All tests passing
- ✅ Environment variables set
- ✅ Database migrations applied
- ✅ Linting clean (`pnpm check`)

---

## Debugging

### Local with Docker Compose
```bash
# Start postgres + service
docker-compose up -d

# View logs
docker-compose logs -f users

# Connect to database
psql postgresql://user:password@localhost:5435/score_cripto_users

# Stop services
docker-compose down
```

### View Stripe Events
```bash
stripe events list                    # List webhook events
stripe logs tail                      # Real-time logs
```

---

## Integration Points

### Receives Events From
- **api-gateway** - Authentication requests, analysis requests
- **process-data-ia** - Score calculation completion (for usage tracking)

### Sends Events To
- **rabbitmq** - User events (created, subscribed, usage consumed)

### External APIs
- **Stripe** - Billing, subscriptions, payment processing

---

Last updated: 2026-04-20
