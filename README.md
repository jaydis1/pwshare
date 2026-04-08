# Password Share

A secure, one-time password and data sharing tool with client-side encryption.

## Features

- **Client-side AES-256 encryption** - Data encrypted in your browser before transmission
- **One-time access** - Share links work only once, then expire automatically
- **Customizable expiration** - Configure when shares expire (1 hour, 1 day, 7 days, or custom)
- **No server-side storage of keys** - Encryption keys never touch the server
- **Simple UI** - Clean, intuitive interface for sharing sensitive data

## How It Works

1. **Sender:**
   - Pastes password/data into the form
   - Selects expiration time (default: 1 day)
   - Generates a share link
   - Shares the link with recipient

2. **Encryption:**
   - AES-256-GCM symmetric encryption via Web Crypto API
   - Random 256-bit key generated for each share
   - Key embedded in the share URL fragment (never sent to server)
   - Encrypted data stored temporarily on server

3. **Recipient:**
   - Opens the share link
   - Data decrypted in their browser
   - Can copy to clipboard
   - Link automatically deleted after one access

## Installation

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`

## Security Notes

- ✓ All encryption happens in the browser - the server never sees unencrypted data
- ✓ Share URL contains both the share ID and encryption key
- ✓ Data deleted after first access
- ✓ Expired shares are automatically cleaned up
- ✓ No cookies, no session tracking, no logging of data
- ⚠️ Share links are URL-safe but should be transmitted securely (not plain email if highly sensitive)

## Tech Stack

- **Frontend:** Vanilla JavaScript with Web Crypto API
- **Backend:** Express.js
- **Encryption:** AES-256-GCM (NIST approved, FIPS 140-2 compliant)

## License

MIT
