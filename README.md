# UGM Backend API

A Node.js backend application built with Express, TypeScript, and Sequelize ORM.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

### Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm run start
   ```

The application will be available at `http://localhost:8000`

## API Documentation

### Authentication Routes (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/sign-up` | Register a new user account | No |
| `POST` | `/verify` | Verify email with token | No |
| `GET` | `/verify-token` | Generate email verification link | Yes |
| `POST` | `/sign-in` | Login user | No |
| `GET` | `/profile` | Get current user profile | Yes |
| `POST` | `/refresh-token` | Refresh access token | No |
| `POST` | `/sign-out` | Logout user | Yes |
| `POST` | `/forget-password` | Send password reset email | No |
| `POST` | `/verify-password-reset-token` | Verify password reset token | No |
| `POST` | `/reset-password` | Reset password with token | No |
| `GET` | `/profile/:id` | Get public profile by user ID | Yes |
| `PUT` | `/profile` | Update user profile | Yes |
| `PUT` | `/update-avatar` | Update user avatar | Yes |

### Product Routes (`/product`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `POST` | `/list` | Create a new product listing | Yes |
| `PATCH` | `/:id` | Update product details | Yes |
| `DELETE` | `/:id` | Delete a product | Yes |
| `DELETE` | `/image/:productId/:imageId` | Delete product image | Yes |
| `GET` | `/detail/:id` | Get product details | No |
| `GET` | `/by-category/:category` | Get products by category | No |
| `GET` | `/latest` | Get latest products | No |
| `GET` | `/listings` | Get user's product listings | Yes |

### Conversation Routes (`/conversation`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| `GET` | `/with/:peerId` | Get or create conversation with user | Yes |
| `GET` | `/chats/:conversationId` | Get conversation messages | Yes |
| `GET` | `/last-chats` | Get recent conversations | Yes |
| `PATCH` | `/seen/:conversationId/:peerId` | Mark messages as seen | Yes |

## Development

- **Development mode:** `npm run dev` - Runs with hot reload
- **Testing:** `npm test` - Run Jest tests
- **Build:** `npm run build` - Compile TypeScript to JavaScript
