from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import random
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'innergo_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'innergo-secret-key-2024-secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="InnerGo API", description="Tu guía de bienestar y experiencias")

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    nationality: str = "España"
    language: str = "es"
    city: str = "Madrid"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    nationality: Optional[str] = None
    language: Optional[str] = None
    city: Optional[str] = None

class MoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood: str
    intensity: float = 0.5
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MoodInput(BaseModel):
    mood: str
    intensity: float = 0.5

class TravelSearchRequest(BaseModel):
    origin: str
    max_budget: float
    date_from: str
    date_to: str

class SavedExperience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    experience_id: str
    saved_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

# ==================== CONTENT DATA ====================

DAILY_QUOTES = [
    {"quote": "Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.", "author": "Carl Jung"},
    {"quote": "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.", "author": "Brian Tracy"},
    {"quote": "No es la montaña lo que conquistamos, sino a nosotros mismos.", "author": "Edmund Hillary"},
    {"quote": "La única manera de hacer un gran trabajo es amar lo que haces.", "author": "Steve Jobs"},
    {"quote": "Tu tarea no es buscar el amor, sino encontrar todas las barreras que has construido contra él.", "author": "Rumi"},
    {"quote": "El secreto del cambio es enfocar toda tu energía en construir lo nuevo.", "author": "Sócrates"},
    {"quote": "La vida es lo que pasa mientras estás ocupado haciendo otros planes.", "author": "John Lennon"},
    {"quote": "Conocer a otros es inteligencia; conocerte a ti mismo es verdadera sabiduría.", "author": "Lao Tzu"},
    {"quote": "Un ser humano puede cambiar su vida cambiando su actitud.", "author": "William James"},
    {"quote": "La felicidad no es algo que pospones para el futuro; es algo que diseñas para el presente.", "author": "Jim Rohn"},
    {"quote": "El que tiene un porqué para vivir, puede soportar casi cualquier cómo.", "author": "Friedrich Nietzsche"},
    {"quote": "Tu mente es un jardín, tus pensamientos son las semillas.", "author": "Proverbio"},
    {"quote": "El viaje de mil millas comienza con un solo paso.", "author": "Lao Tzu"},
    {"quote": "La mejor forma de predecir el futuro es creándolo.", "author": "Peter Drucker"},
    {"quote": "Lo que niegas te somete. Lo que aceptas te transforma.", "author": "Carl Jung"},
    {"quote": "El verdadero viaje de descubrimiento consiste en tener nuevos ojos.", "author": "Marcel Proust"},
    {"quote": "La paz viene de dentro. No la busques fuera.", "author": "Buda"},
]

RECOMMENDED_MOVIES = [
    {"title": "Into the Wild", "year": 2007, "genre": "Aventura/Drama", "description": "Un joven abandona todo para vivir en la naturaleza de Alaska."},
    {"title": "Comer, Rezar, Amar", "year": 2010, "genre": "Drama", "description": "Una mujer viaja por Italia, India y Bali buscando encontrarse a sí misma."},
    {"title": "El Secreto de Walter Mitty", "year": 2013, "genre": "Aventura/Comedia", "description": "Un soñador emprende una aventura épica que cambiará su vida."},
    {"title": "Soul", "year": 2020, "genre": "Animación", "description": "Un músico descubre qué es lo que realmente hace que la vida valga la pena."},
    {"title": "Amélie", "year": 2001, "genre": "Comedia/Romance", "description": "Una joven parisina decide hacer felices a los demás."},
    {"title": "Bajo el Sol de la Toscana", "year": 2003, "genre": "Drama/Romance", "description": "Una escritora compra una villa en Italia y reconstruye su vida."},
    {"title": "Wild", "year": 2014, "genre": "Drama/Aventura", "description": "Una mujer recorre sola el Pacific Crest Trail para sanar su vida."},
    {"title": "Up", "year": 2009, "genre": "Animación/Aventura", "description": "Un anciano viudo cumple su sueño de aventura."},
    {"title": "La Vida es Bella", "year": 1997, "genre": "Drama/Comedia", "description": "Un padre usa la imaginación para proteger a su hijo."},
    {"title": "Coco", "year": 2017, "genre": "Animación", "description": "Un niño descubre la importancia de la familia y los recuerdos."},
]

RECOMMENDED_BOOKS = [
    {"title": "El Alquimista", "author": "Paulo Coelho", "genre": "Ficción filosófica"},
    {"title": "Ikigai", "author": "Héctor García y Francesc Miralles", "genre": "Desarrollo personal"},
    {"title": "El poder del ahora", "author": "Eckhart Tolle", "genre": "Espiritualidad"},
    {"title": "Sapiens", "author": "Yuval Noah Harari", "genre": "Historia"},
    {"title": "Atomic Habits", "author": "James Clear", "genre": "Desarrollo personal"},
    {"title": "El monje que vendió su Ferrari", "author": "Robin Sharma", "genre": "Desarrollo personal"},
    {"title": "Siddhartha", "author": "Hermann Hesse", "genre": "Ficción filosófica"},
    {"title": "El arte de no amargarse la vida", "author": "Rafael Santandreu", "genre": "Psicología"},
    {"title": "Mindfulness en la vida cotidiana", "author": "Jon Kabat-Zinn", "genre": "Bienestar"},
    {"title": "Los cuatro acuerdos", "author": "Don Miguel Ruiz", "genre": "Espiritualidad"},
]

COFFEE_PLACES = [
    {"name": "Café de especialidad local", "tip": "Busca cafeterías con tostado propio"},
    {"name": "Librería-cafetería", "tip": "Combina lectura con buen café"},
    {"name": "Café con terraza tranquila", "tip": "Ideal para observar y reflexionar"},
    {"name": "Café de barrio histórico", "tip": "Descubre la historia de tu ciudad"},
    {"name": "Rooftop café", "tip": "Vistas para inspirarte mientras lees"},
]

FOOD_OPTIONS = [
    {"name": "Cocina mediterránea casera", "description": "Ingredientes frescos y sabores reconfortantes"},
    {"name": "Sushi hecho en casa", "description": "Disfruta preparando algo diferente juntos"},
    {"name": "Pasta italiana artesanal", "description": "Desde cero, una experiencia culinaria"},
    {"name": "Tapas variadas", "description": "Pequeños bocados para compartir"},
    {"name": "Cocina asiática fusión", "description": "Sabores exóticos para una noche especial"},
    {"name": "Fondue de queso", "description": "Perfecto para compartir y conversar"},
]

def get_daily_quote():
    day_of_year = datetime.utcnow().timetuple().tm_yday
    return DAILY_QUOTES[day_of_year % len(DAILY_QUOTES)]

def get_random_movie():
    return random.choice(RECOMMENDED_MOVIES)

def get_random_book():
    return random.choice(RECOMMENDED_BOOKS)

def get_random_coffee_place():
    return random.choice(COFFEE_PLACES)

def get_random_food_options():
    return random.sample(FOOD_OPTIONS, min(3, len(FOOD_OPTIONS)))

# ==================== DEMO EXPERIENCES ====================

DEMO_EXPERIENCES = [
    # === ESCAPADAS Y VIAJES ===
    {
        "id": "exp-1",
        "title": "Escapada a la Naturaleza",
        "description": "Desconecta del ruido y reconecta con la naturaleza. Un retiro en un entorno natural donde podrás respirar aire puro y dejar atrás el estrés.",
        "short_description": "Desconecta del ruido y reconecta contigo",
        "category": "nature",
        "tags": ["naturaleza", "relax", "desconexión", "aire libre"],
        "image_url": "https://images.unsplash.com/photo-1560199738-3d933bc1e714",
        "duration": "2-3 días",
        "location": "Destinos naturales",
        "affiliate_link_placeholder": "",
        "mood_tags": ["need_change", "disconnect"],
        "is_express": False,
        "is_home_activity": False,
        "is_travel": True,
        "requires_budget": True
    },
    {
        "id": "exp-2",
        "title": "Aventura en la Montaña",
        "description": "Siente la adrenalina y la libertad de las alturas. Rutas de senderismo, vistas panorámicas y la satisfacción de conquistar nuevas cimas.",
        "short_description": "Conquista nuevas cimas y resetea tu mente",
        "category": "mountain",
        "tags": ["montaña", "aventura", "senderismo", "desafío"],
        "image_url": "https://images.unsplash.com/photo-1454496522488-7a8e488e8606",
        "duration": "3-4 días",
        "location": "Montañas",
        "affiliate_link_placeholder": "",
        "mood_tags": ["adventure", "need_change"],
        "is_express": False,
        "is_home_activity": False,
        "is_travel": True,
        "requires_budget": True
    },
    {
        "id": "exp-3",
        "title": "Relax en la Playa",
        "description": "Aguas cristalinas, arena suave y el sonido de las olas. Un escape perfecto para liberar tensiones.",
        "short_description": "Deja que el mar se lleve tus preocupaciones",
        "category": "beach",
        "tags": ["playa", "relax", "mar", "descanso"],
        "image_url": "https://images.unsplash.com/photo-1505142468610-359e7d316be0",
        "duration": "4-5 días",
        "location": "Costas",
        "affiliate_link_placeholder": "",
        "mood_tags": ["disconnect", "couple"],
        "is_express": False,
        "is_home_activity": False,
        "is_travel": True,
        "requires_budget": True
    },
    {
        "id": "exp-4",
        "title": "Escapada Romántica",
        "description": "Un fin de semana especial para dos. Hotel boutique, cena romántica, spa y momentos inolvidables.",
        "short_description": "Momentos especiales para dos",
        "category": "couple",
        "tags": ["romántico", "pareja", "spa", "hotel"],
        "image_url": "https://images.pexels.com/photos/19763210/pexels-photo-19763210.jpeg",
        "duration": "2-3 días",
        "location": "Destinos románticos",
        "affiliate_link_placeholder": "",
        "mood_tags": ["couple"],
        "is_express": False,
        "is_home_activity": False,
        "is_travel": True,
        "requires_budget": True
    },
    {
        "id": "exp-5",
        "title": "Ruta Gastronómica",
        "description": "Descubre sabores únicos, bodegas con encanto y la mejor gastronomía local.",
        "short_description": "Sabores, vinos y paisajes increíbles",
        "category": "nature",
        "tags": ["gastronomía", "vino", "cultura", "relax"],
        "image_url": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb",
        "duration": "2-3 días",
        "location": "Regiones vinícolas",
        "affiliate_link_placeholder": "",
        "mood_tags": ["need_change", "couple", "disconnect"],
        "is_express": False,
        "is_home_activity": False,
        "is_travel": True,
        "requires_budget": True
    },
    
    # === TREKKING LOCAL (en tu ciudad) ===
    {
        "id": "exp-local-1",
        "title": "Descubre un Sendero Local",
        "description": "Explora rutas de senderismo cerca de tu ciudad. Bosques, parques naturales y caminos que no conocías a pocos kilómetros de casa.",
        "short_description": "Trekking sin salir de tu zona",
        "category": "local_nature",
        "tags": ["trekking", "naturaleza", "local", "senderismo"],
        "image_url": "https://images.unsplash.com/photo-1560199738-3d933bc1e714",
        "duration": "Medio día",
        "location": "Cerca de tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["need_change", "disconnect", "adventure"],
        "is_express": True,
        "is_home_activity": False,
        "is_travel": False
    },
    {
        "id": "exp-local-2",
        "title": "Bosque Urbano",
        "description": "Descubre el pulmón verde de tu ciudad. Un paseo entre árboles para reconectar con la naturaleza sin irte lejos.",
        "short_description": "Naturaleza en tu ciudad",
        "category": "local_nature",
        "tags": ["bosque", "naturaleza", "ciudad", "paseo"],
        "image_url": "https://images.unsplash.com/photo-1612056026402-ac9e86c277e0",
        "duration": "2-3 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["disconnect", "indecisive"],
        "is_express": True,
        "is_home_activity": False,
        "is_travel": False
    },
    
    # === PLANES EXPRESS (en tu ciudad) ===
    {
        "id": "exp-express-1",
        "title": "Cena Sorpresa",
        "description": "Reserva en un restaurante nuevo que no conoces. Sal de tu zona de confort y descubre un lugar diferente.",
        "short_description": "Descubre un restaurante nuevo",
        "category": "express",
        "tags": ["gastronomía", "ciudad", "noche", "descubrimiento"],
        "image_url": "https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg",
        "duration": "2-3 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "need_change", "couple"],
        "is_express": True,
        "is_home_activity": False,
        "food_options": True
    },
    {
        "id": "exp-express-2",
        "title": "Descubre este Parque",
        "description": "Explora un parque de tu ciudad que no conoces bien. Lleva algo para picnic, música y disfruta de los espacios verdes.",
        "short_description": "Explora espacios verdes cerca de ti",
        "category": "express",
        "tags": ["parque", "naturaleza", "ciudad", "descubrimiento"],
        "image_url": "https://images.pexels.com/photos/33972315/pexels-photo-33972315.jpeg",
        "duration": "2-3 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect", "couple"],
        "is_express": True,
        "is_home_activity": False
    },
    {
        "id": "exp-express-3",
        "title": "Café y Libro",
        "description": "Ve a una cafetería con encanto. Pide un buen café y disfruta de un rato de lectura o simplemente observa.",
        "short_description": "Momento de calma con lectura",
        "category": "express",
        "tags": ["café", "relax", "lectura", "ciudad"],
        "image_url": "https://images.unsplash.com/photo-1556740767-414a9c4860c1",
        "duration": "1-2 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect"],
        "is_express": True,
        "is_home_activity": False,
        "has_recommendations": True
    },
    {
        "id": "exp-express-4",
        "title": "Visita Cultural Express",
        "description": "Ve a ese museo o exposición que llevas tiempo queriendo visitar. Hoy es el día.",
        "short_description": "Ese museo que siempre quisiste visitar",
        "category": "express",
        "tags": ["cultura", "museo", "arte", "ciudad"],
        "image_url": "https://images.unsplash.com/photo-1566132127697-4524fea60007",
        "duration": "2-3 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "need_change"],
        "is_express": True,
        "is_home_activity": False
    },
    
    # === ACTIVIDADES EN CASA ===
    {
        "id": "exp-home-1",
        "title": "Sesión de Yoga",
        "description": "20 minutos de yoga para estirar el cuerpo y calmar la mente. Ideal para empezar o terminar el día.",
        "short_description": "Estira tu cuerpo y calma tu mente",
        "category": "home",
        "tags": ["yoga", "bienestar", "casa", "relax"],
        "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
        "duration": "20 minutos",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["disconnect", "indecisive", "need_change"],
        "is_express": False,
        "is_home_activity": True
    },
    {
        "id": "exp-home-2",
        "title": "Meditación Guiada",
        "description": "10 minutos de meditación para encontrar tu centro. Respira, suelta tensiones y conecta con el momento presente.",
        "short_description": "Encuentra tu paz interior",
        "category": "home",
        "tags": ["meditación", "mindfulness", "casa", "paz"],
        "image_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773",
        "duration": "10-15 minutos",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["disconnect", "indecisive"],
        "is_express": False,
        "is_home_activity": True
    },
    {
        "id": "exp-home-3",
        "title": "Carrera Rápida",
        "description": "Ponte las zapatillas y sal a correr 15-20 minutos. No importa la velocidad, lo importante es mover el cuerpo.",
        "short_description": "15-20 minutos para activarte",
        "category": "home",
        "tags": ["running", "deporte", "ejercicio", "energía"],
        "image_url": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571",
        "duration": "15-20 minutos",
        "location": "Tu barrio",
        "affiliate_link_placeholder": "",
        "mood_tags": ["need_change", "adventure", "indecisive"],
        "is_express": False,
        "is_home_activity": True
    },
    {
        "id": "exp-home-4",
        "title": "Entrenamiento Express",
        "description": "Rutina de ejercicios de 20 minutos sin equipamiento. Cardio, fuerza y estiramientos.",
        "short_description": "Rutina completa en 20 minutos",
        "category": "home",
        "tags": ["fitness", "ejercicio", "casa", "energía"],
        "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
        "duration": "20 minutos",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["need_change", "adventure", "indecisive"],
        "is_express": False,
        "is_home_activity": True
    },
    {
        "id": "exp-home-5",
        "title": "Noche de Película",
        "description": "Prepara palomitas, enciende velas y disfruta de una noche de cine en casa con una película especial.",
        "short_description": "Cine en casa con recomendación especial",
        "category": "home",
        "tags": ["película", "relax", "casa", "entretenimiento"],
        "image_url": "https://images.pexels.com/photos/9807998/pexels-photo-9807998.jpeg",
        "duration": "2-3 horas",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect", "couple"],
        "is_express": False,
        "is_home_activity": True,
        "has_movie_recommendation": True
    },
    {
        "id": "exp-home-6",
        "title": "Cena Especial en Casa",
        "description": "Cocina algo especial. Enciende velas, pon música y transforma una cena normal en algo memorable.",
        "short_description": "Transforma tu cena en algo especial",
        "category": "home",
        "tags": ["cocina", "romántico", "casa", "pareja"],
        "image_url": "https://images.pexels.com/photos/35315661/pexels-photo-35315661.jpeg",
        "duration": "1-2 horas",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["couple", "indecisive"],
        "is_express": False,
        "is_home_activity": True,
        "food_options": True
    }
]

# ==================== TRAVEL SEARCH (DEMO) ====================

DEMO_DESTINATIONS = [
    {"city": "Lisboa", "country": "Portugal", "flight_price": 80, "hotel_per_night": 65, "image": "https://images.unsplash.com/photo-1580323956656-26bbb7e19b1e"},
    {"city": "Oporto", "country": "Portugal", "flight_price": 70, "hotel_per_night": 55, "image": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b"},
    {"city": "Marrakech", "country": "Marruecos", "flight_price": 100, "hotel_per_night": 45, "image": "https://images.unsplash.com/photo-1597212618440-806262de4f6b"},
    {"city": "Roma", "country": "Italia", "flight_price": 90, "hotel_per_night": 80, "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5"},
    {"city": "París", "country": "Francia", "flight_price": 85, "hotel_per_night": 95, "image": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34"},
    {"city": "Ámsterdam", "country": "Países Bajos", "flight_price": 75, "hotel_per_night": 90, "image": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017"},
    {"city": "Praga", "country": "República Checa", "flight_price": 65, "hotel_per_night": 50, "image": "https://images.unsplash.com/photo-1541849546-216549ae216d"},
    {"city": "Budapest", "country": "Hungría", "flight_price": 60, "hotel_per_night": 45, "image": "https://images.unsplash.com/photo-1541343672885-9be56236302a"},
    {"city": "Atenas", "country": "Grecia", "flight_price": 95, "hotel_per_night": 60, "image": "https://images.unsplash.com/photo-1555993539-1732b0258235"},
    {"city": "Dubrovnik", "country": "Croacia", "flight_price": 110, "hotel_per_night": 70, "image": "https://images.unsplash.com/photo-1555990538-16d7db2b3ef7"},
]

@api_router.post("/travel/search")
async def search_travel(request: TravelSearchRequest, user: dict = Depends(get_current_user)):
    """
    Search for travel options within budget:
    - Flight must be <= 50% of max budget
    - Hotel must be <= 10% of max budget per night
    """
    max_flight_budget = request.max_budget * 0.5
    max_hotel_budget = request.max_budget * 0.1
    
    # Calculate number of nights from dates
    try:
        date_from = datetime.strptime(request.date_from, "%Y-%m-%d")
        date_to = datetime.strptime(request.date_to, "%Y-%m-%d")
        nights = (date_to - date_from).days
        if nights <= 0:
            nights = 2
    except:
        nights = 2
    
    # Find destinations within budget (demo mode)
    matching_destinations = []
    for dest in DEMO_DESTINATIONS:
        flight_cost = dest["flight_price"] * 2  # Round trip
        hotel_cost = dest["hotel_per_night"] * nights
        total_cost = flight_cost + hotel_cost
        
        if flight_cost <= max_flight_budget and dest["hotel_per_night"] <= max_hotel_budget:
            matching_destinations.append({
                "destination": dest["city"],
                "country": dest["country"],
                "image": dest["image"],
                "flight_price": flight_cost,
                "hotel_price_per_night": dest["hotel_per_night"],
                "hotel_total": hotel_cost,
                "total_estimated": total_cost,
                "nights": nights,
                "within_budget": total_cost <= request.max_budget,
                "savings": request.max_budget - total_cost if total_cost <= request.max_budget else 0
            })
    
    # Sort by total cost
    matching_destinations.sort(key=lambda x: x["total_estimated"])
    
    return {
        "origin": request.origin,
        "max_budget": request.max_budget,
        "dates": {"from": request.date_from, "to": request.date_to, "nights": nights},
        "budget_breakdown": {
            "max_flight": max_flight_budget,
            "max_hotel_per_night": max_hotel_budget
        },
        "destinations": matching_destinations[:5],
        "note": "Precios estimados. La integración con Skyscanner y Booking estará disponible próximamente."
    }

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email.lower(),
        "password_hash": hash_password(user.password),
        "name": user.name,
        "nationality": user.nationality,
        "language": user.language,
        "city": user.city,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user_id, "email": user.email.lower(), "name": user.name,
            "nationality": user.nationality, "language": user.language, "city": user.city
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "nationality": user["nationality"], "language": user["language"],
            "city": user.get("city", "Tu ciudad")
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "nationality": user["nationality"], "language": user["language"],
        "city": user.get("city", "Tu ciudad")
    }

@api_router.put("/auth/profile")
async def update_profile(update: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": user["id"]})
    return {
        "id": updated_user["id"], "email": updated_user["email"], "name": updated_user["name"],
        "nationality": updated_user["nationality"], "language": updated_user["language"],
        "city": updated_user.get("city", "Tu ciudad")
    }

# ==================== MOOD & RECOMMENDATIONS ====================

MOOD_TRANSLATIONS = {
    "need_change": "Necesito un cambio",
    "disconnect": "Quiero desconectar",
    "adventure": "Ganas de aventura",
    "couple": "Planes de pareja",
    "indecisive": "No sé qué hacer"
}

TRAVELER_TYPES = {
    "need_change": "Buscador de Cambios",
    "disconnect": "Explorador Zen",
    "adventure": "Aventurero Nato",
    "couple": "Romántico Viajero",
    "indecisive": "Espíritu Libre"
}

@api_router.post("/mood/analyze")
async def analyze_mood(mood_input: MoodInput, user: dict = Depends(get_current_user)):
    mood_entry = MoodEntry(user_id=user["id"], mood=mood_input.mood, intensity=mood_input.intensity)
    await db.mood_entries.insert_one(mood_entry.dict())
    
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(10).to_list(10)
    
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values()) or 1
    mood_percentages = {MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) for k, v in mood_counts.items()}
    
    # Get matching experiences
    matching_experiences = []
    home_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp.get("mood_tags", []) and exp.get("is_home_activity")]
    express_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp.get("mood_tags", []) and exp.get("is_express")]
    travel_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp.get("mood_tags", []) and exp.get("is_travel")]
    
    if home_exp:
        matching_experiences.append(random.choice(home_exp))
    if express_exp:
        matching_experiences.append(random.choice(express_exp))
    if travel_exp:
        matching_experiences.extend(random.sample(travel_exp, min(2, len(travel_exp))))
    
    daily_quote = get_daily_quote()
    user_city = user.get("city", "tu ciudad")
    
    # AI recommendation
    ai_message = ""
    quick_routine = ""
    
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"innergo-{user['id']}-{datetime.utcnow().timestamp()}",
                system_message=f"""Eres InnerGo, un asistente de bienestar cálido y motivador.
El usuario vive en {user_city}. Tu objetivo es ayudarle con energía positiva.
Responde en español, breve, directo y positivo. Sin markdown ni asteriscos."""
            ).with_model("openai", "gpt-4o")
            
            mood_spanish = MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood)
            prompt = f"""El usuario se siente: {mood_spanish}. Vive en: {user_city}
Genera una respuesta motivadora de máximo 2 frases con energía y acción concreta.
Luego sugiere UNA actividad rápida de máximo 20 minutos.
Formato:
MENSAJE: [mensaje motivador]
RUTINA: [actividad] - [cómo hacerla]"""

            response = await chat.send_message(UserMessage(text=prompt))
            for line in response.strip().split('\n'):
                if line.startswith('MENSAJE:'):
                    ai_message = line.replace('MENSAJE:', '').strip()
                elif line.startswith('RUTINA:'):
                    quick_routine = line.replace('RUTINA:', '').strip()
        except Exception as e:
            logger.error(f"AI error: {e}")
            ai_message = "¡Hoy es un gran día para hacer algo diferente! No lo pienses más."
            quick_routine = "Sal a dar un paseo de 10 minutos - Sin móvil, solo tú y el momento."
    else:
        ai_message = "¡Hoy es un gran día para hacer algo diferente! No lo pienses más."
        quick_routine = "Sal a dar un paseo de 10 minutos - Sin móvil, solo tú y el momento."
    
    return {
        "ai_message": ai_message,
        "quick_routine": quick_routine,
        "experiences": matching_experiences,
        "mood_profile": {
            "current_mood": mood_input.mood,
            "mood_label": MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood),
            "percentages": mood_percentages,
            "traveler_type": TRAVELER_TYPES.get(mood_input.mood, "Explorador")
        },
        "daily_quote": daily_quote
    }

@api_router.get("/mood/history")
async def get_mood_history(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(30).to_list(30)
    return [{"id": e["id"], "mood": e["mood"], "mood_label": MOOD_TRANSLATIONS.get(e["mood"], e["mood"]), 
             "intensity": e["intensity"], "timestamp": e["timestamp"]} for e in history]

@api_router.get("/mood/profile")
async def get_emotional_profile(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).to_list(100)
    if not history:
        return {"dominant_mood": None, "mood_percentages": {}, "traveler_type": "Nuevo Explorador", "total_entries": 0}
    
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values())
    mood_percentages = {MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) for k, v in mood_counts.items()}
    dominant = max(mood_counts, key=mood_counts.get)
    
    return {
        "dominant_mood": MOOD_TRANSLATIONS.get(dominant, dominant),
        "mood_percentages": mood_percentages,
        "traveler_type": TRAVELER_TYPES.get(dominant, "Explorador"),
        "total_entries": total
    }

@api_router.get("/quote/daily")
async def get_quote():
    return get_daily_quote()

# ==================== RECOMMENDATIONS ====================

@api_router.get("/recommendations/movie")
async def get_movie_recommendation():
    return get_random_movie()

@api_router.get("/recommendations/book")
async def get_book_recommendation():
    return get_random_book()

@api_router.get("/recommendations/coffee")
async def get_coffee_recommendation():
    return {
        "place": get_random_coffee_place(),
        "book": get_random_book()
    }

@api_router.get("/recommendations/food")
async def get_food_recommendations():
    return get_random_food_options()

# ==================== EXPERIENCES ====================

@api_router.get("/experiences")
async def get_experiences(category: Optional[str] = None, express_only: bool = False, home_only: bool = False, travel_only: bool = False):
    experiences = DEMO_EXPERIENCES
    
    if express_only:
        experiences = [e for e in experiences if e.get("is_express")]
    elif home_only:
        experiences = [e for e in experiences if e.get("is_home_activity")]
    elif travel_only:
        experiences = [e for e in experiences if e.get("is_travel")]
    elif category and category != "all":
        if category == "local_nature":
            experiences = [e for e in experiences if e.get("category") == "local_nature" or (e.get("is_express") and "naturaleza" in e.get("tags", []))]
        else:
            experiences = [e for e in experiences if e.get("category") == category]
    
    return experiences

@api_router.get("/experiences/{experience_id}")
async def get_experience(experience_id: str):
    for exp in DEMO_EXPERIENCES:
        if exp["id"] == experience_id:
            result = dict(exp)
            # Add recommendations based on type
            if exp.get("has_movie_recommendation"):
                result["movie_recommendation"] = get_random_movie()
            if exp.get("has_recommendations"):
                result["coffee_recommendation"] = get_random_coffee_place()
                result["book_recommendation"] = get_random_book()
            if exp.get("food_options"):
                result["food_recommendations"] = get_random_food_options()
            return result
    raise HTTPException(status_code=404, detail="Experiencia no encontrada")

@api_router.get("/experiences/categories/list")
async def get_categories():
    return [
        {"id": "all", "name": "Todos", "icon": "grid"},
        {"id": "express", "name": "Express", "icon": "flash"},
        {"id": "home", "name": "En Casa", "icon": "home"},
        {"id": "local_nature", "name": "Naturaleza Local", "icon": "leaf"},
        {"id": "couple", "name": "Pareja", "icon": "heart"},
        {"id": "travel", "name": "Escapadas", "icon": "airplane"}
    ]

# ==================== SAVED ====================

@api_router.post("/saved/{experience_id}")
async def save_experience(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({"user_id": user["id"], "experience_id": experience_id})
    if existing:
        return {"message": "Ya guardada", "saved": True}
    saved = SavedExperience(user_id=user["id"], experience_id=experience_id)
    await db.saved_experiences.insert_one(saved.dict())
    return {"message": "Guardada", "saved": True}

@api_router.delete("/saved/{experience_id}")
async def unsave_experience(experience_id: str, user: dict = Depends(get_current_user)):
    await db.saved_experiences.delete_one({"user_id": user["id"], "experience_id": experience_id})
    return {"message": "Eliminada", "saved": False}

@api_router.get("/saved")
async def get_saved_experiences(user: dict = Depends(get_current_user)):
    saved = await db.saved_experiences.find({"user_id": user["id"]}).to_list(100)
    saved_ids = [s["experience_id"] for s in saved]
    return [exp for exp in DEMO_EXPERIENCES if exp["id"] in saved_ids]

@api_router.get("/saved/check/{experience_id}")
async def check_saved(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({"user_id": user["id"], "experience_id": experience_id})
    return {"saved": existing is not None}

# ==================== HEALTH ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "app": "InnerGo API", "version": "2.0.0"}

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_db_client():
    logger.info("InnerGo API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
