# Contributing to Platform Builder

Thank you for your interest in contributing to Platform Builder!

## Development Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/platform-builder.git
```

3. Install dependencies:
```bash
npm install
```

4. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

## Making Changes

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Run linting before committing:
```bash
npm run lint
```

### Component Guidelines

- Components should be reusable and well-documented
- Use TypeScript interfaces for props
- Include prop descriptions in comments
- Follow the naming convention: PascalCase for components

### Testing

- Test your changes locally
- Ensure all builds pass:
```bash
npm run build
```

### Commit Messages

Use clear and descriptive commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

Example:
```
feat: add image gallery component to UI library
```

## Submitting Changes

1. Ensure your code follows the style guide
2. Test your changes thoroughly
3. Commit your changes with a clear message
4. Push to your fork
5. Create a Pull Request

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure CI checks pass
- Wait for review and address feedback

## Project Structure

Understanding the project structure will help you make better contributions:

```
platform-builder/
├── apps/              # Applications
│   ├── generator/    # Main builder app
│   └── client-site/  # Template site
├── packages/         # Shared packages
│   ├── ui/          # UI components
│   ├── utils/       # Utilities
│   └── scripts/     # Build scripts
└── .github/         # CI/CD workflows
```

## Areas for Contribution

### High Priority

- Additional UI components
- More template designs
- Image optimization
- Performance improvements
- Documentation improvements

### Feature Ideas

- User authentication
- Database integration
- Template marketplace
- Export functionality
- Theme customization
- Responsive preview modes

## Questions?

Feel free to open an issue for:
- Questions about the codebase
- Feature requests
- Bug reports
- General feedback

Thank you for contributing!
