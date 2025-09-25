// 解析think标签的函数
export const parseThinkTags = (content: string) => {
  const segments: { type: 'think' | 'content'; content: string }[] = [];
  let currentIndex = 0;

  // 正则表达式匹配 <think> 和 </think> 标签
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    // 添加think标签之前的内容
    if (match.index > currentIndex) {
      const beforeContent = content.slice(currentIndex, match.index).trim();
      if (beforeContent) {
        segments.push({ type: 'content', content: beforeContent });
      }
    }

    // 添加think标签内容
    const thinkContent = match[1].trim();
    if (thinkContent) {
      segments.push({ type: 'think', content: thinkContent });
    }

    currentIndex = match.index + match[0].length;
  }

  // 添加最后剩余的内容
  if (currentIndex < content.length) {
    const remainingContent = content.slice(currentIndex).trim();
    if (remainingContent) {
      segments.push({ type: 'content', content: remainingContent });
    }
  }

  // 如果没有think标签，返回原内容
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: 'content', content: content.trim() });
  }

  return segments;
};

// Helper function to remove think tags from content
export const removeThinkTags = (content: string) => {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};