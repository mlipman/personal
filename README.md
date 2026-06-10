gemini discussion with templates/structures: https://gemini.google.com/app/f2fe2275796c79de

using digital ocean for server. login via github
4gb ram, 2 vCPU for $24/month.
ssh key: ~/.ssh/id_rsa named "id_rsa work mbp"
ipv4.
162.243.205.126
can login from here via `ssh root@162.243.205.126`
installed codex cli (v0.139) directly onto that box via
`curl -fsSL https://chatgpt.com/codex/install.sh | sh`
it already had git
created a repo-scoped github deploy key with write access for `mlipman/personal`
on the box, the key files are `/root/.ssh/github_personal` and `/root/.ssh/github_personal.pub`
ssh config points github.com at that key, github.com is in known_hosts, and the repo is cloned at `/root/personal`
fresh box version: create a new ed25519 key, add the public key as a write deploy key on this repo, add github.com to known_hosts, add the ssh config entry, then clone `git@github.com:mlipman/personal.git`

next steps:

i think this will be the dev environment for my ai.
so i need to setup docker, load up the code (including setting up docker yamls)
and then get things working
