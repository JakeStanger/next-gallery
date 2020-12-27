import fs from 'fs';
import path from 'path';
import remark from 'remark';
import html from 'remark-html';

export const contentDirectory = path.join(process.cwd(), 'content');

export async function getMarkdownContent(page: string, area: string) {
  const fullPath = path.join(contentDirectory, page, `${area}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Use gray-matter to parse the post metadata section
  // const matterResult = matter(fileContents);

  // Use remark to convert markdown into HTML string
  const processedContent = await remark()
    .use(html)
    .process(fileContents);
  // Combine the data with the id and contentHtml
  return processedContent.toString();
}
