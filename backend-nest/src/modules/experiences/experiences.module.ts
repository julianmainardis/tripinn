import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';

interface Experience {
  id: string;
  title: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  image_url: string;
  duration: string;
  location: string;
  affiliate_link_placeholder: string;
  mood_tags: string[];
  is_express?: boolean;
  is_home_activity?: boolean;
  is_travel?: boolean;
  has_movie_recommendation?: boolean;
  has_recommendations?: boolean;
  food_options?: boolean;
  movie_recommendation?: any;
  coffee_recommendation?: any;
  book_recommendation?: any;
  food_recommendations?: any[];
}

const EXPERIENCES: Experience[] = [
  {
    id: 'exp-1',
    title: 'Escapada a la Naturaleza',
    description: 'Desconecta del ruido y reconecta con la naturaleza.',
    short_description: 'Desconecta del ruido',
    category: 'nature',
    tags: ['naturaleza', 'relax'],
    image_url: 'https://images.unsplash.com/photo-1560199738-3d933bc1e714',
    duration: '2-3 días',
    location: 'Destinos naturales',
    affiliate_link_placeholder: '',
    mood_tags: ['need_change', 'disconnect'],
    is_express: false,
    is_home_activity: false,
    is_travel: true,
  },
  {
    id: 'exp-2',
    title: 'Aventura en la Montaña',
    description: 'Siente la adrenalina de las alturas.',
    short_description: 'Conquista nuevas cimas',
    category: 'mountain',
    tags: ['montaña', 'aventura'],
    image_url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606',
    duration: '3-4 días',
    location: 'Montañas',
    affiliate_link_placeholder: '',
    mood_tags: ['adventure', 'need_change'],
    is_express: false,
    is_home_activity: false,
    is_travel: true,
  },
  {
    id: 'exp-3',
    title: 'Relax en la Playa',
    description: 'Deja que el mar se lleve tus preocupaciones.',
    short_description: 'Relax junto al mar',
    category: 'beach',
    tags: ['playa', 'relax'],
    image_url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0',
    duration: '4-5 días',
    location: 'Costas',
    affiliate_link_placeholder: '',
    mood_tags: ['disconnect', 'couple'],
    is_express: false,
    is_home_activity: false,
    is_travel: true,
  },
  {
    id: 'exp-4',
    title: 'Escapada Romántica',
    description: 'Un fin de semana especial para dos.',
    short_description: 'Momentos para dos',
    category: 'couple',
    tags: ['romántico', 'pareja'],
    image_url:
      'https://images.pexels.com/photos/19763210/pexels-photo-19763210.jpeg',
    duration: '2-3 días',
    location: 'Destinos románticos',
    affiliate_link_placeholder: '',
    mood_tags: ['couple'],
    is_express: false,
    is_home_activity: false,
    is_travel: true,
  },
  {
    id: 'exp-5',
    title: 'Escapada a Nuevas Culturas',
    description:
      'Sumérgete en tradiciones, gastronomía y costumbres de otros lugares. Descubre mercados locales, museos y barrios con historia.',
    short_description: 'Descubre nuevas tradiciones',
    category: 'urban',
    tags: ['cultura', 'gastronomía', 'historia'],
    image_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077',
    duration: '3-5 días',
    location: 'Ciudades con historia',
    affiliate_link_placeholder: '',
    mood_tags: ['need_change', 'adventure', 'disconnect'],
    is_express: false,
    is_home_activity: false,
    is_travel: true,
  },
  {
    id: 'exp-local-1',
    title: 'Descubre un Sendero Local',
    description: 'Explora rutas de senderismo cerca de tu ciudad.',
    short_description: 'Trekking sin salir de tu zona',
    category: 'local_nature',
    tags: ['trekking', 'naturaleza'],
    image_url: 'https://images.unsplash.com/photo-1560199738-3d933bc1e714',
    duration: 'Medio día',
    location: 'Cerca de tu ciudad',
    affiliate_link_placeholder: '',
    mood_tags: ['need_change', 'disconnect', 'adventure'],
    is_express: true,
    is_home_activity: false,
    is_travel: false,
  },
  {
    id: 'exp-local-2',
    title: 'Bosque Urbano',
    description: 'Descubre el pulmón verde de tu ciudad.',
    short_description: 'Naturaleza en tu ciudad',
    category: 'local_nature',
    tags: ['bosque', 'naturaleza'],
    image_url: 'https://images.unsplash.com/photo-1612056026402-ac9e86c277e0',
    duration: '2-3 horas',
    location: 'Tu ciudad',
    affiliate_link_placeholder: '',
    mood_tags: ['disconnect', 'indecisive'],
    is_express: true,
    is_home_activity: false,
    is_travel: false,
  },
  {
    id: 'exp-express-1',
    title: 'Cena Sorpresa',
    description: 'Reserva en un restaurante nuevo.',
    short_description: 'Descubre un restaurante nuevo',
    category: 'express',
    tags: ['gastronomía', 'ciudad'],
    image_url:
      'https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg',
    duration: '2-3 horas',
    location: 'Tu ciudad',
    affiliate_link_placeholder: '',
    mood_tags: ['indecisive', 'need_change', 'couple'],
    is_express: true,
    is_home_activity: false,
    food_options: true,
  },
  {
    id: 'exp-express-2',
    title: 'Descubre este Parque',
    description: 'Explora un parque que no conoces bien.',
    short_description: 'Explora espacios verdes',
    category: 'express',
    tags: ['parque', 'naturaleza'],
    image_url:
      'https://images.pexels.com/photos/33972315/pexels-photo-33972315.jpeg',
    duration: '2-3 horas',
    location: 'Tu ciudad',
    affiliate_link_placeholder: '',
    mood_tags: ['indecisive', 'disconnect', 'couple'],
    is_express: true,
    is_home_activity: false,
    is_travel: false,
  },
  {
    id: 'exp-express-3',
    title: 'Café y Libro',
    description: 'Ve a una cafetería con encanto y disfruta de la lectura.',
    short_description: 'Momento de calma con lectura',
    category: 'express',
    tags: ['café', 'relax'],
    image_url: 'https://images.unsplash.com/photo-1556740767-414a9c4860c1',
    duration: '1-2 horas',
    location: 'Tu ciudad',
    affiliate_link_placeholder: '',
    mood_tags: ['indecisive', 'disconnect'],
    is_express: true,
    is_home_activity: false,
    has_recommendations: true,
  },
  {
    id: 'exp-home-1',
    title: 'Sesión de Yoga',
    description: '20 minutos de yoga para estirar y calmar.',
    short_description: 'Estira tu cuerpo',
    category: 'home',
    tags: ['yoga', 'bienestar'],
    image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    duration: '20 minutos',
    location: 'En casa',
    affiliate_link_placeholder: '',
    mood_tags: ['disconnect', 'indecisive', 'need_change'],
    is_express: false,
    is_home_activity: true,
  },
  {
    id: 'exp-home-2',
    title: 'Meditación Guiada',
    description: '10 minutos para encontrar tu centro.',
    short_description: 'Encuentra tu paz interior',
    category: 'home',
    tags: ['meditación', 'mindfulness'],
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    duration: '10-15 minutos',
    location: 'En casa',
    affiliate_link_placeholder: '',
    mood_tags: ['disconnect', 'indecisive'],
    is_express: false,
    is_home_activity: true,
  },
  {
    id: 'exp-home-3',
    title: 'Carrera Rápida',
    description: '15-20 minutos corriendo para liberar endorfinas.',
    short_description: '15-20 minutos para activarte',
    category: 'home',
    tags: ['running', 'deporte'],
    image_url: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571',
    duration: '15-20 minutos',
    location: 'Tu barrio',
    affiliate_link_placeholder: '',
    mood_tags: ['need_change', 'adventure', 'indecisive'],
    is_express: false,
    is_home_activity: true,
  },
  {
    id: 'exp-home-4',
    title: 'Noche de Película',
    description: 'Prepara palomitas y disfruta de cine en casa.',
    short_description: 'Cine en casa',
    category: 'home',
    tags: ['película', 'relax'],
    image_url:
      'https://images.pexels.com/photos/9807998/pexels-photo-9807998.jpeg',
    duration: '2-3 horas',
    location: 'En casa',
    affiliate_link_placeholder: '',
    mood_tags: ['indecisive', 'disconnect', 'couple'],
    is_express: false,
    is_home_activity: true,
    has_movie_recommendation: true,
  },
  {
    id: 'exp-home-5',
    title: 'Cena Especial en Casa',
    description: 'Cocina algo especial con velas y música.',
    short_description: 'Transforma tu cena',
    category: 'home',
    tags: ['cocina', 'romántico'],
    image_url:
      'https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg',
    duration: '1-2 horas',
    location: 'En casa',
    affiliate_link_placeholder: '',
    mood_tags: ['couple', 'indecisive'],
    is_express: false,
    is_home_activity: true,
    food_options: true,
  },
];

const DAILY_QUOTES = [
  {
    quote:
      'Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.',
    author: 'Carl Jung',
  },
  {
    quote:
      'El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.',
    author: 'Brian Tracy',
  },
  {
    quote: 'No es la montaña lo que conquistamos, sino a nosotros mismos.',
    author: 'Edmund Hillary',
  },
  {
    quote: 'La única manera de hacer un gran trabajo es amar lo que haces.',
    author: 'Steve Jobs',
  },
  {
    quote:
      'El secreto del cambio es enfocar toda tu energía en construir lo nuevo.',
    author: 'Sócrates',
  },
  {
    quote:
      'La vida es lo que pasa mientras estás ocupado haciendo otros planes.',
    author: 'John Lennon',
  },
  {
    quote:
      'Conocer a otros es inteligencia; conocerte a ti mismo es verdadera sabiduría.',
    author: 'Lao Tzu',
  },
  {
    quote:
      'La felicidad no es algo que pospones para el futuro; es algo que diseñas para el presente.',
    author: 'Jim Rohn',
  },
  {
    quote:
      'El que tiene un porqué para vivir, puede soportar casi cualquier cómo.',
    author: 'Friedrich Nietzsche',
  },
  {
    quote: 'El viaje de mil millas comienza con un solo paso.',
    author: 'Lao Tzu',
  },
  {
    quote: 'La mejor forma de predecir el futuro es creándolo.',
    author: 'Peter Drucker',
  },
  {
    quote: 'Lo que niegas te somete. Lo que aceptas te transforma.',
    author: 'Carl Jung',
  },
  { quote: 'La paz viene de dentro. No la busques fuera.', author: 'Buda' },
];

const RECOMMENDED_MOVIES = [
  {
    title: 'Into the Wild',
    year: 2007,
    genre: 'Aventura/Drama',
    description: 'Un joven abandona todo para vivir en la naturaleza.',
  },
  {
    title: 'Comer, Rezar, Amar',
    year: 2010,
    genre: 'Drama',
    description: 'Una mujer viaja buscando encontrarse a sí misma.',
  },
  {
    title: 'El Secreto de Walter Mitty',
    year: 2013,
    genre: 'Aventura',
    description: 'Un soñador emprende una aventura épica.',
  },
  {
    title: 'Soul',
    year: 2020,
    genre: 'Animación',
    description: 'Un músico descubre qué hace que la vida valga la pena.',
  },
  {
    title: 'Amélie',
    year: 2001,
    genre: 'Comedia/Romance',
    description: 'Una joven parisina decide hacer felices a los demás.',
  },
  {
    title: 'Wild',
    year: 2014,
    genre: 'Drama/Aventura',
    description: 'Una mujer recorre sola el Pacific Crest Trail.',
  },
  {
    title: 'Up',
    year: 2009,
    genre: 'Animación/Aventura',
    description: 'Un anciano cumple su sueño de aventura.',
  },
  {
    title: 'Coco',
    year: 2017,
    genre: 'Animación',
    description: 'Un niño descubre la importancia de la familia.',
  },
];

const RECOMMENDED_BOOKS = [
  {
    title: 'El Alquimista',
    author: 'Paulo Coelho',
    genre: 'Ficción filosófica',
  },
  { title: 'Ikigai', author: 'Héctor García', genre: 'Desarrollo personal' },
  {
    title: 'El poder del ahora',
    author: 'Eckhart Tolle',
    genre: 'Espiritualidad',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Desarrollo personal',
  },
  { title: 'Siddhartha', author: 'Hermann Hesse', genre: 'Ficción filosófica' },
];

const COFFEE_PLACES = [
  {
    name: 'Café de especialidad local',
    tip: 'Busca cafeterías con tostado propio',
  },
  { name: 'Librería-cafetería', tip: 'Combina lectura con buen café' },
  {
    name: 'Café con terraza tranquila',
    tip: 'Ideal para observar y reflexionar',
  },
];

const FOOD_OPTIONS = [
  {
    name: 'Cocina mediterránea casera',
    description: 'Ingredientes frescos y sabores reconfortantes',
  },
  {
    name: 'Sushi hecho en casa',
    description: 'Disfruta preparando algo diferente juntos',
  },
  {
    name: 'Pasta italiana artesanal',
    description: 'Desde cero, una experiencia culinaria',
  },
  { name: 'Tapas variadas', description: 'Pequeños bocados para compartir' },
  {
    name: 'Fondue de queso',
    description: 'Perfecto para compartir y conversar',
  },
];

@Injectable()
export class ExperiencesService {
  getExperiences(
    category?: string,
    expressOnly?: boolean,
    homeOnly?: boolean,
    travelOnly?: boolean,
  ): Experience[] {
    let experiences = EXPERIENCES;

    if (expressOnly) {
      experiences = experiences.filter((e) => e.is_express);
    } else if (homeOnly) {
      experiences = experiences.filter((e) => e.is_home_activity);
    } else if (travelOnly) {
      experiences = experiences.filter((e) => e.is_travel);
    } else if (category && category !== 'all') {
      experiences = experiences.filter((e) => e.category === category);
    }

    return experiences;
  }

  getExperience(id: string): Experience {
    const exp = EXPERIENCES.find((e) => e.id === id);
    if (!exp) throw new NotFoundException('Experiencia no encontrada');

    const result = { ...exp };

    if (exp.has_movie_recommendation) {
      result.movie_recommendation =
        RECOMMENDED_MOVIES[
          Math.floor(Math.random() * RECOMMENDED_MOVIES.length)
        ];
    }

    if (exp.has_recommendations) {
      result.coffee_recommendation =
        COFFEE_PLACES[Math.floor(Math.random() * COFFEE_PLACES.length)];
      result.book_recommendation =
        RECOMMENDED_BOOKS[Math.floor(Math.random() * RECOMMENDED_BOOKS.length)];
    }

    if (exp.food_options) {
      result.food_recommendations = [...FOOD_OPTIONS]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    }

    return result;
  }

  getCategories() {
    return [
      { id: 'all', name: 'Todos', icon: 'grid' },
      { id: 'express', name: 'Express', icon: 'flash' },
      { id: 'home', name: 'En Casa', icon: 'home' },
      { id: 'local_nature', name: 'Naturaleza Local', icon: 'leaf' },
      { id: 'couple', name: 'Pareja', icon: 'heart' },
      { id: 'travel', name: 'Escapadas', icon: 'airplane' },
    ];
  }

  getDailyQuote() {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
  }

  getRandomMovie() {
    return RECOMMENDED_MOVIES[
      Math.floor(Math.random() * RECOMMENDED_MOVIES.length)
    ];
  }

  getRandomBook() {
    return RECOMMENDED_BOOKS[
      Math.floor(Math.random() * RECOMMENDED_BOOKS.length)
    ];
  }

  getRandomCoffeePlace() {
    return COFFEE_PLACES[Math.floor(Math.random() * COFFEE_PLACES.length)];
  }

  getRandomFoodOptions() {
    return [...FOOD_OPTIONS].sort(() => Math.random() - 0.5).slice(0, 3);
  }
}

@Controller()
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Get('experiences')
  getExperiences(
    @Query('category') category?: string,
    @Query('express_only') expressOnly?: string,
    @Query('home_only') homeOnly?: string,
    @Query('travel_only') travelOnly?: string,
  ) {
    return this.experiencesService.getExperiences(
      category,
      expressOnly === 'true',
      homeOnly === 'true',
      travelOnly === 'true',
    );
  }

  @Get('experiences/categories/list')
  getCategories() {
    return this.experiencesService.getCategories();
  }

  @Get('experiences/:id')
  getExperience(@Param('id') id: string) {
    return this.experiencesService.getExperience(id);
  }

  @Get('quote/daily')
  getQuote() {
    return this.experiencesService.getDailyQuote();
  }

  @Get('recommendations/movie')
  getMovie() {
    return this.experiencesService.getRandomMovie();
  }

  @Get('recommendations/book')
  getBook() {
    return this.experiencesService.getRandomBook();
  }

  @Get('recommendations/coffee')
  getCoffee() {
    return {
      place: this.experiencesService.getRandomCoffeePlace(),
      book: this.experiencesService.getRandomBook(),
    };
  }

  @Get('recommendations/food')
  getFood() {
    return this.experiencesService.getRandomFoodOptions();
  }
}

@Module({
  providers: [ExperiencesService],
  controllers: [ExperiencesController],
})
export class ExperiencesModule {}
