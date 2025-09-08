from funasr import AutoModel

model = AutoModel(model="/home/dell/mnt/ai-work/Meeting/models/speech_paraformer-large-vad-punc-spk_asr_nat-zh-cn", model_revision="v2.0.4",
                  vad_model="fsmn-vad", vad_model_revision="v2.0.4",
                  punc_model="ct-punc-c", punc_model_revision="v2.0.4",
                  spk_model="cam++", spk_model_revision="v2.0.2",
                  )
res = model.generate(input="/home/dell/mnt/ai-work/Meeting/test/1112.wav", 
            batch_size_s=300, 
            hotword='魔搭')

# 简洁版输出
print("\n语音识别结果:")
print("-" * 40)

if res and len(res) > 0:
    result_dict = res[0]
    
    # 初始化变量
    last_spk = None
    last_end_time = 0
    merged_text = ""
    merged_time = ""
    
    # 遍历句子信息
    for sentence in result_dict['sentence_info']:
        start_sec = sentence.get('start', 0) / 1000  # 毫秒转秒
        end_sec = sentence.get('end', 0) / 1000      # 毫秒转秒
        spk = sentence.get('spk', 0)
        text = sentence.get('text', '')
        
        # 如果当前说话人与上一次相同，且时间连续
        if spk == last_spk and start_sec <= last_end_time + 1:  # 这里假设时间差小于1秒认为是连续的
            merged_text += text
            last_end_time = end_sec
        else:
            # 如果不是连续的，输出上一次合并的结果
            if last_spk is not None:
                start_min = int(merged_time.split('-')[0].split(':')[0])
                start_sec_remain = float(merged_time.split('-')[0].split(':')[1])
                end_min = int(last_end_time // 60)
                end_sec_remain = last_end_time % 60
                print(f"[{start_min}:{start_sec_remain:04.1f}-{end_min}:{end_sec_remain:04.1f}] 说话人{last_spk}: {merged_text}")
            
            # 更新合并信息
            merged_text = text
            merged_time = f"{int(start_sec // 60)}:{start_sec % 60:04.1f}-{int(end_sec // 60)}:{end_sec % 60:04.1f}"
            last_spk = spk
            last_end_time = end_sec
    # 输出最后一次合并的结果
    if last_spk is not None:
        start_min = int(merged_time.split('-')[0].split(':')[0])
        start_sec_remain = float(merged_time.split('-')[0].split(':')[1])
        end_min = int(last_end_time // 60)
        end_sec_remain = last_end_time % 60
        print(f"[{start_min}:{start_sec_remain:04.1f}-{end_min}:{end_sec_remain:04.1f}] 说话人{last_spk}: {merged_text}")
else:
    print("无识别结果")