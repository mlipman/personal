#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE_DIR="$ROOT_DIR/templates/nextjs-prisma-pg"
PROJECTS_DIR="$ROOT_DIR/projects"

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

project_name="${1:-}"
if [ -z "$project_name" ]; then
  read -r -p "Project name: " project_name
fi

project_slug="$(slugify "$project_name")"
if [ -z "$project_slug" ]; then
  echo "Project name must contain at least one letter or number." >&2
  exit 1
fi

target_dir="$PROJECTS_DIR/$project_slug"
if [ -e "$target_dir" ]; then
  echo "Project already exists: $target_dir" >&2
  exit 1
fi

mkdir -p "$PROJECTS_DIR"
cp -R "$TEMPLATE_DIR" "$target_dir"

if [ -f "$target_dir/package.json" ]; then
  sed -i "s/nextjs-prisma-pg-template/$project_slug/g" "$target_dir/package.json"
fi

if [ -f "$target_dir/.env.example" ]; then
  sed -i "s/project_name/$project_slug/g" "$target_dir/.env.example"
fi

echo "Created $target_dir"
echo "Next: copy $target_dir/.env.example to $target_dir/.env.local and fill in values."
