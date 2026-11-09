import { configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// The full suite runs many files at once; a slow moment should not fail a test.
configure({ asyncUtilTimeout: 5000 });
