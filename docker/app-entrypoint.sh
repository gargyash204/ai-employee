#!/bin/sh
set -eu

cd /app

# Railway injects PORT for the public listener (nginx). Nest stays on 3000 inside the container.
PUBLIC_PORT="${PORT:-8080}"

echo "Running migrations..."
node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js

echo "Starting API on 127.0.0.1:3000..."
PORT=3000 node dist/main.js &
API_PID=$!

export PORT="$PUBLIC_PORT"
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/http.d/default.conf

echo "Starting nginx on port ${PUBLIC_PORT}..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Exit if either process dies
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 1
done

if kill -0 "$API_PID" 2>/dev/null; then
  kill "$API_PID" 2>/dev/null || true
  echo "nginx exited unexpectedly" >&2
  exit 1
fi

if kill -0 "$NGINX_PID" 2>/dev/null; then
  kill "$NGINX_PID" 2>/dev/null || true
  echo "API exited unexpectedly" >&2
  exit 1
fi

exit 1
