# 📦 Como Gerar o ZIP do Projeto

## Método 1: Usando o Script (Linux/Mac)

```bash
# Tornar o script executável
chmod +x build-zip.sh

# Executar o script
./build-zip.sh
```

O script irá gerar um arquivo ZIP com a data e hora atual, por exemplo: `dogcity-game-20260922-153000.zip`

## Método 2: Manualmente (Todos os Sistemas)

### Linux/Mac (Terminal)

```bash
# Navegar até a pasta do projeto
cd dogcity-game

# Criar ZIP excluindo node_modules e dist
zip -r dogcity-game.zip . -x "node_modules/*" -x "dist/*" -x ".git/*" -x "*.log"
```

### Windows (PowerShell)

```powershell
# Navegar até a pasta do projeto
cd dogcity-game

# Criar ZIP usando Compress-Archive
Compress-Archive -Path . -DestinationPath dogcity-game.zip -Force

# Ou usando 7-Zip (recomendado para melhor compressão)
# Baixe em: https://www.7-zip.org/
& "C:\Program Files\7-Zip\7z.exe" a -tzip dogcity-game.zip . -xr!node_modules -xr!dist -xr!.git
```

### Windows (CMD com PowerShell)

```cmd
powershell -Command "Compress-Archive -Path . -DestinationPath dogcity-game.zip -Force"
```

## Método 3: Usando Interface Gráfica

### Windows
1. Abra o Explorador de Arquivos
2. Navegue até a pasta **pai** do projeto (não entre na pasta do projeto)
3. Clique com o botão direito na pasta `dogcity-game`
4. Selecione "Enviar para" → "Pasta compactada"
5. **Importante**: Antes de enviar, delete as pastas `node_modules` e `dist` para reduzir o tamanho

### Mac
1. Abra o Finder
2. Navegue até a pasta **pai** do projeto
3. Clique com o botão direito na pasta `dogcity-game`
4. Selecione "Comprimir dogcity-game"
5. **Importante**: Antes de comprimir, delete as pastas `node_modules` e `dist`

### Linux (GNOME/KDE)
1. Abra o gerenciador de arquivos
2. Navegue até a pasta **pai** do projeto
3. Clique com o botão direito na pasta `dogcity-game`
4. Selecione "Comprimir" ou "Criar arquivo"
5. Escolha o formato ZIP
6. **Importante**: Antes de comprimir, delete as pastas `node_modules` e `dist`

## 📋 O que está incluído no ZIP

✅ **Incluído:**
- `src/` - Código fonte completo
- `public/` - Assets estáticos
- `package.json` - Dependências
- `tsconfig.json` - Configuração TypeScript
- `vite.config.ts` - Configuração Vite
- `tailwind.config.js` - Configuração Tailwind
- `index.html` - HTML principal
- `README.md` - Documentação básica
- `WIKI.md` - Documentação completa
- `3D_GAME_DOCUMENTATION.md` - Docs dos gráficos 3D
- `VISUAL_IMPROVEMENTS.md` - Docs das melhorias visuais

❌ **Excluído:**
- `node_modules/` - Dependências (reinstaláveis com `npm install`)
- `dist/` - Build de produção (regenerável com `npm run build`)
- `.git/` - Histórico do Git
- `.env` - Variáveis de ambiente (se existir)
- `*.log` - Arquivos de log

## 📏 Tamanho Esperado

- **Sem node_modules**: ~5-10 MB
- **Com node_modules**: ~200-300 MB (não recomendado)

## 🚀 Após Gerar o ZIP

### Para usar em outro computador:

```bash
# 1. Extrair o ZIP
unzip dogcity-game.zip
cd dogcity-game

# 2. Instalar dependências
npm install

# 3. Rodar em desenvolvimento
npm run dev

# 4. Ou buildar para produção
npm run build
```

### Para enviar para alguém:

1. Gere o ZIP usando um dos métodos acima
2. Envie por email, WeTransfer, Google Drive, etc.
3. O destinatário deve seguir os passos em "Após Gerar o ZIP"

## 🔧 Solução de Problemas

### Erro: "zip: command not found" (Linux/Mac)

```bash
# Ubuntu/Debian
sudo apt-get install zip

# CentOS/RHEL
sudo yum install zip

# Mac (via Homebrew)
brew install zip
```

### Erro: "Compress-Archive não reconhecido" (Windows)

Use o PowerShell como Administrador ou atualize o PowerShell:
```powershell
# Verificar versão do PowerShell
$PSVersionTable.PSVersion

# Se for muito antigo, atualize o Windows ou use 7-Zip
```

### ZIP muito grande

Certifique-se de excluir `node_modules` e `dist`:

```bash
# Verificar tamanho antes de comprimir
du -sh node_modules dist

# Se existirem, delete antes de comprimir
rm -rf node_modules dist
```

## 📞 Precisa de Ajuda?

Se tiver problemas para gerar o ZIP:
1. Verifique se tem permissão de escrita na pasta
2. Certifique-se de ter espaço em disco suficiente
3. Tente usar o método manual (Método 2)
4. Use 7-Zip para melhor compressão

---

**Dica**: O ZIP sem `node_modules` é muito menor e o destinatário pode reinstalar as dependências facilmente com `npm install`.
