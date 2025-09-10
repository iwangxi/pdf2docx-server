# Multi-stage build: build React, then assemble Python runtime with pdf2docx

FROM node:20-bullseye AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm ci || npm i
COPY client ./
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app

# Install system deps that pdf2docx may rely on (fonts, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY api/requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

# Copy API code
COPY api ./api

# Copy built client to be served as static
RUN mkdir -p api/public
COPY --from=client-build /client/dist ./api/public

EXPOSE 3000
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "3000"]
