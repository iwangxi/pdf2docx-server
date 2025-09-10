import { Injectable } from '@nestjs/common';
import { spawn, spawnSync } from 'child_process';

@Injectable()
export class ConvertService {
  private pythonCmd: string;

  constructor() {
    this.pythonCmd = this.resolvePython();
  }

  private resolvePython(): string {
    const candidates = [
      process.env.PDF2DOCX_PYTHON, // explicit override
      'python3',
      'python',
      '/opt/homebrew/anaconda3/bin/python3', // common on macOS with Anaconda
    ].filter(Boolean) as string[];

    for (const cmd of candidates) {
      try {
        const r = spawnSync(cmd, ['-c', 'import pdf2docx; print("ok")'], {
          encoding: 'utf8',
        });
        if (r.status === 0 && (r.stdout || '').includes('ok')) {
          return cmd;
        }
      } catch (_) {
        // try next
      }
    }
    // Fallback: still return python3; actual run will error with clearer message
    return 'python3';
  }

  convertPdfToDocx(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['-m', 'pdf2docx', 'convert', inputPath, outputPath];
      const child = spawn(this.pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      child.stdout.on('data', (d) => process.stdout.write(d));
      child.stderr.on('data', (d) => process.stderr.write(d));

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) return resolve();
        const msg = `pdf2docx exited with code ${code}. ` +
          `Hint: ensure pdf2docx is installed in Python '${this.pythonCmd}' ` +
          `or set env PDF2DOCX_PYTHON to a valid interpreter.`;
        reject(new Error(msg));
      });
    });
  }
}
