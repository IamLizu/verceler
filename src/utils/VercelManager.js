const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const spawn = require("cross-spawn");
const ProgressBar = require("progress");

class VercelManager {
    constructor() {
        this.vercelToken = "";
        this.envList = null;
    }

    setVercelToken(token) {
        this.vercelToken = token;
    }

    setEnvList(envList) {
        this.envList = envList;
    }

    linkProject() {
        try {
            execSync("vercel link --yes");
        } catch (error) {
            console.error("Failed to link Vercel project:", error.message);
        }
    }

    async loadEnv(envFile = ".env.local") {
        const data = fs.readFileSync(envFile, "utf-8");
        const lines = data
            .split("\n")
            .filter((line) => line.trim() !== "" && !line.startsWith("#"));

        console.log(
            `Setting up env: [${this.envList}] in vercel from ${envFile} for ${lines.length} variables...`
        );
        const bar = new ProgressBar(":bar :current/:total", {
            total: lines.length * this.envList.length,
        });

        for (const line of lines) {
            const [key, value] = line.split("=");
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();
            this.setOrUpdateEnvVariable(trimmedKey, trimmedValue, bar);
        }
    }

    setOrUpdateEnvVariable(key, value, bar) {
        const environments = this.envList;
        const exists = this.checkIfEnvExists(key);

        if (exists) {
            environments.forEach((env) =>
                this.updateEnvVariable(key, value, env, bar)
            );
        } else {
            environments.forEach((env) =>
                this.addEnvVariable(key, value, env, bar)
            );
        }
    }

    checkIfEnvExists(key) {
        try {
            const result = spawn.sync("vercel", ["env", "ls", "production"], {
                encoding: "utf-8",
            });
            if (result.error) {
                throw result.error;
            }
            return result.stdout.includes(key);
        } catch (error) {
            console.error(`Failed to check if ${key} exists:`, error.message);
            return false;
        }
    }

    addEnvVariable(key, value, env, bar) {
        try {
            const result = spawn.sync("vercel", ["env", "add", key, env], {
                input: value,
                stdio: "pipe",
            });
            if (result.error) {
                throw result.error;
            }
            bar.tick();
        } catch (error) {
            console.error(
                `Failed to add environment variable ${key} for ${env}:`,
                error.message
            );
        }
    }

    updateEnvVariable(key, value, env, bar) {
        try {
            const result = spawn.sync(
                "vercel",
                ["env", "add", key, env, "--force"],
                { input: value, stdio: "pipe" }
            );
            if (result.error) {
                throw result.error;
            }
            bar.tick();
        } catch (error) {
            console.error(
                `Failed to update environment variable ${key} for ${env}:`,
                error.message
            );
        }
    }

    readVercelCredentials() {
        const projectJsonPath = path.join(".vercel", "project.json");

        if (fs.existsSync(projectJsonPath)) {
            const data = JSON.parse(fs.readFileSync(projectJsonPath, "utf-8"));
            const vercelProjectId = data.projectId;
            const vercelOrgId = data.orgId;

            if (vercelProjectId && vercelOrgId) {
                return { vercelProjectId, vercelOrgId };
            } else {
                throw new Error(
                    "Either projectId or orgId is missing in project.json"
                );
            }
        } else {
            throw new Error(
                "project.json file not found in the .vercel folder"
            );
        }
    }

    addDomain(domain) {
        console.log(`\nAdding domain ${domain}...`);
        try {
            execSync(`vercel domains add ${domain}`);
        } catch (error) {
            if (error.message.includes("have access")) {
                console.log(
                    `\nAbove error regarding domain is a false positive warning from vercel! Please verify domain addition in your vercel project settings.`
                );
            } else {
                console.error(`Failed to add domain ${domain}:`, error.message);
            }
        }
    }
}

module.exports = new VercelManager();
