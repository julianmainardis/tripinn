#!/usr/bin/env bash

set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:8000/api}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@tripinn.app}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Demo1234!}"
DEMO_NAME="${DEMO_NAME:-Demo User}"
DEMO_NATIONALITY="${DEMO_NATIONALITY:-España}"
DEMO_LANGUAGE="${DEMO_LANGUAGE:-es}"
DEMO_CITY="${DEMO_CITY:-Madrid}"

echo "Using API: $API_URL"
echo "Demo user: $DEMO_EMAIL"

LOGIN_HTTP_CODE="$(curl --connect-timeout 3 --max-time 8 -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}" || true)"

if [[ "$LOGIN_HTTP_CODE" == "200" ]]; then
  echo "Demo user already exists and password is valid."
  echo "Email: $DEMO_EMAIL"
  echo "Password: $DEMO_PASSWORD"
  exit 0
fi

REGISTER_HTTP_CODE="$(curl --connect-timeout 3 --max-time 8 -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\",\"name\":\"$DEMO_NAME\",\"nationality\":\"$DEMO_NATIONALITY\",\"language\":\"$DEMO_LANGUAGE\",\"city\":\"$DEMO_CITY\"}" || true)"

if [[ "$REGISTER_HTTP_CODE" == "200" ]]; then
  echo "Demo user created."
  echo "Email: $DEMO_EMAIL"
  echo "Password: $DEMO_PASSWORD"
  exit 0
fi

echo "Could not seed demo user (HTTP $REGISTER_HTTP_CODE)."
echo "If backend is down, start it first with ./start-all.sh"
exit 1
