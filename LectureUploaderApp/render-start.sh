#!/usr/bin/env bash
set -euo pipefail

# Working directory: project root
# Persistent volume mount path
PERSIST="/opt/persist"

mkdir -p "$PERSIST/uploads"
mkdir -p "$PERSIST/server"
# Ensure db file exists
if [ ! -f "$PERSIST/server/db.json" ]; then
  echo '{"users":[],"lectures":[],"lecture_tags":[],"likes":[],"comments":[],"views":[],"teachers":[],"student_files":[],"lecture_summaries":[],"notifications":[]}' > "$PERSIST/server/db.json"
fi

# Link uploads dir used by backend
if [ -e backend/uploads ] && [ ! -L backend/uploads ]; then
  rm -rf backend/uploads
fi
ln -sfn "$PERSIST/uploads" backend/uploads

# Link JSON DB path used by backend/db.js (../server/db.json)
mkdir -p server
if [ -e server/db.json ] && [ ! -L server/db.json ]; then
  rm -f server/db.json
fi
ln -sfn "$PERSIST/server/db.json" server/db.json

# Start the server
exec npm start
