#!/bin/bash
# ECCS Repository to GoogleDrive Sync Script

REPO_DIR="/home/dpr/Downloads/eccs"
GDRIVE_TARGET_1="/home/dpr/GoogleDrive/eccs"
GDRIVE_TARGET_2="/home/dpr/GoogleDrive/gdrive/eccs"

echo "[Sync] Syncing repository to GoogleDrive subfolders..."

mkdir -p "$GDRIVE_TARGET_1" "$GDRIVE_TARGET_2"

rsync -av --delete --exclude='.git' --exclude='archive' --exclude='html' "$REPO_DIR/" "$GDRIVE_TARGET_1/"
rsync -av --delete --exclude='.git' --exclude='archive' --exclude='html' "$REPO_DIR/" "$GDRIVE_TARGET_2/"

echo "[Sync] GoogleDrive subfolders sync complete."
