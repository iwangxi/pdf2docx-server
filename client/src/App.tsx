import React, { useCallback, useState } from 'react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }, []);

  const submit = useCallback(async () => {
    if (!file) {
      setMessage('请选择 PDF 文件');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('请上传 .pdf 文件');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/convert', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition');
      let filename = 'output.docx';
      if (cd) {
        const m = cd.match(/filename="?([^";]+)"?/i);
        if (m) filename = m[1];
      } else if (file.name) {
        filename = file.name.replace(/\.pdf$/i, '.docx');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage('转换成功，已开始下载');
    } catch (e: any) {
      setMessage(e.message || '转换失败');
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>PDF 转 DOCX</h2>
      <p>选择 PDF 文件并点击转换，完成后自动下载 DOCX。</p>
      <input type="file" accept="application/pdf,.pdf" onChange={onFileChange} />
      <div style={{ marginTop: 12 }}>
        <button onClick={submit} disabled={loading}>
          {loading ? '转换中…' : '开始转换'}
        </button>
      </div>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      <hr style={{ margin: '24px 0' }} />
      <div>
        <p>接口说明：</p>
        <ul>
          <li>健康检查：GET /api/health</li>
          <li>转换：POST /api/convert（form-data: file）</li>
        </ul>
      </div>
    </div>
  );
}

