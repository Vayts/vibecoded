import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ComparisonsModule } from './modules/comparisons/comparisons.module';
import { FamilyMembersModule } from './modules/family-members/family-members.module';
import { MeModule } from './modules/me/me.module';
import { ProductAnalyzeModule } from './modules/product-analyze/product-analyze.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { ScannerPhotoModule } from './modules/scanner-photo/scanner-photo.module';
import { ScansModule } from './modules/scans/scans.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    AuthModule,
    MeModule,
    FamilyMembersModule,
    UserModule,
    ProductAnalyzeModule,
    ScannerModule,
    ScannerPhotoModule,
    ScansModule,
    ComparisonsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
