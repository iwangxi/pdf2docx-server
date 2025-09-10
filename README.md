PDF2DOCX Web（FastAPI + React + Docker）

概述

- 后端：FastAPI 提供 PDF→DOCX 转换 API（直接使用 `pdf2docx` 库）。
- 前端：React 单页，选择 PDF 上传，返回后自动下载 DOCX。
- 部署：单镜像（Python 基础镜像 + pdf2docx），一键构建运行。

接口一览（Swagger）

- 文档：`/docs`（Swagger UI）、`/redoc`（ReDoc）
- 健康检查：`GET /api/health`
- 转换：`POST /api/convert`
  - form-data 字段：`file`（PDF 文件）
  - 可选查询参数：`start`、`end`（0 基，`end` 为不包含）

快速开始（Docker 推荐）

1) 构建镜像
- `docker build -t pdf2docx-web .`

2) 运行容器
- `docker run --rm -p 3000:3000 pdf2docx-web`

3) 访问
- 前端页面：`http://localhost:3000`
- Swagger 文档：`http://localhost:3000/docs`
- 健康检查：`GET http://localhost:3000/api/health`
- 转换接口：`POST http://localhost:3000/api/convert`（form-data: `file`）

本地开发

后端（FastAPI）

- 进入目录：`cd api`
- 建议使用虚拟环境：
  - `python3 -m venv .venv && source .venv/bin/activate`
- 安装依赖：`pip install -r requirements.txt`
- 启动（在项目根/当前目录分别选择其一）：
  - 当前目录：`uvicorn main:app --host 0.0.0.0 --port 3000 --reload`
  - 项目根：`uvicorn api.main:app --host 0.0.0.0 --port 3000 --reload`
- 访问：`http://localhost:3000/docs`

前端（React + Vite）

- 进入目录：`cd client`
- 安装依赖：`npm i`（推荐 Node 18+/20+）
- 启动开发：`npm run dev`（默认端口 5173）
- 访问：`http://localhost:5173`
- 已配置代理：前端对 `/api/*` 的请求会代理到 `http://localhost:3000`

API 示例

- 基本转换：
  - `curl -X POST -F "file=@/path/to/in.pdf" http://localhost:3000/api/convert -o out.docx`
- 指定页码（0 基，`end` 不包含）：
  - `curl -X POST -F "file=@/path/to/in.pdf" "http://localhost:3000/api/convert?start=0&end=3" -o out.docx`

与其他服务对接（Node 示意）

```js
import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';

const fd = new FormData();
fd.append('file', fs.createReadStream('/path/to/in.pdf'));
const res = await axios.post('http://localhost:3000/api/convert', fd, {
  headers: fd.getHeaders(),
  responseType: 'stream',
});
res.data.pipe(fs.createWriteStream('/path/to/out.docx'));
```

Docker 说明

- 使用 `python:3.11-slim` 作为运行时，安装 `fastapi`、`uvicorn`、`pdf2docx`。
- 构建阶段会打包 React 前端并复制到 API 的 `public` 目录，FastAPI 直接托管静态资源。

注意与建议

- 计算资源：CPU 密集型，无需 GPU。并发较高时提升 CPU 核数即可。
- 内存与磁盘：DOCX 可能比 PDF 大；请预留输入文件大小 2–3 倍空间。
- Python 版本：支持 Python 3.9+。若为 3.9，请确保使用 `Optional[int]`（代码已兼容）。
- 404 `/proxy/*`：来自扩展/插件的探测请求，可忽略；或关闭访问日志 `--no-access-log`。
- 个别页解析失败：可能是字体/编码异常。可考虑兜底为“失败页转图片嵌入”。如需可在后端加开关。

常见问题排查

- 无法启动 `uvicorn api.main:app`：确认当前所在目录；在 `api` 目录内使用 `uvicorn main:app`。
- `TypeError: unsupported operand type for |`：Python 3.9 环境，请使用 `Optional[int]`（已修复）。
- 转换报错/缺页：查看后端控制台日志；遇到特定页报错可尝试排除页或单页转换定位原因。
