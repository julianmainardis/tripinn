# Run TripInn locally (Expo + backend)

## 1) Start MongoDB

```bash
cd /Users/julianmainardis/Desktop/Prog/tripinn/tripinn
docker compose up -d mongo
```

## 2) Start backend (FastAPI)

```bash
cd /Users/julianmainardis/Desktop/Prog/tripinn/tripinn/backend
python3 -m venv .venv
source .venv/bin/activate
cp .env.example .env
python -m pip install --upgrade pip
pip install -r requirements.txt
python server.py
```

Backend listens on `http://127.0.0.1:8000`.

## 3) Start frontend (Expo)

```bash
cd /Users/julianmainardis/Desktop/Prog/tripinn/tripinn/frontend
npm install
cp .env.example .env
npx expo start -c
```

Then press `i` in Expo terminal to open iOS simulator.
