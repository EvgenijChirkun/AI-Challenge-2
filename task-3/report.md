# Task 3 Report — Telegram AI Learning Assistant

## Summary

I built a Telegram AI learning assistant using n8n. The assistant allows a user to save learning materials from URLs, summarize them, generate quizzes, answer questions, and receive a final score.

## Tools used

- n8n Cloud trial
- Telegram Bot API
- n8n Telegram Trigger
- n8n Telegram nodes
- n8n HTTP Request node
- n8n AI nodes
- n8n Data Tables
- JavaScript Code nodes

## Implemented flow

### `/start`

The bot sends basic usage instructions.

### `/learn <url>`

The workflow:
1. Validates the URL.
2. Fetches page content.
3. Extracts readable text.
4. Sends the content to the Teacher AI role.
5. Stores the material in `learning_materials`.
6. Replies with title, difficulty, summary, key points, and main concepts.

### `/quiz`

The workflow:
1. Lists all saved materials for the user.
2. Builds a dynamic Telegram inline keyboard using the Telegram HTTP API.
3. Lets the user select a material.
4. Generates five multiple-choice questions using the Examiner AI role.
5. Stores the generated quiz in `quizzes`.
6. Creates a quiz session in `quiz_sessions`.
7. Sends questions one by one.
8. Validates answers.
9. Stores user responses.
10. Updates score and progress.
11. Sends final score and per-question feedback after question five.

## Data model

### `learning_materials`

Stores saved learning resources.

Important fields:
- `telegramUserId`
- `url`
- `title`
- `content`
- `summary`
- `keyPointsJson`
- `mainConceptsJson`
- `difficulty`

### `quizzes`

Stores generated quizzes.

Important fields:
- `materialId`
- `telegramUserId`
- `questionsJson`

### `quiz_sessions`

Stores active and completed quiz sessions.

Important fields:
- `quizId`
- `materialId`
- `telegramUserId`
- `currentQuestionIndex`
- `answersJson`
- `status`
- `score`
- `completedDate`

## Challenges

The n8n AI workflow builder was useful for scaffolding, but it was unreliable for later workflow edits. It produced errors such as:

`Cannot read properties of null (reading 'replace')`

and later:

`Unable to connect to n8n's AI service (Session not found)`

Because of that, I completed the workflow manually.

The standard Telegram Send Message node was not flexible enough for a fully dynamic number of inline keyboard buttons. I solved this by using the Telegram HTTP API with a dynamic `reply_markup`.

## Testing

I tested the bot with multiple learning materials, including:

- JavaScript Functions from MDN
- Introduction to JavaScript from GeeksForGeeks
- HTTP Overview from MDN
- SQL Introduction from W3Schools

The bot can now list all saved materials, start a quiz for the selected material, ask five questions, track answers, and show the final score.

## Result

The final workflow satisfies the main Task 3 requirements:

- `/start` works
- `/learn <url>` works
- `/quiz` works
- Saved materials persist
- User can choose from saved topics
- AI generates quiz questions
- Five-question quiz flow works
- User answers are stored
- Final score is calculated
- Per-question feedback is shown