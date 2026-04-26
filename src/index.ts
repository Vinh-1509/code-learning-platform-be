import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/mongodb';
import dataRoutes from './routes/data.routes';

dotenv.config();

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Core API Routes
app.use('/api', dataRoutes);

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

console.log('Hello');

bootstrap().catch((err) => {
  console.error(err);
});
