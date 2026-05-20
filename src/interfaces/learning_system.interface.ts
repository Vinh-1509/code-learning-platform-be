import { Types, Document } from 'mongoose';

//Milestone interface
export interface IMilestone extends Document {
  roadmapId: Types.ObjectId;
  title: string;
  order: number;
  description?: string;
}

export interface MilestoneResponse {
  id: string;
  title: string;
  order: number;
  description?: string;
}

//Block interface
export interface ITheoryContent {
  type: 'theory';
  data: {
    order: number;
    text: string;
    image?: string;
  };
}

export interface ICodeContent {
  type: 'code';
  data: {
    order: number;
    code: string;
    explanation: string;
  };
}

export interface IPracticeContent {
  type: 'practice';

  data: {
    order: number;

    exerciseId: Types.ObjectId;

    required: boolean;
  };
}

export type BlockContent = ITheoryContent | ICodeContent | IPracticeContent;

export interface IBlock extends Document {
  lessonId: Types.ObjectId;
  content: BlockContent[];
  feynmanQuestion?: string;
  feynmanPrompt?: string;
}

//Lesson interface
export interface ILesson extends Document {
  milestoneId: Types.ObjectId;
  title: string;
  blocks: Types.ObjectId[];
  order: number;
}

export interface ILessonResponse {
  id: string;
  milestoneId: string;
  title: string;
  blocks: IBlock[];
  order: number;
}
