import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/group1/db.test.ts', 'tests/group1/schema.test.ts', 'tests/group1/seed.test.ts', 'tests/group2/user-repository.test.ts'],
    setupFiles: ['tests/database-setup.ts', 'tests/setup.ts'],
    fileParallelism: false,
    env: { JWT_SECRET: 'test-secret-test-secret-123' },
  },
});
