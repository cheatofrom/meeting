import asyncio
import websockets
import json
import time
import ssl
import os

async def test_client():
    uri = "wss://127.0.0.1:10095"  # 服务器启用了SSL，使用wss://
    
    # 创建SSL上下文，不验证证书
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    async with websockets.connect(uri, subprotocols=["binary"], ssl=ssl_context) as ws:
        # 1. 发送控制消息，使用 2pass 模式以获取 speaker
        await ws.send(json.dumps({"mode": "2pass", "is_speaking": True}))

        # 2. 发送音频文件（16kHz PCM 或 WAV）
        with open("/home/dell/mnt/ai-work/Meeting/test/test.pcm", "rb") as f:
            chunk = f.read(3200)  # 分块发送
            while chunk:
                await ws.send(chunk)
                chunk = f.read(3200)

        # 3. 告诉服务说话结束
        await ws.send(json.dumps({"is_speaking": False}))

        # 4. 接收返回结果
        online_result = None
        offline_result = None
        start_time = time.time()
        timeout = 5  # 设置5秒超时，确保能收到离线结果
        
        while time.time() - start_time < timeout and (online_result is None or offline_result is None):
            try:
                # 设置接收消息的超时时间
                msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                data = json.loads(msg)
                
                # 区分在线和离线结果
                if data.get("mode") == "2pass-online":
                    online_result = data
                    print("\n在线识别结果:")
                    print(json.dumps(data, ensure_ascii=False, indent=2))
                elif data.get("mode") == "2pass-offline":
                    offline_result = data
                    print("\n离线识别结果 (包含说话人ID):")
                    print(json.dumps(data, ensure_ascii=False, indent=2))
                else:
                    print("\n其他结果:")
                    print(json.dumps(data, ensure_ascii=False, indent=2))
            except asyncio.TimeoutError:
                # 超时但继续循环直到总超时
                continue
        
        # 检查是否收到了离线结果（包含说话人ID）
        if offline_result is None:
            print("\n警告: 未收到包含说话人ID的离线识别结果，请检查speaker服务是否正常运行")

asyncio.run(test_client())
