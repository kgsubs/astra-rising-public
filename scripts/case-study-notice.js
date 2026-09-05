'use strict';

// This repository is a case study, not a distribution.
//
// The code is here to be read: it is the real thing that runs astrarising.com,
// unedited apart from renaming. It is not here to be installed and run by
// somebody else, because doing that needs provider API keys, a database and a
// deploy this repo deliberately does not carry.
//
// Two modes, chosen by the caller:
//   node scripts/case-study-notice.js         warn and continue (npm install)
//   node scripts/case-study-notice.js --stop  print and refuse  (npm start)

const STOP = process.argv.includes('--stop');

const line = '='.repeat(72);
const notice = `
${line}
  ASTRA RISING - PORTFOLIO CASE STUDY
${line}

  This repository exists to be read, not to be run.

  It is the real source behind astrarising.com, published as a case study in
  building a production AI feature. It is complete and it is honest, but it is
  not packaged for someone else to stand up: it needs provider API keys, a
  database and infrastructure that are not, and will not be, in this repo.

  The running game is at:   https://astrarising.com
  The write-up is in:       README.md

  What you CAN do here:
    npm test        the full test suite, no keys and no network needed

${line}
`;

if (STOP) {
  console.error(notice);
  console.error('  `npm start` is intentionally disabled. See the notice above.\n');
  process.exit(1);
}

console.log(notice);
