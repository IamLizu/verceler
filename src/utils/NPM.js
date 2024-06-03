const { execSync } = require("child_process");

class NpmManager {
    // Function to update a npm package
    updatePackage(packageName) {
        try {
            execSync(`npm list -g ${packageName} --depth=0`, {
                stdio: "ignore",
            });
            execSync(`npm update -g ${packageName}`);
        } catch (error) {
            console.log(`Package '${packageName}' is not installed.`);
        }
    }

    // Function to check if a package exists
    checkPackageExists(packageName) {
        try {
            execSync(`npm list -g ${packageName} --depth=0`, {
                stdio: "ignore",
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Install Vercel CLI
    installVercelCli() {
        if (!this.checkPackageExists("vercel")) {
            execSync("npm install --global vercel@latest");
        }
    }
}

module.exports = new NpmManager();
