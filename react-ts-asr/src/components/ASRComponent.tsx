import React, { useState, useEffect } from 'react';
import { Card, Typography } from 'antd';
import { useWebSocketConnection } from '../hooks/useWebSocketConnection';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { useFileUpload } from '../hooks/useFileUpload';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useSpeakerManagement } from '../hooks/useSpeakerManagement';
import { useAISummary } from '../hooks/useAISummary';
import { useFileExport } from '../hooks/useFileExport';
import { useResizablePanels } from '../hooks/useResizablePanels';
import { ControlPanelSection } from './sections/ControlPanelSection';
import { ResultPanelSection } from './sections/ResultPanelSection';
import { AudioPlayerSection } from './sections/AudioPlayerSection';
import { RecognitionControlSection } from './sections/RecognitionControlSection';
import { RecognitionResultsSection } from './sections/RecognitionResultsSection';
import { SpeakerReplaceModal } from './sections/SpeakerReplaceModal';
import { AISummaryPanel } from './sections/AISummaryPanel';
import '../styles/ASRComponent.css';

const { Title } = Typography;

interface ASRComponentProps {
  defaultServerUrl?: string;
}

const ASRComponent: React.FC<ASRComponentProps> = ({
  defaultServerUrl = 'wss://192.168.1.66:10095/'
}) => {
  const [useITN, setUseITN] = useState<boolean>(true);
  const [hotwords, setHotwords] = useState<string>('');

  const wsConnection = useWebSocketConnection(defaultServerUrl, hotwords);

  const audioRecording = useAudioRecording(wsConnection.handleAudioProcess);

  const fileUpload = useFileUpload();

  const voiceRecognition = useVoiceRecognition();

  const speakerManagement = useSpeakerManagement();

  const aiSummary = useAISummary();

  const fileExport = useFileExport();

  const { leftWidth, rightWidth, isDragging, containerRef, handleMouseDown } = useResizablePanels(65);

  useEffect(() => {
    audioRecording.initRecorder();

    return () => {
      wsConnection.disconnectWebSocket();
      if (audioRecording.audioUrl) {
        URL.revokeObjectURL(audioRecording.audioUrl);
      }
    };
  }, []);

  const handleStartRecording = async () => {
    wsConnection.resetSampleBuffer();
    await audioRecording.startRecording(wsConnection.isConnected);
  };

  const handleFileUpload = (file: File) => {
    return fileUpload.handleFileUpload(
      file,
      wsConnection.isConnected,
      audioRecording.audioUrl,
      audioRecording.setRecordedAudio,
      audioRecording.setAudioUrl
    );
  };

  return (
    <div className={`asr-container ${aiSummary.showAISummary ? 'show-summary' : ''} ${isDragging ? 'dragging' : ''}`} ref={containerRef}>
      <div className="main-content" style={{ width: `${leftWidth}%` }}>
        <Card className="asr-card">
          <Title level={2}>AI会议纪要</Title>

          <ControlPanelSection
            useITN={useITN}
            setUseITN={setUseITN}
            hotwords={hotwords}
            setHotwords={setHotwords}
            isConnected={wsConnection.isConnected}
            isRecording={audioRecording.isRecording}
            onConnect={wsConnection.connectWebSocket}
            onDisconnect={wsConnection.disconnectWebSocket}
            onStartRecording={handleStartRecording}
            onStopRecording={audioRecording.stopRecording}
            onFileUpload={handleFileUpload}
            onClearText={wsConnection.clearRecognitionText}
          />

          <ResultPanelSection
            recognitionText={wsConnection.recognitionText}
          />

          <AudioPlayerSection
            audioUrl={audioRecording.audioUrl}
            recordedAudio={audioRecording.recordedAudio}
            onDownload={() => fileExport.downloadAudio(audioRecording.audioUrl)}
            onClear={audioRecording.clearAudio}
          />

          <RecognitionControlSection
            audioUrl={audioRecording.audioUrl}
            batchSizeS={voiceRecognition.batchSizeS}
            setBatchSizeS={voiceRecognition.setBatchSizeS}
            recognitionHotword={voiceRecognition.recognitionHotword}
            setRecognitionHotword={voiceRecognition.setRecognitionHotword}
            isRecognizing={voiceRecognition.isRecognizing}
            recordedAudio={audioRecording.recordedAudio}
            onRecognize={() => voiceRecognition.handleRecognizeAudio(audioRecording.recordedAudio)}
          />

          <RecognitionResultsSection
            editedResults={voiceRecognition.editedResults}
            editingIndex={voiceRecognition.editingIndex}
            editingText={voiceRecognition.editingText}
            setEditingText={voiceRecognition.setEditingText}
            onStartEdit={voiceRecognition.startEditText}
            onSaveEdit={voiceRecognition.saveEditText}
            onCancelEdit={voiceRecognition.cancelEdit}
            onAISummary={aiSummary.handleAISummary}
            onExportTxt={() => fileExport.saveResultsToFile(voiceRecognition.editedResults, 'txt')}
            onExportJson={() => fileExport.saveResultsToFile(voiceRecognition.editedResults, 'json')}
            onSpeakerClick={speakerManagement.openSpeakerReplace}
            onCopyResults={() => fileExport.copyResults(voiceRecognition.editedResults)}
            onClearResults={voiceRecognition.clearResults}
          />

          <SpeakerReplaceModal
            visible={speakerManagement.speakerReplaceVisible}
            currentSpeaker={speakerManagement.currentSpeaker}
            newSpeakerName={speakerManagement.newSpeakerName}
            setNewSpeakerName={speakerManagement.setNewSpeakerName}
            onOk={() => speakerManagement.handleSpeakerReplace(voiceRecognition.editedResults, voiceRecognition.setEditedResults)}
            onCancel={speakerManagement.closeSpeakerReplace}
          />
        </Card>
      </div>

      {aiSummary.showAISummary && (
        <>
          <div
            className="resizer"
            onMouseDown={handleMouseDown}
          />
          <div className="ai-summary-panel" style={{ width: `${rightWidth}%` }}>
            <AISummaryPanel
              activeTab={aiSummary.activeTab}
              setActiveTab={aiSummary.setActiveTab}
              notes={aiSummary.notes}
              setNotes={aiSummary.setNotes}
              aiModel={aiSummary.aiModel}
              setAiModel={aiSummary.setAiModel}
              systemPrompt={aiSummary.systemPrompt}
              setSystemPrompt={aiSummary.setSystemPrompt}
              userPrompt={aiSummary.userPrompt}
              setUserPrompt={aiSummary.setUserPrompt}
              aiSummaryResult={aiSummary.aiSummaryResult}
              isGeneratingAI={aiSummary.isGeneratingAI}
              availableModels={aiSummary.availableModels}
              editedResults={voiceRecognition.editedResults}
              aiSummaryResultRef={aiSummary.aiSummaryResultRef as React.RefObject<HTMLDivElement>}
              onClose={() => aiSummary.setShowAISummary(false)}
              onSaveNotes={aiSummary.saveNotes}
              onGenerateAISummary={() => aiSummary.generateAISummary(voiceRecognition.editedResults)}
              onSaveAISummary={aiSummary.saveAISummary}
              onCopyAISummary={aiSummary.copyAISummary}
              onImportSummaryToNotes={aiSummary.importSummaryToNotes}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ASRComponent;
