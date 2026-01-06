# Contributing to Robiki Proxy

Thank you for your interest in contributing to Robiki Proxy! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/robiki-proxy.git`
3. Install dependencies: `yarn install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development

### Building

```bash
yarn build
```

### Running Locally

Create a `proxy.config.json` file and run:

```bash
node src/index.ts
```

Or use the watch mode:

```bash
yarn dev
```

### Testing

Before submitting a PR, ensure your changes work correctly:

1. Build the project: `yarn build`
2. Test the built version: `node dist/index.js`
3. Test with Docker: `docker build -t robiki/proxy:test . && docker run robiki/proxy:test`

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Submitting Changes

1. Commit your changes: `git commit -am 'Add new feature'`
2. Push to your fork: `git push origin feature/your-feature-name`
3. Create a Pull Request

### Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure the code builds successfully
- Update documentation if needed
- Add examples for new features

## Reporting Issues

When reporting issues, please include:

- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant configuration

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
