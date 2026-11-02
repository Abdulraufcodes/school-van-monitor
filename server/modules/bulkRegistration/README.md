# Bulk roster registration

The roster import validates the full `.xlsx` workbook before it writes any data. A valid workbook is committed in a MongoDB transaction across account, van, student, and audit records. Configure the MongoDB deployment as a replica set (or use MongoDB Atlas) so multi-document transactions are supported. On a standalone MongoDB server the import returns `TRANSACTIONS_REQUIRED` and writes no records.

Driver rows create pending driver accounts and their assigned vans. Student rows must refer to a parent, driver, and van registration. The driver/van pairing is checked against this school’s existing assignments or the driver/van rows in the same workbook. Parents and drivers receive single-use activation links after the transaction commits. Email delivery failures are recorded in import history and can be retried without importing the roster again.
