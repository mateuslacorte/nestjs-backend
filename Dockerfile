# Use the official Node.js image from the Docker Hub
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the port the app runs on (default is 3000 for NestJS)
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "start:prod"]
