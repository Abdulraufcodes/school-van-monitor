# Notification module

The module persists pickup approach alerts for linked active parents and emits them to authenticated parent notification rooms. Alerts are created only for fresh driver GPS updates on active morning pickup trips when the van is within the configured pickup radius. A unique notification index suppresses repeated alerts per parent, student, and trip. SMS and paid push providers are not part of this implementation.
