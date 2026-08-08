FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client code
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
