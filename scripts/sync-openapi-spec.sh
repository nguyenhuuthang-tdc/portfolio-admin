#!/bin/bash
SPEC_URL=${OPENAPI_SPEC_URL:-"http://localhost:4000/api-docs.json"}
mkdir -p specs
echo "Syncing OpenAPI spec from $SPEC_URL..."
curl -fsSL "$SPEC_URL" -o specs/portfolio-api.json
if [ $? -eq 0 ]; then
  echo "✓ Spec synced to specs/portfolio-api.json"
else
  echo "✗ Failed. Is portfolio-api running?"
  exit 1
fi
