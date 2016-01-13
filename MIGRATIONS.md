# Steps to create a migration

Run `db-migrate`

`db-migrate create [migration-name] --sql-file`

Copy one of the old migrations javascript files to migrations/[file].js and
specify the up and down files you've just generated though db-migrate.

Write sql in the up file, and sql in the down file if you like.
