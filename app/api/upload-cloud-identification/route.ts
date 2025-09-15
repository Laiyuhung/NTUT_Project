import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
// 設定 API 請求最大上限 50mb
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export async function POST(req: NextRequest) {

  // 先記錄請求大小
  const contentLength = req.headers.get('content-length');
  console.log('[upload-cloud-identification] content-length:', contentLength);

  const formData = await req.formData();
  const modelFile = formData.get('model');
  const photos = formData.getAll('photos');

  // log 檔案資訊
  if (modelFile instanceof File) {
    console.log('[upload-cloud-identification] modelFile:', modelFile.name, modelFile.size);
  }
  if (Array.isArray(photos)) {
    photos.forEach((f, i) => {
      if (f instanceof File) {
        console.log(`[upload-cloud-identification] photo[${i}]:`, f.name, f.size);
      }
    });
  }

  // 檢查型別
  if (!modelFile || !(modelFile instanceof File) || photos.length === 0 || !photos.every(f => f instanceof File)) {
    return NextResponse.json({ error: '請上傳模型檔與照片' }, { status: 400 });
  }

  // 建立暫存資料夾
  const tempDir = path.join(process.cwd(), 'tmp', Date.now().toString());
  await fs.mkdir(tempDir, { recursive: true });

  // 儲存模型檔
  const modelPath = path.join(tempDir, 'best.pt');
  await fs.writeFile(modelPath, Buffer.from(await (modelFile as File).arrayBuffer()));

  // 儲存照片
  const photosDir = path.join(tempDir, 'photos');
  await fs.mkdir(photosDir, { recursive: true });
  const photoPaths: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const file = photos[i] as File;
    const filePath = path.join(photosDir, `photo_${i}.jpg`);
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    photoPaths.push(filePath);
  }

  // 呼叫 Python 腳本
  const scriptPath = path.join(process.cwd(), '..', '0912new', '1_cloud_identification_cleaned.py');
  const photosCsvPath = path.join(tempDir, 'photos_metadata.csv');
  // 產生簡易 metadata CSV
  let csvContent = 'ID\n';
  for (let i = 0; i < photoPaths.length; i++) {
    csvContent += `${i}\n`;
  }
  await fs.writeFile(photosCsvPath, csvContent);

  // 執行 python
  const py = spawn('python', [scriptPath], {
    cwd: tempDir,
    env: { ...process.env },
  });

  let stdout = '';
  let stderr = '';
  py.stdout.on('data', (data) => { stdout += data.toString(); });
  py.stderr.on('data', (data) => { stderr += data.toString(); });

  const exitCode: number = await new Promise((resolve) => {
    py.on('close', resolve);
  });

  if (exitCode !== 0) {
    return NextResponse.json({ error: '辨識失敗', stderr }, { status: 500 });
  }

  // 讀取結果 CSV
  const files = await fs.readdir(tempDir);
  const resultCsv = files.find(f => f.startsWith('yolo_success_predictions_') && f.endsWith('.csv'));
  let result = '';
  if (resultCsv) {
    result = await fs.readFile(path.join(tempDir, resultCsv), 'utf-8');
  }

  return NextResponse.json({ stdout, result });
}
