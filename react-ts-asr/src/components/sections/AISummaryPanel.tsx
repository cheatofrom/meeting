import React, { useState, useEffect } from 'react';
import { Button, Tabs } from 'antd';
import { CloseOutlined, FileTextOutlined, BulbOutlined } from '@ant-design/icons';
import { PromptManagerModal } from './PromptManagerModal';
import { NotesTab } from './NotesTab/NotesTab';
import { AISummaryTab } from './AISummaryTab/AISummaryTab';

interface AISummaryPanelProps {
  activeTab: 'notes' | 'ai-summary';
  setActiveTab: (tab: 'notes' | 'ai-summary') => void;
  notes: string;
  setNotes: (notes: string) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  aiSummaryResult: string;
  isGeneratingAI: boolean;
  availableModels: any[];
  editedResults: any[];
  aiSummaryResultRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onSaveNotes: () => void;
  onGenerateAISummary: () => void;
  onSaveAISummary: () => void;
  onCopyAISummary: () => void;
  onImportSummaryToNotes: () => void;
}

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  activeTab,
  setActiveTab,
  notes,
  setNotes,
  aiModel,
  setAiModel,
  systemPrompt,
  setSystemPrompt,
  userPrompt,
  setUserPrompt,
  aiSummaryResult,
  isGeneratingAI,
  availableModels,
  editedResults,
  aiSummaryResultRef,
  onClose,
  onSaveNotes,
  onGenerateAISummary,
  onSaveAISummary,
  onCopyAISummary,
  onImportSummaryToNotes
}) => {
  const [promptModalVisible, setPromptModalVisible] = useState(false);

  // 打开提示词管理弹窗
  const handleOpenPromptModal = () => {
    setPromptModalVisible(true);
  };

  // 应用提示词
  const handleApplyPrompts = (newSystemPrompt: string, newUserPrompt: string) => {
    setSystemPrompt(newSystemPrompt);
    setUserPrompt(newUserPrompt);
    setPromptModalVisible(false);
  };

  // 取消提示词管理
  const handleCancelPromptModal = () => {
    setPromptModalVisible(false);
  };

  // 当AI总结内容变化时，自动滚动到底部
  useEffect(() => {
    if (aiSummaryResult && aiSummaryResultRef.current && !isGeneratingAI) {
      // 延迟滚动以确保DOM完全更新
      setTimeout(() => {
        if (aiSummaryResultRef.current) {
          aiSummaryResultRef.current.scrollTop = aiSummaryResultRef.current.scrollHeight;
        }
      }, 150);
    }
  }, [aiSummaryResult, isGeneratingAI, aiSummaryResultRef]);

  return (
    <div className="ai-summary-panel">
      <div className="ai-summary-content">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'notes' | 'ai-summary')}
          tabBarExtraContent={{
            right: (
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={onClose}
                size="small"
                style={{ marginRight: '8px' }}
              />
            )
          }}
          items={[
            {
              key: 'notes',
              label: (
                <span>
                  <FileTextOutlined />
                  笔记
                </span>
              ),
              children: (
                <NotesTab
                  notes={notes}
                  setNotes={setNotes}
                  onSaveNotes={onSaveNotes}
                />
              )
            },
            {
              key: 'ai-summary',
              label: (
                <span>
                  <BulbOutlined />
                  AI纪要
                </span>
              ),
              children: (
                <AISummaryTab
                  aiModel={aiModel}
                  setAiModel={setAiModel}
                  availableModels={availableModels}
                  systemPrompt={systemPrompt}
                  setSystemPrompt={setSystemPrompt}
                  userPrompt={userPrompt}
                  setUserPrompt={setUserPrompt}
                  aiSummaryResult={aiSummaryResult}
                  isGeneratingAI={isGeneratingAI}
                  editedResults={editedResults}
                  aiSummaryResultRef={aiSummaryResultRef}
                  onOpenPromptModal={handleOpenPromptModal}
                  onGenerateAISummary={onGenerateAISummary}
                  onSaveAISummary={onSaveAISummary}
                  onCopyAISummary={onCopyAISummary}
                  onImportSummaryToNotes={onImportSummaryToNotes}
                />
              )
            }
          ]}
        />
      </div>

      <PromptManagerModal
        visible={promptModalVisible}
        systemPrompt={systemPrompt}
        userPrompt={userPrompt}
        onOk={handleApplyPrompts}
        onCancel={handleCancelPromptModal}
      />
    </div>
  );
};
