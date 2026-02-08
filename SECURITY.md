# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it's fixed

### Do

1. **Email us privately** at [security@your-domain.com] with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

2. **Allow time for response**
   - We aim to acknowledge reports within 48 hours
   - We'll provide a detailed response within 7 days
   - We'll work with you to understand and fix the issue

3. **Coordinate disclosure**
   - We'll notify you when the fix is released
   - We'll credit you in our security advisories (unless you prefer anonymity)

## Security Measures

This project implements the following security practices:

### Authentication

- Session-based authentication with httpOnly cookies
- Password hashing with bcryptjs
- MySQL-stored sessions with expiration

### Data Protection

- Server-side validation of all inputs
- Parameterized queries to prevent SQL injection
- Role-based access control (4 levels)

### Best Practices

- No sensitive data in client-side storage
- Environment variables for secrets
- Regular dependency updates

## Scope

The following are in scope for security reports:

- Authentication bypass
- SQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Session management issues
- Authorization flaws
- Data exposure

Thank you for helping keep CD Voting secure!
