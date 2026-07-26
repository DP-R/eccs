#!/bin/bash
# Standalone Launcher for Antigravity Studio
TARGET_FILE="/home/dpr/Downloads/eccs/viewer.html"

if command -v google-chrome &> /dev/null; then
    google-chrome --app="file://${TARGET_FILE}" "$@" &
elif command -v chromium &> /dev/null; then
    chromium --app="file://${TARGET_FILE}" "$@" &
elif command -v firefox &> /dev/null; then
    firefox --new-window "file://${TARGET_FILE}" &
else
    xdg-open "file://${TARGET_FILE}" &
fi
