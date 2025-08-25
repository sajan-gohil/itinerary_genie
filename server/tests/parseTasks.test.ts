import request from 'supertest';
import express from 'express';
// Add Jest types for TypeScript
import type {} from '@jest/globals';
// @ts-ignore
jest.mock('../src/cache', () => ({
    __esModule: true,
    default: {
        get: async () => null,
        set: async () => {},
        has: async () => false,
    },
}));
import parseTasksRouter from '../src/api/parseTasks';

const app = express();
app.use(express.json());
app.use('/api', parseTasksRouter);

describe('POST /api/parse-tasks', () => {
  it('should parse tasks from example input', async () => {
    const res = await request(app)
      .post('/api/parse-tasks')
      .send({ text: 'spa, shopping, dinner at Chandni Chowk, movie' });
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toBeDefined();
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(res.body.tasks.length).toBeGreaterThanOrEqual(4);
    expect(res.body.tasks[0]).toHaveProperty('id');
    expect(res.body.tasks[0]).toHaveProperty('raw');
    expect(res.body.tasks[0]).toHaveProperty('type');
  });
});

function expect(received: any) {
    return {
        toBe(expected: any) {
            if (received !== expected) {
                throw new Error(`Expected ${received} to be ${expected}`);
            }
        },
        toEqual(expected: any) {
            const isEqual = JSON.stringify(received) === JSON.stringify(expected);
            if (!isEqual) {
                throw new Error(`Expected ${JSON.stringify(received)} to equal ${JSON.stringify(expected)}`);
            }
        },
        toBeDefined() {
            if (received === undefined) {
                throw new Error(`Expected value to be defined, but received undefined`);
            }
        },
        toHaveProperty(prop: string) {
            if (!(prop in received)) {
                throw new Error(`Expected object to have property '${prop}', but it does not.`);
            }
        },
        toBeGreaterThanOrEqual(expected: number) {
            if (typeof received !== 'number' || received < expected) {
                throw new Error(`Expected ${received} to be greater than or equal to ${expected}`);
            }
        }
    };
}


