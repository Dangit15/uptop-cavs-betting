import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';

@Module({
  imports: [
    // Load .env and make env vars available across the app
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connect to MongoDB using MONGO_URI from .env
    MongooseModule.forRoot(process.env.MONGO_URI as string),

    GameModule,
    // GameModule will be added here after we generate it
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
