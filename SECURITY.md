# Security Policy

1. [Reporting security problems](#reporting)
2. [Incident Response Process](#process)

<a name="reporting"></a>

## Reporting security problems in the Solana Labs JavaScript Client

**DO NOT CREATE A GITHUB ISSUE** to report a security problem.

Instead please use this [Report a Vulnerability](https://github.com/solana-foundation/solana-web3.js/security/advisories/new) link. Provide a helpful title, detailed description of the vulnerability and an exploit proof-of-concept. Speculative submissions without proof-of-concept will be closed with no further consideration.

If you haven't done so already, please **enable two-factor auth** in your GitHub account.

--

If you do not receive a response in the advisory, send an email to security@solanalabs.com with the full URL of the advisory you have created. DO NOT include attachments or provide detail sufficient for exploitation regarding the security issue in this email. **Only provide such details in the advisory**.

If you do not receive a response from security@solanalabs.com please follow up with the team directly. You can do this in the `#web3js` channel of the [Solana Tech discord server](https://solana.com/discord), by pinging the `Solana Labs` role in the channel and referencing the fact that you submitted a security problem.

<a name="process"></a>

## Incident Response Process

In case an incident is discovered or reported, the following process will be followed to contain, respond and remediate:

### 1. Accept the new report

In response a newly reported security problem, a member of the `solana-labs/admins` group will accept the report to turn it into a draft advisory. The `solana-labs/security-incident-response` group should be added to the draft security advisory, and create a private fork of the repository (grey button towards the bottom of the page) if necessary.

If the advisory is the result of an audit finding, follow the same process as above but add the auditor's github user(s) and begin the title with "[Audit]".

If the report is out of scope, a member of the `solana-labs/admins` group will comment as such and then close the report.

### 2. Triage

Within the draft security advisory, discuss and determine the severity of the issue. If necessary, members of the `solana-labs/security-incident-response` group may add other github users to the advisory to assist. If it is determined that this is not a critical issue then the advisory should be closed and if more follow-up is required a normal Solana public github issue should be created.

### 3. Prepare Fixes

Prepare a fix for the issue and push them to master in the private repository associated with the draft security advisory. There is no CI available in the private repository so you must build from source and manually verify fixes. Code review from the reporter is ideal, as well as from multiple members of the core development team.

### 4. Ship the patch

Once the fix is accepted, a member of the solana-labs/security-incident-response group should prepare a patch using [`pnpm patch`](https://pnpm.io/cli/patch), [`yarn patch`](https://yarnpkg.com/cli/patch), and [`patch-package`](https://www.npmjs.com/package/patch-package) for developers still using `npm`. Post the patch to an unlisted [GitHub Gist](https://gist.github.com) and disseminate patch instructions privately to as many vulnerable applications as possible.

### 5. Public Disclosure and Release

Once the fix has been deployed to as large an affected application set as practical, the patches from the security advisory may be merged into the main source repository. A new official release should be shipped, and old affected releases deprecated on NPM using the `npm deprecate` command.
