# Contributing to Mouzi

Thanks for taking the time to contribute to Mouzi.

Mouzi is a privacy-first file organizer built with Tauri, Rust, React, and TypeScript. Contributions of all sizes are welcome — from bug reports and translations to documentation improvements and new features.

## Before You Start

For larger changes, please open an issue first. This gives us a chance to discuss the idea before you spend time implementing it.

Small fixes, documentation improvements, and translation updates can be submitted directly as pull requests.

## Reporting Bugs

Before opening a new issue:

1. Check whether the issue has already been reported.
2. Make sure you are using the latest version of Mouzi.
3. Include your operating system and Mouzi version.
4. Describe what you expected to happen and what actually happened.
5. Include steps to reproduce the problem.
6. Add screenshots or logs when they help explain the issue.

Please do not report security vulnerabilities as public issues. Follow the instructions in [SECURITY.md](SECURITY.md) instead.

## Suggesting Features

Feature requests are welcome. Please explain:

* What problem the feature would solve.
* Who would benefit from it.
* How you imagine it working.
* Whether you would be interested in implementing it.

Mouzi aims to remain lightweight, local-first, and easy to understand. Features that require cloud processing, user accounts, or unnecessary data collection may not fit the project.

## Development Setup

### Requirements

* Node.js 22 or newer
* Rust stable
* Tauri system dependencies for your operating system
* Windows SDK and MSVC Build Tools on Windows
* WebKitGTK and AppIndicator development packages on Linux

### Running Mouzi locally

```bash
git clone https://github.com/hsr88/mouzi.git
cd mouzi
npm install
npm run tauri dev
```

### Creating a production build

```bash
npm run tauri build
```

Build output is created in:

```text
src-tauri/target/release/bundle/
```

## Pull Requests

Please keep pull requests focused on one change.

Before submitting a pull request:

* Make sure the application builds successfully.
* Test the change on the operating systems available to you.
* Keep unrelated formatting or refactoring out of the pull request.
* Update documentation or translations when necessary.
* Explain what changed and why.
* Link the related issue if one exists.

A pull request may be changed or declined if it adds unnecessary complexity, breaks the local-first approach, or does not fit the direction of the project.

## Translations

Translation improvements are welcome. Please preserve formatting placeholders and test that longer text still fits inside the interface.

## License

By submitting a contribution, you agree that it may be distributed under the project's [MIT License](LICENSE).

Thank you for helping make Mouzi better.
