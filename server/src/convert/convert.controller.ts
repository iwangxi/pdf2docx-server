import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { createReadStream, promises as fs } from 'fs';
import { ConvertService } from './convert.service';

const uploadDir = '/tmp/pdf2docx/uploads';
const outputDir = '/tmp/pdf2docx/outputs';

@Controller()
export class ConvertController {
  constructor(private readonly service: ConvertService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('convert')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: async (_req, _file, cb) => {
          try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
          } catch (e) {
            cb(e as Error, uploadDir);
          }
        },
        filename: (_req, file, cb) => {
          const id = uuidv4();
          const ext = extname(file.originalname) || '.pdf';
          cb(null, `${id}${ext}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }),
  )
  async convert(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      await fs.unlink(file.path).catch(() => void 0);
      throw new HttpException('Please upload a .pdf file', HttpStatus.BAD_REQUEST);
    }

    await fs.mkdir(outputDir, { recursive: true });
    const base = file.originalname.replace(/\.pdf$/i, '');
    const outputPath = join(outputDir, `${uuidv4()}_${base}.docx`);

    try {
      await this.service.convertPdfToDocx(file.path, outputPath);
    } catch (e) {
      await fs.unlink(file.path).catch(() => void 0);
      await fs.unlink(outputPath).catch(() => void 0);
      throw new HttpException(
        `Conversion failed: ${(e as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Stream back the file and cleanup after
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${base}.docx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    const stream = createReadStream(outputPath);
    stream.on('close', async () => {
      await fs.unlink(file.path).catch(() => void 0);
      await fs.unlink(outputPath).catch(() => void 0);
    });
    stream.pipe(res);
  }
}

