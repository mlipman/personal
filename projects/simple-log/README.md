# simple_log

A small, strongly typed log and chat app built with Next.js, React, Prisma, and PostgreSQL.

## Setup

1. Copy `.env.example` to `.env.local` and make sure all keys have values.
3. Run `pnpm install`, `pnpm prisma:migrate -- --name init`, then `pnpm dev`.

Logs accept plain text and newlines. Images use Markdown image syntax: `![description](https://...)`. The chat sends the text-only content of all logs to OpenAI; image markup is removed before the prompt is built.
