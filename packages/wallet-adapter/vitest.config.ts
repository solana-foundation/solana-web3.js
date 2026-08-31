import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// @testing-library/react unmounts between tests only with a global `afterEach`, hence `globals`.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['src/**/__tests__/**/*-test.ts?(x)'],
    },
});
