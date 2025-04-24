# SmartRent Access Control Analytics

This project is a Next.js application that allows users to analyze SmartRent access control events using natural language queries and visualize the results. It's powered by the AI SDK by Vercel and uses OpenAI's GPT-4 model to translate natural language queries into SQL.

## Features

- Natural Language to SQL: Query access control events using plain English
- Data Visualization: View access patterns in both table and chart formats
- Query Explanation: Get AI-generated explanations of complex access control queries
- Real-time Analytics: Analyze entry logs, access patterns, and security events

## Technology Stack

- Next.js for the frontend and API routes
- AI SDK by Vercel for AI integration
- OpenAI's GPT-4 for natural language processing
- PostgreSQL for event storage
- Vercel Postgres for database hosting
- Framer Motion for animations
- ShadcnUI for UI components
- Tailwind CSS for styling
- Recharts for data visualization

## How It Works

1. Users enter natural language questions about access control events
2. The application converts these questions into SQL queries using AI
3. Results are retrieved from the access control events database
4. Data is presented in both table and chart formats
5. Users can analyze patterns and trends in access control usage

## Data

The database contains access control event information, including:

- Event timestamp
- Access point location
- Event type (entry, exit, denied access)
- User information
- Access method (key card, mobile app, etc.)
- Property/building information
- Success/failure status

## Getting Started

To run this demo locally:

1. Install dependencies:
   ```bash
   pnpm install