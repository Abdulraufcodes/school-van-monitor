import Student from '../student/student.model.js';
import User from '../auth/User.model.js';
import Notification from './notification.model.js';
import { emitPickupApproachNotification } from '../../src/sockets/socketServer.js';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_RADIUS_METERS = 500;
const DEFAULT_MAX_LOCATION_AGE_SECONDS = 60;

function distanceMeters(pointA, pointB) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(pointB.latitude - pointA.latitude);
  const longitudeDelta = toRadians(pointB.longitude - pointA.longitude);
  const rawA = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(pointA.latitude)) * Math.cos(toRadians(pointB.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function notifyPickupApproach({ trip, van, location }) {
  if (trip.tripType !== 'morning_pickup') return 0;
  const configuredRadius = Number(process.env.PICKUP_ALERT_RADIUS_METERS);
  const radius = Number.isFinite(configuredRadius) && configuredRadius > 0 && configuredRadius <= 5000 ? configuredRadius : DEFAULT_RADIUS_METERS;
  const configuredMaxAge = Number(process.env.LOCATION_STALE_THRESHOLD_SECONDS);
  const maxAgeSeconds = Number.isFinite(configuredMaxAge) && configuredMaxAge > 0 && configuredMaxAge <= 3600 ? configuredMaxAge : DEFAULT_MAX_LOCATION_AGE_SECONDS;
  const recordedAt = new Date(location.recordedAt);
  const receivedAt = new Date(location.receivedAt);
  const ageSeconds = (receivedAt.getTime() - recordedAt.getTime()) / 1000;
  if (!Number.isFinite(ageSeconds) || ageSeconds < -30 || ageSeconds > maxAgeSeconds) return 0;

  const students = await Student.find({
    schoolId: trip.schoolId,
    assignedVanId: van._id,
    isActive: true,
    parentIds: { $exists: true, $ne: [] },
    'pickupLocation.latitude': { $exists: true },
    'pickupLocation.longitude': { $exists: true }
  }).select('_id name parentIds pickupLocation').lean();

  const nearby = students.map((student) => ({
    student,
    distance: distanceMeters(location, student.pickupLocation)
  })).filter((item) => item.distance <= radius);
  if (!nearby.length) return 0;

  const parentIds = [...new Map(nearby.flatMap(({ student }) => student.parentIds).map((id) => [String(id), id])).values()];
  const parents = await User.find({ _id: { $in: parentIds }, schoolId: trip.schoolId, role: 'parent', isActive: true }).select('_id').lean();
  const activeParentIds = new Set(parents.map((parent) => String(parent._id)));
  let createdCount = 0;

  for (const { student, distance } of nearby) {
    for (const parentId of student.parentIds.filter((id) => activeParentIds.has(String(id)))) {
      let notification;
      try {
        [notification] = await Notification.create([{
          schoolId: trip.schoolId,
          parentId,
          studentId: student._id,
          tripId: trip._id,
          vanId: van._id,
          type: 'pickup_approaching',
          distanceMeters: Math.round(distance),
          occurredAt: receivedAt
        }]);
      } catch (error) {
        if (error?.code === 11000) continue;
        throw error;
      }
      createdCount += 1;
      emitPickupApproachNotification({
        notificationId: String(notification._id),
        studentId: String(student._id),
        studentName: student.name,
        tripId: String(trip._id),
        vanId: String(van._id),
        distanceMeters: notification.distanceMeters,
        occurredAt: notification.occurredAt.toISOString()
      }, String(parentId));
    }
  }
  return createdCount;
}
