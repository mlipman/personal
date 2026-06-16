```
this repo has personal projects and some tooling/templates to enabled ai assisted development.

i am using a digital ocean devbox.
4gb ram, 2 vCPU for $24/month.
login to digital ocean account via github login.
i have an ssh key on my work mbp:
ssh key: ~/.ssh/id_rsa named "id_rsa work mbp"
can login via `ssh root@162.243.205.126`

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
