import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/mongodb';
import dataRoutes from './routes/data.routes';

dotenv.config();

// Initialize Database connection
connectDB();

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Core API Routes
app.use('/api', dataRoutes);

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'CodeStep BE is running 🚀' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
