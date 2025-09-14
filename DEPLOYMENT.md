# Deployment Guide

## Quick Start with Docker

1. **Clone the repository**
```bash
git clone https://github.com/garyku0/pixel-travel-map.git
cd pixel-travel-map
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Build and run with Docker Compose**
```bash
docker-compose up -d
```

The app will be available at `http://localhost:8080` (or whatever PORT you set in .env)

## Environment Variables

Create a `.env` file based on `.env.example`:

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key for image generation (required)
- `PORT`: The port to run the service on (default: 8080)
- `PASSKEY_API_URL`: Your passkey authentication service URL
- `VITE_PASSKEY_API_URL`: Same as above (needed for frontend)
- `VITE_API_URL`: The API URL for frontend (usually same as your app URL)
- `DB_PATH`: Path to SQLite database file (default: ./data/pixelmap.db)

### Getting a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to your `.env` file as `VITE_GEMINI_API_KEY`

## Using with Cloudflare Tunnel

1. Install cloudflared on your server
2. Run the Docker container as shown above
3. Create a tunnel to your app:
```bash
cloudflared tunnel --url http://localhost:8080
```

Or configure a permanent tunnel following Cloudflare's documentation.

## Data Persistence

- Database is stored in `./data/` directory
- Uploaded files are stored in `./uploads/` directory
- These directories are mounted as volumes in Docker

## Authentication

This app integrates with the passkey authentication service at `passkey.okuso.uk`. Users will need to:
1. Register/login using passkeys
2. The app will sync user data with the local database
3. Each user gets their own private map collection

## Development

For local development without Docker:

```bash
# Install dependencies
npm install
cd server && npm install

# Run backend
cd server
npm run dev

# Run frontend (in another terminal)
npm run dev
```

## Security Notes

- Never commit `.env` files to version control
- Change default values in production
- Use HTTPS in production (handled by Cloudflare Tunnel)
- Database and uploads are stored outside the container for persistence