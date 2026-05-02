import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TripsModule } from './modules/trips/trips.module';
import { DuffelModule } from './modules/duffel/duffel.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { MoodModule } from './modules/mood/mood.module';
import { SavedModule } from './modules/saved/saved.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    PrismaModule,
    AuthModule,
    DuffelModule,
    TripsModule,
    ExperiencesModule,
    MoodModule,
    SavedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
