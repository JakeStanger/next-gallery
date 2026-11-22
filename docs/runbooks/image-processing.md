# Runbook: image processing

How uploads are processed, and what to do when one doesn't finish.
See the README's "Image uploads" section for the flow.

## Components

| Piece | Where |
|---|---|
| Upload endpoints | `/api/image/<id>/upload` (app Worker), a multipart upload of the original to `raw/<id>.<ext>` in `rstanger-images-raw`; `PUT /api/image/<id>/processing-copy` writes `processing/<id>.jpeg` for originals beyond the Images binding's limits |
| Queue | `image-processing` (retries up to 5 times with backoff), dead letters in `image-processing-dlq` |
| Processor | Worker `next-gallery-image-processor` (`workers/image-processor`) |
| Outputs | `thumb/<id>.webp` (360px wide) and `marked/<id>.webp` (full size where Cloudflare Images allows, watermarked) in `rstanger-images` |
| Record update | Processor `PATCH`es `/api/image/<id>` via the `APP` service binding, authenticated with `API_TOKEN` |

## Symptoms and fixes

### "This image is taking longer than expected to process" after an upload

The upload page offers **Retry processing**, which requeues the image. If that doesn't help:

1. Tail the processor's logs while requeueing:

   ```bash
   npx wrangler tail next-gallery-image-processor
   curl -X POST -H "Authorization: Bearer $API_TOKEN" https://rstanger.co.uk/api/image/<id>/process
   ```

2. Look for the error logged by `Failed to process image <id>` or `Dropping image <id>`.
   Images binding errors are logged as `IMAGES_TRANSFORM_...` or `IMAGES_INFO_...` with a
   numeric code ([reference](https://developers.cloudflare.com/images/reference/troubleshooting/)):

| Error | Cause / fix |
|---|---|
| `Original raw/<id>... not found` | Upload didn't complete. Upload the file again from the admin page. |
| `Unsupported image format` | Not a raster image. Upload a JPEG/PNG/WebP/AVIF/TIFF/HEIC. |
| `raw/<id>... is over the 20.0 MB Images binding input limit` | The original has no processing copy, e.g. it was uploaded some other way than the admin upload page. Delete the image and upload it again from the upload page, which creates one. |
| Upload page: `This browser can't decode the image` / `couldn't encode` | The browser can't create the processing copy (e.g. TIFF, or a mobile browser's canvas size limit). Use a desktop browser, or export the original as JPEG. |
| Code 9413 | Over 100 megapixels, so the original needed a processing copy and has none. As for the 20 MB limit above. |
| Code 9422 | Monthly free transformation limit reached. Enable paid Images billing (Images → Transformations), then requeue. |
| Code 9529 (`Watermarking image <id> at <n>px timed out`) | Cloudflare Images timed out. The processor retries the watermarked image at smaller sizes on its own, logging `Watermarked image <id> generated at <n>px`. It only fails if it still times out at 2048px, usually when Cloudflare is overloaded: retry later. |
| Code 9432 | Invalid request. If every upload fails with it, the account is probably on the legacy Image Resizing subscription, which can't use the Images binding: switch to the Images subscription in the dashboard (Images → Transformations), then requeue. |
| `Failed to update image <id>: 401` | `API_TOKEN` differs between the app and the processor. Set it again with `scripts/migration/set-secrets.sh`. |
| `Image <id> no longer exists` | The record was deleted while processing; the message is dropped. |

### Messages in the dead-letter queue

Messages land in `image-processing-dlq` after 5 failed attempts. Nothing consumes the DLQ.
Fix the cause (above), then requeue the affected images. To find and requeue every image whose
outputs are missing or which was never processed:

```bash
NEXT_PUBLIC_CDN_URL=https://cdn.rstanger.co.uk/ \
APP_URL=https://rstanger.co.uk API_TOKEN=... \
  node scripts/migration/verify-images.mjs --requeue
```

Then purge the DLQ from the dashboard (Queues → image-processing-dlq).

### Watermark missing

`wrangler dev` emulates the Images binding locally without `draw()` support, so local output
has no watermark. In production it is always applied. To check locally, temporarily set
`"remote": true` on the `IMAGES` binding in `workers/image-processor/wrangler.jsonc`.

### Changing thumbnail size, quality or the watermark

Edit the constants in `workers/image-processor/src/index.ts` (or replace
`content/overlay.png`), deploy with `npm run deploy:processor`, then requeue images to
regenerate them with `verify-images.mjs --requeue`. That script only requeues broken
images, so to regenerate everything, call `/api/image/<id>/process` for each id.
