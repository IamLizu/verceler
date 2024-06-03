const fs = require("fs");
const path = require("path");

class GitHub {
    constructor() {}

    createWorkflowFile() {
        console.log("\nCreating GitHub Actions workflow file...");
        console.log("Please change it accordingly to your needs.\n");

        // TODO: Support debug mode

        const workflowTemplate = `
name: Vercel Production Deployment
env:
    VERCEL_ORG_ID: $${"{{ secrets.VERCEL_ORG_ID }}"}
    VERCEL_PROJECT_ID: $${"{{ secrets.VERCEL_PROJECT_ID }}"}

on:
    release:
        types: [published]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Install Vercel CLI
              run: npm install --global vercel@latest
            - name: Pull Vercel Environment Information
              run: vercel pull --yes --environment=production --token=$${"{{ secrets.VERCEL_TOKEN }}"}
            - name: Build Project Artifacts
              run: vercel build --prod --token=$${"{{ secrets.VERCEL_TOKEN }}"}
            - name: Deploy Project Artifacts to Vercel
              run: vercel deploy --prebuilt --prod --token=$${"{{ secrets.VERCEL_TOKEN }}"}
`;

        const dir = ".github/workflows";
        const filePath = path.join(dir, "vercel-production-deployment.yml");

        // Create .github/workflows directory, if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Create a new GitHub Actions workflow file, if it doesn't exist
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, workflowTemplate);
        }
    }
}

module.exports = new GitHub();
