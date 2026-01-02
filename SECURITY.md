# Quiz App - Setup Instructions

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your values:
   - `POSTGRES_PASSWORD`: Set a secure database password
   - `ADMIN_USERNAME`: Set your admin username

3. Start the application:
   ```bash
   docker-compose up -d --build
   ```

## Important Security Notes

- **Never commit `.env` file to Git** (it's already in `.gitignore`)
- Change the default passwords in production
- The admin account is created when registering with the username set in `ADMIN_USERNAME`

## For Deployment

For the production server, create a `.env` file with your production values.
