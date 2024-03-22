FROM node:18
RUN mkdir -p /app
WORKDIR /app
COPY . .
# RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*
RUN npm install 
RUN npm run proto:install
RUN npm run build
EXPOSE 80
EXPOSE 5000
CMD ["npm", "start"]