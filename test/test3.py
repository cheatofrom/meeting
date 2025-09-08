from pyannote.audio import Pipeline
import torch
import os
# 加载预训练管道（需替换为您的Hugging Face访问令牌）
pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=os.getenv('HF_API_KEY'))

# 可选：将管道发送到GPU（如果有）
pipeline.to(torch.device("cuda"))

# 应用预训练管道
diarization = pipeline("/home/dell/mnt/ai-work/Meeting/test/1112.wav")

# 打印结果
for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"start={turn.start:.1f}s stop={turn.end:.1f}s speaker_{speaker}")
