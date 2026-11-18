
# ==========================================
# Stage 1: Build React frontend
# ==========================================

FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies using lock file
RUN npm ci

# Copy frontend source code
COPY . .

# Vite environment variable is embedded during build
ARG VITE_API_BASE_URL=/api

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Create production build
RUN npm run build


# ==========================================
# Stage 2: Serve frontend using Nginx
# ==========================================

FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Add our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React application
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx serves the application on port 3000
EXPOSE 3000

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
