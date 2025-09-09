#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import tempfile
import traceback
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from funasr import AutoModel
import logging
import uvicorn

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FunASR API Server", description="语音识别API服务")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型变量
model = None

def init_model():
    """初始化FunASR模型"""
    global model
    try:
        logger.info("正在初始化FunASR模型...")
        model = AutoModel(
            model="/home/dell/mnt/ai-work/Meeting/models/speech_paraformer-large-vad-punc-spk_asr_nat-zh-cn", 
            model_revision="v2.0.4",
            vad_model="fsmn-vad", 
            vad_model_revision="v2.0.4",
            punc_model="ct-punc-c", 
            punc_model_revision="v2.0.4",
            spk_model="cam++", 
            spk_model_revision="v2.0.2",
            disable_update=True
        )
        logger.info("FunASR模型初始化完成")
    except Exception as e:
        logger.error(f"模型初始化失败: {e}")
        logger.error(traceback.format_exc())
        raise e

def process_recognition_result(res):
    """处理识别结果，按说话人和时间段合并"""
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

@app.post("/api/recognize")
async def recognize_audio(
    audio: UploadFile = File(...),
    batch_size_s: int = Form(300),
    hotword: str = Form("")
):
    """语音识别API接口"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="模型未初始化")
        
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
            res = model.generate(
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
        'model_loaded': model is not None
    }

if __name__ == '__main__':
    try:
        # 初始化模型
        init_model()
        
        # 启动服务器
        logger.info("启动FunASR API服务器...")
        uvicorn.run(app, host="0.0.0.0", port=10096,ssl_keyfile="/home/dell/mnt/ai-work/Meeting/ssl_key/server.key",
            ssl_certfile="/home/dell/mnt/ai-work/Meeting/ssl_key/server.crt")
        
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
        logger.error(traceback.format_exc())