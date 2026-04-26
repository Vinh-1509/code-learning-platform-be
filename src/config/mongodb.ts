import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const dbString =
      process.env.DB_STRING?.replace(
        'DB_PASSWORD',
        process.env.DB_PASSWORD || '',
      ) || '';

    if (!dbString) {
      throw new Error('DB_STRING is not defined');
    }

    await mongoose.connect(dbString);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;
