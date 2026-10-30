import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const PARENT_TOKEN = process.env.PARENT_TOKEN;
const TRIP_ID = process.env.TRIP_ID;

if (!PARENT_TOKEN || !TRIP_ID) {
    throw new Error('PARENT_TOKEN and TRIP_ID are required');
}

const socket = io(SOCKET_URL, {
    auth: {
        token: PARENT_TOKEN
    }
});

socket.on('connect', () => {
    console.log('Connected:', socket.id);

    socket.emit(
        'trip:subscribe',
        { tripId: TRIP_ID },
        (response) => {
            console.log('Subscription response:', response);
        }
    );
});

socket.on('connection:ready', (data) => {
    console.log('Authentication confirmed:', data);
});

socket.on('location:updated', (data) => {
    console.log('LIVE GPS UPDATE RECEIVED:');
    console.log(data);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});