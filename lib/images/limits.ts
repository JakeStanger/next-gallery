/**
 * Limits shared by the upload page, the upload API and workers/image-processor.
 *
 * The processor transforms images with the Cloudflare Images binding, which accepts
 * inputs up to 20 MB and 100 megapixels, and writes WebP, which is limited to 16,383
 * pixels per side. Originals outside these limits are kept as uploaded, and the
 * upload page also uploads a processing copy within them.
 * https://developers.cloudflare.com/images/get-started/limits/
 */
export const PROCESSING_MAX_BYTES = 20 * 1000 * 1000;
export const PROCESSING_MAX_PIXELS = 100 * 1000 * 1000;
export const PROCESSING_MAX_DIMENSION = 16383;

/** Largest original the upload API accepts */
export const MAX_ORIGINAL_BYTES = 150 * 1000 * 1000;

/**
 * Originals are uploaded in parts of this size (the last may be smaller), keeping each
 * request well under the Workers request body limit (100 MB on Free and Pro zones).
 * R2 requires every part except the last to be the same size, and at least 5 MiB.
 */
export const UPLOAD_PART_BYTES = 16 * 1024 * 1024;
