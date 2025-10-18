# GitHub Actions Workflow Configuration

This document describes the GitHub Actions workflows configured for the SafeChat project.

## Workflows

### 1. Docker Image CI (`docker-image.yml`)

**Purpose**: Build and test Docker images for the backend service.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:

#### build-backend
- Builds the backend Docker image from `backend/Dockerfile`
- Tests the image by running it with test environment variables
- Validates the image can start successfully

#### test-docker-compose
- Validates `docker-compose.yml` configuration
- Builds and starts all services (MongoDB, Backend, Frontend)
- Checks service health
- Tests backend health endpoint
- Cleans up after test

### 2. Docker Compose CI (`docker-compose.yml`)

**Purpose**: Comprehensive testing of both development and production docker-compose configurations.

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:

#### test-compose
- Tests the development `docker-compose.yml` configuration
- Starts all services and validates they're running
- Tests backend health endpoint at `http://localhost:3000/health`
- Tests frontend accessibility
- Displays logs for troubleshooting

#### test-compose-production
- Creates production environment variables
- Tests the production `docker-compose.prod.yml` configuration
- Validates production build with proper resource limits
- Tests health checks and service dependencies
- Ensures production configuration is deployment-ready

### 3. Build and Push Docker Images (`docker-publish.yml`)

**Purpose**: Build and publish Docker images to GitHub Container Registry (GHCR).

**Triggers**:
- Push of version tags (e.g., `v1.0.0`)
- Manual workflow dispatch

**Jobs**:

#### build-and-push
- Authenticates with GitHub Container Registry
- Builds the backend Docker image
- Tags images with:
  - Semantic version (e.g., `v1.0.0`, `v1.0`, `v1`)
  - Commit SHA
  - `latest` tag for main branch
- Pushes images to `ghcr.io/yesuf435/im-safechat/backend`
- Creates deployment summary

**Required Permissions**:
- `contents: read` - Read repository content
- `packages: write` - Write to GitHub Container Registry

## Usage

### Local Development

Test the Docker setup locally:

```bash
# Test compose configuration
docker compose config

# Build and start services
docker compose up -d --build

# Check logs
docker compose logs -f

# Stop services
docker compose down -v
```

### Production Deployment

```bash
# Create .env file (copy from .env.production.example)
cp .env.production.example .env
# Edit .env with production values

# Deploy production services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Publishing Images

To publish a new version:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically build and push the images to GHCR.

## Environment Variables

The workflows use the following environment variables:

### Development (docker-compose.yml)
- `MONGODB_URI`: MongoDB connection string (hardcoded for dev)
- `JWT_SECRET`: JWT signing secret (hardcoded for dev)
- `PORT`: Backend service port (3001)
- `ALLOWED_ORIGINS`: CORS allowed origins (*)

### Production (docker-compose.prod.yml)
- `MONGO_INITDB_ROOT_USERNAME`: MongoDB admin username
- `MONGO_INITDB_ROOT_PASSWORD`: MongoDB admin password
- `MONGO_INITDB_DATABASE`: Initial database name
- `MONGODB_URI`: Full MongoDB connection string
- `JWT_SECRET`: Production JWT secret (use strong secret!)
- `PORT`: Backend service port
- `ALLOWED_ORIGINS`: Production CORS origins

## Health Checks

The backend service provides a health endpoint at `/health`:

```json
{
  "status": "ok",
  "timestamp": "2025-10-18T03:52:00.000Z",
  "uptime": 12.345,
  "mongodb": "connected"
}
```

This endpoint is used by:
- Docker healthcheck in the Dockerfile
- CI workflows to verify service readiness
- Production monitoring systems

## Troubleshooting

### Build Failures

If the Docker build fails:
1. Check the workflow logs for specific errors
2. Test locally: `docker build ./backend -f ./backend/Dockerfile`
3. Verify all dependencies are in `package.json`
4. Check for syntax errors in code

### Compose Failures

If docker-compose fails to start:
1. Check service logs: `docker compose logs <service-name>`
2. Verify environment variables are set correctly
3. Ensure MongoDB credentials match between services
4. Check port conflicts with `docker ps`

### Health Check Failures

If health checks fail:
1. Check backend logs: `docker compose logs backend`
2. Verify MongoDB connection: `docker compose logs mongodb`
3. Test endpoint manually: `curl http://localhost:3000/health`
4. Ensure sufficient startup time (adjust wait time in workflow)

## Notes

- The workflows automatically clean up resources after testing
- Failed workflows will display logs to help with debugging
- Production compose file includes resource limits for stability
- All workflows validate YAML syntax before execution
