declare module 'remark-html' {
  const html: any;
  export default html;
}

declare module '*.svg' {}

declare module 'fast-exif' {
  declare function read(filename: string)
}
