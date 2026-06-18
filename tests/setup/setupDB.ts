import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

export async function connectTestDB() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongo.stop();
}
