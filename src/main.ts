import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  // 静的ファイルの提供設定
  app.useStaticAssets(join(__dirname, '..', 'public'))
  await app.listen(3000)
}
bootstrap()
