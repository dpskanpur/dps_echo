#!/usr/bin/env bash
#
# Publishes every Secret Manager secret the deployed app needs and grants the
# Cloud Run runtime account permission to read them.
#
# Idempotent: re-running adds a NEW VERSION to an existing secret rather than
# failing, so this is also how you rotate a credential.
#
#   ./scripts/setup-secrets.sh
#
# Values are read from .env. DATABASE_URL is asked for separately, because the
# local value points at localhost and production uses a hosted Postgres.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-dpskanpur-backup}"
REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-dps-echo}"
ENV_FILE="${ENV_FILE:-.env}"

SECRETS=(
  "dps-echo-database-url:DATABASE_URL:required"
  "dps-echo-session-secret:SESSION_SECRET:required"
  "dps-echo-google-client-id:GOOGLE_CLIENT_ID:required"
  "dps-echo-google-client-secret:GOOGLE_CLIENT_SECRET:required"
  "dps-echo-razorpay-key-id:RAZORPAY_KEY_ID:optional"
  "dps-echo-razorpay-key-secret:RAZORPAY_KEY_SECRET:optional"
  "dps-echo-razorpay-webhook-secret:RAZORPAY_WEBHOOK_SECRET:optional"
  "dps-echo-cron-secret:CRON_SECRET:optional"
  "dps-echo-api-key:ECHO_API_KEY:optional"
  "dps-echo-resend-api-key:RESEND_API_KEY:optional"
  "dps-echo-notify-email-from:NOTIFY_EMAIL_FROM:optional"
  "dps-echo-msg91-auth-key:MSG91_AUTH_KEY:optional"
  "dps-echo-msg91-sender-id:MSG91_SENDER_ID:optional"
)

echo "Project : $PROJECT_ID"
echo "Region  : $REGION"
echo "Service : $SERVICE_NAME"
echo

read_env() {
  local key="$1"
  [ -f "$ENV_FILE" ] || return 0
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -1 | sed 's/^"//; s/"$//'
}

put_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" \
      --project="$PROJECT_ID" --data-file=- >/dev/null
    echo "  updated  $name (new version)"
  else
    printf '%s' "$value" | gcloud secrets create "$name" \
      --project="$PROJECT_ID" --replication-policy=automatic --data-file=- >/dev/null
    echo "  created  $name"
  fi
}

DB_URL="$(read_env DATABASE_URL)"
if [[ -z "$DB_URL" || "$DB_URL" == *localhost* || "$DB_URL" == *127.0.0.1* ]]; then
  echo "DATABASE_URL in $ENV_FILE points at localhost, which production cannot use."
  echo "Enter the hosted Postgres connection string (Neon / Supabase), e.g."
  echo "  postgresql://user:pass@ep-xxx.aws.neon.tech/dps_echo?sslmode=require&pgbouncer=true&connection_limit=1"
  echo
  echo "Use the POOLED string and keep pgbouncer=true&connection_limit=1 — Cloud Run"
  echo "opens a new Prisma pool per instance and will exhaust direct connections."
  read -rp "DATABASE_URL: " DB_URL
  [ -n "$DB_URL" ] || { echo "A database URL is required. Aborting."; exit 1; }
fi

SESSION_SECRET_VALUE="$(read_env SESSION_SECRET)"
if [ -z "$SESSION_SECRET_VALUE" ]; then
  SESSION_SECRET_VALUE="$(openssl rand -hex 32)"
  echo "Generated a new SESSION_SECRET for production."
fi

echo "Writing secrets..."
missing_required=0
for entry in "${SECRETS[@]}"; do
  IFS=':' read -r name key req <<< "$entry"
  case "$key" in
    DATABASE_URL)   value="$DB_URL" ;;
    SESSION_SECRET) value="$SESSION_SECRET_VALUE" ;;
    *)              value="$(read_env "$key")" ;;
  esac

  if [ -z "$value" ]; then
    if [ "$req" = "required" ]; then
      echo "  MISSING  $key (required) — set it in $ENV_FILE and re-run"
      missing_required=1
    else
      echo "  skipped  $name (no value for $key)"
    fi
    continue
  fi
  put_secret "$name" "$value"
done

[ "$missing_required" -eq 0 ] || { echo; echo "Required values missing. Nothing published."; exit 1; }

echo
echo "Granting secret access to the runtime service account..."
RUNTIME_SA="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" \
  --project="$PROJECT_ID" --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"

if [ -z "$RUNTIME_SA" ]; then
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  echo "  service not deployed yet; using the default compute account"
fi
echo "  $RUNTIME_SA"

for entry in "${SECRETS[@]}"; do
  IFS=':' read -r name key req <<< "$entry"
  gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1 || continue
  gcloud secrets add-iam-policy-binding "$name" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done
echo "  done"

echo
echo "Secrets published. They only reach the service once cloudbuild.yaml's"
echo "--set-secrets line is deployed (commit it, merge to main)."
