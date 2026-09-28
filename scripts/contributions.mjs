import { mkdir, writeFile } from 'node:fs/promises';

const GITHUB_USER = 'istaqom';
const GITLAB_USER = 'istaqom';
const GITLAB_USER_ID = 5169617;
const OUTPUT = 'data/contributions.json';

async function fetchGitHub(token) {
    const query = `query ($login: String!) {
        user(login: $login) {
            createdAt
            followers { totalCount }
            repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100) {
                totalCount
                nodes { stargazerCount isFork primaryLanguage { name } }
            }
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

    const user = json.data.user;
    const repos = user.repositories.nodes;
    const langCounts = {};
    for (const repo of repos) {
        const lang = repo.primaryLanguage?.name;
        if (lang && !repo.isFork) langCounts[lang] = (langCounts[lang] || 0) + 1;
    }

    return {
        stats: {
            repos: user.repositories.totalCount,
            stars: repos.reduce((sum, repo) => sum + repo.stargazerCount, 0),
            followers: user.followers.totalCount,
            langs: Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a]).slice(0, 3),
            since: new Date(user.createdAt).getUTCFullYear()
        },
        days: user.contributionsCollection.contributionCalendar.weeks
            .flatMap((week) => week.contributionDays)
            .map((day) => [day.date, day.contributionCount])
    };
}

async function fetchGitLabCounts() {
    const res = await fetch(`https://gitlab.com/users/${GITLAB_USER}/calendar.json`);
    if (!res.ok) throw new Error(`GitLab calendar ${res.status}: ${await res.text()}`);
    return res.json();
}

async function fetchGitLabRepos() {
    const res = await fetch(`https://gitlab.com/api/v4/users/${GITLAB_USER_ID}/projects?per_page=1&simple=true`);
    if (!res.ok) throw new Error(`GitLab projects ${res.status}: ${await res.text()}`);
    return Number(res.headers.get('x-total'));
}

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) throw new Error('GITHUB_TOKEN is required');

const [github, gitlabCounts, gitlabRepos] = await Promise.all([
    fetchGitHub(githubToken),
    fetchGitLabCounts(),
    fetchGitLabRepos()
]);

const days = github.days.map(([date, count]) => [date, count, gitlabCounts[date] || 0]);

await mkdir('data', { recursive: true });
await writeFile(OUTPUT, JSON.stringify({
    updated: new Date().toISOString(),
    github: github.stats,
    gitlab: { repos: gitlabRepos },
    days
}) + '\n');

const total = (i) => days.reduce((sum, day) => sum + day[i], 0);
console.log(`Wrote ${days.length} days: GitHub ${total(1)}, GitLab ${total(2)}`);
console.log('GitHub stats:', github.stats, '| GitLab repos:', gitlabRepos);
