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
db = client[os.environ.get('DB_NAME', 'numa_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'numa-secret-key-2024-secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="Numa API", description="Emotional wellness & travel recommendation app")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    nationality: str
    language: str
    city: str
    created_at: datetime

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

class Experience(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    short_description: str
    category: str  # nature, beach, mountain, urban, retreat, express, home, couple
    tags: List[str]
    image_url: str
    duration: str
    location: str
    affiliate_link_placeholder: str = ""
    mood_tags: List[str]
    is_express: bool = False
    is_home_activity: bool = False

class RecommendationResponse(BaseModel):
    ai_message: str
    quick_routine: str
    experiences: List[Experience]
    mood_profile: dict
    daily_quote: dict

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
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
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

# ==================== DAILY QUOTES ====================

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
    {"quote": "No te preocupes por los fracasos, preocúpate por las chances que pierdes cuando no intentas.", "author": "Jack Canfield"},
    {"quote": "Cada día es una nueva oportunidad para cambiar tu vida.", "author": "Anónimo"},
    {"quote": "El único viaje imposible es el que nunca comienzas.", "author": "Tony Robbins"}
]

def get_daily_quote():
    # Get quote based on day of year for consistency
    day_of_year = datetime.utcnow().timetuple().tm_yday
    index = day_of_year % len(DAILY_QUOTES)
    return DAILY_QUOTES[index]

# ==================== DEMO EXPERIENCES ====================

DEMO_EXPERIENCES = [
    # === ESCAPADAS Y VIAJES ===
    {
        "id": "exp-1",
        "title": "Escapada a la Naturaleza",
        "description": "Desconecta del ruido y reconecta con la naturaleza. Un retiro de 2-3 días en un entorno natural donde podrás respirar aire puro y dejar atrás el estrés.",
        "short_description": "Desconecta del ruido y reconecta contigo",
        "category": "nature",
        "tags": ["naturaleza", "relax", "desconexión", "aire libre"],
        "image_url": "https://images.unsplash.com/photo-1588152850700-c82ecb8ba9b1",
        "duration": "2-3 días",
        "location": "Pirineos, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=pirineos",
        "mood_tags": ["need_change", "disconnect"],
        "is_express": False,
        "is_home_activity": False
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
        "location": "Sierra Nevada, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=sierra-nevada",
        "mood_tags": ["adventure", "need_change"],
        "is_express": False,
        "is_home_activity": False
    },
    {
        "id": "exp-3",
        "title": "Relax en la Playa",
        "description": "Aguas cristalinas, arena suave y el sonido de las olas. Un escape perfecto para liberar tensiones y dejar que el mar se lleve tus preocupaciones.",
        "short_description": "Deja que el mar se lleve tus preocupaciones",
        "category": "beach",
        "tags": ["playa", "relax", "mar", "descanso"],
        "image_url": "https://images.unsplash.com/photo-1505142468610-359e7d316be0",
        "duration": "4-5 días",
        "location": "Costa Brava, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=costa-brava",
        "mood_tags": ["disconnect", "couple"],
        "is_express": False,
        "is_home_activity": False
    },
    {
        "id": "exp-4",
        "title": "Escapada Romántica",
        "description": "Un fin de semana especial para dos. Hotel boutique, cena romántica, spa y momentos inolvidables para reconectar con tu pareja.",
        "short_description": "Momentos especiales para dos",
        "category": "couple",
        "tags": ["romántico", "pareja", "spa", "hotel"],
        "image_url": "https://images.unsplash.com/photo-1596178065887-1198b6148b2b",
        "duration": "2-3 días",
        "location": "Mallorca, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=mallorca-romantic",
        "mood_tags": ["couple"],
        "is_express": False,
        "is_home_activity": False
    },
    {
        "id": "exp-5",
        "title": "Ruta Gastronómica",
        "description": "Descubre sabores únicos, bodegas con encanto y la mejor gastronomía local. Una experiencia sensorial que combina placer y descubrimiento.",
        "short_description": "Sabores, vinos y paisajes increíbles",
        "category": "nature",
        "tags": ["gastronomía", "vino", "cultura", "relax"],
        "image_url": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb",
        "duration": "2-3 días",
        "location": "La Rioja, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=la-rioja",
        "mood_tags": ["need_change", "couple", "disconnect"],
        "is_express": False,
        "is_home_activity": False
    },
    {
        "id": "exp-6",
        "title": "Aventura Acuática",
        "description": "Kayak, paddle surf, snorkel y más. Explora costas vírgenes y vive la emoción del mar desde otra perspectiva.",
        "short_description": "Adrenalina y diversión en el agua",
        "category": "beach",
        "tags": ["deportes acuáticos", "aventura", "mar", "emoción"],
        "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
        "duration": "1-2 días",
        "location": "Formentera, España",
        "affiliate_link_placeholder": "https://booking.com/search?dest=formentera",
        "mood_tags": ["adventure", "couple"],
        "is_express": False,
        "is_home_activity": False
    },
    
    # === PLANES EXPRESS (en tu ciudad) ===
    {
        "id": "exp-express-1",
        "title": "Cena Sorpresa",
        "description": "Reserva en un restaurante nuevo que no conoces. Sal de tu zona de confort y descubre un lugar diferente esta noche.",
        "short_description": "Descubre un restaurante nuevo esta noche",
        "category": "express",
        "tags": ["gastronomía", "ciudad", "noche", "descubrimiento"],
        "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
        "duration": "2-3 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "need_change", "couple"],
        "is_express": True,
        "is_home_activity": False
    },
    {
        "id": "exp-express-2",
        "title": "Paseo sin Rumbo",
        "description": "Sal a caminar sin destino fijo. Elige una dirección y descubre rincones de tu ciudad que nunca habías visto. Sin móvil, sin prisas.",
        "short_description": "Explora tu ciudad sin destino fijo",
        "category": "express",
        "tags": ["paseo", "ciudad", "mindfulness", "descubrimiento"],
        "image_url": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
        "duration": "1-2 horas",
        "location": "Tu barrio",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect", "need_change"],
        "is_express": True,
        "is_home_activity": False
    },
    {
        "id": "exp-express-3",
        "title": "Café y Libro",
        "description": "Ve a esa cafetería que siempre te llamó la atención. Pide algo nuevo y disfruta de un rato de lectura o simplemente observa a la gente pasar.",
        "short_description": "Momento de calma en una cafetería",
        "category": "express",
        "tags": ["café", "relax", "lectura", "ciudad"],
        "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
        "duration": "1-2 horas",
        "location": "Tu ciudad",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect"],
        "is_express": True,
        "is_home_activity": False
    },
    {
        "id": "exp-express-4",
        "title": "Cita en el Parque",
        "description": "Prepara un picnic improvisado y sorprende a tu pareja con una tarde en el parque. Lleva algo para picar, una manta y música.",
        "short_description": "Picnic romántico improvisado",
        "category": "express",
        "tags": ["romántico", "parque", "picnic", "pareja"],
        "image_url": "https://images.unsplash.com/photo-1529543544599-e4137a95a1a7",
        "duration": "2-3 horas",
        "location": "Parque cercano",
        "affiliate_link_placeholder": "",
        "mood_tags": ["couple", "indecisive"],
        "is_express": True,
        "is_home_activity": False
    },
    {
        "id": "exp-express-5",
        "title": "Visita Cultural Express",
        "description": "Ve a ese museo o exposición que llevas tiempo queriendo visitar. Hoy es el día. No lo pienses más.",
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
        "description": "20 minutos de yoga para estirar el cuerpo y calmar la mente. Ideal para empezar o terminar el día con energía renovada.",
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
        "description": "Ponte las zapatillas y sal a correr 15-20 minutos. No importa la velocidad, lo importante es mover el cuerpo y liberar endorfinas.",
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
        "description": "Rutina de ejercicios de 20 minutos sin equipamiento. Cardio, fuerza y estiramientos para sentirte mejor al instante.",
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
        "description": "Prepara palomitas, elige esa película que llevas tiempo queriendo ver y disfruta de una noche de cine en casa.",
        "short_description": "Noche de cine en casa",
        "category": "home",
        "tags": ["película", "relax", "casa", "entretenimiento"],
        "image_url": "https://images.unsplash.com/photo-1585647347483-22b66260dfff",
        "duration": "2-3 horas",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["indecisive", "disconnect", "couple"],
        "is_express": False,
        "is_home_activity": True
    },
    {
        "id": "exp-home-6",
        "title": "Cena Especial en Casa",
        "description": "Cocina algo especial para ti o para tu pareja. Enciende velas, pon música y transforma una cena normal en algo memorable.",
        "short_description": "Transforma tu cena en algo especial",
        "category": "home",
        "tags": ["cocina", "romántico", "casa", "pareja"],
        "image_url": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
        "duration": "1-2 horas",
        "location": "En casa",
        "affiliate_link_placeholder": "",
        "mood_tags": ["couple", "indecisive"],
        "is_express": False,
        "is_home_activity": True
    }
]

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
            "id": user_id,
            "email": user.email.lower(),
            "name": user.name,
            "nationality": user.nationality,
            "language": user.language,
            "city": user.city
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "nationality": user["nationality"],
            "language": user["language"],
            "city": user.get("city", "Tu ciudad")
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "nationality": user["nationality"],
        "language": user["language"],
        "city": user.get("city", "Tu ciudad")
    }

@api_router.put("/auth/profile")
async def update_profile(update: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]})
    return {
        "id": updated_user["id"],
        "email": updated_user["email"],
        "name": updated_user["name"],
        "nationality": updated_user["nationality"],
        "language": updated_user["language"],
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
    # Save mood entry
    mood_entry = MoodEntry(
        user_id=user["id"],
        mood=mood_input.mood,
        intensity=mood_input.intensity
    )
    await db.mood_entries.insert_one(mood_entry.dict())
    
    # Get user's mood history for context
    history = await db.mood_entries.find({"user_id": user["id"]}).sort("timestamp", -1).limit(10).to_list(10)
    
    # Calculate mood profile
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values()) or 1
    mood_percentages = {MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) for k, v in mood_counts.items()}
    
    # Get matching experiences - mix of all types
    matching_experiences = []
    
    # Get travel/escape experiences
    travel_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp["mood_tags"] and not exp["is_express"] and not exp["is_home_activity"]]
    # Get express experiences
    express_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp["mood_tags"] and exp["is_express"]]
    # Get home activities
    home_exp = [exp for exp in DEMO_EXPERIENCES if mood_input.mood in exp["mood_tags"] and exp["is_home_activity"]]
    
    # Mix recommendations: 1 home, 1 express, 2 travel
    if home_exp:
        matching_experiences.append(random.choice(home_exp))
    if express_exp:
        matching_experiences.append(random.choice(express_exp))
    if travel_exp:
        matching_experiences.extend(random.sample(travel_exp, min(2, len(travel_exp))))
    
    # Get daily quote
    daily_quote = get_daily_quote()
    
    # Generate AI recommendation
    ai_message = ""
    quick_routine = ""
    
    user_city = user.get("city", "tu ciudad")
    
    if EMERGENT_LLM_KEY:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"numa-{user['id']}-{datetime.utcnow().timestamp()}",
                system_message=f"""Eres Numa, un asistente de bienestar positivo y motivador.
El usuario es de {user.get('nationality', 'España')}, vive en {user_city} y habla {user.get('language', 'español')}.
Tu objetivo es ayudarle a decidir qué hacer y motivarle con energía positiva.
Responde siempre en español de forma breve, directa y positiva.
NO uses markdown ni asteriscos. Solo texto plano."""
            ).with_model("openai", "gpt-4o")
            
            mood_spanish = MOOD_TRANSLATIONS.get(mood_input.mood, mood_input.mood)
            
            prompt = f"""El usuario se siente: {mood_spanish}
Vive en: {user_city}

Genera una respuesta motivadora de máximo 2 frases que:
1. Le dé energía y motivación
2. Le proponga una acción concreta

Luego sugiere UNA actividad rápida que pueda hacer AHORA MISMO (máximo 20 minutos).

Formato exacto:
MENSAJE: [tu mensaje motivador]
RUTINA: [nombre de la actividad] - [descripción breve de cómo hacerla]"""

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            lines = response.strip().split('\n')
            for line in lines:
                if line.startswith('MENSAJE:'):
                    ai_message = line.replace('MENSAJE:', '').strip()
                elif line.startswith('RUTINA:'):
                    quick_routine = line.replace('RUTINA:', '').strip()
                    
        except Exception as e:
            logger.error(f"AI recommendation error: {e}")
            ai_message = "¡Hoy es un gran día para hacer algo diferente! No lo pienses más, solo hazlo."
            quick_routine = "Sal a dar un paseo de 10 minutos - Sin móvil, solo tú y el momento presente."
    else:
        ai_message = "¡Hoy es un gran día para hacer algo diferente! No lo pienses más, solo hazlo."
        quick_routine = "Sal a dar un paseo de 10 minutos - Sin móvil, solo tú y el momento presente."
    
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
    return [
        {
            "id": entry["id"],
            "mood": entry["mood"],
            "mood_label": MOOD_TRANSLATIONS.get(entry["mood"], entry["mood"]),
            "intensity": entry["intensity"],
            "timestamp": entry["timestamp"]
        }
        for entry in history
    ]

@api_router.get("/mood/profile")
async def get_emotional_profile(user: dict = Depends(get_current_user)):
    history = await db.mood_entries.find({"user_id": user["id"]}).to_list(100)
    
    if not history:
        return {
            "dominant_mood": None,
            "mood_percentages": {},
            "traveler_type": "Nuevo Explorador",
            "total_entries": 0
        }
    
    mood_counts = {}
    for entry in history:
        m = entry["mood"]
        mood_counts[m] = mood_counts.get(m, 0) + 1
    
    total = sum(mood_counts.values())
    mood_percentages = {
        MOOD_TRANSLATIONS.get(k, k): round(v/total * 100) 
        for k, v in mood_counts.items()
    }
    
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

# ==================== EXPERIENCES ====================

@api_router.get("/experiences")
async def get_experiences(category: Optional[str] = None, express_only: bool = False, home_only: bool = False):
    experiences = DEMO_EXPERIENCES
    
    if express_only:
        experiences = [e for e in experiences if e["is_express"]]
    elif home_only:
        experiences = [e for e in experiences if e["is_home_activity"]]
    elif category:
        experiences = [e for e in experiences if e["category"] == category]
    
    return experiences

@api_router.get("/experiences/{experience_id}")
async def get_experience(experience_id: str):
    for exp in DEMO_EXPERIENCES:
        if exp["id"] == experience_id:
            return exp
    raise HTTPException(status_code=404, detail="Experiencia no encontrada")

@api_router.get("/experiences/categories/list")
async def get_categories():
    return [
        {"id": "all", "name": "Todos", "icon": "grid"},
        {"id": "nature", "name": "Naturaleza", "icon": "leaf"},
        {"id": "beach", "name": "Playa", "icon": "sunny"},
        {"id": "mountain", "name": "Montaña", "icon": "triangle"},
        {"id": "couple", "name": "Pareja", "icon": "heart"},
        {"id": "express", "name": "Express", "icon": "flash"},
        {"id": "home", "name": "En Casa", "icon": "home"}
    ]

# ==================== SAVED EXPERIENCES ====================

@api_router.post("/saved/{experience_id}")
async def save_experience(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    if existing:
        return {"message": "Ya guardada", "saved": True}
    
    saved = SavedExperience(user_id=user["id"], experience_id=experience_id)
    await db.saved_experiences.insert_one(saved.dict())
    return {"message": "Guardada", "saved": True}

@api_router.delete("/saved/{experience_id}")
async def unsave_experience(experience_id: str, user: dict = Depends(get_current_user)):
    await db.saved_experiences.delete_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    return {"message": "Eliminada", "saved": False}

@api_router.get("/saved")
async def get_saved_experiences(user: dict = Depends(get_current_user)):
    saved = await db.saved_experiences.find({"user_id": user["id"]}).to_list(100)
    saved_ids = [s["experience_id"] for s in saved]
    
    experiences = [exp for exp in DEMO_EXPERIENCES if exp["id"] in saved_ids]
    return experiences

@api_router.get("/saved/check/{experience_id}")
async def check_saved(experience_id: str, user: dict = Depends(get_current_user)):
    existing = await db.saved_experiences.find_one({
        "user_id": user["id"],
        "experience_id": experience_id
    })
    return {"saved": existing is not None}

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "app": "Numa API", "version": "1.1.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Numa API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
