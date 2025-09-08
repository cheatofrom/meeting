---
tasks:
- punctuation
domain:
- audio
model-type:
- Classification
frameworks:
- pytorch
metrics:
- f1_score
license: Apache License 2.0
language: 
- cn
tags:
- FunASR
- CT-Transformer-vadRealtime
- Alibaba
- ICASSP 2020
datasets:
  train:
  - 33M-samples online data
  test:
  - wikipedia data test
  - 10000 industrial Mandarin sentences test
widgets:
  - task: punctuation
    inputs:
      - type: text
        name: input
        title: 文本
    examples:
      - name: 1
        title: 示例1
        inputs:
          - name: input
            data: 我们都是木头人不会讲话不会动
    inferencespec:
      cpu: 1 #CPU数量
      memory: 4096
---

# Controllable Time-delay Transformer VAD Realtime 模型介绍

# Highlights
- 中文标点vad实时模型：可用于实时语音识别模型输出文本的标点预测。
  - 基于[基于grpc服务](https://github.com/alibaba-damo-academy/FunASR/tree/main/funasr/runtime/python/grpc)场景的使用
  - 基于[FunASR框架](https://github.com/alibaba-damo-academy/FunASR)，可进行实时场景的ASR，VAD，标点的自由组合
  - 基于模拟vad的纯文本输入的标点预测


## <strong>[FunASR开源项目介绍](https://github.com/alibaba-damo-academy/FunASR)</strong>
<strong>[FunASR](https://github.com/alibaba-damo-academy/FunASR)</strong>希望在语音识别的学术研究和工业应用之间架起一座桥梁。通过发布工业级语音识别模型的训练和微调，研究人员和开发人员可以更方便地进行语音识别模型的研究和生产，并推动语音识别生态的发展。让语音识别更有趣！

[**github仓库**](https://github.com/alibaba-damo-academy/FunASR)
| [**最新动态**](https://github.com/alibaba-damo-academy/FunASR#whats-new) 
| [**环境安装**](https://github.com/alibaba-damo-academy/FunASR#installation)
| [**服务部署**](https://www.funasr.com)
| [**模型库**](https://github.com/alibaba-damo-academy/FunASR/tree/main/model_zoo)
| [**联系我们**](https://github.com/alibaba-damo-academy/FunASR#contact)


## 模型原理介绍

Controllable Time-delay Transformer是达摩院语音团队提出的高效后处理框架中的标点模块。本项目为中文通用标点模型，模型可以被应用于文本类输入的标点预测，也可应用于语音识别结果的后处理步骤，协助语音识别模块输出具有可读性的文本结果。

<p align="center">
<img src="fig/struct.png" alt="Controllable Time-delay Transformer模型结构"  width="500" />

Controllable Time-delay Transformer 模型结构如上图所示，由 Embedding、Encoder 和 Predictor 三部分组成。Embedding 是词向量叠加位置向量。Encoder可以采用不同的网络结构，例如self-attention，conformer，SAN-M等。Predictor 预测每个token后的标点类型。

在模型的选择上采用了性能优越的Transformer模型。Transformer模型在获得良好性能的同时，由于模型自身序列化输入等特性，会给系统带来较大时延。常规的Transformer可以看到未来的全部信息，导致标点会依赖很远的未来信息。这会给用户带来一种标点一直在变化刷新，长时间结果不固定的不良感受。基于这一问题，我们创新性的提出了可控时延的Transformer模型（Controllable Time-Delay Transformer, CT-Transformer），在模型性能无损失的情况下，有效控制标点的延时。

更详细的细节见：
- 论文： [CONTROLLABLE TIME-DELAY TRANSFORMER FOR REAL-TIME PUNCTUATION PREDICTION AND DISFLUENCY DETECTION](https://arxiv.org/pdf/2003.01309.pdf)


#### 基于ModelScope进行推理

以下为三种支持格式及api调用方式参考如下范例：
- text.scp文件路径，例如example/punc_example.txt，格式为： key + "\t" + value
```sh
cat example/punc_example.txt
1       跨境河流是养育沿岸人民的生命之源
2       从存储上来说仅仅是全景图片它就会是图片的四倍的容量
3       那今天的会就到这里吧happy new year明年见
```
```python
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks

inference_pipline = pipeline(
    task=Tasks.punctuation,
    model='iic/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727',
    model_revision="v2.0.4")

inputs = "跨境河流是养育沿岸|人民的生命之源长期以来为帮助下游地区防灾减灾中方技术人员|在上游地区极为恶劣的自然条件下克服巨大困难甚至冒着生命危险|向印方提供汛期水文资料处理紧急事件中方重视印方在跨境河流问题上的关切|愿意进一步完善双方联合工作机制|凡是|中方能做的我们|都会去做而且会做得更好我请印度朋友们放心中国在上游的|任何开发利用都会经过科学|规划和论证兼顾上下游的利益"
vads = inputs.split("|")

rec_result_all="outputs: "
cache = {}
for vad in vads:
    rec_result = inference_pipeline(text_in=vad, cache=cache)
    rec_result_all += rec_result[0]['text']

print(rec_result_all)
```


## 基于FunASR进行推理

下面为快速上手教程，测试音频（[中文](https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/vad_example.wav)，[英文](https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/asr_example_en.wav)）

### 可执行命令行
在命令行终端执行：

```shell
funasr +model=paraformer-zh +vad_model="fsmn-vad" +punc_model="ct-punc" +input=vad_example.wav
```

注：支持单条音频文件识别，也支持文件列表，列表为kaldi风格wav.scp：`wav_id   wav_path`

### python示例
#### 非实时语音识别
```python
from funasr import AutoModel
# paraformer-zh is a multi-functional asr model
# use vad, punc, spk or not as you need
model = AutoModel(model="paraformer-zh", model_revision="v2.0.4",
                  vad_model="fsmn-vad", vad_model_revision="v2.0.4",
                  punc_model="ct-punc-c", punc_model_revision="v2.0.4",
                  # spk_model="cam++", spk_model_revision="v2.0.2",
                  )
res = model.generate(input=f"{model.model_path}/example/asr_example.wav", 
            batch_size_s=300, 
            hotword='魔搭')
print(res)
```
注：`model_hub`：表示模型仓库，`ms`为选择modelscope下载，`hf`为选择huggingface下载。

#### 实时语音识别

```python
from funasr import AutoModel

chunk_size = [0, 10, 5] #[0, 10, 5] 600ms, [0, 8, 4] 480ms
encoder_chunk_look_back = 4 #number of chunks to lookback for encoder self-attention
decoder_chunk_look_back = 1 #number of encoder chunks to lookback for decoder cross-attention

model = AutoModel(model="paraformer-zh-streaming", model_revision="v2.0.4")

import soundfile
import os

wav_file = os.path.join(model.model_path, "example/asr_example.wav")
speech, sample_rate = soundfile.read(wav_file)
chunk_stride = chunk_size[1] * 960 # 600ms

cache = {}
total_chunk_num = int(len((speech)-1)/chunk_stride+1)
for i in range(total_chunk_num):
    speech_chunk = speech[i*chunk_stride:(i+1)*chunk_stride]
    is_final = i == total_chunk_num - 1
    res = model.generate(input=speech_chunk, cache=cache, is_final=is_final, chunk_size=chunk_size, encoder_chunk_look_back=encoder_chunk_look_back, decoder_chunk_look_back=decoder_chunk_look_back)
    print(res)
```

注：`chunk_size`为流式延时配置，`[0,10,5]`表示上屏实时出字粒度为`10*60=600ms`，未来信息为`5*60=300ms`。每次推理输入为`600ms`（采样点数为`16000*0.6=960`），输出为对应文字，最后一个语音片段输入需要设置`is_final=True`来强制输出最后一个字。

#### 语音端点检测（非实时）
```python
from funasr import AutoModel

model = AutoModel(model="fsmn-vad", model_revision="v2.0.4")

wav_file = f"{model.model_path}/example/asr_example.wav"
res = model.generate(input=wav_file)
print(res)
```

#### 语音端点检测（实时）
```python
from funasr import AutoModel

chunk_size = 200 # ms
model = AutoModel(model="fsmn-vad", model_revision="v2.0.4")

import soundfile

wav_file = f"{model.model_path}/example/vad_example.wav"
speech, sample_rate = soundfile.read(wav_file)
chunk_stride = int(chunk_size * sample_rate / 1000)

cache = {}
total_chunk_num = int(len((speech)-1)/chunk_stride+1)
for i in range(total_chunk_num):
    speech_chunk = speech[i*chunk_stride:(i+1)*chunk_stride]
    is_final = i == total_chunk_num - 1
    res = model.generate(input=speech_chunk, cache=cache, is_final=is_final, chunk_size=chunk_size)
    if len(res[0]["value"]):
        print(res)
```

#### 标点恢复
```python
from funasr import AutoModel

model = AutoModel(model="ct-punc", model_revision="v2.0.4")

res = model.generate(input="那今天的会就到这里吧 happy new year 明年见")
print(res)
```

#### 时间戳预测
```python
from funasr import AutoModel

model = AutoModel(model="fa-zh", model_revision="v2.0.4")

wav_file = f"{model.model_path}/example/asr_example.wav"
text_file = f"{model.model_path}/example/text.txt"
res = model.generate(input=(wav_file, text_file), data_type=("sound", "text"))
print(res)
```

更多详细用法（[示例](https://github.com/alibaba-damo-academy/FunASR/tree/main/examples/industrial_data_pretraining)）


## 微调

详细用法（[示例](https://github.com/alibaba-damo-academy/FunASR/tree/main/examples/industrial_data_pretraining)）




## Benchmark
中文标点预测通用模型在自采集的通用领域业务场景数据上有良好效果。训练数据大约33M个sample，每个sample可能包含1句或多句。

### 自采集数据（20000+ samples）

| precision                            | recall                                | f1_score                              |
|:------------------------------------:|:-------------------------------------:|:-------------------------------------:|
| <div style="width: 150pt">55.0</div> | <div style="width: 150pt">56.6</div>  | <div style="width: 150pt">55.6</div>  | 

## 使用方式以及适用范围

运行范围
- 支持Linux-x86_64、Mac和Windows运行。

使用方式
- 直接推理：可以直接对输入文本进行计算，输出带有标点的目标文字。

使用范围与目标场景
- 适合对文本数据进行标点预测，文本长度不限。

## 相关论文以及引用信息

```BibTeX
@inproceedings{chen2020controllable,
  title={Controllable Time-Delay Transformer for Real-Time Punctuation Prediction and Disfluency Detection},
  author={Chen, Qian and Chen, Mengzhe and Li, Bo and Wang, Wen},
  booktitle={ICASSP 2020-2020 IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)},
  pages={8069--8073},
  year={2020},
  organization={IEEE}
}
```

