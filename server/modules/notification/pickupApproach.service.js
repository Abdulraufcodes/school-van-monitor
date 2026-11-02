import Student from '../student/student.model.js';
import User from '../auth/User.model.js';
import School from '../school/school.model.js';
import { LocationUpdate } from '../location/location.model.js';
import StudentEvent from '../studentEvent/studentEvent.model.js';
import Notification from './notification.model.js';
import { emitPickupApproachNotification } from '../../src/sockets/socketServer.js';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_RADIUS_METERS = 500;
const DEFAULT_MAX_LOCATION_AGE_SECONDS = 60;
const DEFAULT_MINIMUM_APPROACH_METERS = 10;

function distanceMeters(pointA, pointB) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(pointB.latitude - pointA.latitude);
  const longitudeDelta = toRadians(pointB.longitude - pointA.longitude);
  const rawA = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(pointA.latitude)) * Math.cos(toRadians(pointB.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  const a = Math.min(1, Math.max(0, rawA));
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function boundedSetting(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

export async function notifyPickupApproach({ trip, van, location }) {
  if (trip.tripType !== 'morning_pickup') return 0;
  const school = await School.findById(trip.schoolId).select('pickupAlertSettings');
  const settings = school?.pickupAlertSettings;
  if (settings?.enabled === false) return 0;
  const radius = boundedSetting(settings?.radiusMeters ?? process.env.PICKUP_ALERT_RADIUS_METERS, DEFAULT_RADIUS_METERS, 100, 5000);
  const maxAgeSeconds = boundedSetting(settings?.maxLocationAgeSeconds ?? process.env.LOCATION_STALE_THRESHOLD_SECONDS, DEFAULT_MAX_LOCATION_AGE_SECONDS, 15, 3600);
  const minimumApproachMeters = boundedSetting(settings?.minimumApproachMeters, DEFAULT_MINIMUM_APPROACH_METERS, 0, 1000);
  const recordedAt = new Date(location.recordedAt);
  const receivedAt = new Date(location.receivedAt);
  const ageSeconds = (receivedAt.getTime() - recordedAt.getTime()) / 1000;
  if (!Number.isFinite(ageSeconds) || ageSeconds < -30 || ageSeconds > maxAgeSeconds) return 0;

  const previous = await LocationUpdate.findOne({ tripId: trip._id, receivedAt: { $lt: receivedAt } })
    .sort({ receivedAt: -1 }).select('latitude longitude receivedAt').lean();
  if (!previous || (receivedAt.getTime() - new Date(previous.receivedAt).getTime()) / 1000 > maxAgeSeconds) return 0;

  const students = await Student.find({
    schoolId: trip.schoolId, assignedVanId: van._id, isActive: true,
    parentIds: { $exists: true, $ne: [] },
    'pickupLocation.latitude': { $exists: true },
    'pickupLocation.longitude': { $exists: true }
  }).select('_id name parentIds pickupLocation').lean();
  if (!students.length) return 0;

  const currentDistanceByStudent = students.map((student) => ({
    student,
    distance: distanceMeters(location, student.pickupLocation),
    previousDistance: distanceMeters(previous, student.pickupLocation)
  })).filter(({ distance, previousDistance }) => distance <= radius
    && previousDistance > radius
    && previousDistance - distance >= minimumApproachMeters);
  if (!currentDistanceByStudent.length) return 0;

  const pickedUp = await StudentEvent.find({
    schoolId: trip.schoolId, tripId: trip._id, type: 'picked_up',
    studentId: { $in: currentDistanceByStudent.map(({ student }) => student._id) }
  }).select('studentId').lean();
  const pickedUpIds = new Set(pickedUp.map((event) => String(event.studentId)));
  const nearby = currentDistanceByStudent.filter(({ student }) => !pickedUpIds.has(String(student._id)));
  if (!nearby.length) return 0;

  const parentIds = [...new Map(nearby.flatMap(({ student }) => student.parentIds).map((id) => [String(id), id])).values()];
  const parents = await User.find({
    _id: { $in: parentIds }, schoolId: trip.schoolId, role: 'parent', isActive: true,
    $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }]
  }).select('_id').lean();
  const activeParentIds = new Set(parents.map((parent) => String(parent._id)));
  let createdCount = 0;

  for (const { student, distance } of nearby) {
    for (const parentId of student.parentIds.filter((id) => activeParentIds.has(String(id)))) {
      let notification;
      try {
        [notification] = await Notification.create([{
          schoolId: trip.schoolId, parentId, studentId: student._id, tripId: trip._id, vanId: van._id,
          type: 'pickup_approaching', distanceMeters: Math.round(distance), occurredAt: receivedAt
        }]);
      } catch (error) {
        if (error?.code === 11000) continue;
        throw error;
      }
      createdCount += 1;
      emitPickupApproachNotification({
        notificationId: String(notification._id), studentId: String(student._id), studentName: student.name,
        tripId: String(trip._id), vanId: String(van._id), distanceMeters: notification.distanceMeters,
        occurredAt: notification.occurredAt.toISOString()
      }, String(parentId));
    }
  }
  return createdCount;
}
