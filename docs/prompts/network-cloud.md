# Network & Cloud

Prompts designed for networking configuration, API interaction, and cloud infrastructure.

## IP

The `ip` prompt validates and formats IP addresses (IPv4/IPv6).

```typescript
const serverIp = await MepCLI.ip({
    message: 'Enter Server IP',
    initial: '192.168.1.1',
    version: 4 // or 6
});
```

## Connection String

The `connectionString` prompt interactively builds a database connection URL (e.g., Postgres, Redis, MongoDB).

```typescript
const dbUrl = await MepCLI.connectionString({
    message: 'Configure Database',
    initial: 'postgres://user:pass@localhost:5432/db'
});
```

## Curl

The `curl` prompt is a powerful HTTP client builder. It allows constructing requests (Method, URL, Headers, Body) visually.

```typescript
const request = await MepCLI.curl({
    message: 'Test API Endpoint',
    initialMethod: 'GET',
    initialUrl: 'https://api.example.com/health'
});
```

## Phone

The `phone` prompt accepts phone numbers with country code selection and validation.

```typescript
const mobile = await MepCLI.phone({
    message: 'Enter your mobile number',
    defaultCountry: 'US'
});
```

## OTP

The `otp` (One-Time Password) prompt accepts a fixed-length numeric code, typically for 2FA.

```typescript
const code = await MepCLI.otp({
    message: 'Enter verification code',
    length: 6
});
```

## Region

The `region` prompt allows selecting a cloud region (e.g., AWS us-east-1) from a map or list.

```typescript
const region = await MepCLI.region({
    message: 'Select Deployment Region',
    provider: 'aws'
});
```

## Related

- [Curl Client](./curl-client.md)
- [Developer Tools](./developer-tools.md)
