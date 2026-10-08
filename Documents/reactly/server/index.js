const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http'); // [BARU] Import HTTP
const { Server } = require('socket.io'); // [BARU] Import Socket.io
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const searchRoutes = require('./routes/searchRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Pastikan ini ada

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// [BARU] Setup Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Sesuaikan dengan port frontend react anda
    methods: ["GET", "POST", "PUT"]
  }
});

// [BARU] Simpan User Online di Variable Global
// Map: userId -> socketId
global.onlineUsers = new Map();

io.on('connection', (socket) => {
  // console.log(`User Connected: ${socket.id}`);

  // Event saat user login (Frontend mengirim userId)
  socket.on("addNewUser", (userId) => {
    if (userId) {
      global.onlineUsers.set(userId, socket.id);
      // console.log("Online Users:", global.onlineUsers.keys());
    }
  });

  // Event saat user disconnect
  socket.on("disconnect", () => {
    // Hapus user dari Map saat disconnect
    for (const [userId, socketId] of global.onlineUsers.entries()) {
      if (socketId === socket.id) {
        global.onlineUsers.delete(userId);
        break;
      }
    }
  });
});

// Simpan IO instance ke app agar bisa diakses di Controller
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 5000;
// [PENTING] Ganti app.listen menjadi server.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));