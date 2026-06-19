import './types/express-augmentation';
import dotenv from 'dotenv';

import connectDB from './config/mongodb';
import app from './app';

import { Roadmap } from './models/learning_system.model';
import { seed } from './seed';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await connectDB();

    const roadmapCount = await Roadmap.countDocuments();

    if (roadmapCount === 0) {
      console.log('Database is empty. Running auto-seeding...');
      await (seed as (autoSeed: boolean) => Promise<void>)(false);
    }

    app.listen(PORT, () => {
      console.log(`Server running at ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error(err);
});
