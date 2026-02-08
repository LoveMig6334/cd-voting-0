# Contributing to CD Voting

Thank you for your interest in contributing to the CD Voting project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, Node.js version)

### Suggesting Features

1. **Check existing issues** for similar suggestions
2. **Open a new issue** describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Any alternatives considered

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Follow coding conventions**
   - Use TypeScript with proper types
   - Follow existing code style (Tailwind CSS, App Router patterns)
   - Use `"use client"` directive for interactive components
   - Use Material Symbols for icons
4. **Write/update tests**
   ```bash
   npm run test
   ```
5. **Ensure code passes linting**
   ```bash
   npm run lint
   ```
6. **Commit with clear messages**
   ```
   feat: add new voting confirmation dialog
   fix: resolve session timeout issue
   docs: update API documentation
   ```
7. **Push and create a Pull Request**

## Development Setup

1. Clone your fork

   ```bash
   git clone https://github.com/your-username/cd-voting-0.git
   cd cd-voting-0
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your MySQL credentials
   ```

4. Set up the database

   ```bash
   mysql -u root -p < schema.sql
   ```

5. Start development server
   ```bash
   npm run dev
   ```

## Project Structure

- `app/` - Next.js App Router pages
- `components/` - Reusable React components
- `lib/` - Utilities, actions, and database logic
- `__tests__/` - Jest test files
- `docs/` - Documentation files

## Questions?

Feel free to open an issue for any questions about contributing.
