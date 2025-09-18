import React, { useState, useRef } from 'react';
import { Button, Upload, Space, Card, Typography, App, Progress, Input, Switch, Radio } from 'antd';
import { UploadOutlined, PlayCircleOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { WebSocketService } from '../services/WebSocketService';
import { FileUploadService } from '../services/FileUploadService';
import { AudioUtils } from '../utils/AudioUtils';
import type { RecordingResult } from '../services/AudioRecorderService';
import '../styles/ASRComponent.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FileUploadProps {
  serverUrl: string;
  isConnected: boolean;
  webSocketService: WebSocketService | null;
  onRecognitionResult: (text: string) => void;
  onFileProcessed: (result: RecordingResult) => void;
  mode?: 'websocket' | 'api'; // 新增模式选择
  apiServerUrl?: string; // API服务器地址
}

interface RecognitionResult {
  speaker: string;
  text: string;
  time_range: string;
  confidence?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  serverUrl,
  isConnected,
  webSocketService,
  onRecognitionResult,
  onFileProcessed,
  mode = 'websocket',
  apiServerUrl = 'https://localhost:10095'
}) => {
  const { message: messageApi } = App.useApp();
  
  // 初始化文件上传服务
  const fileUploadServiceRef = useRef<FileUploadService>(new FileUploadService(apiServerUrl));
  
  // 文件上传相关状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recordedAudio, setRecordedAudio] = useState<RecordingResult | null>(null);
  
  // 识别相关状态
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [recognitionText, setRecognitionText] = useState<string>('');
  const [batchSizeS, setBatchSizeS] = useState<number>(300);
  const [recognitionHotword, setRecognitionHotword] = useState<string>('');
  
  // 配置相关状态
  const [useITN, setUseITN] = useState<boolean>(true);
  const [asrMode, setAsrMode] = useState<string>('2pass');
  
  // 编辑相关状态
  const [editedResults, setEditedResults] = useState<RecognitionResult[]>([]);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingText, setEditingText] = useState<string>('');
  
  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (mode === 'api') {
      // HTTP API模式
      return await handleApiFileUpload(file);
    } else {
      // WebSocket模式
      return await handleWebSocketFileUpload(file);
    }
  };

  // HTTP API模式文件上传
  const handleApiFileUpload = async (file: File) => {
    // 验证文件
    const validation = FileUploadService.validateAudioFile(file);
    if (!validation.valid) {
      messageApi.error(validation.error);
      return false;
    }

    try {
      setIsRecognizing(true);
      setRecognitionResults([]);
      setRecognitionText('');

      // 调用HTTP API进行识别
      const result = await fileUploadServiceRef.current.uploadAndRecognize(file, {
        batch_size_s: batchSizeS,
        hotword: recognitionHotword
      });

      if (result.success && result.data) {
        // 处理识别结果
        const results: RecognitionResult[] = result.data.map((item, index) => ({
          speaker: `说话人${index + 1}`,
          text: item.text,
          time_range: item.start_time && item.end_time 
            ? `${item.start_time.toFixed(1)}s - ${item.end_time.toFixed(1)}s`
            : '未知时间',
          confidence: item.confidence
        }));

        setRecognitionResults(results);
        setEditedResults([...results]);
        
        const fullText = results.map(r => r.text).join('');
        setRecognitionText(fullText);
        onRecognitionResult(fullText);

        messageApi.success(`识别完成！共识别出 ${result.total_segments || results.length} 个语音段`);
      } else {
        messageApi.error(result.error || '识别失败');
      }
    } catch (error) {
      console.error('API识别失败:', error);
      messageApi.error('识别失败，请检查服务器连接');
    } finally {
      setIsRecognizing(false);
    }

    return false;
  };

  // WebSocket模式文件上传
  const handleWebSocketFileUpload = async (file: File) => {
    // 检查连接状态
    if (!isConnected) {
      messageApi.error('请先连接WebSocket服务器');
      return false;
    }
    
    // 检查文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['wav', 'mp3', 'pcm'].includes(fileExt)) {
      messageApi.error('仅支持WAV、MP3或PCM格式的音频文件');
      return false;
    }
    
    try {
      // 读取文件
      const arrayBuffer = await file.arrayBuffer();
      
      // 处理不同格式的文件
      let pcmData: Int16Array;
      let sampleRate = 16000;
      
      if (fileExt === 'wav') {
        const result = AudioUtils.wavToPcm(arrayBuffer);
        pcmData = result.pcmData;
        sampleRate = result.sampleRate;
      } else if (fileExt === 'pcm') {
        pcmData = new Int16Array(arrayBuffer);
      } else {
        // MP3需要先解码，这里简化处理
        messageApi.error('暂不支持MP3格式，请上传WAV或PCM格式的文件');
        return false;
      }
      
      // 重采样到16kHz
      if (sampleRate !== 16000) {
        pcmData = AudioUtils.resampleAudio(pcmData, sampleRate, 16000);
      }
      
      // 处理上传的文件
      await processUploadedFile(file, pcmData);
    } catch (error) {
      console.error('处理文件失败:', error);
      messageApi.error('处理文件失败');
    }
    
    return false; // 阻止默认上传行为
  };
  
  // 处理已上传的文件
  const processUploadedFile = async (file: File, pcmData: Int16Array) => {
    try {
      console.log('📁 处理上传的音频文件:', {
        fileName: file.name,
        fileSize: file.size,
        pcmDataLength: pcmData.length,
        duration: (pcmData.length / 16000).toFixed(2) + '秒'
      });
      
      // 创建音频Blob用于播放和保存
      const wavBlob = createWavBlob(pcmData, 16000);
      
      // 创建录音结果对象
      const uploadResult: RecordingResult = {
        audioData: pcmData,
        blob: wavBlob,
        duration: pcmData.length / 16000,
        sampleRate: 16000
      };
      
      // 保存上传的音频数据
      setRecordedAudio(uploadResult);
      setUploadedFile(file);
      
      // 创建音频URL用于播放
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const newAudioUrl = URL.createObjectURL(wavBlob);
      setAudioUrl(newAudioUrl);
      
      console.log('✅ 音频文件已保存，可以播放和下载');
      messageApi.success(`音频文件上传成功！时长: ${uploadResult.duration.toFixed(1)}秒`);
      
      // 通知父组件
      onFileProcessed(uploadResult);
      
    } catch (error) {
      console.error('处理文件失败:', error);
      messageApi.error('处理文件失败');
    }
  };
  
  // 创建WAV格式的Blob
  const createWavBlob = (audioData: Int16Array, sampleRate: number): Blob => {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      view.setInt16(offset, audioData[i], true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };
  
  // 开始批量识别
  const startBatchRecognition = async () => {
    if (!recordedAudio || !webSocketService || !isConnected) {
      messageApi.error('请先上传音频文件并确保连接正常');
      return;
    }
    
    setIsRecognizing(true);
    setRecognitionResults([]);
    setRecognitionText('');
    
    try {
      // 发送批量识别请求
      const request = {
        chunk_size: [5, 10, 5],
        wav_name: uploadedFile?.name || 'uploaded_file',
        is_speaking: false,
        chunk_interval: batchSizeS,
        itn: useITN,
        mode: asrMode,
        wav_format: 'pcm',
        audio_fs: 16000,
        hotwords: recognitionHotword ? recognitionHotword.split(' ').filter(w => w.trim()) : []
      };
      
      webSocketService.sendInitialRequest(request);
      
      // 分块发送音频数据
      const chunkSize = 16000 * 2; // 2秒的数据
      const audioData = recordedAudio.audioData;
      
      for (let i = 0; i < audioData.length; i += chunkSize) {
        const chunk = audioData.slice(i, i + chunkSize);
        webSocketService.wsSend(chunk);
        
        // 添加延迟避免发送过快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      messageApi.success('批量识别已开始');
    } catch (error) {
      console.error('批量识别失败:', error);
      messageApi.error('批量识别失败');
      setIsRecognizing(false);
    }
  };
  
  // 停止识别
  const stopRecognition = () => {
    setIsRecognizing(false);
    messageApi.info('已停止识别');
  };
  
  // 清除文件和结果
  const clearAll = () => {
    setUploadedFile(null);
    setRecordedAudio(null);
    setRecognitionResults([]);
    setRecognitionText('');
    setEditedResults([]);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    
    messageApi.success('已清除所有数据');
  };
  
  // 保存结果到文件
  const saveResultsToFile = (format: 'txt' | 'json') => {
    const results = editedResults.length > 0 ? editedResults : recognitionResults;
    
    if (results.length === 0) {
      messageApi.warning('没有识别结果可保存');
      return;
    }
    
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = results.map((result, index) => 
        `[${index + 1}] ${result.speaker} (${result.time_range}): ${result.text}`
      ).join('\n');
      filename = `transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify({
        timestamp: new Date().toISOString(),
        total_segments: results.length,
        results: results
      }, null, 2);
      filename = `transcript_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
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
  
  return (
    <div className="file-upload">
      <Card title="文件上传识别" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 配置面板 */}
          <div className="config-panel">
            <Space wrap>
              <div>
                <Text strong>识别模式：</Text>
                <Radio.Group 
                  value={asrMode} 
                  onChange={(e) => setAsrMode(e.target.value)}
                  disabled={isRecognizing}
                >
                  <Radio value="offline">离线模式</Radio>
                  <Radio value="2pass">2Pass模式</Radio>
                </Radio.Group>
              </div>
              
              <div>
                <Text strong>逆文本标准化：</Text>
                <Switch 
                  checked={useITN} 
                  onChange={setUseITN}
                  disabled={isRecognizing}
                />
              </div>
              
              <div>
                <Text strong>批量大小(秒)：</Text>
                <Input 
                  type="number"
                  value={batchSizeS}
                  onChange={(e) => setBatchSizeS(Number(e.target.value))}
                  disabled={isRecognizing}
                  style={{ width: '80px', marginLeft: '8px' }}
                  min={60}
                  max={600}
                />
              </div>
            </Space>
            
            <div style={{ marginTop: '8px' }}>
              <Text strong>热词（用空格分隔）：</Text>
              <Input 
                value={recognitionHotword}
                onChange={(e) => setRecognitionHotword(e.target.value)}
                placeholder="输入热词，用空格分隔"
                disabled={isRecognizing}
                style={{ marginTop: '4px' }}
              />
            </div>
          </div>
          
          {/* 文件上传面板 */}
          <div className="upload-panel">
            <Space>
              <Upload 
                beforeUpload={handleFileUpload} 
                showUploadList={false}
                disabled={!isConnected || isRecognizing}
                accept=".wav,.mp3,.pcm"
              >
                <Button 
                  icon={<UploadOutlined />} 
                  disabled={!isConnected || isRecognizing}
                  size="large"
                >
                  选择音频文件
                </Button>
              </Upload>
              
              {uploadedFile && (
                <Text type="secondary">
                  已上传: {uploadedFile.name}
                </Text>
              )}
            </Space>
          </div>
          
          {/* 音频播放面板 */}
          {audioUrl && (
            <div className="audio-panel">
              <Title level={5}>音频播放</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <audio 
                  controls 
                  src={audioUrl} 
                  style={{ width: '100%' }}
                  preload="metadata"
                >
                  您的浏览器不支持音频播放
                </audio>
                
                {recordedAudio && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    音频信息: 时长 {recordedAudio.duration.toFixed(1)}秒 | 
                    采样率 {recordedAudio.sampleRate}Hz | 
                    数据长度 {recordedAudio.audioData.length} samples
                  </div>
                )}
              </Space>
            </div>
          )}
          
          {/* 控制按钮 */}
          <div className="control-panel">
            <Space>
              <Button 
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={isRecognizing ? stopRecognition : startBatchRecognition}
                disabled={!isConnected || !recordedAudio}
                size="large"
              >
                {isRecognizing ? '停止识别' : '开始批量识别'}
              </Button>
              
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => saveResultsToFile('txt')}
                disabled={recognitionResults.length === 0}
              >
                保存为TXT
              </Button>
              
              <Button 
                onClick={() => saveResultsToFile('json')}
                disabled={recognitionResults.length === 0}
              >
                保存为JSON
              </Button>
              
              <Button 
                icon={<DeleteOutlined />}
                onClick={clearAll}
                danger
              >
                清除全部
              </Button>
            </Space>
          </div>
          
          {/* 识别结果显示 */}
          <div className="result-panel">
            <Title level={5}>识别结果</Title>
            <TextArea 
              value={recognitionText} 
              autoSize={{ minRows: 6, maxRows: 12 }} 
              readOnly 
              placeholder={
                !recordedAudio 
                  ? "请先上传音频文件" 
                  : isRecognizing 
                    ? "正在进行批量识别，结果将在这里显示..." 
                    : "点击开始批量识别按钮进行语音识别"
              }
            />
          </div>
          
          {/* 详细识别结果 */}
          {recognitionResults.length > 0 && (
            <div className="detailed-results">
              <Title level={5}>详细识别结果 ({recognitionResults.length} 条)</Title>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {recognitionResults.map((result, index) => (
                  <Card 
                    key={index} 
                    size="small" 
                    style={{ marginBottom: '8px' }}
                    title={`${result.speaker} (${result.time_range})`}
                  >
                    <Text>{result.text}</Text>
                    {result.confidence && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        置信度: {(result.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* 识别状态指示 */}
          {isRecognizing && (
            <div style={{ 
              textAlign: 'center', 
              color: '#1890ff',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              🔄 正在进行批量识别...
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default FileUpload;