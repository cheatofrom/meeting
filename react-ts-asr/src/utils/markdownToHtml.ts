/**
 * 将Markdown文本转换为HTML，专为移动端优化
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // 处理标题
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 600; margin: 16px 0 8px 0; color: #262626;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; font-weight: 600; margin: 18px 0 10px 0; color: #262626; border-left: 4px solid #1890ff; padding-left: 12px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 18px; font-weight: 700; margin: 20px 0 12px 0; color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 8px;">$1</h1>');

  // 处理粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #1890ff;">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong style="font-weight: 600; color: #1890ff;">$1</strong>');

  // 处理斜体
  html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic; color: #595959;">$1</em>');
  html = html.replace(/_(.*?)_/g, '<em style="font-style: italic; color: #595959;">$1</em>');

  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f0f2f5; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #d63384; font-family: Monaco, Consolas, monospace;">$1</code>');

  // 处理代码块
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```(\w+)?\n?/, '').replace(/```$/, '');
    return `<pre style="background-color: #f6f8fa; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #333; font-family: Monaco, Consolas, monospace; overflow: auto; margin: 12px 0;"><code>${code}</code></pre>`;
  });

  // 处理引用
  html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #1890ff; padding: 12px 16px; margin: 12px 0; color: #595959; font-style: italic; background-color: #f8f9ff; border-radius: 0 8px 8px 0;">$1</blockquote>');

  // 处理无序列表
  html = html.replace(/^\* (.*$)/gim, '<li style="margin-bottom: 6px;">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li style="margin-bottom: 6px;">$1</li>');
  
  // 包装连续的li标签为ul
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
    return `<ul style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; padding-left: 20px; color: #333;">${match}</ul>`;
  });

  // 处理有序列表
  html = html.replace(/^\d+\. (.*$)/gim, '<li style="margin-bottom: 6px;">$1</li>');
  
  // 包装连续的数字li标签为ol（这个需要更复杂的逻辑，暂时简化处理）
  
  // 处理段落 - 将连续的非HTML行包装为p标签
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 如果是空行或HTML标签行，结束当前段落
    if (!trimmedLine || trimmedLine.startsWith('<')) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          processedLines.push(`<p style="font-size: 14px; line-height: 1.7; margin-bottom: 12px; color: #333; text-align: justify;">${paragraphText}</p>`);
        }
        currentParagraph = [];
      }
      if (trimmedLine) {
        processedLines.push(line);
      }
    } else {
      currentParagraph.push(trimmedLine);
    }
  }

  // 处理最后的段落
  if (currentParagraph.length > 0) {
    const paragraphText = currentParagraph.join(' ').trim();
    if (paragraphText) {
      processedLines.push(`<p style="font-size: 14px; line-height: 1.7; margin-bottom: 12px; color: #333; text-align: justify;">${paragraphText}</p>`);
    }
  }

  return processedLines.join('\n');
}

/**
 * 处理think标签，将其转换为HTML details元素
 */
export function processThinkTagsToHtml(content: string): string {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  
  return content.replace(thinkRegex, (_, thinkContent) => {
    const processedThinkContent = markdownToHtml(thinkContent.trim());
    
    return `
      <details style="border: 2px solid #1890ff; border-radius: 8px; padding: 0; background-color: #f8f9ff; margin-bottom: 16px;">
        <summary style="padding: 12px 16px; background-color: #1890ff; color: white; cursor: pointer; font-size: 15px; font-weight: 600; border-radius: 6px 6px 0 0; user-select: none; display: flex; align-items: center; gap: 8px;">
          🧠 思考过程 (点击展开)
        </summary>
        <div style="padding: 16px; background-color: #ffffff; border-radius: 0 0 6px 6px;">
          ${processedThinkContent}
        </div>
      </details>
    `;
  });
}