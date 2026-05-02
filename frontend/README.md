# LogiTwin Pune Frontend

## Install

```bash
cd frontend
npm install
```

## Configure token

Create a `.env` file inside `frontend/`:

```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

## Run

```bash
npm start
```

## Dependencies used

- `mapbox-gl`
- `axios`

## Notes

- `src/App.js` reads the token from `REACT_APP_MAPBOX_TOKEN`.
- Use `.env.example` as the reference for your local `.env`.
- The UI centers on Pune and uses Mapbox Geocoding + Directions APIs.
- Traffic colors and risk score are intentionally mocked for demo use.
