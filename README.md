
# Frontend — JWT Login + Autocomplete

- Login a `/login` → guarda `access_token` en `sessionStorage`.
- Autocompleta **Library** con `/catalog/schemas` y **Table** con `/catalog`.
- Exporta **CSV/XLSX/JSON** con header `Authorization: Bearer <token>`.

## Dev
```bash
npm install
npm run dev
```

## Backend
- En dev usa el proxy `/api` (no configures `.env`).
- O define `.env.development` con `VITE_API_BASE=http://localhost:8000`.

## Build
```bash
npm run build
npm run preview
```
# ibmi_frontend_jwt
