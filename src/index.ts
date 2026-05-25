import './types/express-augmentation';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/mongodb';
import authRoutes from './routes/auth.routes';
import learningSystemRoutes from './routes/learning_system.routes';
import exerciseRoutes from './routes/exercise.routes';
import practiceRoutes from './routes/practice.routes';

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

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'CodeStep BE is running' });
});

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error(err);
});
