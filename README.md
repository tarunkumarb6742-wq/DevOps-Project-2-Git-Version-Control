# CI/CD Pipeline Basics

<!-- This README explains the project purpose, setup steps, and workflow. -->

## Project Overview
This project is a beginner-friendly DevOps demonstration that showcases a simple CI/CD pipeline using GitHub Actions. It includes a responsive webpage and basic automation scripts for testing and building.

## Technologies Used
- HTML5
- CSS3
- JavaScript
- Node.js
- GitHub Actions

## CI/CD Workflow
The workflow runs automatically on every push and pull request. It checks out the repository, sets up Node.js 20, installs dependencies, runs tests, and builds the project.

## Project Structure
```text
CI-CD-Pipeline-Basics/
+-- index.html
+-- style.css
+-- script.js
+-- README.md
+-- package.json
+-- .gitignore
+-- .github/
¦   +-- workflows/
¦       +-- ci.yml
```

## How to Run
1. Open the project folder in your terminal.
2. Run `npm test` to verify the sample test script.
3. Run `npm run build` to simulate a production build.
4. Open `index.html` in a browser to view the webpage.

## GitHub Actions Explanation
GitHub Actions automates the validation process for each change. The workflow ensures the project remains healthy by running tests and a build step whenever code is pushed or a pull request is created.
