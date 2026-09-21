/** Server-side ceiling for a single uploaded file. The file-upload stage enforces it per route. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = `${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`;
