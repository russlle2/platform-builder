-- A filtered DELETE also requires SELECT on each column used by its WHERE
-- predicate. Allow the isolated fixture cleanup to match its exact slug while
-- preserving the denial of table-wide reads and unrelated column access.
grant select (slug) on table public.booking_inquiries to service_role;
