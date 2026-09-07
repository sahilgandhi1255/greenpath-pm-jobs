async function testBoards() {
  const greenhouseBoards = [
    'airbnb', 'stripe', 'coinbase', 'pinterest', 'duolingo', 'datadog',
    'reddit', 'lyft', 'instacart', 'discord', 'robinhood', 'dropbox',
    'gitlab', 'cloudflare', 'elastic', 'mongodb', 'scaleai', 'brex', 'carta'
  ];
  const ashbyBoards = [
    'notion', 'openai', 'anthropic', 'perplexity', 'elevenlabs', 'supabase',
    'replit', 'ramp', 'posthog', 'sentry'
  ];
  const leverBoards = [
    'spotify', 'canva', 'palantir', 'coursera'
  ];

  console.log('--- Testing Greenhouse Boards ---');
  for (const b of greenhouseBoards) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs?content=true`);
      if (res.ok) {
        const data = await res.json();
        const pms = data.jobs.filter(j => {
          const t = j.title.toLowerCase();
          return (t.includes('product manager') || t.includes('product lead') || t.includes('product owner') || t.includes('director of product') || t.includes('head of product') || t.includes('apm') || t.includes('tpm')) && !t.includes('designer') && !t.includes('marketing') && !t.includes('analyst') && !t.includes('counsel') && !t.includes('sales');
        });
        if (pms.length > 0) {
          console.log(`✅ ${b.toUpperCase()} Greenhouse: ${pms.length} PM roles. First: "${pms[0].title}" -> ${pms[0].absolute_url}`);
        }
      }
    } catch(e) {
      console.warn(`Error on ${b}:`, e.message);
    }
  }

  console.log('\n--- Testing Ashby Boards ---');
  for (const b of ashbyBoards) {
    try {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${b}`);
      if (res.ok) {
        const data = await res.json();
        const pms = data.jobs.filter(j => {
          const t = j.title.toLowerCase();
          return (t.includes('product manager') || t.includes('product lead') || t.includes('product owner') || t.includes('director of product') || t.includes('head of product') || t.includes('apm') || t.includes('tpm')) && !t.includes('designer') && !t.includes('marketing') && !t.includes('analyst') && !t.includes('counsel') && !t.includes('sales');
        });
        if (pms.length > 0) {
          console.log(`✅ ${b.toUpperCase()} Ashby: ${pms.length} PM roles. First: "${pms[0].title}" -> ${pms[0].jobUrl}`);
        }
      }
    } catch(e) {
      console.warn(`Error on ${b}:`, e.message);
    }
  }

  console.log('\n--- Testing Lever Boards ---');
  for (const b of leverBoards) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${b}?mode=json`);
      if (res.ok) {
        const data = await res.json();
        const pms = data.filter(j => {
          const t = j.text.toLowerCase();
          return (t.includes('product manager') || t.includes('product lead') || t.includes('product owner') || t.includes('director of product') || t.includes('head of product') || t.includes('apm') || t.includes('tpm')) && !t.includes('designer') && !t.includes('marketing') && !t.includes('analyst') && !t.includes('counsel') && !t.includes('sales');
        });
        if (pms.length > 0) {
          console.log(`✅ ${b.toUpperCase()} Lever: ${pms.length} PM roles. First: "${pms[0].text}" -> ${pms[0].hostedUrl}`);
        }
      }
    } catch(e) {
      console.warn(`Error on ${b}:`, e.message);
    }
  }
}

testBoards();
