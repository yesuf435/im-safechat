const jwt = require('jsonwebtoken');
const MessageModel = require('../models/messageModel');
const GroupMessageModel = require('../models/groupMessageModel');

const connectedUsers = new Map();

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch {
      return next(new Error('未授权'));
    }
  });

  io.on('connection', socket => {
    connectedUsers.set(socket.userId, socket);

    socket.on('private_message', async ({ toUserId, content, type }) => {
      await MessageModel.saveMessage(socket.userId, toUserId, content);
      const target = connectedUsers.get(toUserId);
      if (target) {
        target.emit('private_message', {
          from: socket.userId,
          content,
          type: type || 'text'
        });
      }
    });

    socket.on('join_group', groupId => {
      socket.join('group_' + groupId);
    });

    socket.on('group_message', async ({ groupId, content }) => {
      await GroupMessageModel.save(groupId, socket.userId, content);
      io.to('group_' + groupId).emit('group_message', {
        from: socket.userId,
        content,
        groupId
      });
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
    });
  });
}

module.exports = setupSocket;
