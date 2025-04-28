// server.js
const WebSocket = require('ws');

// Inisialisasi WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

// Simpan koneksi aktif dan informasi pengguna
const clients = new Map();
let userCount = 0;

// Fungsi untuk mengirim pesan ke semua klien
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Fungsi untuk memperbarui jumlah pengguna
function updateUserCount() {
    const userCountMessage = JSON.stringify({
        type: 'system',
        action: 'userCount',
        count: userCount
    });
    broadcast(userCountMessage);
}

// Event handler untuk koneksi baru
wss.on('connection', function connection(ws) {
    console.log('Client connected');
    
    // Tetapkan ID unik untuk koneksi ini
    const clientId = Date.now();
    clients.set(ws, { id: clientId });
    userCount++;
    
    // Kirim pesan selamat datang
    ws.send('Selamat datang di Go Chat! 🎉');
    updateUserCount();
    
    // Event handler untuk pesan masuk
    ws.on('message', function incoming(message) {
        try {
            const messageData = JSON.parse(message.toString());
            console.log('Received: %s', JSON.stringify(messageData));
            
            // Tangani pesan sistem
            if (messageData.type === 'system') {
                if (messageData.action === 'join') {
                    const clientInfo = clients.get(ws);
                    clientInfo.username = messageData.username;
                    clients.set(ws, clientInfo);
                    console.log(`User ${messageData.username} joined`);
                }
                
                // Broadcast pesan sistem ke semua klien
                broadcast(message.toString());
                return;
            }
            
            // Broadcast pesan biasa ke semua klien
            broadcast(message.toString());
            
        } catch (err) {
            console.error('Error handling message:', err);
            // Jika bukan JSON, gunakan pesan biasa
            broadcast(message.toString());
        }
    });
    
    // Event handler ketika koneksi terputus
    ws.on('close', function() {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            console.log(`Client ${clientInfo.username || clientInfo.id} disconnected`);
            
            // Jika klien memiliki username, kirim pemberitahuan
            if (clientInfo.username) {
                const leaveMessage = JSON.stringify({
                    type: 'system',
                    action: 'leave',
                    username: clientInfo.username,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                });
                broadcast(leaveMessage);
            }
            
            // Hapus klien dari daftar dan perbarui jumlah pengguna
            clients.delete(ws);
            userCount--;
            updateUserCount();
        }
    });
    
    // Ping klien secara berkala untuk menjaga koneksi tetap hidup
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000);
});

console.log('Server WebSocket AXAviera berjalan di ws://localhost:8080');

// Tangani exit dengan baik
process.on('SIGINT', () => {
    wss.close(() => {
        console.log('Server ditutup');
        process.exit(0);
    });
});