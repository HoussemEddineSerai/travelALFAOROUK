FROM node:20-slim

WORKDIR /app

# Install system dependencies for Prisma/SSL
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# Install dependencies for root and server
COPY package.json package-lock.json* ./
COPY server/package.json ./server/

RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Ensure uploads directory exists and has correct permissions
RUN mkdir -p public/uploads && chmod 777 public/uploads

# Generate Prisma client
RUN cd server && npm install && chmod +x ./node_modules/.bin/prisma && npx prisma generate

# Build frontend (Vite)
RUN npm run build

# Production settings
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start unified server and sync database schema
# Start unified server and sync database schema
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ] && [ -n \"$DB_HOST\" ]; then export DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME\"; fi && cd server && npx prisma db push && cd .. && npm start"]
