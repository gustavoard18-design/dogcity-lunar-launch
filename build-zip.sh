#!/bin/bash

# Script para gerar ZIP do projeto DogCity Game
# Uso: ./build-zip.sh

echo "🐕‍🦺🚀 Gerando ZIP do projeto DogCity Game..."

# Nome do arquivo ZIP
ZIP_NAME="dogcity-game-$(date +%Y%m%d-%H%M%S).zip"

# Arquivos e pastas para incluir
INCLUDE=(
  "src"
  ".github"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "vite.config.js"
  "vitest.config.ts"
  "index.html"
  ".gitignore"
  "README.md"
  "WIKI.md"
)

# Arquivos e pastas para excluir
EXCLUDE=(
  "node_modules"
  "dist"
  ".git"
  ".env"
  ".env.local"
  "*.log"
  ".DS_Store"
  "Thumbs.db"
)

echo "📦 Criando arquivo: $ZIP_NAME"

# Criar comando zip
ZIP_CMD="zip -r $ZIP_NAME"

# Adicionar includes
for item in "${INCLUDE[@]}"; do
  if [ -e "$item" ]; then
    ZIP_CMD="$ZIP_CMD $item"
  fi
done

# Executar comando zip
eval $ZIP_CMD

# Verificar se foi criado com sucesso
if [ -f "$ZIP_NAME" ]; then
  SIZE=$(du -h "$ZIP_NAME" | cut -f1)
  echo "✅ ZIP criado com sucesso!"
  echo "📁 Arquivo: $ZIP_NAME"
  echo "📏 Tamanho: $SIZE"
  echo ""
  echo "📋 Conteúdo:"
  unzip -l "$ZIP_NAME" | tail -n +4 | head -n -2
else
  echo "❌ Erro ao criar ZIP"
  exit 1
fi
