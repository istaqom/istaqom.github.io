import { mkdir, writeFile } from 'node:fs/promises';

const GITHUB_USER = 'istaqom';
const GITLAB_USER = 'istaqom';
const OUTPUT = 'data/contributions.json';

async function fetchGitHubDays(token) {
    const query = `query ($login: String!) {
        user(login: $login) {
            contributionsCollection {
                contributionCalendar {
                    weeks { contributionDays { date contributionCount } }
                }
            }
        }
    }`;
    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { login: GITHUB_USER } })
    });
    if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors) throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors)}`);
    return json.data.user.contributionsCollection.contributionCalendar.weeks
        .flatMap((week) => week.contributionDays)
        .map((day) => [day.date, day.contributionCount]);
}

async function fetchGitLabCounts() {
    const res = await fetch(`https://gitlab.com/users/${GITLAB_USER}/calendar.json`);
    if (!res.ok) throw new Error(`GitLab calendar ${res.status}: ${await res.text()}`);
    return res.json();
}

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) throw new Error('GITHUB_TOKEN is required');

const [githubDays, gitlabCounts] = await Promise.all([fetchGitHubDays(githubToken), fetchGitLabCounts()]);

const days = githubDays.map(([date, github]) => [date, github, gitlabCounts[date] || 0]);

await mkdir('data', { recursive: true });
await writeFile(OUTPUT, JSON.stringify({ updated: new Date().toISOString(), days }) + '\n');

const total = (i) => days.reduce((sum, day) => sum + day[i], 0);
console.log(`Wrote ${days.length} days: GitHub ${total(1)}, GitLab ${total(2)}`);
