# 🎙️ AI Meeting ASR System

A real-time and offline speech recognition system designed for meeting
transcription, built on **FunASR**.\
It supports streaming ASR, batch transcription, speaker diarization,
punctuation restoration, and hotword boosting.

------------------------------------------------------------------------

## 📋 Table of Contents

-   Features
-   Demo
-   System Architecture
-   Tech Stack
-   Quick Start
-   Docker Deployment
-   Usage Guide
-   Speaker Diarization
-   Performance
-   Project Structure
-   API Reference
-   Configuration
-   Troubleshooting
-   Contribution
-   License
-   Contact

------------------------------------------------------------------------

## 🚀 Features

### Core Capabilities

-   Real-time streaming speech recognition (WebSocket)
-   Offline batch speech recognition (HTTP API)
-   Online / Offline / 2-pass recognition modes
-   Voice Activity Detection (VAD)
-   Automatic punctuation prediction
-   Speaker diarization for multi-speaker meetings
-   Custom hotword boosting
-   Audio file upload and batch processing
-   SSL / WSS secure communication
-   Modern Web UI based on React + TypeScript

### Use Cases

-   Meeting transcription and minutes generation
-   Online education and lecture recording
-   Call center quality inspection
-   Podcast transcription and content editing
-   Accessibility services (real-time captions)

------------------------------------------------------------------------

## 🏗️ System Architecture

    React Frontend  <──WebSocket──>  WSS ASR Server
          │                               │
          └──HTTP API────────────>  Batch ASR API
                                          │
                                     FunASR Models

------------------------------------------------------------------------

## 📦 Tech Stack

### Frontend

-   React 19
-   TypeScript
-   Vite
-   Ant Design
-   WebSocket API

### Backend

-   Python 3.8+
-   asyncio
-   FunASR
-   WebSockets
-   PyTorch

### Models

-   Paraformer (ASR)
-   FSMN-VAD (VAD)
-   CT-Transformer (Punctuation)
-   CAMPPlus (Speaker Diarization)

------------------------------------------------------------------------

## ⚡ Quick Start

### Environment Requirements

-   Python 3.8+
-   Node.js 16+
-   4GB RAM minimum (8GB recommended)
-   Optional CUDA GPU

### Backend Setup

``` bash
cd websocket
pip install -r requirements.txt
pip install -U funasr modelscope
python meet_wss_server.py --port 10095
```

### Frontend Setup

``` bash
cd react-ts-asr
npm install
npm run dev
```

Open your browser at: http://localhost:5173

------------------------------------------------------------------------

## 🐳 Docker Deployment

``` bash
docker-compose up -d
```

------------------------------------------------------------------------

## 🎤 Usage Guide

### Real-time Recognition

1.  Open the frontend UI
2.  Configure the WebSocket server address
3.  Select recognition mode
4.  Click "Start Recording"
5.  View transcription results in real time

### File-based Recognition

1.  Switch to File Mode
2.  Upload audio files (WAV / MP3 / FLAC / AAC)
3.  Enable speaker diarization if needed
4.  Start recognition
5.  Download results as TXT or JSON

------------------------------------------------------------------------

## 👥 Speaker Diarization

-   Automatically detects different speakers
-   Assigns speaker labels (spk0, spk1, ...)
-   Supports up to 10 speakers
-   Speaker labels can be renamed

Example output:

    [spk0]: Hello everyone, let's start the meeting.
    [spk1]: I will report the technical progress.
    [spk0]: Please continue.

------------------------------------------------------------------------

## 📊 Performance

-   Chinese Mandarin accuracy: \>95%
-   English accuracy: \>90%
-   Streaming latency: \~200ms
-   Offline processing speed: \~0.5x realtime
-   GPU acceleration supported

------------------------------------------------------------------------

## 📁 Project Structure

    Meeting/
    ├── react-ts-asr/
    ├── websocket/
    ├── models/
    ├── ssl_key/
    └── test/

------------------------------------------------------------------------

## 📡 API Reference

### WebSocket Endpoint

    ws://localhost:10095/
    wss://localhost:10095/

### Request Example

``` json
{
  "mode": "online",
  "audio_data": "base64...",
  "is_speaking": true
}
```

### Response Example

``` json
{
  "text": "Recognition result",
  "is_final": false,
  "confidence": 0.95
}
```

------------------------------------------------------------------------

## ⚙️ Configuration

### Server Parameters

``` bash
python meet_wss_server.py --port 10095 --ngpu 1 --device cuda
```

### Environment Variables

``` bash
ASR_PORT=10095
ASR_DEVICE=cuda
ASR_NGPU=1
```

------------------------------------------------------------------------

## 🔧 Troubleshooting

-   Connection failed: check port and firewall
-   No audio input: verify microphone permissions
-   Low accuracy: add hotwords and ensure audio quality
-   GPU OOM: reduce batch size or switch to CPU

------------------------------------------------------------------------

## 🤝 Contribution

Contributions are welcome via Issues and Pull Requests.

------------------------------------------------------------------------

## 📄 License

MIT License

------------------------------------------------------------------------

## 📞 Contact

-   Email: 2661517213@qq.com
-   GitHub Issues: https://github.com/cheatofrom/meeting/issues

------------------------------------------------------------------------

⭐ If you find this project useful, please give it a star!
