import { io } from 'socket.io-client';

const PARENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicGFyZW50IiwiaWF0IjoxNzkzNTQxNjE5LCJleHAiOjE3OTM1NDI1MTksInN1YiI6IjZhZTBiNTlhNDg4NDAyMTNkNDhkMGU5MyJ9.1Se-swpkUnXq3-ggxLc_duvOY52VGdgX6732WBaE8kE';
const TRIP_ID = '6ae745acfb028b6294708f6a';

const socket = io('http://localhost:5000', {
  auth: {
    token: PARENT_TOKEN
  }
});

socket.on('connect', () => {
  console.log('Parent connected:', socket.id);

  // Subscribe again whenever the socket connects/reconnects.
  socket.emit('trip:subscribe', { tripId: TRIP_ID }, (response) => {
    console.log('Subscription response:', response);
  });
});

socket.on('connection:ready', (data) => {
  console.log('Server ready:', data);
});

// Listen for trip completion.
socket.on('trip:status', (data) => {
  console.log('TRIP STATUS UPDATE RECEIVED:', data);
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});