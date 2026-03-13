# AGENTS.md - Developer Guidelines

## Project Overview

This is a Node.js/Express application with PostgreSQL database that handles Instagram webhooks for automatic comment replies, plus a full user management system for a smoking cessation support app called "Positivamente".

## Commands

### Running the Server

```bash
npm start
```

Starts the server using `node server.js`. The server listens on port 3000 by default (or PORT environment variable).

### Database Setup

Before running the server for the first time, you must:

1. Create a PostgreSQL database named `positibraz`
2. Copy `.env.example` to `.env` and configure your database credentials
3. Run the migration to create tables:

```bash
npm run migrate
```

### Testing

```bash
npm test
```

Currently no tests are configured. Tests should be added using Jest or Mocha. To run a single test file when tests are added:

```bash
# With Jest
npm test -- --testPathPattern=filename.test.js

# With Mocha
npm test -- --grep "test name"
```

### Development

```bash
# Install dependencies
npm install

# Add a new dependency
npm install <package>
```

## Code Style Guidelines

### General Conventions

- Use **CommonJS** (require/exports) - this project uses CommonJS, not ES modules
- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Maximum line length: 100 characters

### Naming Conventions

- **Variables/Functions**: camelCase (e.g., `buildAutoReply`, `processedComments`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `VERIFY_TOKEN`, `GRAPH_API_VERSION`)
- **Files**: kebab-case (e.g., `server.js`, `index.ejs`)
- **Classes**: PascalCase (if used)
- **Database tables**: snake_case (e.g., `family_members`, `post_likes`)

### Imports

Order imports as follows:
1. Node built-ins (e.g., `path`, `fs`)
2. External packages (e.g., `express`, `axios`, `dotenv`)
3. Local modules

```javascript
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const userModel = require("./models/user");
```

### Functions

- Use function declarations or arrow functions consistently
- Keep functions small and focused
- Document complex functions with JSDoc comments
- Use meaningful parameter names

```javascript
/**
 * Brief description of what the function does.
 * @param {string} commentId - The Instagram comment ID
 * @param {string} message - The reply message
 * @returns {Promise<Object>} API response data
 */
async function replyToInstagramComment(commentId, message) {
  // implementation
}
```

### Error Handling

- Always wrap async operations in try/catch blocks
- Log errors with appropriate context
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safe property access

```javascript
try {
  const response = await someAsyncOperation();
  return response.data;
} catch (err) {
  console.error("Error description:", err.response?.data || err.message);
  // Handle error appropriately
}
```

### Logging

- Use `console.log` for general info and `console.error` for errors
- Include relevant context in log messages
- Avoid logging sensitive data (tokens, passwords)

### Async/Await

- Always handle promise rejections with try/catch
- Avoid bare `await` without error handling

### Types

This is a plain JavaScript project. When adding type safety:
- Use JSDoc comments for type hints
- Consider adding TypeScript if type safety is required

### HTTP Requests (axios)

- Always set Content-Type header for POST requests
- Use params for query parameters
- Handle both success and error responses

```javascript
const response = await axios.post(url, payload, {
  headers: { "Content-Type": "application/json" },
});
```

### Express Routes

- Define routes in a logical order (static routes before dynamic)
- Use separate files for route handlers
- Use middleware for authentication (`requireAuth`)
- Always respond to webhooks quickly (within timeout limits)

### Database

- Use the connection pool from `db/pool.js`
- Use parameterized queries to prevent SQL injection
- Keep queries in models folder

### Environment Variables

- Never commit `.env` files
- Use `.env` for local development
- Copy `.env.example` for required variables

Required variables:
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session secret key
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL config
- `VERIFY_TOKEN` - Webhook verification token
- `META_ACCESS_TOKEN` - Meta API access token
- `GRAPH_API_VERSION` - Graph API version (default: v23.0)

## Project Structure

```
positibraz_auto_coment/
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
├── .env.example       # Example environment variables
├── db/
│   ├── pool.js        # PostgreSQL connection pool
│   └── migrate.js     # Database migration script
├── models/
│   ├── user.js        # User model
│   ├── post.js        # Posts model
│   ├── anamnese.js    # Medical questionnaire model
│   └── family.js      # Family members model
├── routes/
│   ├── auth.js        # Authentication routes
│   └── app.js         # Application routes
├── views/
│   ├── index.ejs      # Main app view
│   ├── login.ejs      # Login page
│   ├── register.ejs   # Registration page
│   ├── profile.ejs    # User profile
│   ├── anamnese.ejs   # Medical questionnaire
│   ├── family.ejs     # Family tree
│   ├── privacidade.ejs # Privacy policy
│   ├── termos.ejs     # Terms of service
│   └── exclusao.ejs   # Data deletion
├── public/css/        # CSS files
└── .env               # Environment variables (not committed)
```

## Adding New Features

1. Create a new branch: `git checkout -b feature/description`
2. Add database tables in `db/migrate.js` if needed
3. Create model functions in `models/` folder
4. Add routes in `routes/` folder
5. Create EJS views in `views/` folder
6. Test locally with `npm start` (after running migrations)
7. Commit with a descriptive message
8. Push and create a pull request

## Dependencies

- **express**: Web framework
- **ejs**: Template engine
- **express-session**: Session management
- **pg**: PostgreSQL client
- **bcrypt**: Password hashing
- **axios**: HTTP client for Meta API calls
- **dotenv**: Environment variable management
