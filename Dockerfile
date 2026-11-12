FROM node:26-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@12.16.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:26-alpine
WORKDIR /app
RUN npm install -g pnpm@12.16.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY .env .env
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/main.js"]
