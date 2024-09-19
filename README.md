# PICURA-CLI

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/picura-cli.svg)](https://badge.fury.io/js/picura-cli)
[![Build Status](https://github.com/picura/picura-cli/workflows/CI/badge.svg)](https://github.com/picura/picura-cli/actions)
[![Coverage Status](https://coveralls.io/repos/github/picura/picura-cli/badge.svg?branch=main)](https://coveralls.io/github/picura/picura-cli?branch=main)
[![Maintainability](https://api.codeclimate.com/v1/badges/a99a88d28ad37a79dbf6/maintainability)](https://codeclimate.com/github/picura/picura-cli)

PICURA-CLI aims to streamline workflows, improve code quality, and facilitate collaboration throughout the project lifecycle. By offering a suite of automated tools, it helps development teams increase productivity and maintain high standards in software development.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Commands](#commands)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Support](#support)

## Features

- **Project Management**: Create and configure new projects, integrate with version control systems, and manage multiple environments.
- **AI-Powered Documentation Generation**: Automatically create architectural documents, data schemas, API specifications, user manuals, and deployment plans.
- **Advanced Code Analysis**: Evaluate code quality, detect security vulnerabilities, analyze performance, and receive AI-based improvement recommendations.
- **Deployment Management**: Automate deployments, perform automatic rollbacks, and monitor deployment status in real-time.
- **AI Technical Assistance**: Get real-time problem resolution, code optimization suggestions, and error prediction and prevention.
- **Comprehensive Auditing and Security**: Detailed logging of all actions, encryption of sensitive data, and role-based access control.

## Installation

Ensure you have Node.js v18 or later installed. Then run:

```bash
npm install -g picura-cli
```

## Usage

To initialize a new PICURA project:

```bash
picura init <project-name>
```

For more detailed usage instructions, see the [Commands](#commands) section.

## Configuration

PICURA uses a `picura.config.js` file in the root of your project for configuration. Here's a sample configuration:

```javascript
module.exports = {
  project: {
    name: 'MyAwesomeProject',
    version: '1.0.0',
  },
  analysis: {
    plugins: ['sonarqube'],
    sonarqube: {
      serverUrl: 'http://localhost:9000',
      token: process.env.SONAR_TOKEN,
    },
  },
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
};
```

## Commands

### Initialize Project

```bash
picura init <project-name>
```

Options:
- `-n, --name <name>`: Project name
- `-d, --description <description>`: Project description
- `-p, --path <path>`: Path to the project (default: current directory)
- `-f, --force`: Force initialization even if the directory is not a Git repository

### Generate Documentation

```bash
picura generate doc <doc-type>
```

Options:
- `-t, --type <type>`: Type of document to generate (required)
- `-p, --project <id>`: Project ID (optional if in project directory)
- `-f, --force`: Force regeneration if document already exists

Available document types:
- `ARCHITECTURE`
- `DATA_SCHEMA`
- `API_SPECIFICATION`
- `USER_MANUAL`
- `DEPLOYMENT`

### Analyze Code

```bash
picura analyze
```

This command runs a comprehensive code analysis using configured plugins (e.g., SonarQube) and AI algorithms.

### Deploy

```bash
picura deploy <environment>
```

Automates the deployment process to the specified environment.

### AI Assistance

```bash
picura assist
```

Initiates an interactive session with the AI assistant for real-time technical support.

## Contributing

We welcome contributions to PICURA-CLI! Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started.

## Security

Security is a top priority for PICURA-CLI. If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md) for responsible disclosure.

## License

PICURA-CLI is open-source software licensed under the [MIT license](LICENSE).

## Support

For bug reports and feature requests, please use our [Issue Tracker](https://github.com/picura/picura-cli/issues).

For general questions and discussions, join our [Community Forum](https://community.picura.io).

---

Built with ❤️ by the PICURA team.
