// src/types/html-docx-js.d.ts
export {}; // 确保这是模块而非脚本

declare global {
  const htmlDocx: {
    asBlob(html: string, options?: any): Blob;
  };
}