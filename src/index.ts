import './types/express-augmentation';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/mongodb';
import authRoutes from './routes/auth.routes';
import learningSystemRoutes from './routes/learning_system.routes';
import exerciseRoutes from './routes/exercise.routes';
import practiceRoutes from './routes/practice.routes';
import feynmanRoutes from './routes/feynman.routes';
import tagRoutes from './routes/tag.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { Roadmap } from './models/learning_system.model';
import { seed } from './seed';
dotenv.config();

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api', learningSystemRoutes);
app.use('/api/', exerciseRoutes);
app.use('/api', practiceRoutes);
app.use('/api', feynmanRoutes);
app.use('/api', tagRoutes);
app.use('/api', dashboardRoutes);

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'CodeStep BE is running' });
});

const PORT = process.env.PORT || 'http://localhost:3000';

async function bootstrap() {
  try {
    await connectDB();

    const roadmapCount = await Roadmap.countDocuments();
    if (roadmapCount === 0) {
      console.log('Database is empty. Running auto-seeding...');
      await seed(false);
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
