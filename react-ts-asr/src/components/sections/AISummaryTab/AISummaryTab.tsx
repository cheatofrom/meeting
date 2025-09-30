import React, { useMemo, useCallback } from 'react';
import { Button, Typography, Space, Collapse, message } from 'antd';
import { SendOutlined, SaveOutlined, ExperimentOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIConfigSection } from '../AIConfigSection/AIConfigSection';
import { parseThinkTags } from '../utils/textUtils';
import { useMarkdownComponents } from '../utils/markdownComponents';
import { isMobile } from '../utils/deviceUtils';
import { markdownToHtml, processThinkTagsToHtml } from '../../../utils/markdownToHtml';
import ErrorBoundary from '../../common/ErrorBoundary';
import FallbackContent from '../../common/FallbackContent';

const { Text } = Typography;

interface AISummaryTabProps {
  aiModel: string;
  setAiModel: (model: string) => void;
  availableModels: any[];
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  aiSummaryResult: string;
  isGeneratingAI: boolean;
  editedResults: any[];
  aiSummaryResultRef: React.RefObject<HTMLDivElement>;
  onOpenPromptModal: () => void;
  onGenerateAISummary: () => void;
  onSaveAISummary: () => void;
  onCopyAISummary: () => void;
  onImportSummaryToNotes: () => void;
}

export const AISummaryTab: React.FC<AISummaryTabProps> = ({
  aiModel,
  setAiModel,
  availableModels,
  systemPrompt,
  setSystemPrompt,
  userPrompt,
  setUserPrompt,
  aiSummaryResult,
  isGeneratingAI,
  editedResults,
  aiSummaryResultRef,
  onOpenPromptModal,
  onGenerateAISummary,
  onSaveAISummary,
  onCopyAISummary,
  onImportSummaryToNotes
}) => {
  const markdownComponents = useMarkdownComponents();
  
  // 检测是否为移动设备
  const isMobileDevice = isMobile();

  // 解析AI总结内容，分离think标签和正常内容
  const parsedSegments = useMemo(() => {
    if (!aiSummaryResult) return [];
    // 始终进行完整解析，确保内容不被截断
    return parseThinkTags(aiSummaryResult);
  }, [aiSummaryResult]);
  
  // 移动端简化渲染函数
  const renderSimpleContent = useCallback((content: string) => {
    // 简单的文本处理，去除复杂的markdown语法
    const processedContent = content
      .replace(/#{1,6}\s+/g, '') // 移除标题标记
      .replace(/\*\*(.+?)\*\*/g, '$1') // 移除粗体标记，保留内容
      .replace(/\*(.+?)\*/g, '$1') // 移除斜体标记，保留内容
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 移除链接，保留链接文本
      .replace(/```[\s\S]*?```/g, '[代码块]') // 将代码块替换为简单标识
      .replace(/`(.+?)`/g, '$1') // 移除行内代码标记
      .replace(/>\s(.+)/g, '• $1') // 将引用转换为列表项
      .replace(/\n\s*[-*+]\s/g, '\n• ') // 将列表项转换为简单的项目符号
      .replace(/\n\s*\d+\.\s/g, '\n• '); // 将有序列表转换为简单的项目符号
    
    return (
      <div style={{ 
        whiteSpace: 'pre-wrap', 
        lineHeight: '1.6',
        fontSize: '14px',
        color: '#333'
      }}>
        {processedContent}
      </div>
    );
  }, []);
  
  // 移动端专用的think标签渲染函数
  const renderMobileThinkContent = useCallback((content: string) => {
    // 使用正则表达式处理think标签内容
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = thinkRegex.exec(content)) !== null) {
      // 添加think标签之前的内容
      if (match.index > lastIndex) {
        const beforeContent = content.slice(lastIndex, match.index);
        if (beforeContent.trim()) {
          segments.push({ type: 'content', content: beforeContent });
        }
      }

      // 添加think标签内容
      const thinkContent = match[1];
      if (thinkContent.trim()) {
        segments.push({ type: 'think', content: thinkContent });
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加最后剩余的内容
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      if (remainingContent.trim()) {
        segments.push({ type: 'content', content: remainingContent });
      }
    }

    // 如果没有think标签，返回原内容
    if (segments.length === 0 && content.trim()) {
      segments.push({ type: 'content', content: content });
    }

    return segments.map((segment, index) => (
      segment.type === 'think' ? (
        <div key={`mobile-think-${index}`} style={{ marginBottom: '16px' }}>
          <details style={{ 
            border: '2px solid #1890ff',
            borderRadius: '8px',
            padding: '0',
            backgroundColor: '#f8f9ff'
          }}>
            <summary style={{
              padding: '12px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ExperimentOutlined />
              思考过程 (点击展开)
            </summary>
            <div style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              borderRadius: '0 0 6px 6px',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#333'
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {segment.content}
              </div>
            </div>
          </details>
        </div>
      ) : (
        <div key={`mobile-content-${index}`} style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#333',
          whiteSpace: 'pre-wrap',
          marginBottom: '12px'
        }}>
          {segment.content}
        </div>
      )
    ));
  }, []);

  // 优化渲染，统一使用ReactMarkdown
  const renderContent = useCallback((content: string) => {
    // 移动端使用专门的think标签处理
    if (isMobileDevice) {
      return renderMobileThinkContent(content);
    }
    
    // 桌面端使用ReactMarkdown渲染
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  }, [markdownComponents, isMobileDevice, renderMobileThinkContent]);

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
      <div style={{ flexShrink: 0 }}>
        <AIConfigSection
          aiModel={aiModel}
          setAiModel={setAiModel}
          availableModels={availableModels}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          onOpenPromptModal={onOpenPromptModal}
        />

        <div style={{ marginBottom: '12px' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={isGeneratingAI}
            onClick={onGenerateAISummary}
            disabled={editedResults.length === 0}
          >
            {isGeneratingAI ? '生成中...' : '生成AI总结'}
          </Button>
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>AI总结结果:</Text>
          {parsedSegments.length > 0 && (
            <Space>
              <Button
                size="small"
                icon={<SaveOutlined />}
                onClick={onSaveAISummary}
              >
                保存总结
              </Button>
              <Button
                size="small"
                onClick={onImportSummaryToNotes}
              >
                导入到笔记
              </Button>
              <Button
                size="small"
                onClick={onCopyAISummary}
              >
                复制
              </Button>
            </Space>
          )}
        </div>
      </div>

      <div
        ref={aiSummaryResultRef}
        className={`ai-summary-result ${isGeneratingAI ? 'ai-summary-streaming' : ''}`}
        style={{
          height: 'calc(100vh - 100px)',
          minHeight: '400px',
          maxHeight: '800px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '16px',
          backgroundColor: '#fff',
          overflow: 'auto',
          scrollBehavior: 'smooth',
          marginBottom: '32px',
          boxSizing: 'border-box'
        }}
      >
        <ErrorBoundary
          onError={(error) => {
            console.error('AI总结渲染错误:', error);
            // 移除用户可见的错误提示，只在控制台记录
            
            // 使用错误日志工具记录错误
            import("../../../utils/errorLogger").then(({ logError, ErrorType, ErrorSeverity }) => {
              logError(
                ErrorType.RENDER,
                `AI总结渲染错误: ${error.message}`,
                ErrorSeverity.MEDIUM,
                'AISummaryTab',
                { stack: error.stack, isMobile: isMobileDevice }
              );
            }).catch(e => console.error('加载错误日志工具失败', e));
          }}
          fallback={
            // 简化fallback，不显示错误信息给用户
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <div style={{ marginBottom: '16px' }}>正在处理AI总结内容...</div>
              {aiSummaryResult && (
                <div style={{ 
                  textAlign: 'left', 
                  whiteSpace: 'pre-wrap', 
                  background: '#f5f5f5', 
                  padding: '16px', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}>
                  {aiSummaryResult}
                </div>
              )}
            </div>
          }
        >
          <div style={{ paddingBottom: '40px' }}>
            {isGeneratingAI && !aiSummaryResult && (
              <div className="ai-generating-indicator">
                <span>AI正在生成会议纪要</span>
                <div className="ai-generating-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            {parsedSegments.length > 0 ? (
              <div className="ai-content-fade-in">
                {/* 移动端使用HTML渲染，桌面端使用ReactMarkdown */}
                {isMobileDevice ? (
                  // 移动端：直接渲染为HTML
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: processThinkTagsToHtml(markdownToHtml(aiSummaryResult))
                    }}
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#333'
                    }}
                  />
                ) : (
                  // 桌面端：使用原有的分段渲染逻辑
                  parsedSegments.map((segment, index) => (
                    segment.type === 'think' ? (
                      <Collapse
                        key={`think-${index}`}
                        size="small"
                        style={{ marginBottom: '16px' }}
                        ghost
                        items={[{
                          key: 'think',
                          label: (
                            <span style={{ color: '#1890ff', fontSize: '14px', fontWeight: '500' }}>
                              <ExperimentOutlined style={{ marginRight: '8px' }} />
                              思考过程
                            </span>
                          ),
                          children: (
                            <div className="think-content" style={{ 
                              padding: '12px 0',
                              borderLeft: '3px solid #f0f0f0',
                              paddingLeft: '16px',
                              marginLeft: '8px',
                              background: '#fafafa',
                              borderRadius: '4px'
                            }}>
                              {renderContent(segment.content)}
                            </div>
                          )
                        }]}
                      />
                    ) : (
                      <React.Fragment key={`content-${index}`}>
                        {renderContent(segment.content)}
                      </React.Fragment>
                    )
                  ))
                )}
              </div>
            ) : !isGeneratingAI ? (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>
                {editedResults.length === 0
                  ? '请先进行语音识别获取会议内容，然后点击"生成AI总结"按钮'
                  : '点击上方"生成AI总结"按钮开始生成会议纪要'
                }
              </Text>
            ) : null}
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};