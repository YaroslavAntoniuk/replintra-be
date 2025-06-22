import { QdrantClient } from '@qdrant/js-client-rest';
import { Service } from 'typedi';

@Service()
export class QdrantService {
  public client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
}
