---
tasks:
- auto-speech-recognition
domain:
- audio
model-type:
- Non-autoregressive
frameworks:
- pytorch
backbone:
- transformer/conformer
metrics:
- CER
license: Apache License 2.0
language: 
- cn
tags:
- FunASR
- Paraformer
- Alibaba
- INTERSPEECH 2022
datasets:
  train:
  - 60,000 hour industrial Mandarin task
  test:
  - AISHELL-1 dev/test
  - AISHELL-2 dev_android/dev_ios/dev_mic/test_android/test_ios/test_mic
  - WentSpeech dev/test_meeting/test_net
  - SpeechIO TIOBE
  - 60,000 hour industrial Mandarin task
indexing:
   results:
   - task:
       name: Automatic Speech Recognition
     dataset:
       name: 60,000 hour industrial Mandarin task
       type: audio    # optional
       args: 16k sampling rate, 8404 characters  # optional
     metrics:
       - type: CER
         value: 8.53%  # float
         description: greedy search, withou lm, avg.
         args: default
       - type: RTF
         value: 0.0251  # float
         description: GPU inference on V100
         args: batch_size=1
widgets:
  - task: auto-speech-recognition
    inputs:
      - type: audio
        name: input
        title: 音频
    examples:
      - name: 1
        title: 示例1
        inputs:
          - name: input
            data: git://example/asr_example.wav
    inferencespec:
      cpu: 8 #CPU数量
      memory: 4096

finetune-support: True
---

# Highlights


Paraformer 模型是一种非自回归（Non-autoregressive）端到端语音识别模型。非自回归模型相比于自回归模型，可以对整条句子并行输出目标文字，具有更高的计算效率，尤其采用GPU解码。Paraformer模型相比于其他非自回归模型，不仅具有高效的解码效率，在模型参数可比的情况下，模型识别性能与SOTA的自回归模型相当。


## <strong>[FunASR开源项目介绍](https://github.com/alibaba-damo-academy/FunASR)</strong>
<strong>[FunASR](https://github.com/alibaba-damo-academy/FunASR)</strong>希望在语音识别的学术研究和工业应用之间架起一座桥梁。通过发布工业级语音识别模型的训练和微调，研究人员和开发人员可以更方便地进行语音识别模型的研究和生产，并推动语音识别生态的发展。让语音识别更有趣！

[**github仓库**](https://github.com/alibaba-damo-academy/FunASR)
| [**最新动态**](https://github.com/alibaba-damo-academy/FunASR#whats-new) 
| [**环境安装**](https://github.com/alibaba-damo-academy/FunASR#installation)
| [**服务部署**](https://www.funasr.com)
| [**模型库**](https://github.com/alibaba-damo-academy/FunASR/tree/main/model_zoo)
| [**联系我们**](https://github.com/alibaba-damo-academy/FunASR#contact)


## 模型原理介绍

Paraformer是达摩院语音团队提出的一种高效的非自回归端到端语音识别框架。本项目为Paraformer中文通用语音识别模型，采用工业级数万小时的标注音频进行模型训练，保证了模型的通用识别效果。模型可以被应用于语音输入法、语音导航、智能会议纪要等场景。

<p align="center">
<img src="fig/struct.png" alt="Paraformer模型结构"  width="500" />


Paraformer模型结构如上图所示，由 Encoder、Predictor、Sampler、Decoder 与 Loss function 五部分组成。Encoder可以采用不同的网络结构，例如self-attention，conformer，SAN-M等。Predictor 为两层FFN，预测目标文字个数以及抽取目标文字对应的声学向量。Sampler 为无可学习参数模块，依据输入的声学向量和目标向量，生产含有语义的特征向量。Decoder 结构与自回归模型类似，为双向建模（自回归为单向建模）。Loss function 部分，除了交叉熵（CE）与 MWER 区分性优化目标，还包括了 Predictor 优化目标 MAE。


其核心点主要有：  
- Predictor 模块：基于 Continuous integrate-and-fire (CIF) 的 预测器 (Predictor) 来抽取目标文字对应的声学特征向量，可以更加准确的预测语音中目标文字个数。  
- Sampler：通过采样，将声学特征向量与目标文字向量变换成含有语义信息的特征向量，配合双向的 Decoder 来增强模型对于上下文的建模能力。  
- 基于负样本采样的 MWER 训练准则。  

更详细的细节见：
- 论文： [Paraformer: Fast and Accurate Parallel Transformer for Non-autoregressive End-to-End Speech Recognition](https://arxiv.org/abs/2206.08317)
- 论文解读：[Paraformer: 高识别率、高计算效率的单轮非自回归端到端语音识别模型](https://mp.weixin.qq.com/s/xQ87isj5_wxWiQs4qUXtVw)


## 如何使用与训练自己的模型

本项目提供的预训练模型是基于大数据训练的通用领域识别模型，开发者可以基于此模型进一步利用ModelScope的微调功能或者本项目对应的Github代码仓库[FunASR](https://github.com/alibaba-damo-academy/FunASR)进一步进行模型的领域定制化。

### 在Notebook中开发

对于有开发需求的使用者，特别推荐您使用Notebook进行离线处理。先登录ModelScope账号，点击模型页面右上角的“在Notebook中打开”按钮出现对话框，首次使用会提示您关联阿里云账号，按提示操作即可。关联账号后可进入选择启动实例界面，选择计算资源，建立实例，待实例创建完成后进入开发环境，进行调用。

#### 基于ModelScope进行推理

- 流式语音识别api调用方式可参考如下范例：

```python
import os
import logging
import torch
import soundfile

from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks
from modelscope.utils.logger import get_logger

logger = get_logger(log_level=logging.CRITICAL)
logger.setLevel(logging.CRITICAL)

os.environ["MODELSCOPE_CACHE"] = "./"
inference_pipeline = pipeline(
    task=Tasks.auto_speech_recognition,
    model='iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online',
    model_revision='v2.0.4',
)

model_dir = os.path.join(os.environ["MODELSCOPE_CACHE"], "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online")
speech, sample_rate = soundfile.read(os.path.join(model_dir, "example/asr_example.wav"))
speech_length = speech.shape[0]

sample_offset = 0
chunk_size = [0, 10, 5] #[5, 10, 5] 600ms, [8, 8, 4] 480ms
encoder_chunk_look_back = 4
decoder_chunk_look_back = 1
stride_size =  chunk_size[1] * 960

is_final = False
for sample_offset in range(0, speech_length, min(stride_size, speech_length - sample_offset)):
    if sample_offset + stride_size >= speech_length - 1:
        stride_size = speech_length - sample_offset
        is_final = True

    res = inference_pipeline(speech[sample_offset: sample_offset + stride_size], cache=cache, is_final=is_final, encoder_chunk_look_back=encoder_chunk_look_back, decoder_chunk_look_back=decoder_chunk_look_back)
    if len(res[0]["value"]):
        print(res)
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



## 使用方式以及适用范围

运行范围
- 支持Linux-x86_64、Mac和Windows运行。

使用方式
- 直接推理：可以直接对输入音频进行解码，输出目标文字。
- 微调：加载训练好的模型，采用私有或者开源数据进行模型训练。

使用范围与目标场景
- 适合于实时语音识别场景。


## 模型局限性以及可能的偏差

考虑到特征提取流程和工具以及训练工具差异，会对CER的数据带来一定的差异（<0.1%），推理GPU环境差异导致的RTF数值差异。



## 相关论文以及引用信息

```BibTeX
@inproceedings{gao2022paraformer,
  title={Paraformer: Fast and Accurate Parallel Transformer for Non-autoregressive End-to-End Speech Recognition},
  author={Gao, Zhifu and Zhang, Shiliang and McLoughlin, Ian and Yan, Zhijie},
  booktitle={INTERSPEECH},
  year={2022}
}
```
