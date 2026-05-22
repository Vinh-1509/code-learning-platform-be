import mongoose, { Schema, Document } from 'mongoose';

export interface ILanguageInfo extends Document {
  language: string;
  info: string;
  strengths: string[];
  challenges: string[];
  useCases: string[];
}

const languageInfoSchema = new Schema<ILanguageInfo>(
  {
    language: { type: String, required: true, unique: true, trim: true },
    info: { type: String, required: true },
    strengths: { type: [String], default: [] },
    challenges: { type: [String], default: [] },
    useCases: { type: [String], default: [] },
  },
  { timestamps: false },
);

export const LanguageInfo = mongoose.model<ILanguageInfo>(
  'LanguageInfo',
  languageInfoSchema,
  'language_info',
);
