# Real-Time Messaging with Socket.IO

## 🚀 Overview

Real-time bidirectional messaging system between clients and dietitians using Socket.IO with custom Next.js server.

---

## ⚙️ Architecture

### Custom Server Setup

**File**: `server.ts` (Root directory)

```typescript
// Custom HTTP server with Socket.IO
const server = createServer(handleNextRequests);
const io = new SocketIOServer(server, {
  path: "/api/socketio",
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

// Global io instance
(global as any).io = io;
```

**Why Custom Server?**
- Next.js App Router doesn't support WebSocket out of the box
- Custom server allows Socket.IO to share HTTP server with Next.js
- Enables real-time bidirectional communication

---

## 📦 Installation & Setup

### 1. Dependencies

```bash
cd diet
npm install socket.io socket.io-client ts-node @types/node

cd mobile
npm install socket.io-client
```

### 2. Start Development Server

```bash
cd diet
npm run dev
```

This runs `ts-node server.ts` instead of `next dev`.

### 3. Production

```bash
npm run build
npm start
```

---

## 🔌 Socket Events

### Server → Client Events

| Event | Description | Data |
|-------|-------------|------|
| `new_message` | New message in diet conversation | `{ message, dietId, clientId }` |
| `new_notification` | Notification for user | `{ type, message, data }` |
| `joined` | Confirmed user joined room | `{ userId, room }` |
| `joined_diet` | Confirmed diet room join | `{ dietId, room }` |

### Client → Server Events

| Event | Description | Data |
|-------|-------------|------|
| `join` | Join user-specific room | `userId: number` |
| `join_diet` | Join diet conversation room | `dietId: number` |
| `leave_diet` | Leave diet room | `dietId: number` |
| `ping` | Connection test | - |

---

## 🛠️ Implementation

### Backend (API Route)

**File**: `app/api/clients/[id]/diets/[dietId]/messages/route.ts`

```typescript
import { getIO } from "@/app/api/socket/route";

// After creating message
const io = getIO();
if (io) {
  // Emit to diet room
  io.to(`diet_${dietId}`).emit("new_message", {
    message: result,
    dietId,
    clientId,
  });
  
  // Emit notification to receiver
  if (auth.user!.role === "client") {
    // Notify dietitian
    io.to(`user_${client.dietitianId}`).emit("new_notification", {
      type: "new_message",
      message: `Yeni mesaj: ${client.name}`,
      data: { messageId, dietId, clientId, from: "client" },
    });
  } else {
    // Notify client
    io.to(`user_${client.userId}`).emit("new_notification", {
      type: "new_message",
      message: "Diyetisyeninizden yeni mesaj",
      data: { messageId, dietId, clientId, from: "dietitian" },
    });
  }
}
```

### Mobile Client

**File**: `mobile/src/core/socket/client.ts`

```typescript
import { io } from "socket.io-client";

// Connect
socketService.connect(userId);

// Join diet room
socketService.joinDiet(dietId);

// Listen for messages
socketService.onNewMessage((data) => {
  setMessages((prev) => [...prev, data.message]);
});

// Cleanup
socketService.leaveDiet(dietId);
socketService.disconnect();
```

**Integration**: `mobile/app/(client)/diets/[id]/messages.tsx`

```typescript
useEffect(() => {
  socketService.joinDiet(parseInt(dietId));
  
  socketService.onNewMessage((data) => {
    if (data.dietId === parseInt(dietId)) {
      setMessages((prev) => [...prev, data.message]);
    }
  });

  return () => {
    socketService.leaveDiet(parseInt(dietId));
    socketService.offNewMessage();
  };
}, [dietId]);
```

### Web Client

**File**: `lib/socket-client.ts`

Similar to mobile, but uses browser WebSocket.

**Integration**: `app/clients/[id]/messages/page.tsx`

```typescript
useEffect(() => {
  webSocketService.connect(dietitianId);
  webSocketService.joinDiet(parseInt(dietId));
  
  webSocketService.onNewMessage((data) => {
    setMessages((prev) => [...prev, data.message]);
  });

  return () => {
    webSocketService.leaveDiet(parseInt(dietId));
  };
}, [clientId, dietId]);
```

---

## 🏠 Room Structure

### User Rooms
- **Format**: `user_${userId}`
- **Purpose**: Personal notifications
- **Example**: `user_1` for dietitian with ID 1

### Diet Rooms
- **Format**: `diet_${dietId}`
- **Purpose**: Diet-specific conversation
- **Example**: `diet_100` for diet program #100

---

## 🧪 Testing

### 1. Check Socket Status

```bash
curl http://localhost:3000/api/socket
```

**Response**:
```json
{
  "success": true,
  "socketInitialized": true,
  "connectedSockets": 2,
  "message": "Socket.IO server is running"
}
```

### 2. Test Connection (Browser Console)

```javascript
const socket = io("http://localhost:3000", {
  path: "/api/socketio"
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("join", 1); // Join as user 1
  socket.emit("join_diet", 100); // Join diet 100
});

socket.on("new_message", (data) => {
  console.log("New message:", data);
});
```

### 3. Mobile Testing

1. Start backend: `cd diet && npm run dev`
2. Start mobile: `cd mobile && npm start`
3. Login as client
4. Go to diet messages
5. Check console for socket logs

---

## 🔒 Security Considerations

### Current Implementation
- ✅ Socket.IO running on custom server
- ✅ CORS configured
- ⚠️ No socket authentication yet

### Recommendations for Production

1. **Socket Authentication**
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify token
  if (validToken) {
    next();
  } else {
    next(new Error("Authentication error"));
  }
});
```

2. **Room Access Control**
```typescript
socket.on("join_diet", async (dietId) => {
  // Verify user has access to this diet
  const hasAccess = await checkDietAccess(socket.userId, dietId);
  if (hasAccess) {
    socket.join(`diet_${dietId}`);
  }
});
```

3. **Rate Limiting**
```typescript
// Limit message frequency
const rateLimiter = new RateLimiter(10, 60000); // 10 per minute
```

---

## 📊 Performance

### Connection Stats
- **Protocol**: WebSocket (fallback: Polling)
- **Latency**: ~20-50ms (local)
- **Reconnection**: Automatic with exponential backoff

### Scalability
For production with multiple servers:
- Use **Redis adapter** for Socket.IO
- Deploy behind load balancer with sticky sessions
- Consider **Socket.IO cluster mode**

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## 🐛 Troubleshooting

### Socket Not Connecting

**Mobile**:
- Check API URL in `mobile/src/core/socket/client.ts`
- iOS: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- Android Device: Use local IP (e.g., `http://192.168.1.100:3000`)

**Web**:
- Open browser console
- Check for CORS errors
- Verify `/api/socket` returns `socketInitialized: true`

### Messages Not Appearing

1. **Check room joining**:
```javascript
// Should see these logs
console.log("Joined diet room: 100");
```

2. **Verify emit**:
Check server logs for `📡 Socket event emitted`

3. **Test listener**:
```typescript
socketService.getSocket()?.on("new_message", console.log);
```

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

---

## 📝 Configuration

### Environment Variables

```env
# .env.local
PORT=3000
HOST=localhost
NODE_ENV=development

# Mobile app
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Custom Port

```json
// package.json
{
  "scripts": {
    "dev": "PORT=3001 ts-node server.ts"
  }
}
```

---

## 🚀 Deployment

### Vercel
⚠️ **Vercel doesn't support WebSocket**

Use Vercel for static/API only, deploy Socket.IO server separately:
- **Railway**
- **Render**
- **DigitalOcean**
- **AWS EC2**

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📚 Further Reading

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)
- [Socket.IO with React](https://socket.io/how-to/use-with-react)
- [Expo WebSocket Support](https://docs.expo.dev/versions/latest/sdk/websockets/)

