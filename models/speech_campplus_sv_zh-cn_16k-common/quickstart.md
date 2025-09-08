---
---
## 模型加载和推理
更多关于模型加载和推理的问题参考[模型的推理Pipeline](https://modelscope.cn/docs/%E6%A8%A1%E5%9E%8B%E7%9A%84%E6%8E%A8%E7%90%86Pipeline)。

```python
from modelscope.pipelines import pipeline
from modelscope.utils.constant import Tasks

p = pipeline('speaker-verification', 'damo/speech_campplus_sv_zh-cn_16k-common')
```

提供input输入
```python
wav1 = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_a_cn_16k.wav'
wav2 = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_b_cn_16k.wav'
p([wav1, wav2])
```

可以自定义阈值，阈值越高，判断为同一个说话人的条件越严格
```python
wav1 = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_a_cn_16k.wav'
wav2 = 'https://modelscope.cn/api/v1/models/damo/speech_campplus_sv_zh-cn_16k-common/repo?Revision=master&FilePath=examples/speaker1_b_cn_16k.wav'
p([wav1, wav2]， thr=0.31)
```

更多使用说明请参阅[ModelScope文档中心](http://www.modelscope.cn/#/docs)。
---

---
## 下载并安装ModelScope library
更多关于下载安装ModelScope library的问题参考[环境安装](https://modelscope.cn/docs/%E7%8E%AF%E5%A2%83%E5%AE%89%E8%A3%85)。

```python
pip install "modelscope[audio]" -f https://modelscope.oss-cn-beijing.aliyuncs.com/releases/repo.html
```