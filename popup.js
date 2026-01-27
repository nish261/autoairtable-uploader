// Airtable Video Uploader - Simplified Version

let selectedFiles = [];
let apiKey = '';
let currentBase = '';
let currentTable = '';

// DOM elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiBtn = document.getElementById('saveApiBtn');
const airtableUrl = document.getElementById('airtableUrl');
const parseUrlBtn = document.getElementById('parseUrlBtn');
const baseIdInput = document.getElementById('baseIdInput');
const tableIdInput = document.getElementById('tableIdInput');
const setTableBtn = document.getElementById('setTableBtn');
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Load saved settings
chrome.storage.local.get(['airtableApiKey', 'airtableBase', 'airtableTable'], (result) => {
  if (result.airtableApiKey) {
    apiKey = result.airtableApiKey;
    apiKeyInput.value = apiKey;
  }

  if (result.airtableBase) {
    currentBase = result.airtableBase;
    baseIdInput.value = currentBase;
  }

  if (result.airtableTable) {
    currentTable = result.airtableTable;
    tableIdInput.value = currentTable;
  }

  // If everything is loaded, auto-show upload section
  if (apiKey && currentBase && currentTable) {
    uploadSection.style.display = 'block';
    showStatus(`✓ Settings loaded! Base: ${currentBase}, Table: ${currentTable}`, 'success');
  }
});

// Save API key
saveApiBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  apiKey = key;
  chrome.storage.local.set({ airtableApiKey: key }, () => {
    showStatus('✓ API Key saved!', 'success');
    setTimeout(() => statusDiv.style.display = 'none', 2000);
  });
});

// Parse Airtable URL
parseUrlBtn.addEventListener('click', () => {
  const url = airtableUrl.value.trim();

  if (!url) {
    showStatus('Please paste an Airtable URL', 'error');
    return;
  }

  // Extract Base ID (appXXXXXXXXXXXXXX)
  const baseMatch = url.match(/\/(app[a-zA-Z0-9]+)/);
  if (!baseMatch) {
    showStatus('Could not find Base ID in URL', 'error');
    return;
  }

  const baseId = baseMatch[1];

  // Auto-fill the base ID field
  baseIdInput.value = baseId;
  currentBase = baseId;

  // Save it
  chrome.storage.local.set({ airtableBase: baseId });

  showStatus(`✓ Base ID saved: ${baseId}. Now enter Table ID below.`, 'success');
});

// Set table
setTableBtn.addEventListener('click', () => {
  const baseId = baseIdInput.value.trim();
  const tableId = tableIdInput.value.trim();

  if (!apiKey) {
    showStatus('Please save your API key first', 'error');
    return;
  }

  if (!baseId) {
    showStatus('Please enter Base ID', 'error');
    return;
  }

  if (!tableId) {
    showStatus('Please enter Table ID', 'error');
    return;
  }

  currentBase = baseId;
  currentTable = tableId;

  // Save to Chrome storage so it auto-loads next time
  chrome.storage.local.set({
    airtableBase: baseId,
    airtableTable: tableId
  }, () => {
    uploadSection.style.display = 'block';
    showStatus(`✓ Saved & Ready! Base: ${baseId}, Table: ${tableId}`, 'success');
  });
});

// File selection
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);

  // Filter for videos and images only
  selectedFiles = selectedFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (selectedFiles.length === 0) {
    showStatus('No valid video/image files found', 'error');
    return;
  }

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files', 'info');
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
});

// Folder selection
folderInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files);

  // Filter for videos and images only
  selectedFiles = selectedFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (selectedFiles.length === 0) {
    showStatus('No valid video/image files found in folder', 'error');
    return;
  }

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files', 'info');
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
});

function displayFileList() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '<div style="color: #9ca3af; font-size: 12px;">No files selected</div>';
    return;
  }

  fileList.innerHTML = `<div style="margin-bottom: 6px; font-weight: 600;">${selectedFiles.length} file(s) selected:</div>` +
    selectedFiles.slice(0, 10).map(file => `
      <div class="file-item">${file.name}</div>
    `).join('') +
    (selectedFiles.length > 10 ? `<div class="file-item" style="color: #9ca3af;">... and ${selectedFiles.length - 10} more</div>` : '');
}

// Upload process
uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    showStatus('Please select files first', 'error');
    return;
  }

  if (!apiKey || !currentBase || !currentTable) {
    showStatus('Please set table info first', 'error');
    return;
  }

  uploadBtn.disabled = true;
  showStatus('Starting upload...', 'info');
  progressDiv.classList.add('active');

  console.log('=== STARTING UPLOAD ===');
  console.log('Files to upload:', selectedFiles.length);
  console.log('Base:', currentBase);
  console.log('Table:', currentTable);

  try {
    let successCount = 0;
    let failCount = 0;
    let errors = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      console.log(`\n--- Processing file ${i + 1}/${selectedFiles.length}: ${file.name} ---`);
      updateProgress(i + 1, selectedFiles.length, `Uploading ${file.name}...`);

      try {
        // Upload file to temporary hosting
        console.log('Uploading to file.io...');
        const fileUrl = await uploadToTempHost(file);

        if (!fileUrl) {
          console.error(`❌ Failed to get URL for ${file.name}`);
          failCount++;
          errors.push(`${file.name}: Failed to upload to file.io`);
          continue;
        }

        console.log('✓ File.io URL:', fileUrl);

        // Create new record in Airtable
        console.log('Creating Airtable record...');
        const result = await createAirtableRecord(file.name, fileUrl);
        console.log('✓ Airtable record created:', result.id);

        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error);
        failCount++;
        errors.push(`${file.name}: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      await sleep(500);
    }

    updateProgress(selectedFiles.length, selectedFiles.length, 'Complete!');

    console.log('\n=== UPLOAD COMPLETE ===');
    console.log('Success:', successCount);
    console.log('Failed:', failCount);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    if (failCount > 0) {
      showStatus(`⚠️ Done! ${successCount} uploaded, ${failCount} failed. Check console (F12) for errors.`, 'error');
    } else {
      showStatus(`✓ Done! ${successCount} files uploaded successfully!`, 'success');
    }

    // Clear file selection
    selectedFiles = [];
    fileInput.value = '';
    folderInput.value = '';
    displayFileList();

  } catch (error) {
    console.error('❌ Upload error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
    setTimeout(() => {
      progressDiv.classList.remove('active');
    }, 5000);
  }
});

// Upload file to temporary hosting (direct approach with host_permissions)
async function uploadToTempHost(file) {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Uploading to tmpfiles.org, size:', file.size, 'bytes');

  try {
    // Try tmpfiles.org first
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    console.log('tmpfiles.org response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('tmpfiles.org response:', data);

      if (data.status === 'success' && data.data && data.data.url) {
        // Convert to direct download URL
        const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        console.log('✓ tmpfiles.org URL:', directUrl);
        return directUrl;
      }
    }

    throw new Error('tmpfiles.org upload failed');

  } catch (error) {
    console.error('tmpfiles.org error:', error);
    console.log('Trying 0x0.st as fallback...');

    try {
      // Fallback to 0x0.st (simple file host)
      const response = await fetch('https://0x0.st', {
        method: 'POST',
        body: formData
      });

      console.log('0x0.st response status:', response.status);

      if (response.ok) {
        const url = await response.text();
        console.log('✓ 0x0.st URL:', url.trim());
        return url.trim();
      }

      throw new Error('0x0.st upload failed');

    } catch (fallbackError) {
      console.error('All upload services failed:', fallbackError);
      throw new Error('Failed to upload file to any hosting service');
    }
  }
}

// Create new Airtable record with attachment (direct with host_permissions)
async function createAirtableRecord(fileName, fileUrl) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    fields: {
      "Money Video": [
        {
          url: fileUrl,
          filename: fileName
        }
      ],
      "Status": "Todo"
    }
  };

  console.log('Creating Airtable record...');
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('Airtable response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Airtable error:', errorData);
    throw new Error(`Airtable error: ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  console.log('✓ Airtable record created:', result.id);
  return result;
}

// Helper functions
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function updateProgress(current, total, message) {
  const percent = (current / total) * 100;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total} - ${message}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
