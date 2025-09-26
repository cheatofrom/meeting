import { App } from 'antd';

import { marked } from 'marked';


export const useFileExport = () => {
  const { message: messageApi } = App.useApp();

  const saveResultsToFile = (editedResults: any[], format: 'txt' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = editedResults.map((result, index) =>
        `[${index + 1}] ${result.speaker} (${result.time_range}): ${result.text}`
      ).join('\n');
      filename = `meeting_transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify({
        timestamp: new Date().toISOString(),
        total_segments: editedResults.length,
        results: editedResults
      }, null, 2);
      filename = `meeting_transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    messageApi.success(`已保存为 ${filename}`);
  };

  const copyResults = (editedResults: any[]) => {
    const fullText = editedResults.map(r => `[${r.time_range}] ${r.speaker}: ${r.text}`).join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      messageApi.success('识别结果已复制到剪贴板');
    }).catch(() => {
      messageApi.error('复制失败');
    });
  };

  const downloadAudio = (audioUrl: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `recording_${new Date().getTime()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    messageApi.success('音频文件已下载');
  };
const saveMarkdownAsWord = async (markdown: string) => {
  try {
    const convertedHtml = marked.parse(markdown);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 { color: #333; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>${convertedHtml}</body>
      </html>
    `;
    console.log('Full HTML for DOCX conversion:', fullHtml);
    const docx = await htmlDocx.asBlob(fullHtml, { orientation: 'portrait' }) as Blob;
    const url = URL.createObjectURL(docx);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_notes_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    messageApi.success('笔记已导出为 Word 文档');
  } catch (error) {
    console.error('文档导出失败:', error);
    messageApi.error('文档导出失败');
  }
};
  return {
    saveResultsToFile,
    copyResults,
    downloadAudio,
    saveMarkdownAsWord
  };
};
