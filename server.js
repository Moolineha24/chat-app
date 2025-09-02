// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static client files from /public
app.use(express.static(path.join(__dirname, 'public')));

// In-memory chat history (simple). Keeps last 200 messages.
const MESSAGE_HISTORY_LIMIT = 200;
let messages = []; // { id, username, text, time }

// Helper to push message and trim history
function addMessage(msg) {
  messages.push(msg);
  if (messages.length > MESSAGE_HISTORY_LIMIT) messages.shift();
}

// Track users (socket.id -> username)
const users = new Map();

io.on('connection', (socket) => {
  console.log('New socket connected:', socket.id);

  // When a user joins: { username }
  socket.on('join', (payload) => {
    const username = String(payload?.username || 'Anonymous').trim() || 'Anonymous';
    users.set(socket.id, username);

    // Send existing history to the newly connected client
    socket.emit('history', messages);

    // Notify others
    socket.broadcast.emit('user-joined', { id: socket.id, username });
    // Send updated user list
    io.emit('users', Array.from(users.entries()).map(([id, name]) => ({ id, name })));
  });

  // When a client sends a chat message: { text }
  socket.on('message', (payload) => {
    const username = users.get(socket.id) || 'Anonymous';
    const text = String(payload?.text || '').trim();
    if (!text) return;

    const msg = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      username,
      text,
      time: new Date().toISOString()
    };
    addMessage(msg);
    io.emit('message', msg); // broadcast to all including sender
  });

  // Optionally handle username change
  socket.on('set-username', (payload) => {
    const newName = String(payload?.username || '').trim();
    if (newName) {
      users.set(socket.id, newName);
      io.emit('users', Array.from(users.entries()).map(([id, name]) => ({ id, name })));
    }
  });

  socket.on('disconnect', () => {
    const name = users.get(socket.id);
    users.delete(socket.id);
    socket.broadcast.emit('user-left', { id: socket.id, username: name });
    io.emit('users', Array.from(users.entries()).map(([id, name]) => ({ id, name })));
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
