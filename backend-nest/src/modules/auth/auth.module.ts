import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  Put,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

class RegisterDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(6)
  password!: string;
  @IsString()
  name!: string;
  @IsString()
  nationality = 'España';
  @IsString()
  language = 'es';
  @IsString()
  city = 'Madrid';
}

class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  password!: string;
}

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() city?: string;
}

@Injectable()
class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(userId: string): string {
    return this.jwt.sign({ user_id: userId });
  }

  private toUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nationality: user.nationality,
      language: user.language,
      city: user.city ?? 'Tu ciudad',
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new HttpException(
        'El email ya está registrado',
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        name: dto.name,
        nationality: dto.nationality,
        language: dto.language,
        city: dto.city,
      },
    });
    return { token: this.signToken(user.id), user: this.toUserResponse(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return { token: this.signToken(user.id), user: this.toUserResponse(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.toUserResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.toUserResponse(user);
  }
}

@Injectable()
class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'tripinn-secret-key-2024-secure',
      ),
    });
  }
  async validate(payload: { user_id: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.user_id },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return { sub: user.id };
  }
}

@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Req() req: { user: { sub: string } }) {
    return this.auth.me(req.user.sub);
  }
  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  update(@Req() req: { user: { sub: string } }, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.sub, dto);
  }
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'tripinn-secret-key-2024-secure',
        ),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
