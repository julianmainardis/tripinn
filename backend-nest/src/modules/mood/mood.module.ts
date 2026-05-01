import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

class MoodInputDto {
  @IsString() mood!: string;
  @IsNumber() @IsOptional() intensity = 0.5;
}

const MOOD_TRANSLATIONS: Record<string, string> = {
  need_change: 'Necesito un cambio',
  disconnect: 'Quiero desconectar',
  adventure: 'Ganas de aventura',
  couple: 'Planes de pareja',
  indecisive: 'No sé qué hacer',
};

const TRAVELER_TYPES: Record<string, string> = {
  need_change: 'Buscador de Cambios',
  disconnect: 'Explorador Zen',
  adventure: 'Aventurero Nato',
  couple: 'Romántico Viajero',
  indecisive: 'Espíritu Libre',
};

@Injectable()
export class MoodService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeMood(userId: string, dto: MoodInputDto) {
    await this.prisma.moodEntry.create({
      data: {
        userId,
        mood: dto.mood,
        intensity: dto.intensity,
      },
    });

    const history = await this.prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const moodCounts: Record<string, number> = {};
    for (const entry of history) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
    const total = Object.values(moodCounts).reduce((sum, v) => sum + v, 0) || 1;
    const percentages: Record<string, number> = {};
    for (const [key, value] of Object.entries(moodCounts)) {
      percentages[MOOD_TRANSLATIONS[key] || key] = Math.round(
        (value / total) * 100,
      );
    }

    return {
      ai_message: '¡Hoy es un gran día para hacer algo diferente!',
      quick_routine: 'Sal a dar un paseo de 10 minutos sin móvil.',
      experiences: [],
      mood_profile: {
        current_mood: dto.mood,
        mood_label: MOOD_TRANSLATIONS[dto.mood] || dto.mood,
        percentages,
        traveler_type: TRAVELER_TYPES[dto.mood] || 'Explorador',
      },
      daily_quote: {
        quote:
          'Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.',
        author: 'Carl Jung',
      },
    };
  }

  async getMoodHistory(userId: string) {
    const entries = await this.prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    return entries.map((e) => ({
      id: e.id,
      mood: e.mood,
      mood_label: MOOD_TRANSLATIONS[e.mood] || e.mood,
      intensity: e.intensity,
      timestamp: e.timestamp,
    }));
  }

  async getEmotionalProfile(userId: string) {
    const entries = await this.prisma.moodEntry.findMany({
      where: { userId },
      take: 100,
    });

    if (entries.length === 0) {
      return {
        dominant_mood: null,
        mood_percentages: {},
        traveler_type: 'Nuevo Explorador',
        total_entries: 0,
      };
    }

    const moodCounts: Record<string, number> = {};
    for (const entry of entries) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
    const total = Object.values(moodCounts).reduce((sum, v) => sum + v, 0);

    const percentages: Record<string, number> = {};
    for (const [key, value] of Object.entries(moodCounts)) {
      percentages[MOOD_TRANSLATIONS[key] || key] = Math.round(
        (value / total) * 100,
      );
    }

    const dominant = Object.keys(moodCounts).reduce((a, b) =>
      moodCounts[a] > moodCounts[b] ? a : b,
    );

    return {
      dominant_mood: MOOD_TRANSLATIONS[dominant] || dominant,
      mood_percentages: percentages,
      traveler_type: TRAVELER_TYPES[dominant] || 'Explorador',
      total_entries: total,
    };
  }
}

@Controller()
export class MoodController {
  constructor(private readonly moodService: MoodService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('mood/analyze')
  async analyzeMood(
    @Body() dto: MoodInputDto,
    @Req() req: { user?: { sub: string } },
  ) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.moodService.analyzeMood(req.user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mood/history')
  async getHistory(@Req() req: { user?: { sub: string } }) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.moodService.getMoodHistory(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mood/profile')
  async getProfile(@Req() req: { user?: { sub: string } }) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.moodService.getEmotionalProfile(req.user.sub);
  }
}

@Module({
  providers: [MoodService],
  controllers: [MoodController],
})
export class MoodModule {}
