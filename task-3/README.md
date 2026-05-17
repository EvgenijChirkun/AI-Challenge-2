# Task 3 — Telegram AI Learning Assistant

## Overview

This project implements a Telegram-based AI learning assistant using n8n.

The bot helps users save learning materials from URLs, summarize them with AI, generate quizzes, and track quiz results.

## Bot commands

- `/start` — shows usage instructions
- `/learn <url>` — saves and summarizes a learning material
- `/quiz` — shows saved materials and starts a quiz

## Features

- Telegram bot integration
- URL content fetching and extraction
- AI Teacher role for summarization
- AI Examiner role for quiz generation
- Dynamic saved-material selection via Telegram inline buttons
- Five-question multiple-choice quiz flow
- Answer validation
- Per-question feedback
- Final score calculation
- Persistent storage using n8n Data Tables

## How to test

1. Open the Telegram bot:

   `https://t.me/ai_learning_challenge_bot`

2. Send:

   `/start`

3. Add a material:

   `/learn https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview`

4. Start a quiz:

   `/quiz`

5. Select a saved material.

6. Answer all five questions.

7. The bot returns a final score and per-question feedback.

## n8n workflow

The exported workflow is included in:

`workflow.json`

## Data tables used

- `learning_materials`
- `quizzes`
- `quiz_sessions`

## Notes

The workflow was built using a free n8n Cloud trial and n8n AI nodes. No external paid subscriptions are required beyond the n8n trial environment.