FROM public.ecr.aws/lambda/nodejs:22

# Copy function code
COPY lib/index.js package.json ${LAMBDA_TASK_ROOT}

# Commands
RUN npm cache clean --force
RUN rm -rf node_modules

## update the dockerfile with the following lines:
RUN npm install
RUN SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --arch=x64 --platform=linux sharp


# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.handler" ]
