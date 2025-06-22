import { v4 as uuidv4 } from 'uuid';

export function getValidQdrantId(id: string): string {
  // If id is a valid UUID, return as is; otherwise, generate a new UUID
  return /^[0-9a-fA-F-]{36}$/.test(id) ? id : uuidv4();
}
