const fs = require("fs");
const path = require("path");
const gitHub = require("../../src/utils/GitHub");

jest.mock("fs");

// Helper function to normalize content for comparison
function normalizeContent(content) {
    return content.trim().replace(/\r?\n|\r/g, "\n");
}

describe("GitHub", () => {
    const originalLog = console.log;

    beforeAll(() => {
        console.log = jest.fn(); // Mock console.log
    });

    afterAll(() => {
        console.log = originalLog; // Restore original console.log
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create the .github/workflows directory if it does not exist", () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation();

        gitHub.createWorkflowFile();

        expect(fs.existsSync).toHaveBeenCalledWith(".github/workflows");
        expect(fs.mkdirSync).toHaveBeenCalledWith(".github/workflows", {
            recursive: true,
        });
    });

    it("should create the workflow file with the correct content if it does not exist", () => {
        fs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(false);
        fs.mkdirSync.mockImplementation();
        fs.writeFileSync.mockImplementation();

        const expectedFilePath = path.join(
            ".github",
            "workflows",
            "vercel-production-deployment.yml"
        );
        const expectedContent = normalizeContent(`
name: Vercel Production Deployment
env:
    VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

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
              run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
            - name: Build Project Artifacts
              run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
            - name: Deploy Project Artifacts to Vercel
              run: vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
`);

        gitHub.createWorkflowFile();

        expect(fs.existsSync).toHaveBeenCalledWith(expectedFilePath);
        // Normalize the received content before comparing
        expect(normalizeContent(fs.writeFileSync.mock.calls[0][1])).toBe(
            expectedContent
        );
    });

    it("should log the correct console messages when creating the workflow file", () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation();
        fs.writeFileSync.mockImplementation();

        gitHub.createWorkflowFile();

        expect(console.log).toHaveBeenCalledWith(
            "\nCreating GitHub Actions workflow file..."
        );
        expect(console.log).toHaveBeenCalledWith(
            "Please change it accordingly to your needs.\n"
        );
    });

    it("should not create the workflow file if it already exists", () => {
        fs.existsSync.mockReturnValue(true);

        gitHub.createWorkflowFile();

        expect(fs.mkdirSync).not.toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
});
