import Notification from './notification.model.js';

export async function listParentNotifications({ parentId, schoolId, limit = 50 }) {
  const notifications = await Notification.find({ parentId, schoolId })
    .populate({ path: 'studentId', select: 'name' })
    .populate({ path: 'vanId', select: 'registrationNumber' })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean();
  return notifications.map((notification) => ({
    id: String(notification._id),
    type: notification.type,
    student: notification.studentId ? { id: String(notification.studentId._id), name: notification.studentId.name } : null,
    tripId: String(notification.tripId),
    van: notification.vanId ? { id: String(notification.vanId._id), registrationNumber: notification.vanId.registrationNumber } : null,
    distanceMeters: notification.distanceMeters,
    occurredAt: notification.occurredAt,
    readAt: notification.readAt
  }));
}
