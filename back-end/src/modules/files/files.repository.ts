import { Injectable } from '@nestjs/common';

/**
 * FilesRepository — In-Memory Data Access Layer
 *
 * Holds the metadata for uploaded files. The bytes live on disk under
 * `uploads/`; this is the index that maps a public id to one of them.
 *
 * Note the asymmetry with the rest of the app: these records reset with the
 * process, but the files they point at do not. `sweepOrphans()` exists so a
 * restart does not silently accumulate unreachable bytes.
 */
@Injectable()
export class FilesRepository {
  private files: any[] = [];
  private counter = 100;

  generateId(): string {
    return 'f_' + Date.now() + '_' + this.counter++;
  }

  findAll(query?: { uploadedBy?: string; taskId?: string }): any[] {
    let result = this.files;
    if (query?.uploadedBy) result = result.filter(f => f.uploadedBy === query.uploadedBy);
    if (query?.taskId) result = result.filter(f => f.taskId === query.taskId);
    return result;
  }

  findById(id: string): any | null {
    return this.files.find(f => f.id === id) || null;
  }

  insert(file: any): any {
    this.files.push(file);
    return file;
  }

  update(id: string, partial: any): any | null {
    const idx = this.files.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.files[idx] = { ...this.files[idx], ...partial };
    return this.files[idx];
  }

  remove(id: string): any | null {
    const idx = this.files.findIndex(f => f.id === id);
    if (idx === -1) return null;
    return this.files.splice(idx, 1)[0];
  }

  /** Every stored filename, so the service can spot files nothing points at. */
  storedNames(): string[] {
    return this.files.map(f => f.storedName);
  }

  resetToSeed(): void {
    this.files = [];
  }
}
