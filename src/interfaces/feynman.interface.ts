// Question response
export interface FeynmanQuestionResponse {
  blockId: string;
  question: string;
}

// Chat response
export interface FeynmanChatRequestBody {
  message: string;
}

export interface FeynmanChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FeynmanChatAiInput {
  contentSummary: string;
  userMessage: string;
  chatHistory: FeynmanChatMessage[];
}

export interface FeynmanChatAiResult {
  reply: string;
  isPassed: boolean;
}

export interface FeynmanChatResponse {
  blockId: string;
  reply: string;
  isPassed: boolean;
}

// History response
export interface FeynmanHistoryResponse {
  blockId: string;
  chatHistory: FeynmanChatMessage[];
}

export interface FeynmanResetHistoryResponse {
  blockId: string;
  chatHistory: FeynmanChatMessage[];
  isFeynmanPassed: boolean;
}

// Stats response
export interface FeynmanStatsResponse {
  blockId: string;
  isFeynmanPassed: boolean;
}
