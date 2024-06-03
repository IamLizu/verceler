const { execSync } = require("child_process");
const npmManager = require("../../src/utils/NPM");

jest.mock("child_process");

describe("NpmManager", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
    });

    it("should update a package if it exists", () => {
        execSync.mockImplementation((command) => {
            if (command.includes("npm list -g")) {
                return "mock package list output";
            }
        });

        npmManager.updatePackage("some-package");

        expect(execSync).toHaveBeenCalledWith(
            "npm list -g some-package --depth=0",
            { stdio: "ignore" }
        );
        expect(execSync).toHaveBeenCalledWith("npm update -g some-package");
    });

    it("should log a message if the package does not exist when trying to update", () => {
        execSync.mockImplementation((command) => {
            if (command.includes("npm list -g")) {
                throw new Error("Package not found");
            }
        });

        npmManager.updatePackage("some-package");

        expect(execSync).toHaveBeenCalledWith(
            "npm list -g some-package --depth=0",
            { stdio: "ignore" }
        );
        expect(console.log).toHaveBeenCalledWith(
            "Package 'some-package' is not installed."
        );
    });

    it("should return true if a package exists", () => {
        execSync.mockReturnValue("mock package list output");

        const exists = npmManager.checkPackageExists("some-package");

        expect(execSync).toHaveBeenCalledWith(
            "npm list -g some-package --depth=0",
            { stdio: "ignore" }
        );
        expect(exists).toBe(true);
    });

    it("should return false if a package does not exist", () => {
        execSync.mockImplementation(() => {
            throw new Error("Package not found");
        });

        const exists = npmManager.checkPackageExists("some-package");

        expect(execSync).toHaveBeenCalledWith(
            "npm list -g some-package --depth=0",
            { stdio: "ignore" }
        );
        expect(exists).toBe(false);
    });

    it("should install Vercel CLI if it is not installed", () => {
        execSync.mockImplementation((command) => {
            if (command.includes("npm list -g")) {
                throw new Error("Package not found");
            }
        });

        npmManager.installVercelCli();

        expect(execSync).toHaveBeenCalledWith("npm list -g vercel --depth=0", {
            stdio: "ignore",
        });
        expect(execSync).toHaveBeenCalledWith(
            "npm install --global vercel@latest"
        );
    });

    it("should not install Vercel CLI if it is already installed", () => {
        execSync.mockImplementation((command) => {
            if (command.includes("npm list -g")) {
                return "mock package list output";
            }
        });

        npmManager.installVercelCli();

        expect(execSync).toHaveBeenCalledWith("npm list -g vercel --depth=0", {
            stdio: "ignore",
        });
        expect(execSync).not.toHaveBeenCalledWith(
            "npm install --global vercel@latest"
        );
    });
});
