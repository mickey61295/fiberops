#!/bin/bash
# Watchdog that keeps the dev server alive
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date)] Dev server not running, starting..."
    nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
    disown $!
    sleep 25
    if pgrep -f "next-server" > /dev/null 2>&1; then
      echo "[$(date)] Dev server started OK"
    else
      echo "[$(date)] Dev server failed to start"
    fi
  fi
  sleep 10
done
