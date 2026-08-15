-- citext backs the case-insensitive `users.email` column in the UAC design
-- (docs/design/uac-design.md). gen_random_uuid() needs no extension on PG13+.
CREATE EXTENSION IF NOT EXISTS citext;
