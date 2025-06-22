import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import os from 'os';
import path from 'path';
import { Container, Service } from 'typedi';
import { B2Service } from '../services/b2';

const prisma = new PrismaClient();

@Service()
export class DocumentExtractionService {
  /**
   * Downloads a file from B2, extracts and cleans content, saves to Postgres, and returns the raw text.
   */
  async extractAndSaveRawContent(
    documentId: string,
    b2FileId: string,
    fileName: string,
    fileType: string
  ): Promise<string> {
    console.log('[Extraction] Starting extraction for', documentId);
    // 1. Download file from B2
    const b2Service = Container.get(B2Service);
    const { data: fileBuffer } = await b2Service.downloadFile(b2FileId);

    // 2. Detect file type/extension
    const ext = fileName.toLowerCase().split('.').pop();
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);
    await fs.writeFile(tempFilePath, fileBuffer);

    let documents: any[] = [];
    try {
      // 3. Use LangChain loader
      switch (ext) {
        case 'pdf':
          documents = await new PDFLoader(tempFilePath).load();
          break;
        case 'txt':
        case 'md':
          documents = await new TextLoader(tempFilePath).load();
          break;
        // Add more loaders as needed
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
      // 4. Clean up temp file
      await fs.unlink(tempFilePath);
    } catch (err) {
      await fs.unlink(tempFilePath).catch(() => {});
      throw err;
    }

    // 5. Clean and join content
    const rawContent = documents
      .map((doc) => this.stripFormatting(doc.pageContent))
      .join('\n\n');

    // 6. Save to Postgres
    await prisma.document.update({
      where: { id: documentId },
      data: { rawContent },
    });

    return rawContent;
  }

  private stripFormatting(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
}
