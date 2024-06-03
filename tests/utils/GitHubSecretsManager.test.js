const gitHubSecretsManager = require("../../src/utils/GitHubSecretsManager");
const { Octokit } = require("@octokit/rest");
const sodium = require("libsodium-wrappers");
const { execSync } = require("child_process");

jest.mock("@octokit/rest");
jest.mock("child_process");

// Mock sodium functions properly
jest.mock("libsodium-wrappers", () => {
    const actualSodium = jest.requireActual("libsodium-wrappers");
    return {
        ...actualSodium,
        ready: Promise.resolve(),
        from_base64: jest.fn(),
        from_string: jest.fn(),
        crypto_box_seal: jest.fn(),
        to_base64: jest.fn(),
        base64_variants: {
            ORIGINAL: "ORIGINAL",
        },
    };
});

describe("GitHubSecretsManager", () => {
    beforeAll(async () => {
        await sodium.ready;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {}); // Mock console.log
    });

    it("should retrieve the public key correctly", async () => {
        const mockGetRepoPublicKey = jest.fn().mockResolvedValue({
            data: {
                key: "mock_key",
                key_id: "mock_key_id",
            },
        });

        Octokit.prototype.actions = { getRepoPublicKey: mockGetRepoPublicKey };

        gitHubSecretsManager.setToken("mock_token");
        const { key, key_id } = await gitHubSecretsManager.getPublicKey(
            "owner",
            "repo"
        );

        expect(mockGetRepoPublicKey).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
        });
        expect(key).toEqual("mock_key");
        expect(key_id).toEqual("mock_key_id");
    });

    it("should handle error when retrieving the public key fails with 401", async () => {
        const mockGetRepoPublicKey = jest.fn().mockRejectedValue({
            status: 401,
        });

        Octokit.prototype.actions = { getRepoPublicKey: mockGetRepoPublicKey };
        gitHubSecretsManager.setToken("mock_token");

        await expect(
            gitHubSecretsManager.getPublicKey("owner", "repo")
        ).rejects.toThrow("GitHub operation failed");
        expect(mockGetRepoPublicKey).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
        });
        expect(console.log).toHaveBeenCalledWith(
            "\n[Error] Please provide a valid GitHub token with the repo scope."
        );
    });

    it("should handle error when retrieving the public key fails with other error", async () => {
        const mockGetRepoPublicKey = jest.fn().mockRejectedValue({
            status: 500,
        });

        Octokit.prototype.actions = { getRepoPublicKey: mockGetRepoPublicKey };
        gitHubSecretsManager.setToken("mock_token");

        await expect(
            gitHubSecretsManager.getPublicKey("owner", "repo")
        ).rejects.toThrow("GitHub operation failed");
        expect(mockGetRepoPublicKey).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
        });
        expect(console.log).toHaveBeenCalledWith("Failed to get public key");
    });

    it("should encrypt secrets correctly", async () => {
        sodium.from_base64.mockReturnValue("publicKeyBytes");
        sodium.from_string.mockReturnValue("messageBytes");
        sodium.crypto_box_seal.mockReturnValue("encryptedBytes");
        sodium.to_base64.mockReturnValue("base64Encrypted");

        const encrypted = await gitHubSecretsManager.encryptSecret(
            "mock_key",
            "secret_value"
        );

        expect(encrypted).toEqual("base64Encrypted");
        expect(sodium.from_base64).toHaveBeenCalledWith("mock_key", "ORIGINAL");
        expect(sodium.from_string).toHaveBeenCalledWith("secret_value");
        expect(sodium.crypto_box_seal).toHaveBeenCalledWith(
            "messageBytes",
            "publicKeyBytes"
        );
        expect(sodium.to_base64).toHaveBeenCalledWith(
            "encryptedBytes",
            "ORIGINAL"
        );
    });

    it("should handle error when sodium.ready fails", async () => {
        const originalReady = sodium.ready;

        sodium.ready = Promise.reject(
            new Error("Sodium initialization failed")
        );

        await expect(
            gitHubSecretsManager.encryptSecret("mock_key", "secret_value")
        ).rejects.toThrow("Sodium initialization failed");

        sodium.ready = originalReady; // Restore the original sodium.ready
    });

    it("should set GitHub secrets correctly", async () => {
        gitHubSecretsManager.getPublicKey = jest
            .fn()
            .mockResolvedValue({ key: "mock_key", key_id: "mock_key_id" });
        gitHubSecretsManager.encryptSecret = jest
            .fn()
            .mockResolvedValue("encrypted_secret");
        const mockCreateOrUpdateRepoSecret = jest.fn().mockResolvedValue({});
        Octokit.prototype.actions = {
            createOrUpdateRepoSecret: mockCreateOrUpdateRepoSecret,
        };

        gitHubSecretsManager.setToken("mock_token");
        await gitHubSecretsManager.setGitHubSecret(
            "owner",
            "repo",
            "SECRET_NAME",
            "secret_value"
        );

        expect(mockCreateOrUpdateRepoSecret).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
            secret_name: "SECRET_NAME",
            encrypted_value: "encrypted_secret",
            key_id: "mock_key_id",
        });
    });

    it("should handle error when setting GitHub secret fails", async () => {
        gitHubSecretsManager.getPublicKey = jest
            .fn()
            .mockResolvedValue({ key: "mock_key", key_id: "mock_key_id" });
        gitHubSecretsManager.encryptSecret = jest
            .fn()
            .mockResolvedValue("encrypted_secret");
        const mockCreateOrUpdateRepoSecret = jest.fn().mockRejectedValue({
            status: 500,
        });
        Octokit.prototype.actions = {
            createOrUpdateRepoSecret: mockCreateOrUpdateRepoSecret,
        };

        gitHubSecretsManager.setToken("mock_token");
        await expect(
            gitHubSecretsManager.setGitHubSecret(
                "owner",
                "repo",
                "SECRET_NAME",
                "secret_value"
            )
        ).rejects.toThrow("GitHub operation failed");

        expect(mockCreateOrUpdateRepoSecret).toHaveBeenCalledWith({
            owner: "owner",
            repo: "repo",
            secret_name: "SECRET_NAME",
            encrypted_value: "encrypted_secret",
            key_id: "mock_key_id",
        });
        expect(console.log).toHaveBeenCalledWith(
            "Failed to set secret SECRET_NAME"
        );
    });

    it("should get owner and repo correctly from git remote URL", () => {
        execSync.mockReturnValueOnce("https://github.com/owner/repo.git");

        const { owner, repo } = gitHubSecretsManager.getOwnerRepo();

        expect(owner).toEqual("owner");
        expect(repo).toEqual("repo");
    });

    it("should handle error when git remote URL is invalid", () => {
        execSync.mockReturnValueOnce("invalid_url");

        expect(() => gitHubSecretsManager.getOwnerRepo()).toThrow(
            "GitHub operation failed"
        );
        expect(console.log).toHaveBeenCalledWith(
            "Please set the remote origin URL to a valid GitHub repository URL"
        );
    });

    it("should set GitHub secrets and log messages", async () => {
        console.log = jest.fn();
        gitHubSecretsManager.getOwnerRepo = jest
            .fn()
            .mockReturnValue({ owner: "owner", repo: "repo" });
        gitHubSecretsManager.setGitHubSecret = jest.fn().mockResolvedValue({});

        await gitHubSecretsManager.setGitHubSecrets(
            "vercel_project_id",
            "vercel_org_id",
            "vercel_token"
        );

        expect(gitHubSecretsManager.getOwnerRepo).toHaveBeenCalled();
        expect(gitHubSecretsManager.setGitHubSecret).toHaveBeenCalledTimes(3);
        expect(console.log).toHaveBeenCalledWith("\nSetting GitHub Secrets...");
    });
});
