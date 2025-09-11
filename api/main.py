from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Query, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pdf2docx import Converter
import tempfile
import shutil
import os
from typing import Optional

app = FastAPI(
    title="PDF2DOCX Web API",
    version="1.0.0",
    description=(
        "提供 PDF→DOCX 转换的 API 与前端页面。\n\n"
        "- 健康检查: GET /api/health\n"
        "- 转换: POST /api/convert (form-data: file，支持 start/end 页码)\n"
        "- 文档: /docs, /redoc"
    ),
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# 一些浏览器扩展/代理会向 /proxy/* 发送探测或错误上报请求，
# 避免被 StaticFiles 捕获后返回 405，统一以 204 忽略。
@app.post("/proxy/report-error")
def _proxy_report_error_sink():
    return Response(status_code=204)


@app.api_route("/proxy/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
def _proxy_any_sink(rest: str):
    return Response(status_code=204)


@app.post("/api/convert", summary="上传 PDF 并返回 DOCX")
def convert(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to convert"),
    start: Optional[int] = Query(default=None, description="起始页(0基)"),
    end: Optional[int] = Query(default=None, description="结束页(不包含, 0基)"),
):
    # 简单上传大小限制（基于 Content-Length），默认 100MB
    try:
        content_length = request.headers.get("content-length")
        if content_length is not None and int(content_length) > 100 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 100MB)")
    except ValueError:
        pass
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a .pdf file")

    workdir = Path(tempfile.mkdtemp(prefix="pdf2docx_"))
    pdf_path = workdir / "input.pdf"
    docx_path = workdir / "output.docx"

    try:
        with pdf_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)

        try:
            cv = Converter(str(pdf_path))
            # 仅在提供时传入 start/end，避免某些实现对 None 的处理问题
            if start is None and end is None:
                cv.convert(str(docx_path))
            else:
                cv.convert(str(docx_path), start=start, end=end)
            cv.close()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

        base_name = os.path.splitext(os.path.basename(file.filename))[0]
        download_name = f"{base_name}.docx"

        def cleanup():
            try:
                shutil.rmtree(workdir, ignore_errors=True)
            except Exception:
                pass

        background_tasks.add_task(cleanup)

        return FileResponse(
            path=str(docx_path),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=download_name,
        )
    finally:
        try:
            file.file.close()
        except Exception:
            pass


# Serve built React app (copied to ./public in Docker build)
static_dir = Path(__file__).resolve().parent / "public"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    import os
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3000"))
    reload_flag = os.getenv("RELOAD", "1").lower() in {"1", "true", "yes", "on"}
    # Use import string so uvicorn reload/workers work when running inside `api/`.
    # In `api` directory, module path is "main:app".
    uvicorn.run("main:app", host=host, port=port, reload=reload_flag)
