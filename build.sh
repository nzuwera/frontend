#!/bin/bash

docker stop websockets
docker rm websockets
docker build -t websockets .
docker run --name websockets -d -p 80:80 websockets
