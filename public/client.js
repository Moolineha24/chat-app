// public/client.js
const socket = io();

// DOM
const usernameInput = document.getElementById('username');
const setNameBtn = document.getElementById('setNameBtn');
const usersList = document.getElementById('usersList');
const messagesEl = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const statusEl = document.getElementById('status');

// small helper: escape HTML
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// show connection status
socket.on('connect', () => {
  statusEl.textContent = 'Connected';
  statusEl.style.color = '#16a34a';
});
socket.on('disconnect', () => {
  statusEl.textContent = 'Disconnected';
  statusEl.style.color = '#ef4444';
});

// receive message history
socket.on('history', (history) => {
  messagesEl.innerHTML = '';
  (history || []).forEach(showMessage);
  scrollToBottom();
});

// new message
socket.on('message', (msg) => {
  showMessage(msg);
  scrollToBottom();
});

// users list update
socket.on('users', (list) => {
  usersList.innerHTML = '';
  list.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u.name || 'Anonymous';
    usersList.appendChild(li);
  });
});

// user joined/left (optional notifications)
socket.on('user-joined', (info) => {
  if (info?.username) {
    showSystemMessage(`${info.username} joined`);
  }
});
socket.on('user-left', (info) => {
  if (info?.username) {
    showSystemMessage(`${info.username} left`);
  }
});

function showSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<div class="bubble" style="background:#fff7ed;color:#92400e;font-style:italic">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(div);
  scrollToBottom();
}

function showMessage(msg) {
  const mine = socket.id === msg.socketId || false; // we don't set socketId from server; skip

  const wrapper = document.createElement('div');
  wrapper.className = 'msg';
  // mark mine if username matches local name (simple heuristic)
  const localName = (usernameInput.value || '').trim();
  if (msg.username && localName && msg.username === localName) wrapper.classList.add('mine');

  const content = document.createElement('div');
  content.className = 'bubble';

  const who = document.createElement('div');
  who.className = 'who';
  who.innerHTML = escapeHtml(msg.username || 'Anonymous') + ` <span class="meta">• ${formatTime(msg.time)}</span>`;

  const text = document.createElement('div');
  text.innerHTML = escapeHtml(msg.text);

  content.appendChild(who);
  content.appendChild(text);
  wrapper.appendChild(content);
  messagesEl.appendChild(wrapper);
}

// form: send message
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('message', { text });
  messageInput.value = '';
});

// set name button
setNameBtn.addEventListener('click', () => {
  const name = (usernameInput.value || '').trim();
  if (!name) {
    alert('Please enter a name.');
    return;
  }
  socket.emit('join', { username: name });
  statusEl.textContent = `You: ${name}`;
});

// convenience: press Enter in username field to set name
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    setNameBtn.click();
    e.preventDefault();
  }
});

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
