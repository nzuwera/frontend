# Use a lightweight base image
FROM nginx:alpine
LABEL authors="nzuwera"
# Copy the static website files to the Nginx document root
COPY . /usr/share/nginx/html