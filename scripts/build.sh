#!/bin/sh
set -eu

TARGET_DIR="${TARGET_DIR:?TARGET_DIR is required}"

if [ ! -f "${TARGET_DIR}/.env" ]; then
  echo "Missing ${TARGET_DIR}/.env - create it on the VPS from .env.example"
  exit 1
fi

echo "Building ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
docker buildx build \
  --provenance=false \
  --sbom=false \
  --push \
  --secret id=admin_env,src="${TARGET_DIR}/.env" \
  -f Dockerfile \
  -t "${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}" \
  .
echo "Pushed ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
