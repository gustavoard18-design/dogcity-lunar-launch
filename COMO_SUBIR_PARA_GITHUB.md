# 🚀 Como Colocar o Projeto no GitHub

## 📋 Passo a Passo Completo

### 1️⃣ Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha os dados:
   - **Repository name**: `dogcity-game` (ou outro nome)
   - **Description**: `🐕‍🦺🚀 DogCity Lunar Launch - Jogo 3D espacial com React e Three.js`
   - **Public** ou **Private** (sua escolha)
   - ❌ **NÃO** marque "Initialize with README"
   - ❌ **NÃO** marque "Add .gitignore"
   - ❌ **NÃO** marque "Choose a license"
3. Clique em **"Create repository"**

### 2️⃣ Configurar Git Localmente

Abra o terminal na pasta do projeto e execute:

```bash
# Inicializar git
git init

# Adicionar todos os arquivos
git add .

# Primeiro commit
git commit -m "🎉 Initial commit: DogCity Lunar Launch Game"

# Adicionar repositório remoto (SUBSTITUA com seu username)
git remote add origin https://github.com/SEU_USERNAME/dogcity-game.git

# Renomear branch para main
git branch -M main

# Fazer push para o GitHub
git push -u origin main
```

### 3️⃣ Verificar no GitHub

1. Recarregue a página do repositório
2. Você deve ver todos os arquivos do projeto
3. O README.md será exibido automaticamente

---

## 🔄 Comandos Úteis do Git

### Ver Status
```bash
git status
```

### Adicionar Mudanças
```bash
git add .
git commit -m "📝 Descrição das mudanças"
git push
```

### Criar Nova Branch
```bash
git checkout -b nome-da-branch
# ... fazer mudanças ...
git add .
git commit -m "✨ Nova feature"
git push -u origin nome-da-branch
```

### Puxar Mudanças
```bash
git pull origin main
```

---

## 🌐 Deploy Automático (Opcional)

### Opção 1: Vercel (Recomendado)

1. Acesse: https://vercel.com
2. Clique em **"New Project"**
3. Importe o repositório do GitHub
4. Vercel detecta automaticamente que é Vite
5. Clique em **"Deploy"**
6. Pronto! Você terá um link tipo: `https://dogcity-game.vercel.app`

### Opção 2: Netlify

1. Acesse: https://netlify.com
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Conecte com GitHub
4. Selecione o repositório
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Clique em **"Deploy site"**

### Opção 3: GitHub Pages

1. Instale o pacote:
```bash
npm install -D gh-pages
```

2. Adicione ao `package.json`:
```json
{
  "scripts": {
    "deploy": "gh-pages -d dist"
  }
}
```

3. Configure o `vite.config.js`:
```javascript
export default defineConfig({
  base: '/dogcity-game/',
  // ... resto da config
})
```

4. Deploy:
```bash
npm run build
npm run deploy
```

5. Acesse: `https://SEU_USERNAME.github.io/dogcity-game/`

---

## 📝 Checklist Antes do Push

- [ ] Criar repositório no GitHub
- [ ] Verificar se `.gitignore` está correto
- [ ] Remover dados sensíveis (se houver)
- [ ] Testar se o projeto roda localmente
- [ ] Fazer commit inicial
- [ ] Push para o GitHub
- [ ] Verificar se tudo está no repositório

---

## 🎯 Próximos Passos

Depois de subir para o GitHub:

1. **Adicionar colaboradores** (se quiser)
   - Settings → Collaborators → Add people

2. **Criar issues** para futuras features
   - Issues → New issue

3. **Configurar GitHub Actions** (CI/CD)
   - Criar `.github/workflows/ci.yml`

4. **Adicionar badges** ao README
   - Build status, coverage, etc.

5. **Configurar deploy automático**
   - Vercel, Netlify ou GitHub Pages

---

## 🆘 Problemas Comuns

### Erro: "Permission denied (publickey)"
```bash
# Configurar SSH
ssh-keygen -t ed25519 -C "seu_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Adicionar a chave em: GitHub → Settings → SSH and GPG keys
```

### Erro: "Updates were rejected"
```bash
# Forçar push (cuidado!)
git push -f origin main
```

### Erro: "remote origin already exists"
```bash
# Remover e adicionar novamente
git remote remove origin
git remote add origin https://github.com/SEU_USERNAME/dogcity-game.git
```

---

## 📚 Links Úteis

- [GitHub Docs](https://docs.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)

---

**Pronto! Seu projeto estará no GitHub e pronto para o mundo ver!** 🎉
