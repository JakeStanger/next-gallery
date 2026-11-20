# Runbook: image processing

How uploads are processed, and what to do when one doesn't finish.
See the README's "Image uploads" section for the flow.

## Components

| Piece | Where |
|---|---|
| Upload endpoint | `PUT /api/image/<id>/upload` (app Worker), writes `raw/<id>.<ext>` to `rstanger-images-raw` |
| Queue | `image-processing` (retries up to 5 times with backoff), dead letters in `image-processing-dlq` |
| Processor | Worker `next-gallery-image-processor` (`workers/image-processor`) |
| Outputs | `thumb/<id>.webp` (360px wide) and `marked/<id>.webp` (full size, watermarked) in `rstanger-images` |
| Record update | Processor `PATCH`es `/api/image/<id>` via the `APP` service binding, authenticated with `API_TOKEN` |

## Symptoms and fixes

### "Processing is taking longer than expected" after an upload

1. Tail the processor's logs while requeueing:

   ```bash
   npx wrangler tail next-gallery-image-processor
   curl -X POST -H "Authorization: Bearer $API_TOKEN" https://rstanger.co.uk/api/image/<id>/process
   ```

2. Look for the error logged by `Failed to process image <id>`:

| Error | Cause / fix |
|---|---|
| `Original raw/<id>... not found` | Upload didn't complete. Upload the file again from the admin page. |
| `Unsupported image format` | Not a raster image. Upload a JPEG/PNG/WebP/AVIF/TIFF/HEIC. |
| Images binding error (e.g. dimensions/size) | Cloudflare Images input limits (very large dimensions or file size). Downscale the original before uploading. |
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
