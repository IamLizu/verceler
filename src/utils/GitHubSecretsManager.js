const { Octokit } = require("@octokit/rest");
const sodium = require("libsodium-wrappers");
const { execSync } = require("child_process");

class GitHubSecrets {
    #token = null;
    #octokit = null;

    constructor() {}

    setToken(token) {
        this.#token = token;
        this.#octokit = new Octokit({
            auth: this.#token,
        });
    }

    async getPublicKey(owner, repo) {
        try {
            const { data } = await this.#octokit.actions.getRepoPublicKey({
                owner,
                repo,
            });
            return { key: data.key, key_id: data.key_id };
        } catch (error) {
            this.handleError(error, "Failed to get public key");
        }
    }

    async encryptSecret(publicKey, secretValue) {
        await sodium.ready;
        const publicKeyUint8Array = sodium.from_base64(
            publicKey,
            sodium.base64_variants.ORIGINAL
        );
        const messageUint8Array = sodium.from_string(secretValue);

        const encryptedBytes = sodium.crypto_box_seal(
            messageUint8Array,
            publicKeyUint8Array
        );
        return sodium.to_base64(
            encryptedBytes,
            sodium.base64_variants.ORIGINAL
        );
    }

    async setGitHubSecret(owner, repo, secretName, secretValue) {
        const { key, key_id } = await this.getPublicKey(owner, repo);
        const encryptedValue = await this.encryptSecret(key, secretValue);

        try {
            await this.#octokit.actions.createOrUpdateRepoSecret({
                owner,
                repo,
                secret_name: secretName,
                encrypted_value: encryptedValue,
                key_id: key_id,
            });
        } catch (error) {
            this.handleError(error, `Failed to set secret ${secretName}`);
        }
    }

    getOwnerRepo() {
        const gitRemoteOriginUrl = execSync(
            "git config --get remote.origin.url"
        )
            .toString()
            .trim();

        if (gitRemoteOriginUrl.startsWith("https://")) {
            const gitOwner =
                gitRemoteOriginUrl.split("/")[
                    gitRemoteOriginUrl.split("/").length - 2
                ];
            const gitRepo = gitRemoteOriginUrl
                .split("/")
                [gitRemoteOriginUrl.split("/").length - 1].replace(".git", "");
            return { owner: gitOwner, repo: gitRepo };
        } else {
            this.handleError(
                null,
                "Please set the remote origin URL to a valid GitHub repository URL"
            );
        }
    }

    async setGitHubSecrets(vercelProjectId, vercelOrgId, vercelToken) {
        console.log("\nSetting GitHub Secrets...");

        const { owner, repo } = this.getOwnerRepo();

        await Promise.all([
            this.setGitHubSecret(
                owner,
                repo,
                "VERCEL_PROJECT_ID",
                vercelProjectId
            ),
            this.setGitHubSecret(owner, repo, "VERCEL_ORG_ID", vercelOrgId),
            this.setGitHubSecret(owner, repo, "VERCEL_TOKEN", vercelToken),
        ]);
    }

    handleError(error, defaultMessage) {
        if (error && error.status === 401) {
            console.log(
                "\n[Error] Please provide a valid GitHub token with the repo scope."
            );
        } else {
            console.log(defaultMessage);
        }
        throw new Error("GitHub operation failed");
    }
}

module.exports = new GitHubSecrets();
