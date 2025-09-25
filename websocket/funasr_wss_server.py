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


parser = argparse.ArgumentParser()
parser.add_argument(
    "--host", type=str, default="0.0.0.0", required=False, help="host ip, localhost, 0.0.0.0"
)
parser.add_argument("--port", type=int, default=10095, required=False, help="grpc server port")
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


websocket_users = set()

print("model loading")
from funasr import AutoModel

# asr
model_asr = AutoModel(
    model=args.asr_model,
    model_revision=args.asr_model_revision,
    ngpu=args.ngpu,
    ncpu=args.ncpu,
    device=args.device,
    disable_pbar=True,
    disable_log=True,
    disable_update=True,  # 禁用版本检查以减少警告
    trust_remote_code=False,  # 设为False以避免远程代码警告
    local_files_only=True,
)
# asr
model_asr_streaming = AutoModel(
    model=args.asr_model_online,
    model_revision=args.asr_model_online_revision,
    ngpu=args.ngpu,
    ncpu=args.ncpu,
    device=args.device,
    disable_pbar=True,
    disable_log=True,
    disable_update=True,  # 禁用版本检查以减少警告
    trust_remote_code=False,  # 设为False以避免远程代码警告
    local_files_only=True,
)
# vad
model_vad = AutoModel(
    model=args.vad_model,
    model_revision=args.vad_model_revision,
    ngpu=args.ngpu,
    ncpu=args.ncpu,
    device=args.device,
    disable_pbar=True,
    disable_log=True,
    disable_update=True,  # 禁用版本检查以减少警告
    trust_remote_code=False,  # 设为False以避免远程代码警告
    local_files_only=True,
)

if args.punc_model != "":
    model_punc = AutoModel(
        model=args.punc_model,
        model_revision=args.punc_model_revision,
        ngpu=args.ngpu,
        ncpu=args.ncpu,
        device=args.device,
        disable_pbar=True,
        disable_log=True,
        disable_update=True,  # 禁用版本检查以减少警告
        trust_remote_code=False,  # 设为False以避免远程代码警告
        local_files_only=True,
    )
else:
    model_punc = None


def get_gpu_memory_info():
    """
    获取GPU显存使用情况
    """
    if torch.cuda.is_available():
        device = torch.cuda.current_device()
        total_memory = torch.cuda.get_device_properties(device).total_memory / (1024**3)  # GB
        allocated_memory = torch.cuda.memory_allocated(device) / (1024**3)  # GB
        cached_memory = torch.cuda.memory_reserved(device) / (1024**3)  # GB
        free_memory = total_memory - cached_memory
        
        return {
            "total": total_memory,
            "allocated": allocated_memory,
            "cached": cached_memory,
            "free": free_memory
        }
    return None

def clear_gpu_memory():
    """
    清理GPU显存
    """
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()
        print("GPU memory cleared")

def check_memory_before_processing(audio_size_bytes):
    """
    在处理前检查显存是否足够
    """
    memory_info = get_gpu_memory_info()
    if memory_info:
        print(f"GPU Memory - Total: {memory_info['total']:.2f}GB, Free: {memory_info['free']:.2f}GB, Allocated: {memory_info['allocated']:.2f}GB")
        
        # 估算需要的显存（经验值：音频大小的3-5倍）
        estimated_memory_gb = (audio_size_bytes * 4) / (1024**3)
        
        if memory_info['free'] < estimated_memory_gb:
            print(f"Warning: Insufficient GPU memory. Need ~{estimated_memory_gb:.2f}GB, but only {memory_info['free']:.2f}GB available")
            clear_gpu_memory()
            # 重新检查
            memory_info = get_gpu_memory_info()
            print(f"After cleanup - Free: {memory_info['free']:.2f}GB")
            return memory_info['free'] >= estimated_memory_gb
        return True
    return True


class AudioBuffer:
    """
    音频缓冲区管理类，用于流式音频处理
    """
    def __init__(self, max_buffer_size_mb=50):
        self.buffer = b""
        self.max_buffer_size = max_buffer_size_mb * 1024 * 1024  # 转换为字节
        self.processed_size = 0
        
    def add_chunk(self, chunk):
        """添加音频块到缓冲区"""
        self.buffer += chunk
        
        # 如果缓冲区过大，清理已处理的部分
        if len(self.buffer) > self.max_buffer_size:
            self.buffer = self.buffer[self.processed_size:]
            self.processed_size = 0
            
    def get_unprocessed_data(self):
        """获取未处理的音频数据"""
        if not self.buffer:
            return b""
        return self.buffer[self.processed_size:]
        
    def mark_processed(self, size):
        """标记已处理的数据大小"""
        self.processed_size += size
        
    def clear(self):
        """清空缓冲区"""
        self.buffer = b""
        self.processed_size = 0
        
    def get_buffer_size(self):
        """获取缓冲区大小"""
        return len(self.buffer)
    
    def is_likely_active(self):
        """判断音频缓冲区是否可能包含活动语音"""
        if len(self.buffer) < 320:  # 至少需要20ms的音频数据 (16kHz * 0.02s = 320 samples)
            return False
            
        # 检查音频数据是否全为零
        audio_array = np.frombuffer(self.buffer, dtype=np.int16)
        if np.all(audio_array == 0):
            return False
            
        # 简单的能量检测
        energy = np.mean(np.abs(audio_array))
        return energy > 100  # 设置一个较低的能量阈值


def merge_stream_results(stream_results):
    """
    合并流式识别结果，去重并生成完整文本
    """
    if not stream_results:
        return ""
    
    # 提取所有文本片段
    texts = []
    for result in stream_results:
        if result and "text" in result and result["text"]:
            texts.append(result["text"].strip())
    
    # 简单去重和合并
    merged_text = "".join(texts)
    return merged_text


async def send_final_result(websocket, text, mode="final"):
    """
    发送最终识别结果
    """
    try:
        message = json.dumps({
            "mode": mode,
            "text": text,
            "wav_name": websocket.wav_name,
            "is_final": True,
            "timestamp": time.time()
        })
        await websocket.send(message)
        print(f"Final result sent: {text[:100]}..." if len(text) > 100 else f"Final result sent: {text}")
    except Exception as e:
        print(f"Failed to send final result: {str(e)}")

print("model loaded! only support one client at the same time now!!!!")
print("GPU Memory Status:")
memory_info = get_gpu_memory_info()
if memory_info:
    print(f"Total: {memory_info['total']:.2f}GB, Free: {memory_info['free']:.2f}GB")


async def ws_reset(websocket):
    """重置WebSocket连接状态"""
    print("ws reset now, total num is ", len(websocket_users))

    websocket.status_dict_asr_online["cache"] = {}
    websocket.status_dict_asr_online["is_final"] = True
    websocket.status_dict_vad["cache"] = {}
    websocket.status_dict_vad["is_final"] = True
    websocket.status_dict_punc["cache"] = {}

    await websocket.close()


async def clear_websocket():
    for websocket in websocket_users:
        await ws_reset(websocket)
    websocket_users.clear()


async def ws_serve(websocket, path):
    frames = []
    frames_asr = []
    frames_asr_online = []
    global websocket_users
    # await clear_websocket()
    websocket_users.add(websocket)
    websocket.status_dict_asr = {}
    websocket.status_dict_asr_online = {"cache": {}, "is_final": False}
    websocket.status_dict_vad = {"cache": {}, "is_final": False}
    websocket.status_dict_punc = {"cache": {}}
    websocket.chunk_interval = 10
    websocket.vad_pre_idx = 0
    websocket.sent_text_length = 0  # 初始化已发送文本长度计数器
    websocket.audio_buffer = AudioBuffer(max_buffer_size_mb=100)  # 添加音频缓冲区
    websocket.stream_results = []  # 存储流式识别结果
    speech_start = False
    speech_end_i = -1
    websocket.wav_name = "microphone"
    websocket.mode = "2pass"
    websocket.is_file_upload = False  # 添加文件上传标识
    print("new user connected", flush=True)

    try:
        async for message in websocket:
            if isinstance(message, str):
                messagejson = json.loads(message)

                if "is_speaking" in messagejson:
                    websocket.is_speaking = messagejson["is_speaking"]
                    websocket.status_dict_asr_online["is_final"] = not websocket.is_speaking
                    # 当用户开始说话时，重置已发送文本长度计数器
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
                if "encoder_chunk_look_back" in messagejson:
                    websocket.status_dict_asr_online["encoder_chunk_look_back"] = messagejson[
                        "encoder_chunk_look_back"
                    ]
                if "decoder_chunk_look_back" in messagejson:
                    websocket.status_dict_asr_online["decoder_chunk_look_back"] = messagejson[
                        "decoder_chunk_look_back"
                    ]
                if "hotwords" in messagejson:
                    websocket.status_dict_asr["hotword"] = messagejson["hotwords"]
                if "mode" in messagejson:
                    websocket.mode = messagejson["mode"]
                if "is_file_upload" in messagejson:
                    websocket.is_file_upload = messagejson["is_file_upload"]
                if "upload_complete" in messagejson:
                    # 文件上传完成，立即处理剩余的音频数据
                    if websocket.is_file_upload and hasattr(websocket, 'audio_buffer'):
                        remaining_data = websocket.audio_buffer.get_unprocessed_data()
                        if remaining_data:
                            # 处理剩余的音频数据进行最终识别
                            try:
                                await async_asr(websocket, remaining_data)
                            except Exception as e:
                                print(f"Error processing remaining audio: {str(e)}")
                        
                        # 发送合并后的完整转录结果
                        if hasattr(websocket, 'stream_results') and websocket.stream_results:
                            final_text = merge_stream_results(websocket.stream_results)
                            if final_text:
                                try:
                                    await send_final_result(websocket, final_text, "upload-complete")
                                except Exception as e:
                                    print(f"Error sending final result: {str(e)}")
                        
                        # 清理缓冲区
                        websocket.audio_buffer.clear()
                        websocket.stream_results = []

            websocket.status_dict_vad["chunk_size"] = int(
                websocket.status_dict_asr_online["chunk_size"][1] * 60 / websocket.chunk_interval
            )
            if len(frames_asr_online) > 0 or len(frames_asr) >= 0 or not isinstance(message, str):
                if not isinstance(message, str):
                    frames.append(message)
                    duration_ms = len(message) // 32
                    websocket.vad_pre_idx += duration_ms
                    
                    # 将音频数据添加到缓冲区
                    websocket.audio_buffer.add_chunk(message)
                    
                    # 检查缓冲区大小，如果过大则进行显存清理
                    if websocket.audio_buffer.get_buffer_size() > 50 * 1024 * 1024:  # 50MB
                        clear_gpu_memory()

                    # asr online - 流式识别处理
                    frames_asr_online.append(message)
                    websocket.status_dict_asr_online["is_final"] = speech_end_i != -1
                    
                    # 流式处理：无论是否文件上传，都进行实时识别
                    if (
                        len(frames_asr_online) % websocket.chunk_interval == 0
                        or websocket.status_dict_asr_online["is_final"]
                    ):
                        if websocket.mode == "2pass" or websocket.mode == "online":
                            audio_in = b"".join(frames_asr_online)
                            try:
                                result = await async_asr_online(websocket, audio_in)
                                # 存储流式识别结果
                                if result and websocket.is_file_upload:
                                    websocket.stream_results.append(result)
                            except Exception as e:
                                print(f"error in asr streaming: {str(e)}")
                        frames_asr_online = []
                    
                    # 文件上传模式下，同时收集音频数据用于最终的离线识别
                    if websocket.is_file_upload:
                        frames_asr.append(message)
                        # 标记音频数据已被处理用于离线识别
                        websocket.audio_buffer.mark_processed(len(message))
                    # vad online - 文件上传模式下也启用VAD检测以实现更好的流式处理
                    if speech_start:
                        frames_asr.append(message)
                    try:
                        speech_start_i, speech_end_i = await async_vad(websocket, message)
                    except:
                        print("error in vad")
                    if speech_start_i != -1:
                        speech_start = True
                        beg_bias = (websocket.vad_pre_idx - speech_start_i) // duration_ms
                        frames_pre = frames[-beg_bias:]
                        frames_asr = []
                        frames_asr.extend(frames_pre)
                # asr punc offline
                if speech_end_i != -1 or not websocket.is_speaking:
                    # print("vad end point")
                    if websocket.mode == "2pass" or websocket.mode == "offline":
                        audio_in = b"".join(frames_asr)
                        try:
                            await async_asr(websocket, audio_in)
                        except Exception as e:
                            print(f"error in asr offline: {str(e)}")
                            import traceback
                            traceback.print_exc()
                    frames_asr = []
                    speech_start = False
                    frames_asr_online = []
                    # 修复：只在用户完全停止说话时才清空在线识别缓存，避免文字跳动
                    # websocket.status_dict_asr_online["cache"] = {}  # 注释掉这行，保持流式识别的连续性
                    if not websocket.is_speaking:
                        websocket.vad_pre_idx = 0
                        frames = []
                        websocket.status_dict_vad["cache"] = {}
                        # 只在用户完全停止说话时才重置在线识别缓存
                        websocket.status_dict_asr_online["cache"] = {}
                    else:
                        frames = frames[-20:]

    except websockets.ConnectionClosed:
        print("ConnectionClosed...", websocket_users, flush=True)
        
        # 在连接断开前，发送合并后的完整转录结果
        if hasattr(websocket, 'stream_results') and websocket.stream_results:
            final_text = merge_stream_results(websocket.stream_results)
            if final_text:
                try:
                    await send_final_result(websocket, final_text, "stream-final")
                except:
                    print("Failed to send final stream result before disconnect")
        
        # 清理资源
        if hasattr(websocket, 'audio_buffer'):
            websocket.audio_buffer.clear()
        
        await ws_reset(websocket)
        websocket_users.remove(websocket)
    except websockets.InvalidState:
        print("InvalidState...")
        
        # 清理资源
        if hasattr(websocket, 'audio_buffer'):
            websocket.audio_buffer.clear()
            
    except Exception as e:
        print("Exception:", e)
        
        # 清理资源
        if hasattr(websocket, 'audio_buffer'):
            websocket.audio_buffer.clear()


async def async_vad(websocket, audio_in):
    try:
        segments_result = model_vad.generate(input=audio_in, **websocket.status_dict_vad)[0]["value"]
        # print(segments_result)

        speech_start = -1
        speech_end = -1

        if len(segments_result) == 0 or len(segments_result) > 1:
            return speech_start, speech_end
        if segments_result[0][0] != -1:
            speech_start = segments_result[0][0]
        if segments_result[0][1] != -1:
            speech_end = segments_result[0][1]
        return speech_start, speech_end
            
    except Exception as e:
        print(f"VAD processing failed: {e}")
        # 发生异常时，返回默认值
        return -1, -1


def split_audio_chunks(audio_data, chunk_size_mb=10):
    """
    将音频数据分割成小块以避免显存溢出
    """
    chunk_size_bytes = chunk_size_mb * 1024 * 1024  # 转换为字节
    chunks = []
    
    if len(audio_data) <= chunk_size_bytes:
        return [audio_data]
    
    # 计算每个chunk的样本数（假设16位音频，16kHz采样率）
    bytes_per_sample = 2  # 16位 = 2字节
    samples_per_chunk = chunk_size_bytes // bytes_per_sample
    
    # 确保chunk边界对齐到样本
    samples_per_chunk = (samples_per_chunk // 2) * 2  # 确保偶数个字节
    
    for i in range(0, len(audio_data), samples_per_chunk * bytes_per_sample):
        chunk = audio_data[i:i + samples_per_chunk * bytes_per_sample]
        if len(chunk) > 0:
            chunks.append(chunk)
    
    return chunks

async def async_asr(websocket, audio_in):
    try:
        if len(audio_in) > 0:
            print(f"Processing audio data: {len(audio_in)} bytes")
            
            # 检查显存是否足够
            if not check_memory_before_processing(len(audio_in)):
                error_msg = "Insufficient GPU memory for processing this audio file"
                print(error_msg)
                error_message = json.dumps({
                    "mode": "error",
                    "text": error_msg,
                    "wav_name": websocket.wav_name,
                    "is_final": True
                })
                await websocket.send(error_message)
                return
            
            # 检查音频大小，如果超过阈值则分块处理
            max_chunk_size_mb = 8  # 8MB per chunk to be safe
            if len(audio_in) > max_chunk_size_mb * 1024 * 1024:
                print(f"Large audio detected, splitting into chunks...")
                chunks = split_audio_chunks(audio_in, max_chunk_size_mb)
                print(f"Split into {len(chunks)} chunks")
                
                # 处理每个chunk并合并结果
                combined_text = ""
                for i, chunk in enumerate(chunks):
                    print(f"Processing chunk {i+1}/{len(chunks)}, size: {len(chunk)} bytes")
                    
                    # 清理GPU缓存
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    
                    try:
                         # 优化推理参数以减少显存占用
                         optimized_params = websocket.status_dict_asr.copy()
                         optimized_params.update({
                             'batch_size': 1,  # 使用最小batch size
                             'cache_size': 1,  # 减少缓存大小
                         })
                         
                         chunk_result = model_asr.generate(input=chunk, **optimized_params)[0]
                         if len(chunk_result["text"]) > 0:
                             combined_text += chunk_result["text"] + " "
                         print(f"Chunk {i+1} result: {chunk_result['text']}")
                    except Exception as chunk_e:
                        print(f"Error processing chunk {i+1}: {str(chunk_e)}")
                        # 继续处理下一个chunk
                        continue
                
                # 创建合并后的结果
                rec_result = {"text": combined_text.strip()}
                print(f"Combined ASR result: {rec_result}")
            else:
                 # 小文件直接处理，但仍使用优化参数
                 optimized_params = websocket.status_dict_asr.copy()
                 optimized_params.update({
                     'batch_size': 1,  # 使用最小batch size
                     'cache_size': 1,  # 减少缓存大小
                 })
                 
                 rec_result = model_asr.generate(input=audio_in, **optimized_params)[0]
                 print(f"ASR result: {rec_result}")
            
            # 处理完成后清理显存
            clear_gpu_memory()
            # print("offline_asr, ", rec_result)
            if model_punc is not None and len(rec_result["text"]) > 0:
                print("Applying punctuation model")
                # print("offline, before punc", rec_result, "cache", websocket.status_dict_punc)
                rec_result = model_punc.generate(
                    input=rec_result["text"], **websocket.status_dict_punc
                )[0]
                print(f"Punctuation result: {rec_result}")
                # print("offline, after punc", rec_result)
            if len(rec_result["text"]) > 0:
                # print("offline", rec_result)
                mode = "2pass-offline" if "2pass" in websocket.mode else websocket.mode
                message = json.dumps(
                    {
                        "mode": mode,
                        "text": rec_result["text"],
                        "wav_name": websocket.wav_name,
                        "is_final": False,  # 在线流式识别始终为临时结果，让客户端处理累积逻辑
                    }
                )
                print(f"Sending message: {message}")
                await websocket.send(message)
            else:
                print("Empty recognition result")
        else:
            print("Empty audio input, sending empty result")
            mode = "2pass-offline" if "2pass" in websocket.mode else websocket.mode
            message = json.dumps(
                {
                    "mode": mode,
                    "text": "",
                    "wav_name": websocket.wav_name,
                    "is_final": False,  # 在线流式识别始终为临时结果，让客户端处理累积逻辑
                }
            )
            await websocket.send(message)
    except Exception as e:
        print(f"Exception in async_asr: {str(e)}")
        import traceback
        traceback.print_exc()
        # 发送错误消息给客户端
        try:
            error_message = json.dumps({
                "mode": "error",
                "text": f"ASR处理错误: {str(e)}",
                "wav_name": websocket.wav_name,
                "is_final": True
            })
            await websocket.send(error_message)
        except:
            print("Failed to send error message to client")    

async def async_asr_online(websocket, audio_in):
    if len(audio_in) > 0:
        # print(websocket.status_dict_asr_online.get("is_final", False))
        rec_result = model_asr_streaming.generate(
            input=audio_in, **websocket.status_dict_asr_online
        )[0]
        # print("online, ", rec_result)
        if websocket.mode == "2pass" and websocket.status_dict_asr_online.get("is_final", False):
            return rec_result
            #     websocket.status_dict_asr_online["cache"] = dict()
        if len(rec_result["text"]):
            # 获取完整识别文本
            full_text = rec_result["text"]
            
            # 初始化已发送文本长度跟踪
            if not hasattr(websocket, 'sent_text_length'):
                websocket.sent_text_length = 0
            
            # 只发送新增的文本部分
            if len(full_text) > websocket.sent_text_length:
                new_text = full_text[websocket.sent_text_length:]
                websocket.sent_text_length = len(full_text)
                
                mode = "2pass-online" if "2pass" in websocket.mode else websocket.mode
                message = json.dumps(
                    {
                        "mode": mode,
                        "text": new_text,
                        "wav_name": websocket.wav_name,
                        "is_final": False,  # 在线流式识别始终为临时结果，让客户端处理累积逻辑
                    }
                )
                await websocket.send(message)
                
        return rec_result  # 返回识别结果
    return None


if len(args.certfile) > 0:
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)

    # Generate with Lets Encrypt, copied to this location, chown to current user and 400 permissions
    ssl_cert = args.certfile
    ssl_key = args.keyfile

    ssl_context.load_cert_chain(ssl_cert, keyfile=ssl_key)
    start_server = websockets.serve(
        ws_serve, args.host, args.port, subprotocols=["binary"], ping_interval=None, ssl=ssl_context
    )
else:
    start_server = websockets.serve(
        ws_serve, args.host, args.port, subprotocols=["binary"], ping_interval=None
    )
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
