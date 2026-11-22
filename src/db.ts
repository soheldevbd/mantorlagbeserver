import { MongoClient, ObjectId } from 'mongodb';
import { env } from './config.js';

export const client = new MongoClient(env.mongoUri);
export const db = client.db(env.dbName);
// 4 app collections (BetterAuth also keeps its own session/account/verification collections)
export const users = db.collection<any>('users');
export const tuitions = db.collection<any>('tuitions');
export const applications = db.collection<any>('applications');
export const payments = db.collection<any>('payments');

export const oid = (id: unknown) =>
  typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : null;

let indexed = false;
export async function ensureIndexes() {
  if (indexed) return;
  indexed = true;
  try {
    await applications.createIndex(
      { tuitionId: 1, studentEmail: 1 },
      { unique: true },
    );
    await applications.createIndex({ tutorEmail: 1 });
    await tuitions.createIndex({
      approvalStatus: 1,
      isActive: 1,
      createdAt: -1,
    });
    await tuitions.createIndex({ tutorEmail: 1 });
    await payments.createIndex({ stripeSessionId: 1 }, { unique: true });
  } catch (e) {
    indexed = false;
    console.error('Index creation failed:', (e as Error).message);
  }
}
