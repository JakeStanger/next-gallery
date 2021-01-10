# next-gallery

A photo web gallery and store built with NextJS.

A live version can be seen at <https://rstanger.co.uk>.

The database and site structure are rather geared towards the requirements of the above site, but I've tried to design
it to be relatively easy to hack and customise.

## Features

- Masonry layout.
- Designed to work on any size screen.
- Ability to sort images into categories and groups.
- Full admin area for viewing, adding, updating and removing all data.
- Supports AWS S3 for storing images and static assets.
  - Works well paired with Cloudfront or another CDN service.
- Stripe Checkout integration for purchasing products based on your images.
- Defaults to webp to greatly reduce image sizes with no loss in quality.
  - Automatically Falls back to jpeg where webp is not supported.
- Automatic image optimisation regardless of host.
- Static page generation, even for dynamic content, using NextJS's revalidation features.
- Server-side and client-side Sentry support for error tracking
