FROM node:22-alpine AS build

ARG VITE_LIFEOPS_API_BASE=http://localhost:8000
ENV VITE_LIFEOPS_API_BASE=$VITE_LIFEOPS_API_BASE

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
