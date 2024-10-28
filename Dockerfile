# Use a lightweight Node.js image
FROM node:18-alpine

# Install serve globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy over the static files from the dist directory
COPY dist /app

# Expose the port serve will run on
EXPOSE 3000

# Command to serve the static files
CMD ["serve", "-s", ".", "-l", "3000"]
