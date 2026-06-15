# verceler

`verceler` is a CLI tool that automates deploying to Vercel from GitHub **tags and releases**. Instead of clicking through the Vercel dashboard and the GitHub settings UI, you run one command and `verceler` wires up everything needed for trunk-based, release-driven deployments:

- Generates a GitHub Actions workflow that deploys to Vercel on every release.
- Installs the Vercel CLI and links your repository to a Vercel project.
- Pushes your local environment variables into Vercel.
- Creates the GitHub repository secrets the workflow needs to authenticate.
- Optionally attaches a custom domain to the project.

> [!IMPORTANT]
> By default `verceler` generates a **release-based** workflow (it deploys when a GitHub Release is published). If you'd rather deploy on **tags**, edit the generated workflow's `on:` trigger after it's created — see [Targeting tags instead of releases](#targeting-tags-instead-of-releases).

## Why two tokens are needed

`verceler` talks to two separate services on your behalf, so it needs an access token for each. They are used for different things and are **never interchangeable**.

### Why a Vercel token is needed

The Vercel token authenticates the Vercel CLI so `verceler` can act on your Vercel account. It is used to:

- **Link** your local repository to a Vercel project (`vercel link`).
- **Read and write environment variables** for the environments you choose (`vercel env ls` to check what already exists, `vercel env add` to set them).
- **Add a custom domain** to the project (`vercel domains add`), if you pass `--domain`.

The same token is also stored as a GitHub secret (`VERCEL_TOKEN`) so the generated workflow can **pull, build, and deploy** your project from CI later on. In other words, the Vercel token is used both at setup time (on your machine) and at deploy time (inside GitHub Actions).

**Where to get it:** [Vercel → Account Settings → Tokens](https://vercel.com/account/tokens). Create a token with a scope that covers the project/team you're deploying to.

### Why a GitHub token is needed

The GitHub token authenticates `verceler` to the GitHub API so it can create the **repository secrets** your deployment workflow relies on. Specifically, it writes three encrypted secrets to your repo:

| Secret              | What it is                          | Why the workflow needs it                |
| ------------------- | ----------------------------------- | ---------------------------------------- |
| `VERCEL_TOKEN`      | Your Vercel token                   | Authenticates the Vercel CLI in CI       |
| `VERCEL_ORG_ID`     | Your Vercel org/team ID             | Tells Vercel which account to deploy to  |
| `VERCEL_PROJECT_ID` | Your Vercel project ID              | Tells Vercel which project to deploy     |

`verceler` reads `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from the `.vercel/project.json` (or `.vercel/repo.json`) file created when it links your project, encrypts each value with the repository's public key, and uploads them. Your secrets are never written to disk or logged.

> [!NOTE]
> The GitHub token is only used at setup time, from your machine. It is **not** stored in your repository.

#### Required GitHub token permissions

The token must be able to **write Actions secrets** to the target repository. Pick whichever token type you prefer:

**Classic personal access token**

- Scope: **`repo`** (full control of private repositories).

This is the scope `verceler` expects; if the token is missing it, you'll see:
`[Error] Please provide a valid GitHub token with the repo scope.`

**Fine-grained personal access token** (more restrictive, recommended)

- **Repository access:** only the repository you're deploying.
- **Permissions → Secrets:** **Read and write**.
- **Permissions → Metadata:** **Read-only** (required by GitHub for any fine-grained token).

**Where to get it:** [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).


## Prerequisites

- **Node.js** and **npm** installed.
- The repository is a **git repo with a GitHub `origin` remote** (`verceler` reads `git config --get remote.origin.url` to know which repo to configure). HTTPS remote URLs are supported.
- A **`.env.local`** file in the project root if you want `verceler` to upload environment variables (used with `--load-env`).
- A Vercel account and a GitHub account, each with a token as described above.

You do **not** need to install the Vercel CLI yourself — `verceler` installs it for you if it's missing.


## Installation

Install `verceler` globally with npm, yarn, or pnpm:

```sh
npm install -g verceler
```

```sh
yarn global add verceler
```

```sh
pnpm add -g verceler
```

You can also run it without installing, using `npx`:

```sh
npx verceler -vt <vercel_token> -gt <github_token> [options]
```


## Usage

Run `verceler` from the **root of the repository** you want to deploy:

```sh
verceler -vt <vercel_token> -gt <github_token> [options]
```

Both tokens are required. With no options beyond the tokens, `verceler` installs the Vercel CLI, links the project, and sets up the GitHub secrets.

### Options

| Option                           | Description                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--vercel-token, -vt <token>`    | Your Vercel API token. **Required.**                                                                             |
| `--github-token, -gt <token>`    | Your GitHub API token. **Required.**                                                                            |
| `--create-github-workflow, -cgw` | Generate the GitHub Actions workflow file for Vercel deployment.                                                  |
| `--load-env, -le <envs>`         | Comma-separated list of Vercel environments to populate from `.env.local` (e.g. `preview,development,production`).|
| `--domain, -dom <domain>`        | Custom domain to attach to the Vercel project.                                                                   |
| `--debug, -d`                    | Enable debug mode for extra logging. **Prints both tokens to the console — don't share the output.**            |
| `--version, -v`                  | Print the installed version.                                                                                      |
| `--help, -h`                     | Show help.                                                                                                        |

### What a full run does

A complete command such as:

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -cgw -le preview,development,production -dom yourdomain.com
```

will, in order:

1. Generate `.github/workflows/vercel-production-deployment.yml` (because of `-cgw`).
2. Install the Vercel CLI globally if it isn't already installed.
3. Link the current directory to a Vercel project (creating `.vercel/project.json`).
4. Read every variable in `.env.local` and set it in Vercel for the `preview`, `development`, and `production` environments.
5. Read the Vercel org and project IDs and create the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub secrets.
6. Attach `yourdomain.com` to the Vercel project.

> [!IMPORTANT]
> ### Commit the generated workflow to your repo
>
> `verceler` writes the workflow file to your working tree, but it does **not** commit or push it. GitHub Actions only runs workflows that exist on a branch in the remote repository, so **the deployment will not happen until you commit and push the file**:
>
> ```sh
> git add .github/workflows/vercel-production-deployment.yml
> git commit -m "ci: add Vercel release deployment workflow"
> git push
> ```
>
> After this is on your default branch, creating a GitHub Release (or pushing a tag, if you've switched the trigger) will start a deployment.


## Examples

> [!TIP]
> The examples below read the tokens from shell environment variables (`$VERCEL_TOKEN`, `$GITHUB_TOKEN`) rather than pasting the raw values on the command line. This keeps your secrets out of your shell history. Set them first, for the current session only:
>
> ```sh
> export VERCEL_TOKEN=your_vercel_token
> export GITHUB_TOKEN=your_github_token
> ```

**Minimal setup** — link the project and create GitHub secrets, nothing else:

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN
```

**Generate the deployment workflow** as well:

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -cgw
```

**Push environment variables** from `.env.local` into production only:

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -le production
```

**Push to multiple environments:**

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -le preview,development,production
```

**Attach a custom domain:**

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -dom yourdomain.com
```

**Everything at once** (workflow + env vars + domain), using long flags for readability:

```sh
verceler \
  --vercel-token $VERCEL_TOKEN \
  --github-token $GITHUB_TOKEN \
  --create-github-workflow \
  --load-env preview,development,production \
  --domain yourdomain.com
```

**Debug run** — same as any command, with extra logging:

```sh
verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -d
```

> [!WARNING]
> Debug mode prints both tokens to the console. Don't paste the output anywhere public.

**Run with npx** (no global install):

```sh
npx verceler -vt $VERCEL_TOKEN -gt $GITHUB_TOKEN -cgw
```

## The generated workflow

`-cgw` writes `.github/workflows/vercel-production-deployment.yml`:

```yaml
name: Vercel Production Deployment
env:
    VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
    VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

on:
    release:
        types: [published]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Install Vercel CLI
              run: npm install --global vercel@latest
            - name: Pull Vercel Environment Information
              run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
            - name: Build Project Artifacts
              run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
            - name: Deploy Project Artifacts to Vercel
              run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

It relies on the three secrets `verceler` created, and triggers whenever a GitHub Release is **published**.

> [!NOTE]
> If the file already exists, `verceler` leaves it untouched — it won't overwrite your customizations.

### Targeting tags instead of releases

To deploy on tag pushes rather than releases, edit the `on:` block in the generated file:

```yaml
on:
    push:
        tags:
            - "v*" # deploy on tags like v1.0.0, v2.3.1, etc.
```

Remember to commit and push the change.

## Troubleshooting

| Symptom                                                              | Likely cause / fix                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Please provide a valid GitHub token with the repo scope.`          | The GitHub token lacks `repo` scope (classic) or **Secrets: Read and write** (fine-grained). Regenerate it.           |
| `Please set the remote origin URL to a valid GitHub repository URL` | No GitHub `origin` remote, or it isn't an HTTPS URL. Run `git remote -v` and set a valid HTTPS origin.                |
| `Neither project.json nor repo.json file found in the .vercel folder`| Project linking didn't complete. Check the Vercel token's scope and re-run; `vercel link` must succeed first.         |
| Domain "you don't have access" warning                              | Often a false positive from Vercel. Verify the domain in your Vercel project settings before assuming it failed.      |
| The workflow never runs after a release                             | The workflow file wasn't committed/pushed. See [Commit the generated workflow to your repo](#what-a-full-run-does).   |

## Contributing

We welcome contributions to verceler. To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

### Running tests

```sh
npm test
```

Or with a coverage report:

```sh
npm run test:coverage
```

Please write tests for any new features or bug fixes.

### Code style

We follow standard JavaScript coding conventions. Please make sure your code adheres to them before submitting a pull request.

## License

`verceler` is licensed under the MIT License. See the [LICENSE](./LICENSE.md) file for details.


## Footnote
We hope verceler makes your Vercel deployments easier and more efficient. If you have any questions or feedback, feel free to open an [issue](https://github.com/IamLizu/verceler/issues).
