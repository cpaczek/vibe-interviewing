FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Source code is mounted as a volume at runtime.
# setup_commands in scenario.yaml handle `pip install` etc.
