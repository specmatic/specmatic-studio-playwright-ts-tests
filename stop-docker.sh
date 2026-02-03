#!/bin/bash
# Stop the docker containers defined in the docker-compose.yaml with the same project name as start-docker.sh

# Get the repo (current directory) name
REPO_NAME=$(basename "$PWD")

docker compose -p "$REPO_NAME" -f specmatic-studio-demo/docker-compose.yaml down
echo Docker containers for project %REPO_NAME% have been stopped and removed.