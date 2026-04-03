# Production Deployment Guide

## Server — Google Cloud Run

### Prerequisites

- Google Cloud account with Cloud Run, Cloud SQL, GCS, Secret Manager, and Container Registry APIs enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login && gcloud config set project myyuka-app`)
- Docker installed

---

## Automated CI/CD Pipeline (Recommended)

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-server.yml` that automatically builds, pushes, and deploys the server on every push to `main` that touches `apps/server/` or `packages/shared/`.

### Step 1 — Store Secrets in GitHub

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

| Secret Name                          | Value                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`                     | Your GCP project ID (e.g. `my-project-123`)                                                       |
| `GCP_SA_KEY`                         | JSON key of a GCP Service Account with Cloud Run, GCR, and Secret Manager permissions (see below) |
| `CLOUD_SQL_INSTANCE_CONNECTION_NAME` | Cloud SQL connection name (e.g. `my-project:us-central1:acme-db`)                                 |
| `BETTER_AUTH_URL`                    | Public HTTPS URL of your Cloud Run service                                                        |
| `TRUSTED_ORIGINS`                    | Comma-separated allowed origins (e.g. `https://yourapp.com`)                                      |

### Step 2 — Store Secrets in GCP Secret Manager

The following secrets must exist in GCP Secret Manager so Cloud Run can pull them at runtime:

```bash
# Create each secret (run once per secret)
gcloud secrets create DATABASE_URL --replication-policy automatic
gcloud secrets create OPENAI_API_KEY --replication-policy automatic
gcloud secrets create BETTER_AUTH_SECRET --replication-policy automatic
gcloud secrets create GCS_BUCKET --replication-policy automatic

# Add secret values
echo -n "postgresql://acme:password@35.232.58.18:5432/acme" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

echo -n "sk-..." | gcloud secrets versions add OPENAI_API_KEY --data-file=-

echo -n "$(openssl rand -hex 32)" | gcloud secrets versions add BETTER_AUTH_SECRET --data-file=-

echo -n "acme-temp-images" | gcloud secrets versions add GCS_BUCKET --data-file=-
```

Cloud Run runtime access to GCS should come from the service account attached to the Cloud Run service, not from a JSON key file or extra GCS auth environment variables.

### Step 3 — Create a GCP Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name "GitHub Actions Deploy"

SA_EMAIL=github-actions-deploy@myyuka-app.iam.gserviceaccount.com

# Grant required roles
gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"

# Required for pushing to gcr.io (GCR routes through Artifact Registry in newer GCP projects)
gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Download JSON key and store as GCP_SA_KEY GitHub secret
gcloud iam service-accounts keys create /tmp/sa-key.json \
  --iam-account="${SA_EMAIL}"
cat /tmp/sa-key.json  # copy this output into the GCP_SA_KEY GitHub secret
rm /tmp/sa-key.json
```

---

## Manual Deployment

### Build the Docker image

```bash
docker build -f apps/server/Dockerfile -t us-central1-docker.pkg.dev/myyuka-app/acme/acme-server .
```

### Test locally

```bash
docker run --rm \
  -e DATABASE_URL="postgresql://acme:acme_password@host.docker.internal:5432/acme" \
  -e OPENAI_API_KEY="sk-..." \
  -e BETTER_AUTH_SECRET="change-me-32-chars-min" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  -e STORAGE_BACKEND="gcs" \
  -e GCS_BUCKET="acme-images" \
  -e TRUSTED_ORIGINS="http://localhost:8081" \
  -p 3000:3000 \
  us-central1-docker.pkg.dev/myyuka-app/acme/acme-server
# Verify: curl http://localhost:3000/health
```

### Push to GCR and deploy

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev

docker push us-central1-docker.pkg.dev/myyuka-app/acme/acme-server:latest

gcloud run deploy acme-server \
  --image us-central1-docker.pkg.dev/myyuka-app/acme/acme-server:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --allow-unauthenticated \
  --add-cloudsql-instances <INSTANCE_CONNECTION_NAME> \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,BETTER_AUTH_SECRET=BETTER_AUTH_SECRET:latest,GCS_BUCKET=GCS_BUCKET:latest \
  --set-env-vars=BETTER_AUTH_URL=<SERVICE_URL>,TRUSTED_ORIGINS=<ORIGINS>,NODE_ENV=production,STORAGE_BACKEND=gcs \
  --project myyuka-app
```

---

## Cloud SQL Setup

```bash
# Create instance
gcloud sql instances create acme-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database and user
gcloud sql databases create chozr --instance=chozr
gcloud sql users create chozr \
  --instance=chozr \
  --password='password'

# Run migrations (from local machine via Cloud SQL Auth Proxy)
cloud-sql-proxy <INSTANCE_CONNECTION_NAME> &
DATABASE_URL="postgresql://acme:<PASSWORD>@127.0.0.1:5432/acme" \
  pnpm --filter @acme/server db:migrate
```

> **Note:** Migrations also run automatically on container startup via `docker-entrypoint.sh`.

---

## GCS Setup

```bash
# Create bucket
gsutil mb -l us-central1 gs://chozr-product-images

# Grant the Cloud Run runtime service account access to read and write objects.
# Replace with the service account used by your Cloud Run service.
RUNTIME_SA="chozr-server@myyuka-app.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.objectAdmin"

# Needed because the app checks whether the bucket exists on startup.
gcloud projects add-iam-policy-binding myyuka-app \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/storage.legacyBucketReader"

# Set lifecycle rule: delete objects older than 1 day
# Note: GCS lifecycle rules use "age" in days (minimum granularity = 1 day).
# For sub-day deletion, use a Cloud Scheduler + Cloud Function that calls
# gsutil rm or the GCS JSON API on a custom schedule.
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [{"action": {"type": "Delete"}, "condition": {"age": 1}}]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://acme-temp-images
```

---

## Landing — Google Cloud Run

The landing page is deployed to Cloud Run as a Next.js standalone container via `.github/workflows/deploy-landing.yml`. It triggers automatically on pushes to `main` that touch `apps/landing/`.

### Automated Deployment

Uses the same GitHub secrets (`GCP_PROJECT_ID`, `GCP_SA_KEY`) and Artifact Registry repo as the server. No additional secrets are needed — the landing page has no backend dependencies (no database, no API keys).

### Manual Deployment

```bash
# Build
docker build -f apps/landing/Dockerfile -t us-central1-docker.pkg.dev/myyuka-app/acme/acme-landing .

# Test locally
docker run --rm -p 3000:3000 us-central1-docker.pkg.dev/myyuka-app/acme/acme-landing

# Push and deploy
gcloud auth configure-docker us-central1-docker.pkg.dev

docker push us-central1-docker.pkg.dev/myyuka-app/acme/acme-landing:latest

gcloud run deploy acme-landing \
  --image us-central1-docker.pkg.dev/myyuka-app/acme/acme-landing:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 2 \
  --memory 256Mi \
  --cpu 1 \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production,HOSTNAME=0.0.0.0 \
  --project myyuka-app
```

---

## iOS — EAS Build & TestFlight (US-8.3)

### Prerequisites

- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- Apple Developer account (Team ID, App Store Connect app ID)
- Logged in: `eas login`

### One-time setup

1. EAS will prompt for Apple credentials on first build/submit. Alternatively, set these environment variables for CI:
   - `EXPO_APPLE_ID` — your Apple ID email
   - `EXPO_APPLE_APP_SPECIFIC_PASSWORD` — app-specific password from appleid.apple.com
   - `ASC_APP_ID` — App Store Connect app numeric ID

2. Register the app:
   ```bash
   cd apps/mobile
   eas build:configure
   ```

### Build for TestFlight

```bash
cd apps/mobile
eas build --platform ios --profile production
```

### Submit to TestFlight

```bash
eas submit --platform ios --profile production
# or after a build:
eas submit --platform ios --latest
```

---

## Manual Verification Checklist

- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] Sign up creates user in Cloud SQL
- [ ] AI generate creates deck + cards
- [ ] Sign in on second device restores all decks via sync pull
- [ ] Study ratings sync to server within 30s of going online
- [ ] Docker health check passes (`docker inspect --format='{{json .State.Health}}'`)
- [ ] Cloud Run min instances = 1 (no cold starts)
      D#uYM\*j\*\*dX|]/il
