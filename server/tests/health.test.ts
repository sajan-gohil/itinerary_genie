import request from 'supertest';
import express from 'express';
import { config } from '../src/config';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

describe('GET /health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
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
        }
    };
}

