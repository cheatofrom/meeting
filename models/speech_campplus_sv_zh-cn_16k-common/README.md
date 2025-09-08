---
tasks:
- speaker-verification
model_type:
- CAM++
domain:
- audio
frameworks:
- pytorch
backbone:
- CAM++
license: Apache License 2.0
language:
- cn
tags:
- speaker verification
- CAM++
- 中文模型
widgets:
  - task: speaker-verification
    model_revision: v1.0.0
    inputs:
      - type: audio
        name: input
        title: 音频
    extendsParameters:
      thr: 0.31
    examples:
      - name: 1
        title: 示例1
        inputs:
          - name: enroll
            data: git://examples/speaker1_a_cn_16k.wav
          - name: input
            data: git://examples/speaker1_b_cn_16k.wav
      - name: 2
        title: 示例2
        inputs:
          - name: enroll
            data: git://examples/speaker1_a_cn_16k.wav
          - name: input
            data: git://examples/speaker2_a_cn_16k.wav
    inferencespec:
      cpu: 8 #CPU数量
      memory: 1024
---

# CAM++说话人识别模型
CAM++模型是基于密集连接时延神经网络的说话人识别模型。相比于一些主流的说话人识别模型，比如ResNet34和ECAPA-TDNN，CAM++具有更准确的说话人识别性能和更快的推理速度。该模型可以用于说话人确认、说话人日志、语音合成、说话人风格转化等多项任务。
## 模型简述
CAM++兼顾识别性能和推理效率，在公开的中文数据集CN-Celeb和英文数据集VoxCeleb上，相比主流的说话人识别模型ResNet34和ECAPA-TDNN，获得了更高的准确率，同时具有更快的推理速度。其模型结构如下图所示，整个模型包含两部分，残差卷积网络作为前端，时延神经网络结构作为主干。前端模块是2维卷积结构，用于提取更加局部和精细的时频特征。主干模块采用密集型连接，复用层级特征，提高计算效率。同时每一层中嵌入了一个轻量级的上下文相关的掩蔽(Context-aware Mask)模块，该模块通过多粒度的pooling操作提取不同尺度的上下文信息，生成的mask可以去除掉特征中的无关噪声，并保留关键的说话人信息。

<div align=center>
<img src="structure.png" width="400" />
</div>

更详细的信息见
- 论文：[CAM++: A Fast and Efficient Network for Speaker Verification Using Context-Aware Masking](https://arxiv.org/abs/2303.00332)
- github项目地址：[3D-Speaker](https://github.com/alibaba-damo-academy/3D-Speaker)

## 训练数据
本模型使用大型中文说话人数据集进行训练，包含约200k个说话人。
## 模型效果评估
在CN-Celeb中文测试集的EER评测结果对比：
| Model | #Spks trained | CN-Celeb Test |
|:-----:|:------:|:------:|
|ResNet34|~3k|6.97%|
|ECAPA-TDNN|~3k|7.45%|
|CAM++|~3k|6.78%|
|CAM++|~200k|4.32%|

# 如何快速体验模型效果
## 在Notebook中体验
对于有开发需求的使用者，特别推荐您使用Notebook进行离线处理。先登录ModelScope账号，点击模型页面右上角的“在Notebook中打开”按钮出现对话框，首次使用会提示您关联阿里云账号，按提示操作即可。关联账号后可进入选择启动实例界面，选择计算资源，建立实例，待实例创建完成后进入开发环境，输入api调用实例。
``` python
from modelscope.pipelines import pipeline
sv_pipeline = pipeline(
    task='speaker-verification',
    model='damo/speech_campplus_sv_zh-cn_16k-common',
    model_revision='v1.0.0'
)
speaker1_a_wav = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_a_cn_16k.wav'
speaker1_b_wav = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_b_cn_16k.wav'
speaker2_a_wav = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker2_a_cn_16k.wav'
# 相同说话人语音
result = sv_pipeline([speaker1_a_wav, speaker1_b_wav])
print(result)
# 不同说话人语音
result = sv_pipeline([speaker1_a_wav, speaker2_a_wav])
print(result)
# 可以自定义得分阈值来进行识别，阈值越高，判定为同一人的条件越严格
result = sv_pipeline([speaker1_a_wav, speaker2_a_wav], thr=0.31)
print(result)
# 可以传入output_emb参数，输出结果中就会包含提取到的说话人embedding
result = sv_pipeline([speaker1_a_wav, speaker2_a_wav], output_emb=True)
print(result['embs'], result['outputs'])
# 可以传入save_dir参数，提取到的说话人embedding会存储在save_dir目录中
result = sv_pipeline([speaker1_a_wav, speaker2_a_wav], save_dir='savePath/')
```
## 训练和测试自己的CAM++模型
本项目已在[3D-Speaker](https://github.com/alibaba-damo-academy/3D-Speaker)开源了训练、测试和推理代码，使用者可按下面方式下载安装使用：
``` sh
git clone https://github.com/alibaba-damo-academy/3D-Speaker.git && cd 3D-Speaker
conda create -n 3D-Speaker python=3.8
conda activate 3D-Speaker
pip install -r requirements.txt
```

运行CAM++在VoxCeleb集上的训练样例
``` sh
cd egs/voxceleb/sv-cam++
# 需要在run.sh中提前配置训练使用的GPU信息，默认是4卡
bash run.sh
```

## 使用本预训练模型快速提取embedding
``` sh
pip install modelscope
cd 3D-Speaker
# 配置模型名称并指定wav路径，wav路径可以是单个wav，也可以包含多条wav路径的list文件
model_id=damo/speech_campplus_sv_zh-cn_16k-common
# 提取embedding
python speakerlab/bin/infer_sv.py --model_id $model_id --wavs $wav_path
```


# 相关论文以及引用信息
如果你觉得这个该模型有所帮助，请引用下面的相关的论文
```BibTeX
@article{cam++,
  title={CAM++: A Fast and Efficient Network for Speaker Verification Using Context-Aware Masking},
  author={Hui Wang and Siqi Zheng and Yafeng Chen and Luyao Cheng and Qian Chen},
  journal={arXiv preprint arXiv:2303.00332},
}
```

# 3D-Speaker 开发者社区钉钉群
<div align=left>
<img src="dingding.jpg" width="260" />
</div>
