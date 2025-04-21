const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 6655 });
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  ws.send('已连接 IM 系统');
});