# UpQuiz

UpQuiz is a simple and flexible web-based quiz generator.

## Why I Built This

The idea came up because the only tool available to practice for exams was a Telegram bot that was strictly in Italian. This was a huge limit for international students or anyone who didn't speak the language.

I wanted to break that barrier. I built UpQuiz to be a web platform where the language doesn't stop you. You can just upload your own files and generate your own quizzes, making it a fair and easy tool for everyone to use, regardless of where they are from or what language they speak.

## Features

- **No more language barriers**: Built to be used with any content you upload
- **Web-based**: Much more comfortable than a Telegram bot
- **Custom sets**: Just upload your file and start practicing immediately

## Local Usage

### Step 1: Start the backend services

```bash
docker compose up -d --build
```

### Step 2: Start the frontend development server

```bash
npm run dev
```

And you're ready to use it!
