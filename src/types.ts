export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface AskSuccess {
  model_id: string;
  response: string;
}

export interface AskError {
  model_id: string;
  error: string;
}

export type AskResult = AskSuccess | AskError;
