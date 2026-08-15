```
this repo has personal projects and some tooling/templates to enabled ai assisted development.

i am using a digital ocean devbox.
4gb ram, 2 vCPU for $24/month.
login to digital ocean account via github login.

ip address is 162.243.205.126
need to setup ssh key on personal mb air.

installed codex cli (v0.139) directly onto that box via
`curl -fsSL https://chatgpt.com/codex/install.sh | sh`
it already had git
created a repo-scoped github deploy key with write access for `mlipman/personal`
on the box, the key files are `/root/.ssh/github_personal` and `/root/.ssh/github_personal.pub`
ssh config points github.com at that key, github.com is in known_hosts, and the repo is cloned at `/root/personal`
fresh box version: create a new ed25519 key, add the public key as a write deploy key on this repo, add github.com to known_hosts, add the ssh config entry, then clone `git@github.com:mlipman/personal.git`

we setup a http server on the devbox, code and setup is in remote_control
that allows someone with the bearer token to go to http://162.243.205.126:8787/ and send a request
which will go to codex. i'm considering instead using open claw or similar to correspond with an agent on the devbox.
```

see simple-log as an example of a successfully deployed nextjs webapp, with its README including prod setup and deploy process

## Simple static and mostly-static sites

For small standalone sites, use Cloudflare Workers with a custom domain rather than Vercel or a GitHub deployment integration. `projects/election-percentiles` is the working example, deployed at `percentiles.mlipman.com`.

Each site checks in:

- its source code and normal build configuration;
- a `wrangler.jsonc` containing the Worker name, compatibility settings, and custom-domain route;
- a `deploy` package script that builds the production bundle and runs `wrangler deploy`; and
- ignore rules for generated output and local Wrangler state.

The deployment path is local working copy → production build → Wrangler → Cloudflare. A GitHub push does not deploy the site, and Vercel is not involved.

On the first deployment from a computer:

```bash
npm install
npx wrangler login
npm run deploy
```

`npx wrangler login` opens Cloudflare OAuth and stores the authorization on that computer. Later deployments from the same computer normally require only `npm run deploy`. Deploying interactively from a different computer requires running the login command there as well.

For CI, a devbox, or another non-interactive environment, use a scoped Cloudflare API token instead of browser login. Give the token only the permissions needed to deploy the Worker and manage its route/custom domain, store it in the environment's secret manager as `CLOUDFLARE_API_TOKEN`, and run `npm run deploy`. Never commit the token or local Wrangler credentials.

See `projects/election-percentiles/README.md` for the concrete configuration and commands.
