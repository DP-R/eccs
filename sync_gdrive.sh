#!/bin/bash
# ECCS Repository to GoogleDrive Sync Script

REPO_DIR="/home/dpr/Downloads/eccs"
GDRIVE_TARGET="/home/dpr/GoogleDrive/gdrive/eccs"

echo "[Sync] Syncing repository to GoogleDrive/gdrive/eccs..."

mkdir -p "$GDRIVE_TARGET"
rsync -av --delete --exclude='.git' --exclude='archive' --exclude='html' "$REPO_DIR/" "$GDRIVE_TARGET/"

echo "[Sync] GoogleDrive/gdrive/eccs sync complete."
