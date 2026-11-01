import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../../modules/auth/User.model.js';
import { Trip } from '../../modules/trip/trip.model.js';
import Student from '../../modules/student/student.model.js';

let io;

export function attachSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.JWT_ACCESS_SECRET) return next(new Error('UNAUTHENTICATED'));
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (!payload.sub || !payload.role) return next(new Error('UNAUTHENTICATED'));
      socket.data.user = { id: String(payload.sub), role: String(payload.role) };
      return next();
    } catch {
      return next(new Error('UNAUTHENTICATED'));
    }
  });

  // Do not expose a generic "join any room" handler. Add narrowly scoped join handlers
  // only after implementing database-backed driver/parent assignment checks.
  io.on('connection', (socket) => {
    socket.emit('connection:ready', {
      authenticated: true
    });

    socket.on('trip:subscribe', async (payload = {}, ack) => {
      const respond = typeof ack === 'function' ? ack : () => { };

      try {
        const { tripId } = payload;

        if (
          typeof tripId !== 'string' ||
          !mongoose.isValidObjectId(tripId)
        ) {
          return respond({
            success: false,
            code: 'INVALID_TRIP_ID'
          });
        }

        const authenticatedUser = socket.data.user;

        // This initial subscription is specifically for parents.
        if (authenticatedUser.role !== 'parent') {
          return respond({
            success: false,
            code: 'FORBIDDEN'
          });
        }

        // Recheck the account in the database instead of trusting
        // client-supplied role, school, or parent information.
        const parent = await User.findOne({
          _id: authenticatedUser.id,
          role: 'parent',
          isActive: true
        })
          .select('_id schoolId role isActive')
          .lean();

        if (!parent?.schoolId) {
          return respond({
            success: false,
            code: 'FORBIDDEN'
          });
        }

        // Only allow subscription to a currently active trip
        // belonging to the parent's school.
        const trip = await Trip.findOne({
          _id: tripId,
          schoolId: parent.schoolId,
          status: 'active'
        })
          .select('_id schoolId vanId status')
          .lean();

        if (!trip) {
          return respond({
            success: false,
            code: 'TRIP_NOT_AVAILABLE'
          });
        }

        // Find only active students linked to this parent
        // and assigned to the van for this active trip.
        const linkedStudents = await Student.find({
          schoolId: parent.schoolId,
          parentIds: parent._id,
          assignedVanId: trip.vanId,
          isActive: true
        })
          .select('_id')
          .lean();

        if (!linkedStudents.length) {
          return respond({
            success: false,
            code: 'TRIP_ACCESS_DENIED'
          });
        }

        // Join the trip room for GPS updates.
        await socket.join(`trip:${String(trip._id)}`);

        // Join individual student rooms for pickup/drop-off events.
        // A parent can receive events only for their linked students.
        const studentRooms = linkedStudents.map(
          (student) => `student:${String(student._id)}`
        );

        await socket.join(studentRooms);

        return respond({
          success: true,
          tripId: String(trip._id)
        });
      } catch (error) {
        // Avoid logging GPS or sensitive student details.
        console.error('Trip subscription failed:', error.message);

        return respond({
          success: false,
          code: 'SUBSCRIPTION_FAILED'
        });
      }
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket.IO has not been initialized');
  return io;
}

export function emitTripLocationUpdate(location) {
  // Allows service unit tests to run without starting an HTTP server.
  // In the actual application, attachSocketServer() initializes io.
  if (!io) return;

  io.to(`trip:${location.tripId}`).emit('location:updated', {
    vanId: location.vanId,
    tripId: location.tripId,
    latitude: location.latitude,
    longitude: location.longitude,
    recordedAt: location.recordedAt,
    receivedAt: location.receivedAt
  });
}

// Notify parents currently subscribed to a trip when its status changes.
export function emitTripStatusUpdate(trip) {
  // Allows service tests to run without starting Socket.IO.
  if (!io) return;

  io.to(`trip:${trip.id}`).emit('trip:status', {
    tripId: trip.id,
    vanId: trip.vanId,
    status: trip.status,
    tripType: trip.tripType ?? null,
    serviceDate: trip.serviceDate ?? null,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt
  });
}

export function emitStudentEvent(event) {
  // Allows service tests to run without starting Socket.IO.
  if (!io) return;

  io.to(`student:${String(event.studentId)}`).emit('student:event', {
    eventId: String(event._id),
    studentId: String(event.studentId),
    tripId: String(event.tripId),
    type: event.type,
    occurredAt: event.occurredAt
  });
}
