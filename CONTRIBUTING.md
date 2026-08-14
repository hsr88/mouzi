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

Mouzi keeps its interface translations in JSON files under [`src/i18n/locales`](src/i18n/locales). You can improve an existing translation or add a new language without changing the file-organizing logic.

### Improve an existing translation

1. Fork the repository and create a branch for your translation.
2. Open the matching file in [`src/i18n/locales`](src/i18n/locales), for example `es.json` for Spanish.
3. Translate the text values. Do not rename, add, or remove the JSON keys.
4. Preserve placeholders and technical values exactly, including `{}`, `{year}`, `{month}`, file extensions, paths, and product names.
5. Check that the JSON remains valid and that longer text fits in the interface.
6. Submit a pull request describing which language you updated.

### Add a new language

Please open an issue before starting so we can agree on the language code and avoid duplicate work. Mention whether the translation targets a regional variant, such as Brazilian or European Portuguese.

After the language code is confirmed:

1. Copy [`src/i18n/locales/en.json`](src/i18n/locales/en.json) to a new file named with the agreed language code, such as `pt.json`.
2. Translate the values while keeping the complete English key structure unchanged.
3. Register the locale import, resource, and `SupportedLang` value in [`src/i18n/index.ts`](src/i18n/index.ts).
4. Add the language to the selector in [`src/components/Settings.tsx`](src/components/Settings.tsx).
5. Add translations for the native tray menu and notifications in [`src-tauri/src/i18n.rs`](src-tauri/src/i18n.rs).
6. Add the language to the supported-language list in [`README.md`](README.md).
7. Run the app, switch to the new language, and check the popup, every Settings tab, tray menu, notifications, dialogs, and empty states.
8. Run `npm run build` and submit a focused pull request.

If you are comfortable translating but not editing TypeScript or Rust, submit the completed JSON file in a pull request or attach it to the language issue. A maintainer can wire it into the application.

### Translation rules

* Use natural wording rather than translating each English word literally.
* Keep Mouzi, file extensions, keyboard shortcuts, placeholders, and example paths unchanged unless localization is necessary.
* Preserve punctuation or whitespace when it is part of a placeholder or path.
* Do not translate text that is not present in the English locale without explaining why in the pull request.
* Test narrow windows and longer labels where possible; a correct translation should not make buttons or settings unusable.

## License

By submitting a contribution, you agree that it may be distributed under the project's [MIT License](LICENSE).

Thank you for helping make Mouzi better.
