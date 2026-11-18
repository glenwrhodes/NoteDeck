# Image for the NoteDeck API.
# Each instruction below adds a layer to the image. Docker caches layers, so we
# copy package files and install dependencies BEFORE copying the source code:
# editing a .js file then reuses the cached npm install layer.

# Start from the official Node.js image (small Alpine Linux variant).
FROM node:22-alpine

# All following commands run in /app inside the image.
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies exactly as pinned in package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application code.
COPY src ./src

# Don't run as root inside the container.
USER node

# Documents the port the app listens on (inside the Compose network).
EXPOSE 3000

# The command a container runs when it starts from this image.
CMD ["node", "src/server.js"]
