import mongoose, { Schema, Document } from 'mongoose';

export interface ILanguageInfo extends Document {
  language: string;
  info: string;
}

const languageInfoSchema = new Schema<ILanguageInfo>(
  {
    language: { type: String, required: true, unique: true, trim: true },
    info: { type: String, required: true },
  },
  { timestamps: false },
);

export const LanguageInfo = mongoose.model<ILanguageInfo>(
  'LanguageInfo',
  languageInfoSchema,
  'language_info',
);
