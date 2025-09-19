# FunASR 统一服务器

这是一个整合了WebSocket流式识别和FastAPI文件上传识别功能的统一服务器。

## 功能特性

### WebSocket 流式识别 (端口 10095)
- 实时语音识别
- 2pass模式识别
- 在线流式识别
- 支持热词
- 支持文件上传流式处理

### FastAPI 文件识别 (端口 10096)
- 文件上传识别
- 说话人分离
- 时间戳标注
- 批量处理
- RESTful API接口

## 启动方式


### 方式1：直接运行Python文件
```bash
python funasr_unified_server.py
```

### 方式2：自定义参数
```bash
python funasr_unified_server.py \
    --host 0.0.0.0 \
    --ws_port 10095 \
    --api_port 10096 \
    --ngpu 1 \
    --device cuda
```

## 命令行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| --host | 0.0.0.0 | 服务器主机地址 |
| --ws_port | 10095 | WebSocket服务端口 |
| --api_port | 10096 | FastAPI服务端口 |
| --asr_model | ... | ASR模型路径 |
| --asr_model_online | ... | 在线ASR模型路径 |
| --vad_model | ... | VAD模型路径 |
| --punc_model | ... | 标点符号模型路径 |
| --file_model | ... | 文件识别模型路径 |
| --ngpu | 1 | GPU数量 |
| --device | cuda | 设备类型 |
| --ncpu | 4 | CPU核心数 |
| --certfile | ... | SSL证书文件 |
| --keyfile | ... | SSL密钥文件 |

## API接口

### 健康检查
```
GET /api/health
```

### 服务状态
```
GET /api/status
```

### 文件识别
```
POST /api/recognize
Content-Type: multipart/form-data

参数:
- audio: 音频文件
- batch_size_s: 批处理大小(秒)
- hotword: 热词
```

## WebSocket协议

### 连接地址
```
wss://localhost:10095
```

### 消息格式

#### 控制消息 (JSON字符串)
```json
{
    "is_speaking": true,
    "hotwords": "热词",
    "mode": "2pass",
    "is_file_upload": false,
    "upload_complete": false
}
```

#### 音频数据 (二进制)
直接发送音频字节数据

#### 识别结果 (JSON字符串)
```json
{
    "mode": "2pass",
    "text": "识别结果",
    "is_final": true,
    "timestamp": 1234567890
}
```

## 模型要求

服务器需要以下模型：
1. ASR模型 (2pass识别)
2. 在线ASR模型 (流式识别)
3. VAD模型 (语音活动检测)
4. 标点符号模型
5. 文件识别模型 (包含说话人分离)

## 内存管理

- 自动GPU内存监控
- 大文件分块处理
- 内存不足时自动清理缓存
- 音频缓冲区管理

## 错误处理

- 模型加载失败检测
- WebSocket连接异常处理
- 文件上传错误处理
- GPU内存不足处理

## 日志

服务器会输出详细的日志信息，包括：
- 模型加载状态
- 连接状态
- 识别进度
- 错误信息
- GPU内存使用情况

## 注意事项

1. 确保所有模型文件存在且路径正确
2. 确保有足够的GPU内存
3. SSL证书文件需要正确配置
4. 防火墙需要开放相应端口
5. 建议使用HTTPS/WSS协议