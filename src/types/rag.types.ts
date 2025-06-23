export interface RagProcessRequest {
  b2FileId: string;
  fileName: string;
  fileType: string;
  chatbotId: string;
}

export interface RagRetrieveRequest {
  query: string;
  chatbotId: string;
  limit?: number;
}

export interface RagProcessResponse {
  status: string;
  documentId: string;
}

export interface RagRetrieveResponse {
  results: any[];
}
