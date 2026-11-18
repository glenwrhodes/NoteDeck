# Image for the NoteDeck web frontend. This is a MULTI-STAGE build:
#   Stage 1 ("build") has Node and all the build tools, and runs Vite.
#   Stage 2 starts fresh from a small nginx image and copies in only the
#   finished files from stage 1. Node, node_modules and the source code are
#   left behind, so the final image is small and only serves static files.

# ---- Stage 1: build the React app -------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, so this layer is cached until package files change.
COPY package.json package-lock.json ./
RUN npm ci

# Then the source, and the production build (output goes to /app/dist).
COPY . .
RUN npm run build

# ---- Stage 2: serve it with nginx -------------------------------------
FROM nginx:1.27-alpine

# Our site config: serve the app and forward /api to the api service.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Only the built files cross over from stage 1.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# The nginx base image already defines the start command (CMD).
