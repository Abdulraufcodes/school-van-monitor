const item = (label, to, comingSoon = false) => ({ label, to, comingSoon });

export const roleNavigation = Object.freeze({
  admin: [
    item('Overview', '/dashboard'),
    item('Vans', '/dashboard/vans'),
    item('Live Tracking', '/dashboard/live-tracking'),
    item('Students', '/dashboard/student-activity'),
    item('Drivers', '/dashboard/drivers'),
    item('People', '/dashboard/people'),
    item('Bulk Import', '/dashboard/import'),
    item('Reports', '/dashboard/reports', true)
  ],
  driver: [
    item('Dashboard', '/driver/dashboard'),
    item('My Trip', '/driver/trip'),
    item('Student Roster', '/driver/roster', true),
    item('Trip History', '/driver/history', true)
  ],
  parent: [
    item('Dashboard', '/parent/dashboard'),
    item('Live Tracking', '/parent/live-tracking', true),
    item('Activity History', '/parent/activity-history', true)
  ]
});

export const roleLabels = Object.freeze({
  admin: 'Administrator',
  driver: 'Driver',
  parent: 'Parent'
});
