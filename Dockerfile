FROM node:14.15.4-slim

# Create app directory
WORKDIR /code

# Install app dependencies.
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+).
COPY package*.json ./

# Build code for production
RUN npm ci --only=production
# Globally install knex so migrations could be ran.
RUN npm install knex -g

# Bundle app source
COPY . .

EXPOSE 3000