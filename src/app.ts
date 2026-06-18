import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import learningSystemRoutes from './routes/learning_system.routes';
import exerciseRoutes from './routes/exercise.routes';
import practiceRoutes from './routes/practice.routes';
import feynmanRoutes from './routes/feynman.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', learningSystemRoutes);
app.use('/api', exerciseRoutes);
app.use('/api', practiceRoutes);
app.use('/api', feynmanRoutes);

app.get('/', (_, res) => {
  res.json({ message: 'CodeStep BE is running' });
});

export default app;
