FROM node:alpine

RUN apk --no-cache upgrade && apk add yarn

WORKDIR /opt/gallery
COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
RUN yarn install --frozen-lockfile
COPY . .

COPY ./.docker/gallery/entrypoint.sh entrypoint.sh

RUN yarn prisma generate

RUN mkdir -p /var/lib/gallery/photos/marked \
  &&  mkdir -p /var/lib/gallery/photos/thumb

EXPOSE 3000

USER node

ENTRYPOINT ["sh", "entrypoint.sh"]
