const item = (label, to, comingSoon = false) => ({ label, to, comingSoon });

export const roleNavigation = Object.freeze({
  admin: [
    item('Overview', '/dashboard'),
    item('Vans', '/dashboard/vans', true),
    item('Live Tracking', '/dashboard/live-tracking', true),
    item('Students', '/dashboard/students', true),
    item('Drivers', '/dashboard/drivers', true),
    item('Parents', '/dashboard/parents', true),
    item('Reports', '/dashboard/reports', true)
  ],
  driver: [
    item('Dashboard', '/driver/dashboard'),
    item('My Trip', '/driver/trip', true),
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
