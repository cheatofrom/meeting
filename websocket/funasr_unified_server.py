#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import json
import websockets
import time
import logging
import tracemalloc
import numpy as np
import argparse
import ssl
import torch
import gc
import os
import tempfile
import traceback
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from funasr import AutoModel
import uvicorn
import threading

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 命令行参数解析
parser = argparse.ArgumentParser()
parser.add_argument(
    "--host", type=str, default="0.0.0.0", required=False, help="host ip, localhost, 0.0.0.0"
)
parser.add_argument("--ws_port", type=int, default=10095, required=False, help="websocket server port")
parser.add_argument("--api_port", type=int, default=10096, required=False, help="fastapi server port")
parser.add_argument(
    "--asr_model",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/models/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-pytorch",
    help="model from modelscope",
)
parser.add_argument("--asr_model_revision", type=str, default="v2.0.4", help="")
parser.add_argument(
    "--asr_model_online",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/models/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online",
    help="model from modelscope",
)
parser.add_argument("--asr_model_online_revision", type=str, default="v2.0.4", help="")
parser.add_argument(
    "--vad_model",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/models/speech_fsmn_vad_zh-cn-16k-common-pytorch",
    help="model from modelscope",
)
parser.add_argument("--vad_model_revision", type=str, default="v2.0.4", help="")
parser.add_argument(
    "--punc_model",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/models/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727",
    help="model from modelscope",
)
parser.add_argument("--punc_model_revision", type=str, default="v2.0.4", help="")
parser.add_argument(
    "--file_model",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/models/speech_paraformer-large-vad-punc-spk_asr_nat-zh-cn",
    help="model for file upload recognition",
)
parser.add_argument("--file_model_revision", type=str, default="v2.0.4", help="")
parser.add_argument("--ngpu", type=int, default=1, help="0 for cpu, 1 for gpu")
parser.add_argument("--device", type=str, default="cuda", help="cuda, cpu")
parser.add_argument("--ncpu", type=int, default=4, help="cpu cores")
parser.add_argument(
    "--certfile",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/ssl_key/server.crt",
    required=False,
    help="certfile for ssl",
)
parser.add_argument(
    "--keyfile",
    type=str,
    default="/home/dell/mnt/ai-work/Meeting/ssl_key/server.key",
    required=False,
    help="keyfile for ssl",
)
args = parser.parse_args()

# 全局变量
websocket_users = set()
model_asr = None
model_asr_streaming = None
model_vad = None
model_punc = None
model_file = None

# FastAPI应用
app = FastAPI(title="FunASR Unified Server", description="统一的语音识别服务")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_models():
    """初始化所有模型"""
    global model_asr, model_asr_streaming, model_vad, model_punc, model_file
    
    try:
        logger.info("正在初始化FunASR模型...")
        
        # WebSocket流式识别模型
        logger.info("加载WebSocket ASR模型...")
        model_asr = AutoModel(
            model=args.asr_model,
            model_revision=args.asr_model_revision,
            ngpu=args.ngpu,
            ncpu=args.ncpu,
            device=args.device,
            disable_pbar=True,
            disable_log=True,
            disable_update=True,
            trust_remote_code=False,
            local_files_only=True,
        )
        
        # 在线流式模型
        logger.info("加载在线流式模型...")
        model_asr_streaming = AutoModel(
            model=args.asr_model_online,
            model_revision=args.asr_model_online_revision,
            ngpu=args.ngpu,
            ncpu=args.ncpu,
            device=args.device,
            disable_pbar=True,
            disable_log=True,
            disable_update=True,
            trust_remote_code=False,
            local_files_only=True,
        )
        
        # VAD模型
        logger.info("加载VAD模型...")
        model_vad = AutoModel(
            model=args.vad_model,
            model_revision=args.vad_model_revision,
            ngpu=args.ngpu,
            ncpu=args.ncpu,
            device=args.device,
            disable_pbar=True,
            disable_log=True,
            disable_update=True,
            trust_remote_code=False,
            local_files_only=True,
        )
        
        # 标点符号模型
        if args.punc_model != "":
            logger.info("加载标点符号模型...")
            model_punc = AutoModel(
                model=args.punc_model,
                model_revision=args.punc_model_revision,
                ngpu=args.ngpu,
                ncpu=args.ncpu,
                device=args.device,
                disable_pbar=True,
                disable_log=True,
                disable_update=True,
                trust_remote_code=False,
                local_files_only=True,
            )
        else:
            model_punc = None
        
        # 文件上传识别模型
        logger.info("加载文件识别模型...")
        model_file = AutoModel(
            model=args.file_model,
            model_revision=args.file_model_revision,
            vad_model="fsmn-vad",
            vad_model_revision="v2.0.4",
            punc_model="ct-punc-c",
            punc_model_revision="v2.0.4",
            spk_model="cam++",
            spk_model_revision="v2.0.2",
            disable_update=True
        )
        
        logger.info("所有模型初始化完成")
        
    except Exception as e:
        logger.error(f"模型初始化失败: {e}")
        logger.error(traceback.format_exc())
        raise e

def get_gpu_memory_info():
    """获取GPU内存信息"""
    try:
        if torch.cuda.is_available():
            total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            allocated_memory = torch.cuda.memory_allocated(0) / (1024**3)
            cached_memory = torch.cuda.memory_reserved(0) / (1024**3)
            free_memory = total_memory - cached_memory
            
            return {
                "total": total_memory,
                "allocated": allocated_memory,
                "cached": cached_memory,
                "free": free_memory
            }
    except Exception as e:
        logger.error(f"获取GPU内存信息失败: {e}")
    return None

def clear_gpu_memory():
    """清理GPU内存"""
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
    except Exception as e:
        logger.error(f"清理GPU内存失败: {e}")

def check_memory_before_processing(audio_size_bytes):
    """处理前检查内存"""
    try:
        audio_size_gb = audio_size_bytes / (1024**3)
        memory_info = get_gpu_memory_info()
        
        if memory_info and memory_info["free"] < audio_size_gb * 2:
            logger.warning(f"GPU内存不足，正在清理缓存...")
            clear_gpu_memory()
            
            memory_info_after = get_gpu_memory_info()
            if memory_info_after and memory_info_after["free"] < audio_size_gb * 1.5:
                logger.warning(f"内存仍然不足，可能影响处理性能")
                return False
        return True
    except Exception as e:
        logger.error(f"内存检查失败: {e}")
        return True

class AudioBuffer:
    """音频缓冲区类"""
    def __init__(self, max_buffer_size_mb=50):
        self.buffer = bytearray()
        self.max_buffer_size = max_buffer_size_mb * 1024 * 1024
        self.processed_size = 0

    def add_chunk(self, chunk):
        """添加音频块"""
        if len(self.buffer) + len(chunk) > self.max_buffer_size:
            overflow_size = len(self.buffer) + len(chunk) - self.max_buffer_size
            self.buffer = self.buffer[overflow_size:]
            self.processed_size += overflow_size
        self.buffer.extend(chunk)

    def get_unprocessed_data(self):
        """获取未处理的数据"""
        return bytes(self.buffer[self.processed_size:])

    def mark_processed(self, size):
        """标记已处理的数据大小"""
        self.processed_size = min(self.processed_size + size, len(self.buffer))

    def clear(self):
        """清空缓冲区"""
        self.buffer.clear()
        self.processed_size = 0

    def get_buffer_size(self):
        """获取缓冲区大小"""
        return len(self.buffer)

def merge_stream_results(stream_results):
    """合并流式识别结果"""
    if not stream_results:
        return ""
    
    merged_text = ""
    for result in stream_results:
        if isinstance(result, dict) and "text" in result:
            merged_text += result["text"]
        elif isinstance(result, str):
            merged_text += result
    
    return merged_text.strip()

async def send_final_result(websocket, text, mode="final"):
    """发送最终结果"""
    try:
        result = {
            "mode": mode,
            "text": text,
            "is_final": True,
            "timestamp": time.time()
        }
        await websocket.send(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        logger.error(f"发送结果失败: {e}")

async def ws_reset(websocket):
    """重置WebSocket状态"""
    try:
        websocket.status_dict_asr = {}
        websocket.status_dict_asr_online = {"cache": {}, "is_final": False}
        websocket.status_dict_vad = {"cache": {}, "is_final": False}
        websocket.status_dict_punc = {"cache": {}}
        websocket.sent_text_length = 0
        if hasattr(websocket, 'audio_buffer'):
            websocket.audio_buffer.clear()
        if hasattr(websocket, 'stream_results'):
            websocket.stream_results.clear()
    except Exception as e:
        logger.error(f"重置WebSocket状态失败: {e}")

async def clear_websocket():
    """清理WebSocket连接"""
    global websocket_users
    websocket_users.clear()

async def async_vad(websocket, audio_in):
    """异步VAD处理"""
    try:
        vad_res = model_vad.generate(input=audio_in, cache=websocket.status_dict_vad["cache"])
        if vad_res is not None and len(vad_res[0]["value"]) > 0:
            return vad_res[0]["value"]
    except Exception as e:
        logger.error(f"VAD处理失败: {e}")
    return []

def split_audio_chunks(audio_data, chunk_size_mb=10):
    """分割音频数据"""
    chunk_size_bytes = chunk_size_mb * 1024 * 1024
    chunks = []
    
    for i in range(0, len(audio_data), chunk_size_bytes):
        chunk = audio_data[i:i + chunk_size_bytes]
        chunks.append(chunk)
    
    return chunks

async def async_asr(websocket, audio_in):
    """异步ASR处理"""
    try:
        audio_size = len(audio_in)
        if not check_memory_before_processing(audio_size):
            logger.warning("内存不足，跳过当前音频块")
            return
        
        # 分块处理大音频文件
        if audio_size > 50 * 1024 * 1024:  # 50MB
            chunks = split_audio_chunks(audio_in, 10)
            for i, chunk in enumerate(chunks):
                try:
                    res = model_asr.generate(
                        input=chunk,
                        cache=websocket.status_dict_asr.get("cache", {}),
                        is_final=i == len(chunks) - 1,
                        hotword=websocket.status_dict_asr.get("hotword", "")
                    )
                    
                    if res is not None and len(res) > 0 and len(res[0]["text"]) > 0:
                        result_text = res[0]["text"]
                        
                        # 存储流式结果
                        if hasattr(websocket, 'stream_results'):
                            websocket.stream_results.append({"text": result_text, "chunk": i})
                        
                        # 发送中间结果
                        await websocket.send(json.dumps({
                            "mode": "2pass",
                            "text": result_text,
                            "is_final": i == len(chunks) - 1,
                            "chunk_index": i,
                            "total_chunks": len(chunks)
                        }, ensure_ascii=False))
                        
                except Exception as e:
                    logger.error(f"处理音频块 {i} 失败: {e}")
        else:
            # 小文件直接处理
            res = model_asr.generate(
                input=audio_in,
                cache=websocket.status_dict_asr.get("cache", {}),
                is_final=True,
                hotword=websocket.status_dict_asr.get("hotword", "")
            )
            
            if res is not None and len(res) > 0 and len(res[0]["text"]) > 0:
                result_text = res[0]["text"]
                
                # 存储结果
                if hasattr(websocket, 'stream_results'):
                    websocket.stream_results.append({"text": result_text})
                
                # 发送结果
                await websocket.send(json.dumps({
                    "mode": "2pass",
                    "text": result_text,
                    "is_final": True
                }, ensure_ascii=False))
                
    except Exception as e:
        logger.error(f"ASR处理失败: {e}")
        await websocket.send(json.dumps({
            "mode": "error",
            "text": f"识别失败: {str(e)}",
            "is_final": True
        }, ensure_ascii=False))

async def async_asr_online(websocket, audio_in):
    """异步在线ASR处理"""
    try:
        res = model_asr_streaming.generate(
            input=audio_in,
            cache=websocket.status_dict_asr_online["cache"],
            is_final=websocket.status_dict_asr_online["is_final"]
        )
        
        if res is not None and len(res) > 0 and len(res[0]["text"]) > 0:
            result_text = res[0]["text"]
            
            # 发送在线结果
            await websocket.send(json.dumps({
                "mode": "online",
                "text": result_text,
                "is_final": websocket.status_dict_asr_online["is_final"]
            }, ensure_ascii=False))
            
    except Exception as e:
        logger.error(f"在线ASR处理失败: {e}")

async def ws_serve(websocket, path):
    """WebSocket服务处理函数"""
    global websocket_users
    websocket_users.add(websocket)
    websocket.status_dict_asr = {}
    websocket.status_dict_asr_online = {"cache": {}, "is_final": False}
    websocket.status_dict_vad = {"cache": {}, "is_final": False}
    websocket.status_dict_punc = {"cache": {}}
    websocket.chunk_interval = 10
    websocket.vad_pre_idx = 0
    websocket.sent_text_length = 0
    websocket.audio_buffer = AudioBuffer(max_buffer_size_mb=100)
    websocket.stream_results = []
    websocket.wav_name = "microphone"
    websocket.mode = "2pass"
    websocket.is_file_upload = False
    
    logger.info("新用户连接到WebSocket")
    
    try:
        async for message in websocket:
            if isinstance(message, str):
                messagejson = json.loads(message)
                
                # 处理各种控制消息
                if "is_speaking" in messagejson:
                    websocket.is_speaking = messagejson["is_speaking"]
                    websocket.status_dict_asr_online["is_final"] = not websocket.is_speaking
                    if websocket.is_speaking:
                        websocket.sent_text_length = 0
                        
                if "chunk_interval" in messagejson:
                    websocket.chunk_interval = messagejson["chunk_interval"]
                    
                if "wav_name" in messagejson:
                    websocket.wav_name = messagejson.get("wav_name")
                    
                if "chunk_size" in messagejson:
                    chunk_size = messagejson["chunk_size"]
                    if isinstance(chunk_size, str):
                        chunk_size = chunk_size.split(",")
                    websocket.status_dict_asr_online["chunk_size"] = [int(x) for x in chunk_size]
                    
                if "hotwords" in messagejson:
                    websocket.status_dict_asr["hotword"] = messagejson["hotwords"]
                    
                if "mode" in messagejson:
                    websocket.mode = messagejson["mode"]
                    
                if "is_file_upload" in messagejson:
                    websocket.is_file_upload = messagejson["is_file_upload"]
                    
                if "upload_complete" in messagejson:
                    # 文件上传完成处理
                    if websocket.is_file_upload and hasattr(websocket, 'audio_buffer'):
                        remaining_data = websocket.audio_buffer.get_unprocessed_data()
                        if remaining_data:
                            await async_asr(websocket, remaining_data)
                        
                        # 发送合并结果
                        if hasattr(websocket, 'stream_results') and websocket.stream_results:
                            final_text = merge_stream_results(websocket.stream_results)
                            if final_text:
                                await send_final_result(websocket, final_text, "final")
                                
            elif isinstance(message, bytes):
                # 处理音频数据
                if websocket.is_file_upload:
                    websocket.audio_buffer.add_chunk(message)
                    
                    # 定期处理缓冲区数据
                    if websocket.audio_buffer.get_buffer_size() > 5 * 1024 * 1024:  # 5MB
                        unprocessed_data = websocket.audio_buffer.get_unprocessed_data()
                        if unprocessed_data:
                            await async_asr(websocket, unprocessed_data)
                            websocket.audio_buffer.mark_processed(len(unprocessed_data))
                else:
                    # 实时流式处理
                    if websocket.mode == "2pass":
                        await async_asr(websocket, message)
                    else:
                        await async_asr_online(websocket, message)
                        
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket连接已关闭")
    except Exception as e:
        logger.error(f"WebSocket处理错误: {e}")
        logger.error(traceback.format_exc())
    finally:
        websocket_users.discard(websocket)
        await ws_reset(websocket)

def process_recognition_result(res):
    """处理文件识别结果，按说话人和时间段合并"""
    if not res or len(res) == 0:
        return []
    
    result_dict = res[0]
    if 'sentence_info' not in result_dict:
        return []
    
    # 初始化变量
    last_spk = None
    last_end_time = 0
    merged_text = ""
    merged_start_time = 0
    results = []
    
    # 遍历句子信息
    for sentence in result_dict['sentence_info']:
        start_sec = sentence.get('start', 0) / 1000  # 毫秒转秒
        end_sec = sentence.get('end', 0) / 1000      # 毫秒转秒
        spk = sentence.get('spk', 0)
        text = sentence.get('text', '')
        
        # 如果当前说话人与上一次相同，且时间连续
        if spk == last_spk and start_sec <= last_end_time + 1:  # 时间差小于1秒认为是连续的
            merged_text += text
            last_end_time = end_sec
        else:
            # 如果不是连续的，保存上一次合并的结果
            if last_spk is not None:
                results.append({
                    'speaker': f'说话人{last_spk}',
                    'start_time': merged_start_time,
                    'end_time': last_end_time,
                    'text': merged_text,
                    'time_range': f"{int(merged_start_time // 60)}:{merged_start_time % 60:04.1f}-{int(last_end_time // 60)}:{last_end_time % 60:04.1f}"
                })
            
            # 更新合并信息
            merged_text = text
            merged_start_time = start_sec
            last_spk = spk
            last_end_time = end_sec
    
    # 保存最后一次合并的结果
    if last_spk is not None:
        results.append({
            'speaker': f'说话人{last_spk}',
            'start_time': merged_start_time,
            'end_time': last_end_time,
            'text': merged_text,
            'time_range': f"{int(merged_start_time // 60)}:{merged_start_time % 60:04.1f}-{int(last_end_time // 60)}:{last_end_time % 60:04.1f}"
        })
    
    return results

# FastAPI路由
@app.post("/api/recognize")
async def recognize_audio(
    audio: UploadFile = File(...),
    batch_size_s: int = Form(300),
    hotword: str = Form("")
):
    """语音识别API接口"""
    try:
        if model_file is None:
            raise HTTPException(status_code=500, detail="文件识别模型未初始化")
        
        # 检查文件
        if not audio.filename:
            raise HTTPException(status_code=400, detail="未选择文件")
        
        # 保存临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            logger.info(f"开始识别音频文件: {audio.filename}")
            
            # 调用模型进行识别
            res = model_file.generate(
                input=temp_file_path,
                batch_size_s=batch_size_s,
                hotword=hotword if hotword else None
            )
            
            # 处理识别结果
            processed_results = process_recognition_result(res)
            
            logger.info(f"识别完成，共识别出 {len(processed_results)} 个语音段")
            
            return {
                'success': True,
                'data': processed_results,
                'total_segments': len(processed_results)
            }
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"识别过程中发生错误: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

@app.get("/api/health")
def health_check():
    """健康检查接口"""
    return {
        'status': 'ok',
        'websocket_model_loaded': model_asr is not None and model_asr_streaming is not None,
        'file_model_loaded': model_file is not None,
        'websocket_users': len(websocket_users)
    }

@app.get("/api/status")
def get_status():
    """获取服务状态"""
    memory_info = get_gpu_memory_info()
    return {
        'websocket_port': args.ws_port,
        'api_port': args.api_port,
        'connected_users': len(websocket_users),
        'gpu_memory': memory_info,
        'models': {
            'asr': model_asr is not None,
            'asr_streaming': model_asr_streaming is not None,
            'vad': model_vad is not None,
            'punc': model_punc is not None,
            'file': model_file is not None
        }
    }

def start_websocket_server():
    """启动WebSocket服务器"""
    try:
        # 为当前线程创建新的事件循环
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        if len(args.certfile) > 0:
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            ssl_cert = args.certfile
            ssl_key = args.keyfile
            ssl_context.load_cert_chain(ssl_cert, keyfile=ssl_key)
            start_server = websockets.serve(
                ws_serve, args.host, args.ws_port, subprotocols=["binary"], ping_interval=None, ssl=ssl_context
            )
        else:
            start_server = websockets.serve(
                ws_serve, args.host, args.ws_port, subprotocols=["binary"], ping_interval=None
            )
        
        loop.run_until_complete(start_server)
        logger.info(f"WebSocket服务器启动在端口 {args.ws_port}")
        loop.run_forever()
        
    except Exception as e:
        logger.error(f"WebSocket服务器启动失败: {e}")
        logger.error(traceback.format_exc())

def start_fastapi_server():
    """启动FastAPI服务器"""
    try:
        logger.info(f"启动FastAPI服务器在端口 {args.api_port}")
        if len(args.certfile) > 0:
            uvicorn.run(
                app, 
                host=args.host, 
                port=args.api_port,
                ssl_keyfile=args.keyfile,
                ssl_certfile=args.certfile
            )
        else:
            uvicorn.run(app, host=args.host, port=args.api_port)
            
    except Exception as e:
        logger.error(f"FastAPI服务器启动失败: {e}")
        logger.error(traceback.format_exc())

if __name__ == '__main__':
    try:
        # 初始化所有模型
        logger.info("开始初始化模型...")
        init_models()
        
        # 显示GPU内存状态
        logger.info("GPU内存状态:")
        memory_info = get_gpu_memory_info()
        if memory_info:
            logger.info(f"总计: {memory_info['total']:.2f}GB, 空闲: {memory_info['free']:.2f}GB")
        
        logger.info("模型加载完成！启动服务器...")
        
        # 在单独的线程中启动WebSocket服务器
        websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
        websocket_thread.start()
        
        # 在主线程中启动FastAPI服务器
        start_fastapi_server()
        
    except KeyboardInterrupt:
        logger.info("服务器被用户中断")
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
        logger.error(traceback.format_exc())