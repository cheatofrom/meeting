import React from 'react';
import { Typography, Button, Alert } from 'antd';

interface FallbackContentProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isLoading?: boolean;
  content?: string;
}

/**
 * 降级显示组件，用于在渲染错误或加载失败时显示基本内容
 */
const FallbackContent: React.FC<FallbackContentProps> = ({
  title = '内容显示异常',
  message = '抱歉，内容渲染时遇到了问题，但您仍然可以查看基本文本内容。',
  onRetry,
  isLoading = false,
  content = ''
}) => {
  // 提取纯文本内容，去除markdown标记
  const extractPlainText = (text: string) => {
    return text
      .replace(/#{1,6}\s+/g, '') // 移除标题标记
      .replace(/\*\*(.+?)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*(.+?)\*/g, '$1') // 移除斜体标记
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 移除链接，保留链接文本
      .replace(/```[\s\S]*?```/g, '') // 移除代码块
      .replace(/`(.+?)`/g, '$1') // 移除行内代码
      .replace(/>\s(.+)/g, '$1') // 移除引用
      .replace(/\n\s*[-*+]\s/g, '\n• ') // 将列表项转换为简单的项目符号
      .replace(/\n\s*\d+\.\s/g, '\n• '); // 将有序列表转换为简单的项目符号
  };

  const plainTextContent = content ? extractPlainText(content) : '';

  return (
    <div style={{ padding: '16px' }}>
      <Alert
        message={title}
        description={message}
        type="warning"
        showIcon
        style={{ marginBottom: '16px' }}
      />
      
      {onRetry && (
        <Button 
          type="primary" 
          onClick={onRetry}
          loading={isLoading}
          style={{ marginBottom: '16px' }}
        >
          {isLoading ? '处理中...' : '重试'}
        </Button>
      )}
      
      {plainTextContent && (
        <div style={{ 
          border: '1px solid #f0f0f0', 
          borderRadius: '4px',
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <Typography.Title level={5}>基本文本内容：</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {plainTextContent}
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
};

export default FallbackContent;