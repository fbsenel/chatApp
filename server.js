const http = require('http');
const express = require('express');
const socket = require('socket.io');
const Filter = require('bad-words');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);
const filter = new Filter();

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A new connection has been established:', socket.id);

  socket.on('chat', (data) => {
    if (data.message && data.message.trim() !== '') {
      const filteredMessage = filter.clean(data.message);
      io.sockets.emit('chat', {
        message: filteredMessage,
        sender: data.sender,
      });
    } else {
      console.log('Empty message received and ignored.');
    }
  });

  socket.on('voiceMessage', (data) => {
    const base64AudioMessage = 'data:audio/wav;base64,' + data.message;
    io.sockets.emit('chat', {
      sender: data.sender,
      message: base64AudioMessage
    });
  });

  socket.on('imageMessage', (data) => {
    const base64ImageData = data.message;
    io.sockets.emit('chat', {
      sender: data.sender,
      message: base64ImageData,
    });
  });

  
  socket.on('disconnect', () => {
    console.log('A user has disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});