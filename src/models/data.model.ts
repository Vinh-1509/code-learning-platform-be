import mongoose, { Schema, Document } from 'mongoose';

export interface IData extends Document {
  name: string;
  age: number;
}

const dataSchema = new Schema<IData>({
  name: { type: String, required: true },
  age: { type: Number, required: true },
});

// Connected to "MyCollection" in "MyDB"
const Data = mongoose.model<IData>('Data', dataSchema, 'MyCollection');

export default Data;
