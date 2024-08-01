# verceler

`verceler` is a CLI tool that simplifies and automates the process of deploying based on tags/releases to Vercel. It helps you automate trunk-based development and deploy through tags and releases.

## Installation

To install `verceler`, you can use npm or yarn:

```sh
npm install -g verceler
```

or

```sh
yarn global add verceler
```

## Usage

After installing verceler, you can use it via the command line. Here are some common commands and options:

```sh
verceler -vt <vercel_token> -gt <github_token> [options]
```

### Options

| Option                           | Description                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--vercel-token, -vt <token>`    | Your Vercel API token.                                                                                           |
| `--github-token, -gt <token>`    | Your GitHub API token.                                                                                           |
| `--create-github-workflow, -cgw` | Create a GitHub Actions workflow file for Vercel deployment.                                                     |
| `--debug, -d`                    | Enable debug mode to log extra information.                                                                      |
| `--load-env, -le <envs>`         | Comma-separated list of environments to set variables in Vercel projects (e.g., preview,development,production). |
| `--domain, -dom <domain>`        | Domain name to set up with your Vercel project.                                                                  |

### Example

```sh
verceler --vt your_vercel_token --gt your_github_token --create-github-workflow --load-env preview,development,production --domain yourdomain.com
```

This command will:

1. Create a GitHub Actions workflow file for Vercel deployment.
2. Install the Vercel CLI globally if not already installed.
3. Link the project to Vercel.
4. Load environment variables from .env.local and set them in Vercel for the specified environments.
5. Set up the necessary GitHub secrets for Vercel deployment.
6. Add the specified domain to your Vercel project.

## Contributing

We welcome contributions to verceler. To contribute, follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

### Running Tests

To run the test suite, use the following command:

```sh
yarn test --verbose --coverage
```

This will run all the unit tests and provide you with a coverage report. Make sure to write tests for any new features or bug fixes you add.

### Code Style

We follow standard JavaScript coding conventions. Please make sure your code adheres to these conventions before submitting a pull request.

## License

`verceler` is licensed under the MIT License. See the [LICENSE](./LICENSE.md) file for more details.

---

We hope verceler makes your Vercel deployments easier and more efficient. If you have any questions or feedback, feel free to open an issue or reach out to us.
