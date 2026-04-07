import { Module } from '@nestjs/common';
import { ScannerPhotoController } from './scanner-photo.controller';
import { ScannerPhotoService } from './scanner-photo.service';

@Module({
  controllers: [ScannerPhotoController],
  providers: [ScannerPhotoService],
})
export class ScannerPhotoModule {}
