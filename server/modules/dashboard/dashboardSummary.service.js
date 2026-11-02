import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import StudentEvent from '../studentEvent/studentEvent.model.js';
import { Trip } from '../trip/trip.model.js';
import { Van } from '../van/van.model.js';

export async function getSchoolDashboardSummary(schoolId) {
  const [activeStudentCount, trips] = await Promise.all([
    Student.countDocuments({ schoolId, isActive: true }),
    Trip.find({ schoolId, status: 'active' }).select('_id vanId driverId tripType serviceDate startedAt status').sort({ startedAt: -1 }).lean()
  ]);

  if (!trips.length) {
    return {
      totals: { vans: await Van.countDocuments({ schoolId }), activeDrivers: await User.countDocuments({ schoolId, role: 'driver', isActive: true }), activeTrips: 0, students: activeStudentCount },
      progress: { assigned: 0, pickedUp: 0, pendingPickup: 0, droppedOff: 0, pendingDropoff: 0 },
      trips: []
    };
  }

  const vanIds = [...new Map(trips.map((trip) => [String(trip.vanId), trip.vanId])).values()];
  const driverIds = [...new Map(trips.map((trip) => [String(trip.driverId), trip.driverId])).values()];
  const [vans, drivers, students, morningTrips] = await Promise.all([
    Van.find({ schoolId, _id: { $in: vanIds } }).select('_id registrationNumber isActive').lean(),
    User.find({ schoolId, _id: { $in: driverIds }, role: 'driver' }).select('_id name isActive').lean(),
    Student.find({ schoolId, assignedVanId: { $in: vanIds }, isActive: true }).select('_id name assignedVanId').sort({ name: 1 }).lean(),
    Trip.find({ schoolId, status: { $in: ['active', 'completed'] }, tripType: 'morning_pickup', vanId: { $in: vanIds }, serviceDate: { $in: [...new Set(trips.map((trip) => trip.serviceDate))] } }).select('_id vanId serviceDate').lean()
  ]);

  const vanById = new Map(vans.map((van) => [String(van._id), van]));
  const driverById = new Map(drivers.map((driver) => [String(driver._id), driver]));
  const studentsByVan = new Map();
  for (const student of students) {
    const key = String(student.assignedVanId);
    if (!studentsByVan.has(key)) studentsByVan.set(key, []);
    studentsByVan.get(key).push(student);
  }
  const morningByKey = new Map(morningTrips.map((trip) => [`${trip.vanId}:${trip.serviceDate}`, trip]));
  const studentIds = students.map((student) => student._id);
  const relevantTripIds = [...new Map([
    ...trips.map((trip) => [String(trip._id), trip._id]),
    ...trips.filter((trip) => trip.tripType === 'afternoon_dropoff').map((trip) => morningByKey.get(`${trip.vanId}:${trip.serviceDate}`)?._id).filter(Boolean).map((id) => [String(id), id])
  ]).values()];
  const events = studentIds.length
    ? await StudentEvent.find({ schoolId, studentId: { $in: studentIds }, tripId: { $in: relevantTripIds } }).select('studentId tripId type occurredAt').lean()
    : [];
  const eventByStudentTrip = new Map(events.map((event) => [`${event.tripId}:${event.studentId}:${event.type}`, event]));

  const tripSummaries = trips.map((trip) => {
    const vanStudents = studentsByVan.get(String(trip.vanId)) || [];
    const morningTrip = trip.tripType === 'afternoon_dropoff' ? morningByKey.get(`${trip.vanId}:${trip.serviceDate}`) : trip;
    const isAfternoon = trip.tripType === 'afternoon_dropoff';
    let pickedUp = 0;
    let droppedOff = 0;
    for (const student of vanStudents) {
      if (morningTrip && eventByStudentTrip.has(`${morningTrip._id}:${student._id}:picked_up`)) pickedUp += 1;
      if (isAfternoon && eventByStudentTrip.has(`${trip._id}:${student._id}:dropped_off`)) droppedOff += 1;
    }
    return {
      trip: { id: String(trip._id), status: trip.status, tripType: trip.tripType, serviceDate: trip.serviceDate, startedAt: trip.startedAt },
      van: vanById.has(String(trip.vanId)) ? { id: String(trip.vanId), registrationNumber: vanById.get(String(trip.vanId)).registrationNumber } : null,
      driver: driverById.has(String(trip.driverId)) ? { id: String(trip.driverId), name: driverById.get(String(trip.driverId)).name } : null,
      progress: { assigned: vanStudents.length, pickedUp, pendingPickup: Math.max(vanStudents.length - pickedUp, 0), droppedOff, pendingDropoff: isAfternoon ? Math.max(pickedUp - droppedOff, 0) : 0 }
    };
  });

  const progress = tripSummaries.reduce((total, item) => {
    for (const key of Object.keys(total)) total[key] += item.progress[key];
    return total;
  }, { assigned: 0, pickedUp: 0, pendingPickup: 0, droppedOff: 0, pendingDropoff: 0 });
  const [vanCount, driverCount] = await Promise.all([
    Van.countDocuments({ schoolId }),
    User.countDocuments({ schoolId, role: 'driver', isActive: true })
  ]);
  return {
    totals: { vans: vanCount, activeDrivers: driverCount, activeTrips: trips.length, students: activeStudentCount },
    progress,
    trips: tripSummaries
  };
}
