# Chat-based Currency Conversion and Product Search API

This project is a NestJS application that provides an API for handling chat-based queries related to product searches and currency conversion using OpenAI's GPT-3.5-turbo model.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Endpoints](#endpoints)
  - [Example Request](#example-request)
- [Configuration](#configuration)
- [License](#license)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or later)
- npm (v6 or later)
- NestJS CLI

## Installation

1. Clone the repository:

   ```bash
   git clone <repository_url>
   cd <repository_name>
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory of the project and add the following environment variables:

   ```plaintext
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_ORG_ID=your_openai_organization_id
   OPENEXCHANGERATES_API_KEY=your_openexchangerates_api_key
   ```

4. Make sure you have a CSV file named `products_list.csv` in the root directory with the product data.

## Running the Application

To run the application in a development environment, use the following command:

```bash
npm run start:dev
```

This will start the server on `http://localhost:3000`.

## API Documentation

- Endpoints

GET /chat
Tests the API and returns a test response

Request

```http
GET /chat
```

Response

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1629471234,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "this is a test!"
      },
      "finish_reason": "stop",
      "index": 0
    }
  ]
}
```

POST /chat
Handles user chat queries related to product searches and currency conversion.

Request

```http
POST /chat
Content-Type: application/json

{
  "query": "What is the price of a watch in Euros?"
}

```

Response

```json
{
  "response": "The price of the Apple Watch Series 8 GPS in Euros is €429.00."
}
```

- Example Request

To make a request to the `/chat` endpoint, you can use the following example with `curl`:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
        "query": "What is the price of a watch in Euros?"
      }'

```

## Configuration
