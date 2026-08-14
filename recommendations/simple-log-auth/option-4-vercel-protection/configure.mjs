const required = ["VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_PROTECTION_PASSWORD"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const project = encodeURIComponent(process.env.VERCEL_PROJECT_ID);
const endpoint = new URL(`https://api.vercel.com/v9/projects/${project}`);
if (process.env.VERCEL_TEAM_ID) endpoint.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);

const response = await fetch(endpoint, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    passwordProtection: {
      deploymentType: "all",
      password: process.env.VERCEL_PROTECTION_PASSWORD,
    },
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Vercel update failed (${response.status}): ${body.slice(0, 1_000)}`);
}

const body = await response.json();
console.log(`Password Protection updated for project ${body.name ?? process.env.VERCEL_PROJECT_ID}.`);
