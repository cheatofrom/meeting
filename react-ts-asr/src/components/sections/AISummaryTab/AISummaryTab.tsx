import React, { useMemo } from 'react';
import { Button, Typography, Space, Collapse } from 'antd';
import { SendOutlined, SaveOutlined, ExperimentOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIConfigSection } from '../AIConfigSection/AIConfigSection';
import { parseThinkTags } from '../utils/textUtils';
import { useMarkdownComponents } from '../utils/markdownComponents';

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

  // 解析AI总结内容，分离think标签和正常内容
  const parsedSegments = useMemo(() => {
    if (!aiSummaryResult) return [];
    return parseThinkTags(aiSummaryResult);
  }, [aiSummaryResult]);

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
              {parsedSegments.map((segment, index) => (
                segment.type === 'think' ? (
                  <Collapse
                    key={`think-${index}`}
                    size="small"
                    style={{ marginBottom: '16px' }}
                    items={[{
                      key: 'think',
                      label: (
                        <span style={{ color: '#8c8c8c', fontSize: '13px', fontStyle: 'italic' }}>
                          <ExperimentOutlined style={{ marginRight: '6px' }} />
                          思考过程
                        </span>
                      ),
                      children: (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {segment.content}
                        </ReactMarkdown>
                      )
                    }]}
                  />
                ) : (
                  <ReactMarkdown
                    key={`content-${index}`}
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {segment.content}
                  </ReactMarkdown>
                )
              ))}
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
      </div>
    </div>
  );
};