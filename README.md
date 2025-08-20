# Real-time Chat Backend (Node.js + TypeScript + Express + Socket.IO + Prisma/MySQL)

A production-ready starter for a real-time chat backend that meets the task requirements.

## Features
- JWT auth (registration/login), bcrypt password hashing.
- Chat rooms: public/private, invite links, membership tracking.
- Real-time messaging via Socket.IO (`join_room`, `send_message`, `receive_message`, `typing`, `user_status`).
- Message persistence in MySQL (Prisma ORM).
- Presence: online/offline + `lastSeenAt` stored on disconnect.
- Rate limiting: HTTP (express-rate-limit) + Socket message limiter (5 msgs / 10s per user/room).
- Access control: private rooms require JWT and membership/invite.
- Pagination for chat history, message delivery receipts (delivered/read).
- Zod validation on HTTP inputs.
- Tests: a minimal Vitest test for message persistence.

## Tech Stack
- Node.js (Express), Socket.IO, TypeScript
- Prisma ORM + MySQL
- JWT, bcrypt
- Zod, Helmet, CORS, Morgan

## Getting Started

### 1) Clone & Install
```bash
npm install
```

### 2) Configure Environment
Copy `.env.example` to `.env` and set values:
```bash
cp .env.example .env
```

Set `DATABASE_URL` to your MySQL instance, e.g.
```
DATABASE_URL="mysql://root:password@localhost:3306/realtime_chat"
DATABASE_URL="mysql://chatuser:chatpass@db:3306/realtime_chat"
```

### 3) Prisma Setup
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

This creates tables and generates the Prisma client.

### 4) Run Dev
```bash
npm run dev
```

### 5) Production Build & Start
```bash
npm run build
npm start
```


## DOCKER SETUP

### 1) Build + run:
- docker-compose up --build
### 2) Run in Background:
- docker-compose up -d
### 3) Apply Prisma migrations inside container:
- docker-compose exec backend npx prisma migrate dev --name init
### 4) Stop:
- docker-compose down


## API Overview

### Auth
- `POST /api/auth/register` { email, password, displayName }
- `POST /api/auth/login` { email, password }

Both return `{ token, user }`.

### Rooms
- `POST /api/rooms` (auth) { name, isPrivate }
- `POST /api/rooms/join` (auth) { inviteCode | roomId }
- `GET /api/rooms/mine` (auth) – rooms the user belongs to
- `GET /api/rooms/:id/messages?cursor=<id>&limit=20` (auth) – paginated history (backward)

### Messages
- `POST /api/messages/read` (auth) { roomId, messageId } – mark read
- `POST /api/messages/delivered` (auth) { roomId, messageId } – mark delivered

### Socket.IO

Authenticate by sending `Authorization: Bearer <token>` header during the Socket.IO connection (or `auth.token` in connection opts).

Events:
- `join_room` { roomId }
- `send_message` { roomId, content }
- `typing` { roomId, isTyping }
- `receive_message` (server -> clients) payload is message object
- `user_status` (server -> clients) { userId, status: "online"|"offline", lastSeenAt? }

## Database Schema (Prisma)
See `prisma/schema.prisma` for full details.

## Tests
Run:
```bash
npm test
```

## Notes
- Presence is in-memory; for horizontal scaling, move presence to Redis + socket.io-redis adapter.
- Rate limiting uses a simple sliding window per user+room for messages.
