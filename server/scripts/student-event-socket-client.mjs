import { io } from 'socket.io-client';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

const PARENT_TOKEN = process.env.PARENT_TOKEN;
const TRIP_ID = process.env.TRIP_ID;

if (!PARENT_TOKEN || !TRIP_ID) {
  throw new Error('PARENT_TOKEN and TRIP_ID are required');
}

const socket = io(SERVER_URL, {
  auth: {
    token: PARENT_TOKEN
  }
});

socket.on('connect', () => {
  console.log('Connected to Socket.IO:', socket.id);

  socket.emit('trip:subscribe', { tripId: TRIP_ID }, (response) => {
    console.log('Subscription response:', response);

    if (!response.success) {
      console.log('Subscription failed');
    }
  });
});

socket.on('connection:ready', (data) => {
  console.log('Authentication confirmed:', data);
});

socket.on('student:event', (event) => {
  console.log('\nStudent event received!');
  console.log(event);
});

socket.on('location:updated', (location) => {
  console.log('\nGPS update received:', location);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});