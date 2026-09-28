# Docker Compose Local Development Setup

This guide explains how to use Docker Compose for local development of PromptMint.

## Prerequisites

- Docker Desktop or Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ available RAM
- 10GB+ available disk space

## Quick Start

### 1. Prepare Environment

```bash
# Copy the Docker environment template
cp .env.docker .env

# Optionally customize environment variables
# Edit .env to set your own contract IDs and API keys
```

### 2. Start Services

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### 3. Access Services

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3000
- **MongoDB**: localhost:27017 (internal only)
- **Redis**: localhost:6379 (internal only)

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# Stop without removing containers
docker-compose stop
```

## Service Details

### MongoDB

Configured with replica set support for:
- Transaction support
- Point-in-time recovery
- Oplog-based recovery

**Default credentials:**
- Username: `admin`
- Password: `password`

**Access from host:**
```bash
mongosh mongodb://admin:password@localhost:27017/prompt-mint?authSource=admin
```

**Volumes:**
- `mongodb_data`: Database files
- `mongodb_config`: Configuration data

### Redis

Used for:
- Session management
- Caching
- Rate limiting

**Access from host:**
```bash
redis-cli -h localhost -p 6379
```

**Volume:**
- `redis_data`: Persistence storage

### Express Server

Backend API server with hot-reload.

**Environment:**
- `NODE_ENV=development`
- Mounted source: `/app/server/src`
- Port: 3000

**Commands:**
```bash
# View server logs
docker-compose logs server

# Access server container
docker-compose exec server sh

# Restart server
docker-compose restart server
```

### Vite Frontend

React frontend with hot module replacement.

**Environment:**
- `NODE_ENV=development`
- Mounted source: `/app/src`, `/app/public`
- Port: 5173

**Features:**
- Hot reload on file changes
- Source maps for debugging
- TypeScript support

**Commands:**
```bash
# View frontend logs
docker-compose logs frontend

# Access frontend container
docker-compose exec frontend sh

# Rebuild frontend
docker-compose exec frontend yarn build
```

## Development Workflow

### Making Code Changes

Changes to these directories are reflected automatically:
- `src/**` → Frontend hot reload
- `server/src/**` → Server restart
- Contract files require rebuild

```bash
# After changing Rust contracts
docker-compose exec server npm run build:contracts

# After changing TypeScript types
docker-compose exec frontend yarn typecheck
```

### Running Tests

```bash
# Frontend tests
docker-compose exec frontend yarn test

# Backend tests
docker-compose exec server npm test

# Contract tests
docker-compose exec server cargo test -p prompt-hash
```

### Database Management

```bash
# Access MongoDB
docker-compose exec mongodb mongosh -u admin -p password prompt-mint

# Backup current database
docker-compose exec server npm run backup:backup

# List backups
docker-compose exec server npm run backup:status
```

### Debugging

#### Server Debugging

```bash
# View detailed server logs
docker-compose logs -f server --tail=100

# Access server shell
docker-compose exec server sh

# Check Node process
docker-compose exec server ps aux | grep node
```

#### Frontend Debugging

Open http://localhost:5173 and use browser DevTools:
- Chrome DevTools (F12)
- Console for logs
- Network tab for API calls

#### Database Debugging

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p password prompt-mint

# Run queries
db.prompts.find().limit(5)
db.users.countDocuments()

# Check replica set
rs.status()
```

## Common Tasks

### Reset Database

```bash
# Remove all data but keep containers running
docker-compose exec mongodb mongosh -u admin -p password --authenticationDatabase admin --eval "rs.dropAllDatabases()"

# Or stop and remove volumes
docker-compose down -v
docker-compose up -d
```

### Update Dependencies

```bash
# Frontend dependencies
docker-compose exec frontend yarn install

# Backend dependencies
docker-compose exec server npm install

# Rebuild containers after changing package.json
docker-compose up -d --build
```

### View Performance Metrics

```bash
# CPU and memory usage
docker stats

# Container resource limits
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Use Host MongoDB Instead

If you have local MongoDB:

```bash
# Stop MongoDB container
docker-compose down mongodb

# Update .env
MONGODB_URI=mongodb://admin:password@host.docker.internal:27017/prompt-mint

# Restart other services
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :5173
lsof -i :3000
lsof -i :27017

# Use different port
docker-compose --env-file .env.docker -p custom-env up -d
```

### Container Won't Start

```bash
# Check logs
docker-compose logs mongodb
docker-compose logs server

# Rebuild container
docker-compose up -d --build

# Force recreate
docker-compose up -d --force-recreate
```

### MongoDB Connection Refused

```bash
# Check MongoDB is healthy
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### Out of Disk Space

```bash
# Clean up unused images and volumes
docker system prune -a

# Remove specific volume
docker volume rm prompt-mint_mongodb_data

# Rebuild from scratch
docker-compose down -v
docker-compose up -d
```

### Permission Issues

```bash
# Fix volume permissions
docker-compose exec -u root server chmod -R 755 /app

# Or rebuild with correct permissions
docker-compose down -v
docker-compose up -d
```

## Production-Like Testing

For testing production-like scenarios:

```yaml
# docker-compose.prod.yml
# Similar to docker-compose.yml but with:
# - health checks
# - resource limits
# - logging configuration
# - security settings
```

Use with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Performance Tuning

### Increase Resource Limits

Edit `docker-compose.yml`:

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### Enable Docker Buildkit

Faster image builds:

```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

## Continuous Integration

These services are useful for CI/CD testing:

```bash
# In CI pipeline
docker-compose --profile ci up -d --build
npm run test
docker-compose down
```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Node.js Docker Hub](https://hub.docker.com/_/node)
