# Placeholder Dockerfile for order-service
# This service is not yet implemented
FROM node:20-alpine

WORKDIR /app

# Create a minimal package.json and basic server stub
RUN echo '{"name":"order-service","version":"1.0.0","dependencies":{"express":"^5.1.0"}}' > package.json && \
    npm install && \
    echo "const express = require('express'); const app = express(); app.use(express.json()); app.get('/health', (req, res) => res.json({status: 'ok', service: 'order-service', note: 'Not yet implemented'})); app.listen(4003, () => console.log('Order service placeholder running on port 4003'));" > server.js

EXPOSE 4003

# Placeholder command - keeps service running but returns placeholder responses
CMD ["node", "server.js"]

