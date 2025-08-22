# Base Next.js image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "start", "-p", "3001"]