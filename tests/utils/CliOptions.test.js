const cliOptions = require("../../src/utils/CliOptions");
const { program } = require("commander");

// Mock the commander program
jest.mock("commander", () => {
    const mCommander = {
        version: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        addHelpText: jest.fn().mockReturnThis(),
        parse: jest.fn(),
        opts: jest.fn(),
        help: jest.fn(), // Mock help method
    };
    return { program: mCommander };
});

describe("CliOptions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should configure the program with options and help texts", () => {
        cliOptions.configureProgram();

        expect(program.version).toHaveBeenCalledWith(
            expect.any(String),
            "-v, --version",
            "Output the current version"
        );
        expect(program.option).toHaveBeenCalledWith(
            "-vt, --vercel-token <token>",
            "Vercel token"
        );
        expect(program.option).toHaveBeenCalledWith(
            "-gt, --github-token <token>",
            "Github token"
        );
        expect(program.option).toHaveBeenCalledWith(
            "-cgw, --create-github-workflow",
            "Create Github workflow file"
        );
        expect(program.option).toHaveBeenCalledWith(
            "-d, --debug",
            "enables output of extra debugging"
        );
        expect(program.option).toHaveBeenCalledWith(
            "-le, --load-env <envs>",
            "Comma separated list of env to set variables in vercel project. Example preview,development,production."
        );
        expect(program.option).toHaveBeenCalledWith(
            "-dom, --domain <domain>",
            "Domain name to setup"
        );
        expect(program.addHelpText).toHaveBeenCalledWith(
            "afterAll",
            expect.stringContaining(
                "Caution: Both tokens are required to run this program."
            )
        );
        expect(program.addHelpText).toHaveBeenCalledWith(
            "afterAll",
            expect.stringContaining(
                "Example: verceler --vt <token> --gt <token>"
            )
        );
    });

    it("should parse command line arguments and return options", () => {
        const mockArgs = [
            "node",
            "verceler",
            "--vercel-token",
            "vt",
            "--github-token",
            "gt",
        ];
        program.parse.mockImplementation(() => {
            program.opts.mockReturnValue({
                vercelToken: "vt",
                githubToken: "gt",
            });
        });

        const options = cliOptions.parse(mockArgs);
        expect(program.parse).toHaveBeenCalledWith(mockArgs);
        expect(options).toEqual({
            vercelToken: "vt",
            githubToken: "gt",
        });
    });

    it("should log the options if debug mode is enabled", () => {
        console.log = jest.fn(); // Mock console.log

        program.opts.mockReturnValue({
            debug: true,
            vercelToken: "vt",
            githubToken: "gt",
        });

        cliOptions.logOpts();
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Vercel token: vt")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Github token: gt")
        );
    });

    it("should not log the options if debug mode is disabled", () => {
        console.log = jest.fn(); // Mock console.log

        program.opts.mockReturnValue({
            debug: false,
        });

        cliOptions.logOpts();
        expect(console.log).not.toHaveBeenCalled();
    });

    it("should return true when debug mode is enabled", () => {
        program.opts.mockReturnValue({
            debug: true,
        });

        expect(cliOptions.isDebugMode()).toBe(true);
    });

    it("should return false when debug mode is disabled", () => {
        program.opts.mockReturnValue({
            debug: false,
        });

        expect(cliOptions.isDebugMode()).toBe(false);
    });

    it("should return the correct Vercel token", () => {
        program.opts.mockReturnValue({
            vercelToken: "vt",
        });

        expect(cliOptions.getVercelToken()).toBe("vt");
    });

    it("should return the correct Github token", () => {
        program.opts.mockReturnValue({
            githubToken: "gt",
        });

        expect(cliOptions.getGithubToken()).toBe("gt");
    });

    it("should return a list of environments split by commas", () => {
        program.opts.mockReturnValue({
            loadEnv: "preview,development,production",
        });

        expect(cliOptions.getEnvList()).toEqual([
            "preview",
            "development",
            "production",
        ]);
    });

    it("should return a single environment if only one is provided", () => {
        program.opts.mockReturnValue({
            loadEnv: "preview",
        });

        expect(cliOptions.getEnvList()).toEqual(["preview"]);
    });

    it("should return null if no environments are provided", () => {
        program.opts.mockReturnValue({
            loadEnv: undefined,
        });

        expect(cliOptions.getEnvList()).toBeNull();
    });

    it("should return the correct domain", () => {
        program.opts.mockReturnValue({
            domain: "example.com",
        });

        expect(cliOptions.getDomain()).toBe("example.com");
    });

    it("should return true if the Vercel token is provided", () => {
        program.opts.mockReturnValue({
            vercelToken: "vt",
        });

        expect(cliOptions.hasVercelToken()).toBe(true);
    });

    it("should return false if the Vercel token is not provided", () => {
        program.opts.mockReturnValue({
            vercelToken: undefined,
        });

        expect(cliOptions.hasVercelToken()).toBe(false);
    });

    it("should return true if the Github token is provided", () => {
        program.opts.mockReturnValue({
            githubToken: "gt",
        });

        expect(cliOptions.hasGithubToken()).toBe(true);
    });

    it("should return false if the Github token is not provided", () => {
        program.opts.mockReturnValue({
            githubToken: undefined,
        });

        expect(cliOptions.hasGithubToken()).toBe(false);
    });

    it("should return true if create GitHub workflow option is enabled", () => {
        program.opts.mockReturnValue({
            createGithubWorkflow: true,
        });

        expect(cliOptions.shallCreateGithubWorkflow()).toBe(true);
    });

    it("should return false if create GitHub workflow option is not enabled", () => {
        program.opts.mockReturnValue({
            createGithubWorkflow: false,
        });

        expect(cliOptions.shallCreateGithubWorkflow()).toBe(false);
    });

    it("should call program.help if required tokens are not provided", () => {
        program.help = jest.fn();

        program.opts.mockReturnValue({
            vercelToken: undefined,
            githubToken: undefined,
        });

        cliOptions.validateArgs();
        expect(program.help).toHaveBeenCalled();
    });

    it("should return true if both tokens are provided", () => {
        program.opts.mockReturnValue({
            vercelToken: "vt",
            githubToken: "gt",
        });

        expect(cliOptions.validateArgs()).toBe(true);
    });

    it("should initialize and call parse, validateArgs, and logOpts", () => {
        jest.spyOn(cliOptions, "parse");
        jest.spyOn(cliOptions, "validateArgs");
        jest.spyOn(cliOptions, "logOpts");

        const mockArgs = [
            "node",
            "verceler",
            "--vercel-token",
            "vt",
            "--github-token",
            "gt",
        ];
        cliOptions.init(mockArgs);

        expect(cliOptions.parse).toHaveBeenCalledWith(mockArgs);
        expect(cliOptions.validateArgs).toHaveBeenCalled();
        expect(cliOptions.logOpts).toHaveBeenCalled();
    });
});
