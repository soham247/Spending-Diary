import { createServer } from 'node:net';

export async function createSmtpFixture() {
  const sockets = new Set();
  const server = createServer(socket => {
    sockets.add(socket);
    socket.setEncoding('utf8');
    socket.on('error', () => socket.destroy());
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 localhost ESMTP test fixture\r\n');
    let pending = '';
    let data = false;
    socket.on('data', chunk => {
      pending += chunk;
      let end;
      while ((end = pending.indexOf('\r\n')) !== -1) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (data) {
          if (line === '.') { data = false; socket.write('250 queued locally\r\n'); }
          continue;
        }
        const verb = line.split(' ')[0].toUpperCase();
        if (verb === 'EHLO') socket.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (verb === 'DATA') { data = true; socket.write('354 End with a dot\r\n'); }
        else if (verb === 'QUIT') socket.end('221 goodbye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  return {
    port: server.address().port,
    close: () => new Promise(accept => { for (const socket of sockets) socket.destroy(); server.close(accept); }),
  };
}
