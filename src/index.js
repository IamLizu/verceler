#! /usr/bin/env node

const {
    cliOptions,
    gitHub,
    npm,
    vercelManager,
    gitHubSecretsManager,
} = require("./utils");

async function main() {
    try {
        cliOptions.init(process.argv);

        const ghToken = cliOptions.getGithubToken(),
            vercelToken = cliOptions.getVercelToken();

        const createWorkflow = cliOptions.shallCreateGithubWorkflow();

        if (createWorkflow) {
            gitHub.createWorkflowFile();
        }

        npm.installVercelCli();

        vercelManager.linkProject();
        vercelManager.setVercelToken(vercelToken);

        const envList = cliOptions.getEnvList();

        if (envList?.length > 0) {
            vercelManager.setEnvList(envList);
            vercelManager.loadEnv();
        }

        const { vercelProjectId, vercelOrgId } =
            vercelManager.readVercelCredentials();

        gitHubSecretsManager.setToken(ghToken);
        await gitHubSecretsManager.setGitHubSecrets(
            vercelProjectId,
            vercelOrgId,
            vercelToken
        );

        const domain = cliOptions.getDomain();

        if (domain) {
            vercelManager.addDomain(domain);
        }

        // TODO: Add documentation
    } catch (error) {
        console.error(error);

        process.exit(1);
    }
}

main();
