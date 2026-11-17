// Unit tests must never inherit an application database, even from the shell.
for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) delete process.env[key];
