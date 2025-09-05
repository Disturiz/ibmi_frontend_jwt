# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

# Copia manifiestos primero (mejor caché)
COPY package.json ./
COPY package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Instala según lockfile disponible
RUN if [ -f pnpm-lock.yaml ]; then \
    npm i -g pnpm && pnpm install --frozen-lockfile ; \
    elif [ -f yarn.lock ]; then \
    npm i -g yarn && yarn install --frozen-lockfile ; \
    elif [ -f package-lock.json ]; then \
    npm ci ; \
    else \
    npm install ; \
    fi

# Copia el resto del código
COPY . .

# Variable para tu API (Vite lee VITE_*)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Compila
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
