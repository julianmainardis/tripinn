import {
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  async saveExperience(userId: string, experienceId: string) {
    const existing = await this.prisma.savedExperience.findFirst({
      where: { userId, experienceId },
    });
    if (existing) return { message: 'Ya guardada', saved: true };

    await this.prisma.savedExperience.create({
      data: { userId, experienceId },
    });
    return { message: 'Guardada', saved: true };
  }

  async unsaveExperience(userId: string, experienceId: string) {
    await this.prisma.savedExperience.deleteMany({
      where: { userId, experienceId },
    });
    return { message: 'Eliminada', saved: false };
  }

  async getSavedExperiences(userId: string) {
    const saved = await this.prisma.savedExperience.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
    return saved.map((s) => ({
      id: s.id,
      experience_id: s.experienceId,
      saved_at: s.savedAt,
    }));
  }

  async checkSaved(userId: string, experienceId: string) {
    const existing = await this.prisma.savedExperience.findFirst({
      where: { userId, experienceId },
    });
    return { saved: existing !== null };
  }
}

@Controller('saved')
@UseGuards(AuthGuard('jwt'))
export class SavedController {
  constructor(private readonly savedService: SavedService) {}

  @Post(':experienceId')
  async save(
    @Param('experienceId') experienceId: string,
    @Req() req: { user?: { sub: string } },
  ) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.savedService.saveExperience(req.user.sub, experienceId);
  }

  @Delete(':experienceId')
  async unsave(
    @Param('experienceId') experienceId: string,
    @Req() req: { user?: { sub: string } },
  ) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.savedService.unsaveExperience(req.user.sub, experienceId);
  }

  @Get()
  async getSaved(@Req() req: { user?: { sub: string } }) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.savedService.getSavedExperiences(req.user.sub);
  }

  @Get('check/:experienceId')
  async checkSaved(
    @Param('experienceId') experienceId: string,
    @Req() req: { user?: { sub: string } },
  ) {
    if (!req.user?.sub)
      throw new UnauthorizedException('Usuario no autenticado');
    return this.savedService.checkSaved(req.user.sub, experienceId);
  }
}

@Module({
  providers: [SavedService],
  controllers: [SavedController],
})
export class SavedModule {}
