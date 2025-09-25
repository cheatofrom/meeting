import { useRef, useEffect, useState } from 'react';
import { App } from 'antd';
import { WebSocketService } from '../services/WebSocketService';
import { AudioUtils } from '../utils/AudioUtils';

export const useWebSocketConnection = (defaultServerUrl: string, hotwords: string) => {
  const { message: messageApi } = App.useApp();
  const [serverUrl, setServerUrl] = useState<string>(defaultServerUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recognitionText, setRecognitionText] = useState<string>('');
  const webSocketServiceRef = useRef<WebSocketService | null>(null);
  const sampleBufferRef = useRef<Int16Array>(new Int16Array());

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      if (data.text) {
        const rectxt = data.text;

        if (rectxt.trim().length > 0) {
          setRecognitionText(prev => prev + rectxt);
        }
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };

  const handleConnectionState = (state: number) => {
    switch (state) {
      case 0:
        setIsConnected(true);
        messageApi.success('WebSocket连接成功');
        break;
      case 1:
        setIsConnected(false);
        messageApi.info('WebSocket连接已关闭');
        break;
      case 2:
        setIsConnected(false);
        messageApi.error('WebSocket连接失败');
        break;
      default:
        break;
    }
  };

  const handleAudioProcess = (buffer: Int16Array, _powerLevel: number, _bufferDuration: number, bufferSampleRate: number) => {
    const wsService = webSocketServiceRef.current;
    const wsActuallyConnected = wsService && wsService.isConnected();

    if (!wsActuallyConnected) {
      return;
    }

    let processedBuffer = buffer;
    if (bufferSampleRate !== 16000) {
      processedBuffer = AudioUtils.resampleAudio(buffer, bufferSampleRate, 16000);
    }

    const oldLength = sampleBufferRef.current.length;
    const newBuffer = new Int16Array(oldLength + processedBuffer.length);
    newBuffer.set(sampleBufferRef.current);
    newBuffer.set(processedBuffer, oldLength);
    sampleBufferRef.current = newBuffer;

    const chunk_size = 960;

    while (sampleBufferRef.current.length >= chunk_size) {
      const sendBuf = sampleBufferRef.current.slice(0, chunk_size);
      sampleBufferRef.current = sampleBufferRef.current.slice(chunk_size);

      if (webSocketServiceRef.current) {
        try {
          webSocketServiceRef.current.wsSend(sendBuf);
        } catch (error) {
          console.error('发送音频块失败:', error);
        }
      } else {
        break;
      }
    }
  };

  useEffect(() => {
    webSocketServiceRef.current = new WebSocketService({
      msgHandle: handleWebSocketMessage,
      stateHandle: handleConnectionState,
      hotwords: hotwords,
      mode: '2pass'
    });

    const handleToggleProtocol = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'toggle') {
        if (serverUrl.startsWith('wss://')) {
          setServerUrl(serverUrl.replace('wss://', 'ws://'));
        } else if (serverUrl.startsWith('ws://')) {
          setServerUrl(serverUrl.replace('ws://', 'wss://'));
        }
      }
    };

    const handleRetryConnection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'retry') {
        setTimeout(() => {
          connectWebSocket();
        }, 500);
      }
    };

    document.addEventListener('toggle-ws-protocol', handleToggleProtocol);
    document.addEventListener('retry-connection', handleRetryConnection);

    return () => {
      disconnectWebSocket();
      document.removeEventListener('toggle-ws-protocol', handleToggleProtocol);
      document.removeEventListener('retry-connection', handleRetryConnection);
    };
  }, []);

  useEffect(() => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.updateConfig({
        hotwords: hotwords,
        mode: '2pass'
      });
    }
  }, [hotwords]);

  const connectWebSocket = () => {
    if (!webSocketServiceRef.current) return;
    webSocketServiceRef.current.wsStart(serverUrl);
  };

  const disconnectWebSocket = () => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.wsStop();
      setIsConnected(false);
    }
  };

  const clearRecognitionText = () => {
    setRecognitionText('');
    messageApi.success('已清除识别文本');
  };

  const resetSampleBuffer = () => {
    sampleBufferRef.current = new Int16Array();
  };

  return {
    serverUrl,
    setServerUrl,
    isConnected,
    recognitionText,
    connectWebSocket,
    disconnectWebSocket,
    clearRecognitionText,
    handleAudioProcess,
    resetSampleBuffer,
    webSocketServiceRef
  };
};