# Decide.Bet Backend

Decide.Bet is a decentralized betting platform built on the Solana blockchain, enabling users to place bets on a wide variety of topics. The backend of the platform is powered by NestJS and uses Kafka for messaging, Redis for caching, MongoDB for writing, PostgreSQL for reading, and integrates with Stripe and Pix for payment processing. This project also includes integration with Logtail for logging and scalability via GraphQL.

## Features

- **User-Created Bets**: Users can create new betting options, subject to admin approval.
- **Solana Blockchain**: The platform leverages the Solana blockchain for seamless transactions and coin management.
- **Betting Marketplace**: Users can bet on a variety of predefined or user-generated betting options.
- **Peer-to-Peer Selling**: Users can sell their betting coins back to the platform.
- **Admin Dashboard**: Admins can approve or reject user-created betting options.
- **Payment Integrations**: Payments can be processed via Stripe (USD) and Pix (BRL).
- **Scalable Backend**: The backend is built to scale horizontally and integrates Redis for caching, Kafka for messaging, and MongoDB/PostgreSQL for database operations.

## Architecture

The backend uses the following technologies and tools:
- **NestJS**: A TypeScript-based framework for building scalable and maintainable applications.
- **Kafka**: A distributed event streaming platform for managing real-time data streams.
- **MongoDB**: Used for writing data and providing a flexible schema for fast development.
- **PostgreSQL**: Used for reading data, ensuring consistency and scalability for complex queries.
- **Redis**: For session management and caching to speed up responses.
- **GraphQL**: Provides an API for easy and flexible querying of platform data.
- **Solana Blockchain**: Manages the betting coins (BET), ensuring decentralized transaction and staking.

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
git clone https://github.com/your-username/decide-bet-backend.git
cd decide-bet-backend
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
MONGO_URI=mongodb://localhost:27017/decide_bet
POSTGRES_URI=postgres://user:password@localhost:5432/decide_bet
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=your_stripe_secret_key
PIX_API_KEY=your_pix_api_key
SOLANA_NETWORK=devnet
```

This will properly format the setup instructions for environment variables in Markdown.

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

The API is built using GraphQL. You can query the schema using Apollo Server at:

```bash
http://localhost:3000/graphql
```

### Example Query:

```graphql
query {
  getBettingOptions {
    id
    name
    options {
      id
      description
      odds
    }
  }
}
```

## Logging

We use **Logtail** for centralized logging. Logs will be sent to your Logtail dashboard, where you can monitor the performance and health of the platform.

## Features Roadmap

### Phase 1: Beta Release
- Launch basic betting platform with predefined betting options.
- Implement user registration and authentication.
- Integrate Solana blockchain for BET coin transactions.
- Admin panel for approving user-generated betting options.

### Phase 2: Full Launch
- Enable user-to-user coin exchange and selling.
- Add more payment gateways (Stripe, Pix).
- Improve backend scalability for higher load.
- Enhance security and add audit logging.

### Phase 3: Advanced Features
- Advanced analytics and reporting.
- Multi-currency support.
- Introduce betting on live events and real-time odds adjustment.
- Implement a mobile app for users.

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
