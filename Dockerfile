# Use Node LTS
FROM node:20-alpine

# Set working dir
WORKDIR /app

# Copy package files and install
COPY package*.json tsconfig.json ./
RUN npm install

# Copy rest of code
COPY . .

# Build TS → JS
RUN npm run build

# Expose backend port
EXPOSE 4000

# Run the compiled JS
CMD ["npm", "start"]
