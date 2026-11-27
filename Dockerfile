# Easypanel: App > Source = GitHub repo, Build = Dockerfile. Mount a volume at /data/uploads.
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-alpine AS run
RUN apk add --no-cache openssl && npm i -g prisma@6.19.3
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /data/uploads
EXPOSE 3000
# Apply DB migrations on every boot, then start.
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
