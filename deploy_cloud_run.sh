#!/bin/bash
# =============================================================================
# GOOGLE CLOUD RUN PRODUCTION AUTOMATED DEPLOYMENT SCRIPT
# =============================================================================

PROJECT_ID="phcl-super-f0d21"
SERVICE_NAME="antigravity-platform-service"
REGION="us-central1"

echo "🚀 Starting Production Cloud Run Deployment for $SERVICE_NAME..."

# Build container image using Google Cloud Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:latest --project $PROJECT_ID

# Deploy to Cloud Run with auto-scaling & HTTPS
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 20 \
  --memory 1Gi \
  --cpu 1 \
  --project $PROJECT_ID

echo "✅ Production Cloud Run Deployment Complete!"
