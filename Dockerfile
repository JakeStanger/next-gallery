FROM node:alpine

RUN apk --no-cache upgrade && apk add yarn

WORKDIR /opt/gallery
COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
RUN yarn install --frozen-lockfile
COPY . .

RUN chown -R node:node .

RUN yarn prisma generate

RUN mkdir -p /var/lib/gallery/uploads/marked \
  &&  mkdir -p /var/lib/gallery/uploads/thumb

EXPOSE 3000

USER node

ENTRYPOINT ["npm", "run", "start"]
