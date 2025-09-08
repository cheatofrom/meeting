import torch
from modelscope.pipelines import pipeline

# 检查 PyTorch 和 CUDA 环境
print("PyTorch 版本:", torch.__version__)
print("CUDA 是否可用:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("CUDA 版本:", torch.version.cuda)
    print("可用的 GPU 数量:", torch.cuda.device_count())
    print("当前 GPU 设备:", torch.cuda.get_device_name(0))

# 初始化说话人分离模型，并指定使用 GPU
sd_pipeline = pipeline(
    task='speaker-diarization',
    model='iic/speech_campplus_speaker-diarization_common',
    model_revision='v1.0.0',
    device='cuda'
)

# 手动将模型移动到 GPU
if torch.cuda.is_available():
    sd_pipeline.model.to('cuda')

# 输入音频文件
input_wav = '/home/dell/mnt/ai-work/Meeting/test/1112.wav'

# 运行模型
result = sd_pipeline(input_wav)

# 格式化输出结果
def format_speaker_diarization_result(result):
    formatted_result = []
    for segment in result['text']:
        start_time = segment[0]
        end_time = segment[1]
        speaker_id = segment[2]
        
        # 将时间转换为分钟和秒
        start_minutes = int(start_time // 60)
        start_seconds = start_time % 60
        end_minutes = int(end_time // 60)
        end_seconds = end_time % 60
        
        # 格式化时间
        start_time_str = f"{start_minutes:02d}:{start_seconds:05.2f}"
        end_time_str = f"{end_minutes:02d}:{end_seconds:05.2f}"
        
        # 格式化输出
        formatted_segment = f"[{start_time_str}-{end_time_str}] 说话人{speaker_id}"
        formatted_result.append(formatted_segment)
    
    return "\n".join(formatted_result)

# 格式化输出结果
formatted_output = format_speaker_diarization_result(result)
print(formatted_output)