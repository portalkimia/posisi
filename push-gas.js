const fs = require('fs');
const path = require('path');

async function pushToGAS() {
  const scriptId = '1B_6zFnTxoOaXhWL0xtnDh3WIT2Gm6-ga_R5xInrhZg4jb3WlI3xRGqQb';
  const clasprcPath = 'C:/Users/Tito/.clasprc.json';

  if (!fs.existsSync(clasprcPath)) {
    throw new Error('.clasprc.json not found');
  }

  const clasprc = JSON.parse(fs.readFileSync(clasprcPath, 'utf8'));
  const creds = clasprc.tokens.default;

  console.log('Refreshing OAuth access token...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token'
    }).toString()
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to obtain access token: ' + JSON.stringify(tokenData));
  }
  const accessToken = tokenData.access_token;
  console.log('OAuth token obtained successfully.');

  const codeGsPath = path.join(__dirname, 'gas', 'Code.gs');
  const appsscriptPath = path.join(__dirname, 'gas', 'appsscript.json');

  const codeGsSource = fs.readFileSync(codeGsPath, 'utf8');
  const appsscriptSource = fs.readFileSync(appsscriptPath, 'utf8');

  const payload = {
    files: [
      {
        name: 'appsscript',
        type: 'JSON',
        source: appsscriptSource
      },
      {
        name: 'Code',
        type: 'SERVER_JS',
        source: codeGsSource
      }
    ]
  };

  console.log(`Pushing code to Google Apps Script Project (${scriptId})...`);
  const uploadRes = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const uploadData = await uploadRes.json();
  if (uploadRes.status === 200) {
    console.log('SUCCESS: Code.gs and appsscript.json pushed successfully to GAS project!');
    console.log('Remote files updated:', uploadData.files.map(f => f.name + ' (' + f.type + ')').join(', '));
  } else {
    console.error('ERROR during push:', uploadRes.status, uploadData);
  }
}

pushToGAS().catch(err => console.error('Fatal error:', err.message));
