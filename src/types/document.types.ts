export interface DocumentIngestRequest {
  documentId: string;
  b2FileId: string;
  fileName: string;
  fileType: string;
  chatbotId: string;
}

export interface DocumentStatusResponse {
  status: string;
  updatedAt: Date;
  tenant: any;
}

export interface DocumentQueueResponse {
  status: string;
  documentId: string;
  tenant: any;
}
