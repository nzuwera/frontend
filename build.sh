#!/bin/bash
CONTAINER_NAME=$1

# Create dist folder if not exists
[ -d dist ] || mkdir dist
cp -rf src/* dist/
# Build docker image
docker stop "${CONTAINER_NAME}"
docker rm "${CONTAINER_NAME}"
docker build -t "${CONTAINER_NAME}:latest" .
docker run --name "${CONTAINER_NAME}" -d -p 80:3000 "${CONTAINER_NAME}"
