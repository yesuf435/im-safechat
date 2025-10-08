#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_NAME="safechat"
ARCHIVE_NAME="safechat-baota-release.tar.gz"
STAGING_DIR="$DIST_DIR/$PACKAGE_NAME"

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

copy_backend() {
  echo "[SafeChat] 复制后端代码..."
  cp -R "$ROOT_DIR/backend" "$STAGING_DIR/backend"
  rm -rf "$STAGING_DIR/backend/node_modules"
  rm -f "$STAGING_DIR/backend/app.log"
  find "$STAGING_DIR/backend" -maxdepth 1 -type f \( -name "*.tar.gz" -o -name "*.zip" \) -delete
}

copy_frontend() {
  echo "[SafeChat] 复制前端代码..."
  mkdir -p "$STAGING_DIR/frontend"
  cp -R "$ROOT_DIR/frontend/modern" "$STAGING_DIR/frontend/modern"
}

copy_docs_and_scripts() {
  echo "[SafeChat] 写入部署说明..."
  cp "$ROOT_DIR/deploy/BAOTA_DEPLOY.md" "$STAGING_DIR/README.md"
  cp "$ROOT_DIR/deploy/package/start-safechat.sh" "$STAGING_DIR/start-safechat.sh"
  chmod +x "$STAGING_DIR/start-safechat.sh"
}

pack_archive() {
  echo "[SafeChat] 生成压缩包..."
  mkdir -p "$DIST_DIR"
  tar -czf "$DIST_DIR/$ARCHIVE_NAME" -C "$DIST_DIR" "$PACKAGE_NAME"
}

copy_backend
copy_frontend
copy_docs_and_scripts
pack_archive

echo "[SafeChat] 打包完成：$DIST_DIR/$ARCHIVE_NAME"
