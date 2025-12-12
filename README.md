# JM Barbearia

Sistema de gestão profissional para barbearias, desenvolvido com React + Vite e backend serverless.

## 🚀 Stack Tecnológica

- **Frontend**: React 19, Vite, TailwindCSS
- **Backend**: Vercel Serverless Functions
- **Banco de Dados**: Neon PostgreSQL (serverless)
- **Deploy**: Vercel

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Neon](https://neon.tech) (PostgreSQL)
- Conta na [Vercel](https://vercel.com)

## 🛠️ Configuração Local

1. **Clone o repositório**

   ```bash
   git clone https://github.com/wagnermontezuma/jm-barbearia.git
   cd jm-barbearia
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**

   ```bash
   cp .env.example .env
   ```

   Edite o `.env` com sua connection string do Neon:

   ```
   DATABASE_URL=postgresql://...
   VITE_API_URL=http://localhost:3001
   ```

4. **Inicialize o banco de dados**

   ```bash
   npm run db:init
   ```

5. **Execute em modo desenvolvimento**

   ```bash
   # Terminal 1 - Backend Express (desenvolvimento local)
   npm run dev:server
   
   # Terminal 2 - Frontend Vite
   npm run dev
   ```

   Ou execute ambos simultaneamente:

   ```bash
   npm run dev:full
   ```

## 🚀 Deploy na Vercel

### Passo 1: Configurar o Repositório

1. Faça push do código para o GitHub:

   ```bash
   git add .
   git commit -m "feat: prepare for Vercel deployment"
   git push origin main
   ```

### Passo 2: Conectar à Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Import Project"
3. Selecione o repositório `wagnermontezuma/jm-barbearia`

### Passo 3: Configurar Variáveis de Ambiente

Na dashboard da Vercel, adicione as seguintes variáveis:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do Neon PostgreSQL |
| `INIT_SECRET_KEY` | (Opcional) Chave para proteger endpoint de inicialização |

### Passo 4: Deploy

A Vercel detectará automaticamente que é um projeto Vite e fará o build corretamente.

### Passo 5: Inicializar o Banco de Dados

Após o primeiro deploy, inicialize o banco acessando:

```
POST https://seu-projeto.vercel.app/api/db/init
```

## 📁 Estrutura do Projeto

```
jm-barbearia/
├── api/                    # Vercel Serverless Functions
│   └── index.ts            # API Handler único (roteamento)
├── components/             # Componentes React
├── context/                # Context API (Auth)
├── pages/                  # Páginas da aplicação
├── server/                 # Backend Express (desenvolvimento local)
├── services/               # Serviços de API do frontend
├── App.tsx                 # Componente principal
├── index.html
├── vercel.json             # Configuração da Vercel
└── package.json
```

## 🔐 Credenciais de Teste

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | <admin@barber.com> | 123 |
| Cliente | <cliente@email.com> | 123 |

## 🔗 Endpoints da API

- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário
- `GET /api/users` - Listar usuários
- `GET/POST /api/services` - Listar/criar serviços
- `DELETE /api/services/:id` - Deletar serviço
- `GET/POST /api/barbers` - Listar/criar barbeiros
- `DELETE /api/barbers/:id` - Deletar barbeiro
- `GET/POST /api/appointments` - Listar/criar agendamentos
- `PATCH /api/appointments/:id/status` - Atualizar status
- `GET /api/appointments/available-slots` - Slots disponíveis
- `GET/POST /api/products` - Listar/criar produtos
- `GET/POST /api/product-sales` - Listar/criar vendas
- `GET/POST /api/expenses` - Listar/criar despesas
- `GET /api/health` - Health check

## 📝 Licença

Este projeto é privado.
