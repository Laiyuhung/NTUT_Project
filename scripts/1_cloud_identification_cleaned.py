# 匯入必要套件
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import os
import warnings
warnings.filterwarnings('ignore')

# 禁用 YOLO 詳細輸出
os.environ['YOLO_VERBOSE'] = 'False'
from ultralytics import YOLO
import cv2
from tqdm import tqdm

# === 參數設定 ===
photos_dir = Path('photos')
photos_csv = Path('photos_metadata.csv')
model_path = Path('best.pt')
class_names = ['Ac', 'As', 'Cb', 'Cc', 'Ci', 'Cs', 'Cu', 'Ns', 'Sc', 'St']
class_id_map = {name: idx for idx, name in enumerate(class_names)}

# 讀取照片 metadata
photos_df = pd.read_csv(photos_csv)

# 初始化 YOLO 模型，先檢查best.pt是否存在
if model_path.exists():
    try:
        model = YOLO(model_path)
        model.to('cpu')  # 強制使用 CPU
        use_yolo_model = True
        print(f"✅ 成功載入 YOLO 模型: {model_path}")
    except Exception as e:
        print(f"❌ YOLO 模型載入失敗: {e}")
        use_yolo_model = False
else:
    print(f"❌ 模型檔案 {model_path} 不存在，未載入YOLO模型。")
    use_yolo_model = False

# === 雲型識別相關函數 ===
def apply_high_level_cloud_rules(top_preds):
    if not any(cid in top_preds for cid in [class_id_map['Cc'], class_id_map['Ci'], class_id_map['Cs']]):
        return top_preds
    if class_id_map['Cs'] in top_preds and class_id_map['Ci'] in top_preds:
        top_preds = [class_id_map['Cs']] + [cid for cid in top_preds if cid != class_id_map['Cs']]
    if class_id_map['Cc'] in top_preds and class_id_map['Ci'] in top_preds and class_id_map['Cs'] not in top_preds:
        top_preds = [class_id_map['Cc']] + [cid for cid in top_preds if cid != class_id_map['Cc']]
    return top_preds[:3]

def apply_middle_level_cloud_rules(top_preds):
    if not any(cid in top_preds for cid in [class_id_map['Ac'], class_id_map['As'], class_id_map['Ns']]):
        return top_preds
    if class_id_map['Ns'] in top_preds and class_id_map['As'] in top_preds:
        top_preds = [class_id_map['Ns']] + [cid for cid in top_preds if cid != class_id_map['Ns']]
    if class_id_map['Ac'] in top_preds and class_id_map['As'] in top_preds:
        top_preds = [class_id_map['As']] + [cid for cid in top_preds if cid != class_id_map['As']]
    return top_preds[:3]

def apply_low_level_cloud_rules(top_preds):
    if not any(cid in top_preds for cid in [class_id_map['Sc'], class_id_map['St'], class_id_map['Cu']]):
        return top_preds
    if class_id_map['Sc'] in top_preds and class_id_map['Cu'] in top_preds:
        top_preds = [class_id_map['Sc']] + [cid for cid in top_preds if cid != class_id_map['Sc']]
    if class_id_map['St'] in top_preds and class_id_map['Sc'] in top_preds:
        top_preds = [class_id_map['St']] + [cid for cid in top_preds if cid != class_id_map['St']]
    return top_preds[:3]

def adjust_by_brightness(top_preds, mean_brightness):
    if mean_brightness > 200:
        for pri in [class_id_map['Ci'], class_id_map['Cs']]:
            if pri in top_preds:
                top_preds = [pri] + [cid for cid in top_preds if cid != pri]
                break
    elif mean_brightness < 100:
        for pri in [class_id_map['Ns'], class_id_map['St']]:
            if pri in top_preds:
                top_preds = [pri] + [cid for cid in top_preds if cid != pri]
                break
    return top_preds[:3]

def predict_cloud_type_yolo(image_path):
    result = {
        'main_cloud': '',
        'confidence': 0.0,
        'brightness': 0.0,
        'detection_count': 0,
        'status': ''
    }
    
    try:
        image = cv2.imread(image_path)
        if image is None:
            result['main_cloud'] = "無法讀取照片"
            result['status'] = "失敗"
            return result

        # 計算亮度
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = gray.mean()
        result['brightness'] = round(mean_brightness, 2)

        if use_yolo_model:
            # 使用 YOLO 模型預測
            results = model.predict(source=image_path, conf=0.05, verbose=False)
            if results and len(results[0].boxes) > 0:
                # 獲取所有預測結果
                preds = [(int(box.cls.item()), float(box.conf.item())) for box in results[0].boxes]
                result['detection_count'] = len(preds)
                
                # 按信心度排序
                preds_sorted = sorted(preds, key=lambda x: x[1], reverse=True)
                top3_preds = [p[0] for p in preds_sorted[:3]]
                
                # 應用規則調整
                top3_preds = adjust_by_brightness(top3_preds.copy(), mean_brightness)
                top3_preds = apply_high_level_cloud_rules(top3_preds.copy())
                top3_preds = apply_middle_level_cloud_rules(top3_preds.copy())
                top3_preds = apply_low_level_cloud_rules(top3_preds.copy())
                
                if top3_preds:
                    result['main_cloud'] = class_names[top3_preds[0]]
                    result['confidence'] = round(preds_sorted[0][1], 3)
                    result['status'] = "成功"
                else:
                    result['main_cloud'] = "無法識別"
                    result['status'] = "失敗"
            else:
                result['main_cloud'] = "未偵測到雲"
                result['status'] = "失敗"
        else:
            # 如果沒有 YOLO 模型，使用亮度規則
            if mean_brightness > 200:
                result['main_cloud'] = "Ci"
                result['confidence'] = 0.7
            elif mean_brightness < 100:
                result['main_cloud'] = "St"
                result['confidence'] = 0.7
            else:
                result['main_cloud'] = "Cu"
                result['confidence'] = 0.7
            result['status'] = "成功"
            
    except Exception as e:
        result['main_cloud'] = "預測失敗"
        result['status'] = "失敗"
        print(f"預測錯誤: {e}")
    
    return result

# === 執行雲型識別 ===
if __name__ == "__main__":
    # 初始化欄位
    photos_df['yolo_cloud_type'] = ''
    photos_df['yolo_confidence'] = 0.0
    photos_df['image_brightness'] = 0.0

    success_count = 0
    fail_count = 0

    print(f"開始處理 {len(photos_df)} 張照片...")

    for idx, photo_row in tqdm(photos_df.iterrows(), total=len(photos_df), desc="雲型預測進度"):
        photo_filename = f"photo_{photo_row['ID']}.jpg"
        photo_path = photos_dir / photo_filename
        
        if not photo_path.exists():
            print(f"警告: 照片檔案不存在 - {photo_path}")
            continue
            
        prediction = predict_cloud_type_yolo(str(photo_path))
        
        # 更新 DataFrame
        photos_df.at[idx, 'yolo_cloud_type'] = prediction['main_cloud']
        photos_df.at[idx, 'yolo_confidence'] = prediction['confidence']
        photos_df.at[idx, 'image_brightness'] = prediction['brightness']
        
        if prediction['status'] == "成功":
            success_count += 1
        else:
            fail_count += 1

    # 儲存成功預測的照片資料到CSV
    success_df = photos_df[photos_df['yolo_cloud_type'] != '']
    timestamp = datetime.now().strftime('%Y%m%dT%H%M%S')
    output_csv = f'yolo_success_predictions_{timestamp}.csv'
    success_df.to_csv(output_csv, index=False)
    
    print(f"\n✅ 完成雲型辨識：成功 {success_count} 張，失敗 {fail_count} 張")
    print(f"📄 成功預測結果已儲存至 {output_csv}")