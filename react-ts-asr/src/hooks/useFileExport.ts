import { App } from 'antd';

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

  return {
    saveResultsToFile,
    copyResults,
    downloadAudio
  };
};