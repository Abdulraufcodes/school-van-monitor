# Trip module

Trips are school-scoped and identify their assigned van, driver, type, service date, status, start time, and end time. Drivers may start trips only for their own active assigned vans and end only their own active trips. Active-trip uniqueness is enforced by partial indexes. GPS writes and student events require an authorized active trip.
