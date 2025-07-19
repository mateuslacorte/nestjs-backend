# Backend

## Setup

### Prerequisites

Before setting up the project, make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [NestJS CLI](https://docs.nestjs.com/)
- [Docker](https://www.docker.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [MongoDB](https://www.mongodb.com/)
- [Redis](https://redis.io/)

### 1. Clone the Repository

```bash
git clone https://github.com/mateuslacorte/nestjs-backend.git
cd nestjs-backend
```

## 2. Install Dependencies

Run the following command to install the required packages:

```bash
npm install
```

## 3. Set Up Environment Variables

Create a `.env` file in the root of the project and add the following environment variables:

```bash
# .env
LOGTAIL_SOURCE_TOKEN=your_logtail_source_token

APP_NAME=Backend
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
API_PREFIX=api
GRAPHQL_PLAYGROUND=true

LOGTAIL_SOURCE_TOKEN=your_betterstack_source_token

JWT_SECRET=secret
JWT_EXPIRATION_TIME=1h

KAFKA_CLIENT_ID=my-client
KAFKA_BROKERS=localhost:9092,localhost:9093
KAFKA_GROUP_ID=my-group
KAFKA_SSL=false
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=my_username
KAFKA_SASL_PASSWORD=my_password

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=my_redis_password
REDIS_DB=0
REDIS_TTL=3600

MONGO_URI=mongodb://localhost:27017/mongo
POSTGRES_URI=postgres://user:password@localhost:5432/postgres

BCRYPT_HASH_FACTOR=16
```

## 4. Start the Development Server

Run the following command to start the NestJS server in development mode:

```bash
npm run start:dev
```

This will start the server with hot-reloading enabled, so any changes you make will automatically restart the server.

## 5. Docker Setup (Optional)

For running the entire environment with Docker, you can use the following command:

```bash
docker-compose up --build
```

This will set up the necessary services like MongoDB, PostgreSQL, Redis, and Kafka in Docker containers.

## API Documentation

```
http://localhost:3000/docs
```

## Logging

We use **Logtail** for centralized logging. Logs will be sent to your Logtail dashboard, where you can monitor the performance and health of the platform.`

## Testing

To run tests, use the following command:

```bash
npm run test
```

### Run Tests in Watch Mode:

```bash
npm run test:watch
```

### Run Tests with Coverage:

```bash
npm run test:cov
```

## Contributing

If you would like to contribute to the project, feel free to fork this repository, make your changes, and submit a pull request. Please ensure that your code follows the existing style and includes relevant tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries, please contact us at: [contact@decide.bet](mailto:contact@decide.bet).
