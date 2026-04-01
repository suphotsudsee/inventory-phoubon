FROM mysql:8.0

COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY init-users.sql /docker-entrypoint-initdb.d/02-init-users.sql