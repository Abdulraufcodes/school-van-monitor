# Location module

`LocationUpdate` stores GPS history for a trip. The van module's reference service currently writes location records. Consider moving location ingestion into this module if it grows, but avoid circular imports. Add retention rules and stale/out-of-order update handling before production.
