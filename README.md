# VaxTrace Nigeria

> Vaccine Supply Chain Analytics Dashboard for OpenLMIS

VaxTrace Nigeria is a high-level analytics dashboard designed to sit atop the existing OpenLMIS infrastructure. It transforms raw logistical data into actionable insights for decision-makers at the National, State, and LGA levels.

## 🎯 Core Value Proposition

- **Eliminate Blind Spots**: Real-time visibility into stockouts before they happen
- **Quality Assurance**: Digital tracking of VVM (Vaccine Vial Monitor) status and temperature excursions
- **Operational Efficiency**: Automated calculation of replenishment needs based on actual consumption

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  Next.js 14 (App Router) + Mapbox GL JS + PWA (Offline-First)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (NestJS)                         │
│  Middleware Orchestrator • Redis Cache • Protobuf Encoding     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
        ┌──────────────────┐  ┌─────────────────┐
        │  PostgreSQL +    │  │   OpenLMIS      │
        │  PostGIS (GEO)   │  │   REST API      │
        └──────────────────┘  └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/vaxtrace-nigeria.git
   cd vaxtrace-nigeria
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your configuration**
   - Set strong passwords for PostgreSQL and Redis
   - Configure OpenLMIS API credentials
   - Set encryption keys for AES-256

4. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Install dependencies**
   ```bash
   npm run install:all
   ```

6. **Run database migrations**
   ```bash
   cd backend && npm run migration:run
   ```

7. **Seed initial data**
   ```bash
   psql -h localhost -U vaxtrace_admin -d vaxtrace_nigeria -f backend/database/seeds/001_seed_locations.sql
   psql -h localhost -U vaxtrace_admin -d vaxtrace_nigeria -f backend/database/seeds/002_seed_vaccines.sql
   ```

8. **Start development servers**
   ```bash
   npm run dev
   ```

   - Backend API: http://localhost:8000
   - Frontend Dashboard: http://localhost:3000

## 📁 Project Structure

```
vaxtrace-nigeria/
├── backend/                 # NestJS API Gateway
│   ├── config/             # Configuration files
│   ├── database/           # Migrations and seeds
│   │   ├── migrations/     # SQL migrations
│   │   └── seeds/          # Seed data
│   ├── src/
│   │   ├── modules/        # NestJS modules
│   │   ├── common/         # Shared utilities
│   │   └── main.ts         # Entry point
│   └── protos/             # Protobuf definitions
├── frontend/               # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── styles/        # Global styles
│   └── public/            # Static assets
├── shared/                 # Shared code
│   ├── types/             # TypeScript types
│   ├── utils/             # Utilities (encryption, etc.)
│   └── constants/         # Constants
├── docs/                   # Documentation
├── docker-compose.yml      # Docker services
└── package.json           # Root package.json
```

## 🔐 Security & Compliance

### NDPR Compliance

- **Data at Rest**: AES-256 encryption for sensitive fields
- **Data in Transit**: TLS 1.3 only
- **Hosting**: Galaxy Backbone (GxCP) for data sovereignty
- **Retention**: 7 years (per Nigeria health data regulations)

### Security Features

- Role-Based Access Control (RBAC)
- OAuth2 integration with OpenLMIS
- JWT token authentication
- Certificate pinning for GBB endpoints
- HSTS (HTTP Strict Transport Security)

## 🗄️ Database Schema

### Core Tables

- **locations**: Hierarchical geographic structure (Zone > State > LGA > Facility)
- **stock_snapshots**: Current stock levels at facilities
- **stock_ledger**: Historical stock tracking for analytics
- **logistics_metrics**: Performance metrics (lead time, wastage rate)
- **alerts**: System-generated alerts (stockouts, expiry, temperature)
- **requisitions**: Order tracking from OpenLMIS

## 🔧 Development

### Available Scripts

```bash
# Install all dependencies
npm run install:all

# Development
npm run dev              # Start both backend and frontend
npm run dev:backend      # Start only backend
npm run dev:frontend     # Start only frontend

# Building
npm run build            # Build all packages
npm run build:backend    # Build backend only
npm run build:frontend   # Build frontend only

# Testing
npm run test             # Run all tests
npm run test:backend     # Run backend tests
npm run test:frontend    # Run frontend tests

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
```

### Database Management

```bash
# Run migrations
cd backend && npm run migration:run

# Revert last migration
cd backend && npm run migration:revert

# Access PostgreSQL
docker exec -it vaxtrace-postgres psql -U vaxtrace_admin -d vaxtrace_nigeria

# Access Redis
docker exec -it vaxtrace-redis redis-cli -a your_redis_password
```

## 🌍 Environment Variables

See [`.env.example`](./.env.example) for all available environment variables.

### Critical Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_PASSWORD` | PostgreSQL password | Yes |
| `REDIS_PASSWORD` | Redis password | Yes |
| `ENCRYPTION_KEY` | AES-256 encryption key (32+ chars) | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `OPENLMIS_BASE_URL` | OpenLMIS API URL | Yes |
| `MAPBOX_ACCESS_TOKEN` | Mapbox public token | Yes |

## 📊 API Documentation

API documentation is available via Swagger when running the backend:

```
http://localhost:8000/api/docs
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## 🚢 Deployment

### Production Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

3. **Deploy to Galaxy Backbone (GxCP)**
   - Follow GxCP deployment guidelines
   - Configure TLS certificates
   - Set up monitoring and logging

## 📈 Monitoring

- Application logs: Winston (structured JSON logging)
- Database queries: pg_stat_statements
- Cache performance: Redis INFO command
- API performance: Custom middleware

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **VaxTrace Nigeria Team**
- National Primary Health Care Development Agency (NPHCDA)

## 📞 Support

For support, email support@vaxtrace.ng or open an issue in the repository.

## 🙏 Acknowledgments

- OpenLMIS community for the supply chain management platform
- Galaxy Backbone for hosting infrastructure
- Nigeria Federal Ministry of Health

---

**Built with ❤️ for Nigeria's healthcare system**
