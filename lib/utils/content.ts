import { remark } from 'remark';
import html from 'remark-html';
import files from '../gen/content';

/**
 * Returns the raw contents of a file in the content/ directory.
 *
 * Content is inlined at build time (scripts/generate-content.mjs) because the
 * Cloudflare Workers runtime has no access to the project filesystem.
 */
export function getContentFile(filePath: string): string {
  const contents = files[filePath];
  if (contents === undefined) {
    throw new Error(`Content file not found: ${filePath}`);
  }

  return contents;
}

export async function getMarkdownContent(page: string, area: string) {
  const fileContents = getContentFile(`${page}/${area}.md`);

  // Use remark to convert markdown into HTML string
  const processedContent = await remark().use(html).process(fileContents);

  return processedContent.toString();
}
