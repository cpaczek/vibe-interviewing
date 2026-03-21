FROM node:20-slim

# Install curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Source code is mounted as a volume at runtime.
# setup_commands in scenario.yaml handle `npm install` etc.
