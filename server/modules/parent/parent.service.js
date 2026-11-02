import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import { Trip } from '../trip/trip.model.js';
import { Van } from '../van/van.model.js';
import { LocationUpdate } from '../location/location.model.js';

export async function listParentStudentsWithTrips({ parentId, schoolId }) {
  const parent = await User.findOne({ _id: parentId, schoolId, role: 'parent', isActive: true }).select('_id').lean();
  if (!parent) return [];
  const students = await Student.find({ schoolId, parentIds: parent._id, isActive: true }).select('_id name className assignedVanId').sort({ name: 1 }).lean();
  const vanIds = [...new Map(students.filter((student) => student.assignedVanId).map((student) => [String(student.assignedVanId), student.assignedVanId])).values()];
  const activeTrips = vanIds.length ? await Trip.find({ schoolId, vanId: { $in: vanIds }, status: 'active' }).select('_id vanId driverId tripType serviceDate status startedAt').lean() : [];
  const vans = activeTrips.length ? await Van.find({ schoolId, _id: { $in: activeTrips.map((trip) => trip.vanId) } }).select('_id registrationNumber').lean() : [];
  const drivers = activeTrips.length ? await User.find({ schoolId, role: 'driver', _id: { $in: activeTrips.map((trip) => trip.driverId) } }).select('_id name').lean() : [];
  const locations = activeTrips.length ? await LocationUpdate.find({ tripId: { $in: activeTrips.map((trip) => trip._id) } }).select('tripId latitude longitude recordedAt receivedAt').sort({ receivedAt: -1 }).lean() : [];
  const tripByVan = new Map(activeTrips.map((trip) => [String(trip.vanId), trip]));
  const vanById = new Map(vans.map((van) => [String(van._id), van]));
  const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
  const locationByTrip = new Map();
  for (const location of locations) if (!locationByTrip.has(String(location.tripId))) locationByTrip.set(String(location.tripId), location);
  const configuredStaleAfter = Number(process.env.LOCATION_STALE_THRESHOLD_SECONDS);
  const staleAfterSeconds = Number.isFinite(configuredStaleAfter) && configuredStaleAfter > 0 ? configuredStaleAfter : 60;

  return students.map((student) => {
    const trip = student.assignedVanId ? tripByVan.get(String(student.assignedVanId)) : null;
    const van = student.assignedVanId ? vanById.get(String(student.assignedVanId)) : null;
    const driver = trip ? driverById.get(String(trip.driverId)) : null;
    const location = trip ? locationByTrip.get(String(trip._id)) : null;
    const ageInSeconds = location ? Math.max(0, Math.floor((Date.now() - new Date(location.receivedAt).getTime()) / 1000)) : null;
    return {
      student: { id: String(student._id), name: student.name, className: student.className || '' },
      trip: trip ? { id: String(trip._id), status: trip.status, tripType: trip.tripType, serviceDate: trip.serviceDate, startedAt: trip.startedAt } : null,
      van: van ? { id: String(van._id), registrationNumber: van.registrationNumber } : null,
      driver: driver ? { id: String(driver._id), name: driver.name } : null,
      location: location ? { latitude: location.latitude, longitude: location.longitude, recordedAt: location.recordedAt, receivedAt: location.receivedAt, ageInSeconds, isStale: ageInSeconds > staleAfterSeconds } : null
    };
  });
}
