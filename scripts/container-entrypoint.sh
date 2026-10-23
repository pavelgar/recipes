#!/bin/sh
# Starts the app in the container the way linuxserver.io images do. Started
# as root (the default), it gives the node user the PUID and PGID asked for
# (1000 unless set), hands /data to that user and drops to it. Started as
# another user (--user), it runs as that user and leaves ownership alone.
set -e

umask "${UMASK:-022}"

if [ "$(id -u)" = 0 ]; then
  PUID=${PUID:-1000}
  PGID=${PGID:-1000}
  if [ "$(id -g node)" != "$PGID" ]; then
    groupmod -o -g "$PGID" node
  fi
  if [ "$(id -u node)" != "$PUID" ]; then
    usermod -o -u "$PUID" node
  fi
  echo "Running as uid $PUID, gid $PGID"
  # Only files not already the user's, so a large /data still starts fast.
  find /data \( ! -user node -o ! -group node \) -exec chown -h node:node {} +
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
