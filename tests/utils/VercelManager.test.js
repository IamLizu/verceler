const vercelManager = require("../../src/utils/VercelManager");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ProgressBar = require("progress");
const spawn = require("cross-spawn");

jest.mock("child_process");
jest.mock("fs");
jest.mock("path");
jest.mock("progress");
jest.mock("cross-spawn");
jest.mock();

describe("VercelManager", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
        jest.spyOn(console, "error").mockImplementation(() => {}); // Mock console.error

        bar = new ProgressBar(":bar :current/:total", { total: 1 });
        jest.spyOn(bar, "tick").mockImplementation(() => {});
    });

    it("should set the Vercel API token", () => {
        vercelManager.setVercelToken("mock_token");
        expect(vercelManager.vercelToken).toBe("mock_token");
    });

    it("should set the environment list", () => {
        const envList = ["development", "production"];
        vercelManager.setEnvList(envList);
        expect(vercelManager.envList).toBe(envList);
    });

    it("should link the Vercel project", () => {
        execSync.mockReturnValue(undefined);
        vercelManager.setVercelToken("mock_token");
        vercelManager.linkProject();

        expect(execSync).toHaveBeenCalledWith(
            "vercel link --yes --token mock_token"
        );
    });

    it("should handle error when linking the Vercel project fails", () => {
        execSync.mockImplementation(() => {
            throw new Error("Linking failed");
        });
        vercelManager.setVercelToken("mock_token");
        vercelManager.linkProject();

        expect(execSync).toHaveBeenCalledWith(
            "vercel link --yes --token mock_token"
        );
        expect(console.error).toHaveBeenCalledWith(
            "Failed to link Vercel project:",
            "Linking failed"
        );
    });

    it("should load environment variables and set them using Vercel CLI", async () => {
        const envFileContent = "KEY=value\nANOTHER_KEY=another_value";
        fs.readFileSync.mockReturnValue(envFileContent);
        vercelManager.setEnvList(["development", "production"]);

        await vercelManager.loadEnv();

        expect(fs.readFileSync).toHaveBeenCalledWith(".env.local", "utf-8");
        expect(console.log).toHaveBeenCalledWith(
            "Setting up env: [development,production] in vercel from .env.local for 2 variables..."
        );
        expect(ProgressBar).toHaveBeenCalledWith(":bar :current/:total", {
            total: 4,
        });
    });

    it("should add an environment variable if it does not exist", () => {
        vercelManager.setEnvList(["development"]);
        spawn.sync.mockReturnValue({ stdout: "", error: null });

        const bar = new ProgressBar(":bar :current/:total", { total: 1 });

        vercelManager.addEnvVariable("KEY", "value", "development", bar);

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "development"],
            {
                input: "value",
                stdio: "pipe",
            }
        );
        expect(bar.tick).toHaveBeenCalled();
    });

    it("should log an error message when updating an environment variable fails", () => {
        spawn.sync.mockReturnValueOnce({
            error: new Error("Failed to update env variable"),
        });

        vercelManager.updateEnvVariable("KEY", "value", "development", bar);

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "development", "--force"],
            { input: "value", stdio: "pipe" }
        );
        expect(console.error).toHaveBeenCalledWith(
            "Failed to update environment variable KEY for development:",
            "Failed to update env variable"
        );
    });

    it("should update an environment variable if it exists", () => {
        vercelManager.setEnvList(["development"]);
        spawn.sync.mockReturnValue({ stdout: "KEY", error: null });

        const bar = new ProgressBar(":bar :current/:total", { total: 1 });

        vercelManager.updateEnvVariable("KEY", "value", "development", bar);

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "development", "--force"],
            {
                input: "value",
                stdio: "pipe",
            }
        );
        expect(bar.tick).toHaveBeenCalled();
    });

    it("should set or update an environment variable if it exists", () => {
        vercelManager.setEnvList(["development", "production"]);
        spawn.sync.mockReturnValue({ stdout: "KEY", error: null });

        const bar = new ProgressBar(":bar :current/:total", { total: 1 });
        jest.spyOn(bar, "tick").mockImplementation(() => {});

        vercelManager.setOrUpdateEnvVariable("KEY", "value", bar);

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "ls", "production"],
            {
                encoding: "utf-8",
            }
        );
        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "development", "--force"],
            { input: "value", stdio: "pipe" }
        );
        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "production", "--force"],
            { input: "value", stdio: "pipe" }
        );
        expect(bar.tick).toHaveBeenCalledTimes(2);
    });

    it("should read Vercel credentials from project.json", () => {
        const projectJsonPath = path.join(".vercel", "project.json");
        const mockProjectJson = JSON.stringify({
            projectId: "mock_project_id",
            orgId: "mock_org_id",
        });

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(mockProjectJson);

        const credentials = vercelManager.readVercelCredentials();

        expect(fs.existsSync).toHaveBeenCalledWith(projectJsonPath);
        expect(fs.readFileSync).toHaveBeenCalledWith(projectJsonPath, "utf-8");
        expect(credentials).toEqual({
            vercelProjectId: "mock_project_id",
            vercelOrgId: "mock_org_id",
        });
    });

    it("should throw an error if project.json is missing", () => {
        const projectJsonPath = path.join(".vercel", "project.json");
        fs.existsSync.mockReturnValue(false);

        expect(() => {
            vercelManager.readVercelCredentials();
        }).toThrow("project.json file not found in the .vercel folder");
        expect(fs.existsSync).toHaveBeenCalledWith(projectJsonPath);
    });

    it("should throw an error if projectId or orgId is missing in project.json", () => {
        const mockProjectJson = JSON.stringify({
            projectId: "mock_project_id",
        });

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(mockProjectJson);

        expect(() => {
            vercelManager.readVercelCredentials();
        }).toThrow("Either projectId or orgId is missing in project.json");
    });

    it("should add a domain", () => {
        execSync.mockReturnValue(undefined);
        vercelManager.addDomain("example.com");

        expect(execSync).toHaveBeenCalledWith("vercel domains add example.com");
    });

    it("should log a message for a false positive warning regarding domain addition", () => {
        execSync.mockImplementation(() => {
            throw new Error("You do not have access");
        });

        vercelManager.addDomain("example.com");

        expect(execSync).toHaveBeenCalledWith("vercel domains add example.com");
        expect(console.log).toHaveBeenCalledWith(
            "\nAbove error regarding domain is a false positive warning from vercel! Please verify domain addition in your vercel project settings."
        );
    });

    it("should log an error message when adding a domain fails with another error", () => {
        execSync.mockImplementation(() => {
            throw new Error("Some other error");
        });

        vercelManager.addDomain("example.com");

        expect(execSync).toHaveBeenCalledWith("vercel domains add example.com");
        expect(console.error).toHaveBeenCalledWith(
            "Failed to add domain example.com:",
            "Some other error"
        );
    });

    it("should handle error when checking if env variable exists", () => {
        spawn.sync.mockReturnValueOnce({ error: new Error("Failed") });
        const result = vercelManager.checkIfEnvExists("KEY");

        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalledWith(
            "Failed to check if KEY exists:",
            "Failed"
        );
    });

    it("should return true when the environment variable exists", () => {
        spawn.sync.mockReturnValue({ stdout: "KEY", error: null });
        const result = vercelManager.checkIfEnvExists("KEY");

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "ls", "production"],
            {
                encoding: "utf-8",
            }
        );
        expect(result).toBe(true);
    });

    it("should return false when the environment variable does not exist", () => {
        spawn.sync.mockReturnValue({ stdout: "", error: null });
        const result = vercelManager.checkIfEnvExists("KEY");

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "ls", "production"],
            {
                encoding: "utf-8",
            }
        );
        expect(result).toBe(false);
    });

    it("should handle error when adding env variable fails", () => {
        spawn.sync.mockReturnValueOnce({ error: new Error("Failed") });
        const bar = new ProgressBar(":bar :current/:total", { total: 1 });

        vercelManager.addEnvVariable("KEY", "value", "development", bar);

        expect(console.error).toHaveBeenCalledWith(
            "Failed to add environment variable KEY for development:",
            "Failed"
        );
    });

    it("should handle error when updating env variable fails", () => {
        spawn.sync.mockReturnValueOnce({
            error: new Error("Failed to update env variable"),
        });

        vercelManager.updateEnvVariable("KEY", "value", "development", bar);

        expect(spawn.sync).toHaveBeenCalledWith(
            "vercel",
            ["env", "add", "KEY", "development", "--force"],
            { input: "value", stdio: "pipe" }
        );
        expect(console.error).toHaveBeenCalledWith(
            "Failed to update environment variable KEY for development:",
            "Failed to update env variable"
        );
    });
});
