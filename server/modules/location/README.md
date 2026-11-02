# Location module

`LocationUpdate` stores GPS history for a trip with both device-recorded and server-received timestamps. The van service enforces driver/van/trip ownership, rejects future and out-of-order updates, persists accepted locations, then broadcasts them. Admin and parent APIs return the latest saved point and identify stale data. GPS retention remains a production policy to define.
