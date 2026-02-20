
#!/bin/bash
# Start the docker containers defined in the docker-compose.yaml with a unique project name

# Get the repo (current directory) name
REPO_NAME=$(basename "$PWD")

# Remove any existing containers with hardcoded names to avoid conflicts
for cname in studio order-bff order-api inventory-api; do
	if [ $(docker ps -a -q -f name="^/${cname}$") ]; then
		echo "Removing existing container: $cname"
		docker rm -f "$cname"
	fi
done

docker compose -p "$REPO_NAME" -f specmatic-studio-demo/docker-compose.yaml pull
docker compose -p "$REPO_NAME" -f specmatic-studio-demo/docker-compose.yaml up -d

# Wait until the service is accessible
BASE_URL="http://localhost:9000/_specmatic/studio"
echo "Waiting for $BASE_URL to become accessible..."
MAX_ATTEMPTS=30
SLEEP_SECONDS=2
attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
	if curl --silent --fail "$BASE_URL" > /dev/null; then
		echo "$BASE_URL is accessible."
		exit 0
	fi
	echo "Attempt $attempt/$MAX_ATTEMPTS: $BASE_URL not accessible yet. Waiting $SLEEP_SECONDS seconds..."
	sleep $SLEEP_SECONDS
	attempt=$((attempt + 1))
done
echo "Error: $BASE_URL was not accessible after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
exit 1
