import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConvertModule } from './convert/convert.module';

@Module({
  imports: [
    // Serve React build from dist/public at root path
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      exclude: ['/api*'],
    }),
    ConvertModule,
  ],
})
export class AppModule {}

