
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

# Wait until required endpoints are accessible
MAX_ATTEMPTS=30
SLEEP_SECONDS=2

wait_for_url() {
	local url="$1"
	local attempt=1
	echo "Waiting for $url to become accessible..."
	while [ $attempt -le $MAX_ATTEMPTS ]; do
		if curl --silent --fail "$url" > /dev/null; then
			echo "$url is accessible."
			return 0
		fi
		echo "Attempt $attempt/$MAX_ATTEMPTS: $url not accessible yet. Waiting $SLEEP_SECONDS seconds..."
		sleep $SLEEP_SECONDS
		attempt=$((attempt + 1))
	done
	echo "Error: $url was not accessible after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
	return 1
}

wait_for_url "http://localhost:8095/health" || exit 1
wait_for_url "http://localhost:8090/products" || exit 1
wait_for_url "http://localhost:8080/health" || exit 1
wait_for_url "http://localhost:9000/_specmatic/studio" || exit 1
