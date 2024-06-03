const { program: commanderProgram } = require("commander");
const { version } = require("../../package.json");

/**
 * Class representing command line options.
 */
class CliOptions {
    /**
     * Create a CliOptions object.
     */
    constructor(program = commanderProgram) {
        this.program = program;
        this.configureProgram();
    }

    /**
     * Configure the commander program with options and help text.
     */
    configureProgram() {
        this.program
            .version(version, "-v, --version", "Output the current version")
            .option("-vt, --vercel-token <token>", "Vercel token")
            .option("-gt, --github-token <token>", "Github token")
            .option(
                "-cgw, --create-github-workflow",
                "Create Github workflow file"
            )
            .option("-d, --debug", "enables output of extra debugging")
            .option(
                "-le, --load-env <envs>",
                "Comma separated list of env to set variables in vercel project. Example preview,development,production."
            )
            .option("-dom, --domain <domain>", "Domain name to setup");

        this.program.addHelpText(
            "afterAll",
            "\nCaution: Both tokens are required to run this program."
        );

        this.program.addHelpText(
            "afterAll",
            "Example: verceler --vt <token> --gt <token>"
        );
    }

    /**
     * Parse command line arguments.
     * @param {string[]} args - The command line arguments.
     * @return {Object} The options set from the command line arguments.
     */
    parse(args) {
        this.program.parse(args);
        return this.program.opts();
    }

    /**
     * Log the options if debug mode is enabled.
     */
    logOpts() {
        if (this.isDebugMode()) {
            console.log(`
Vercel token: ${this.getVercelToken()}
Github token: ${this.getGithubToken()}
        `);
        }
    }

    /**
     * Check if debug mode is enabled.
     * @return {boolean} True if debug mode is enabled, false otherwise.
     */
    isDebugMode() {
        return this.program.opts().debug;
    }

    /**
     * Get the Vercel token.
     * @return {string} The Vercel token.
     */
    getVercelToken() {
        return this.program.opts().vercelToken;
    }

    /**
     * Get the Github token.
     * @return {string} The Github token.
     */
    getGithubToken() {
        return this.program.opts().githubToken;
    }

    /**
     * Get the list of environment variables to load.
     * @returns {Array<string>|null} The list of environment variables to load, or null if not specified.
     */
    getEnvList() {
        const list = this.program.opts().loadEnv;
        if (list) {
            return list.includes(",") ? list.split(",") : [list];
        }

        return null;
    }

    /**
     * Get the domain from the command line options.
     * @returns {string} The domain value.
     */
    getDomain() {
        return this.program.opts().domain;
    }

    /**
     * Check if the Vercel token is provided.
     * @return {boolean} True if the Vercel token is provided, false otherwise.
     */
    hasVercelToken() {
        return !!this.program.opts().vercelToken;
    }

    /**
     * Check if the Github token is provided.
     * @return {boolean} True if the Github token is provided, false otherwise.
     */
    hasGithubToken() {
        return !!this.program.opts().githubToken;
    }

    /**
     * Determines whether to create a GitHub workflow.
     * @returns {boolean} True if a GitHub workflow should be created, false otherwise.
     */
    shallCreateGithubWorkflow() {
        return this.program.opts().createGithubWorkflow;
    }

    /**
     * Validate the command line arguments.
     * @return {boolean} True if the arguments are valid, false otherwise.
     */
    validateArgs() {
        if (!this.hasVercelToken() || !this.hasGithubToken()) {
            this.program.help();
        }
        return true;
    }

    /**
     * Setup parsing and validation of command line arguments.
     */
    init(args) {
        this.parse(args);
        this.validateArgs();
        this.logOpts();
    }
}

module.exports = new CliOptions();
