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
const clearBtn = document.getElementById('clearBtn');
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

// File selection - select individual files from anywhere
fileInput.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);

  // Filter for videos and images only
  const validFiles = newFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (validFiles.length === 0) {
    showStatus('No valid video/image files found', 'error');
    return;
  }

  // ADD to existing selection
  selectedFiles = [...selectedFiles, ...validFiles];

  // Remove duplicates by full path
  const uniqueFiles = [];
  const seen = new Set();
  for (const file of selectedFiles) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }
  selectedFiles = uniqueFiles;

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files total', 'info');
  } else {
    showStatus(`✓ Added ${validFiles.length} files (${selectedFiles.length} total)`, 'success');
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
  clearBtn.style.display = selectedFiles.length > 0 ? 'block' : 'none';

  // Reset input so you can select more
  fileInput.value = '';
});

// Folder selection - select entire folder contents
folderInput.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);

  // Filter for videos and images only
  const validFiles = newFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (validFiles.length === 0) {
    showStatus('No valid video/image files found in folder', 'error');
    return;
  }

  // ADD to existing selection
  selectedFiles = [...selectedFiles, ...validFiles];

  // Remove duplicates by full path
  const uniqueFiles = [];
  const seen = new Set();
  for (const file of selectedFiles) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }
  selectedFiles = uniqueFiles;

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files total', 'info');
  } else {
    // Count unique folders
    const folders = new Set();
    for (const file of selectedFiles) {
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folders.add(parts.join('/'));
        }
      }
    }
    const folderCount = folders.size;
    if (folderCount > 1) {
      showStatus(`✓ Selected ${folderCount} folders (${selectedFiles.length} files)`, 'success');
    } else {
      showStatus(`✓ Selected ${selectedFiles.length} files`, 'success');
    }
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
  clearBtn.style.display = selectedFiles.length > 0 ? 'block' : 'none';

  // Reset input so you can select more folders
  folderInput.value = '';
});

// Clear all files
clearBtn.addEventListener('click', () => {
  selectedFiles = [];
  fileInput.value = '';
  folderInput.value = '';
  displayFileList();
  uploadBtn.disabled = true;
  clearBtn.style.display = 'none';
  showStatus('✓ Selection cleared', 'success');
  setTimeout(() => statusDiv.style.display = 'none', 2000);
});

function displayFileList() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '<div style="color: #9ca3af; font-size: 12px;">No files selected</div>';
    return;
  }

  // Detect if files are from folder selection or individual file selection
  const hasFolderStructure = selectedFiles.some(file => file.webkitRelativePath);

  if (hasFolderStructure) {
    // FOLDER SELECTION: Group by folder
    const filesByFolder = new Map();
    for (const file of selectedFiles) {
      let folderPath = 'root';
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folderPath = parts[parts.length - 1]; // Show just the folder name
        }
      }
      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath).push(file);
    }

    const folderCount = filesByFolder.size;
    const header = `${folderCount} folder${folderCount > 1 ? 's' : ''} (${selectedFiles.length} files) → ${folderCount} records`;

    let html = `<div style="margin-bottom: 6px; font-weight: 600;">${header}:</div>`;

    // Show files grouped by folder
    for (const [folderName, files] of filesByFolder) {
      html += `<div style="color: #18bfff; font-size: 11px; margin-top: 8px; font-weight: 600;">📁 ${folderName} (${files.length} files)</div>`;
      html += files.slice(0, 3).map(file => `
        <div class="file-item">${file.name}</div>
      `).join('');
      if (files.length > 3) {
        html += `<div class="file-item" style="color: #9ca3af;">... and ${files.length - 3} more</div>`;
      }
    }

    fileList.innerHTML = html;
  } else {
    // FILE SELECTION: Show individual files (each becomes 1 record)
    const header = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} → ${selectedFiles.length} records`;

    let html = `<div style="margin-bottom: 6px; font-weight: 600;">${header}:</div>`;
    html += selectedFiles.slice(0, 10).map(file => `
      <div class="file-item">📄 ${file.name}</div>
    `).join('');
    if (selectedFiles.length > 10) {
      html += `<div class="file-item" style="color: #9ca3af;">... and ${selectedFiles.length - 10} more files</div>`;
    }

    fileList.innerHTML = html;
  }
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
  showStatus('⚠️ DO NOT CLOSE THIS POPUP - Upload in progress...', 'info');
  progressDiv.classList.add('active');

  console.log('=== STARTING UPLOAD ===');
  console.log('Files to upload:', selectedFiles.length);
  console.log('Base:', currentBase);
  console.log('Table:', currentTable);

  try {
    // Step 1: Group files by their parent folder
    const filesByFolder = new Map();

    for (const file of selectedFiles) {
      let folderPath;

      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folderPath = parts.join('/');
        } else {
          folderPath = 'root';
        }
      } else {
        folderPath = `file_${file.name}_${file.size}_${file.lastModified}`;
      }

      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath).push(file);
    }

    console.log(`\n📁 Found ${filesByFolder.size} folder(s) to create records for:`);
    for (const [folder, files] of filesByFolder) {
      console.log(`  - ${folder}: ${files.length} files`);
    }

    // Step 2: Upload all files in PARALLEL (5 concurrent)
    const CONCURRENT_UPLOADS = 5;
    const uploadedByFolder = new Map();
    const errors = [];
    let uploadedCount = 0;

    // Flatten all files with their folder info
    const allFiles = [];
    for (const [folderPath, files] of filesByFolder) {
      uploadedByFolder.set(folderPath, []);
      for (const file of files) {
        allFiles.push({ file, folderPath });
      }
    }

    // Process files in parallel batches
    for (let i = 0; i < allFiles.length; i += CONCURRENT_UPLOADS) {
      const batch = allFiles.slice(i, i + CONCURRENT_UPLOADS);

      const batchPromises = batch.map(async ({ file, folderPath }) => {
        console.log(`\n--- Uploading: ${file.name} ---`);

        try {
          const fileUrl = await uploadToTempHost(file);

          if (!fileUrl) {
            console.error(`❌ Failed to get URL for ${file.name}`);
            errors.push(`${file.name}: Failed to upload to hosting`);
            return null;
          }

          console.log('✓ URL:', fileUrl);
          return { folderPath, url: fileUrl, filename: file.name };

        } catch (error) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
          return null;
        }
      });

      const results = await Promise.all(batchPromises);

      // Process results
      for (const result of results) {
        uploadedCount++;
        updateProgress(uploadedCount, allFiles.length, `Uploaded ${uploadedCount}/${allFiles.length}`);

        if (result) {
          uploadedByFolder.get(result.folderPath).push({
            url: result.url,
            filename: result.filename
          });
        }
      }

      // Small delay between batches
      if (i + CONCURRENT_UPLOADS < allFiles.length) {
        await sleep(100);
      }
    }

    // Step 3: Create records in BATCHES (Airtable allows 10 per request)
    const BATCH_SIZE = 10;
    let recordsCreated = 0;

    // Collect all records to create
    const recordsToCreate = [];
    for (const [folderPath, uploadedFiles] of uploadedByFolder) {
      if (uploadedFiles.length > 0) {
        recordsToCreate.push({ folderPath, files: uploadedFiles });
      }
    }

    // Process in batches of 10
    for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
      const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
      updateProgress(allFiles.length, allFiles.length, `Creating records ${i+1}-${Math.min(i+BATCH_SIZE, recordsToCreate.length)}...`);

      try {
        const result = await createAirtableRecordsBatch(batch);
        recordsCreated += result.records.length;
        console.log(`✓ Batch created: ${result.records.length} records`);
      } catch (error) {
        console.error(`❌ Error creating batch:`, error);
        // Fallback to individual creation
        for (const record of batch) {
          try {
            await createAirtableRecord(record.files);
            recordsCreated++;
          } catch (e) {
            errors.push(`Folder ${record.folderPath}: ${e.message}`);
          }
        }
      }

      if (i + BATCH_SIZE < recordsToCreate.length) {
        await sleep(100);
      }
    }

    console.log('\n=== UPLOAD COMPLETE ===');
    console.log('Records created:', recordsCreated);
    console.log('Files uploaded:', uploadedCount - errors.length);
    console.log('Files failed:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    if (recordsCreated === 0) {
      showStatus('❌ All uploads failed. Check console for details.', 'error');
    } else if (errors.length > 0) {
      showStatus(`⚠️ Done! ${recordsCreated} records created, ${errors.length} files failed.`, 'error');
    } else {
      showStatus(`✓ Done! ${recordsCreated} records created with ${uploadedCount} files!`, 'success');
    }

    selectedFiles = [];
    fileInput.value = '';
    folderInput.value = '';
    displayFileList();
    clearBtn.style.display = 'none';

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

// Upload file to temporary hosting - race all hosts for speed
async function uploadToTempHost(file) {
  // Create upload promises for all hosts simultaneously
  const uploadToCatbox = async () => {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    const response = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('catbox failed');
    const url = await response.text();
    if (url && url.startsWith('https://')) return url.trim();
    throw new Error('catbox invalid url');
  };

  const uploadToUguu = async () => {
    const formData = new FormData();
    formData.append('files[]', file);
    const response = await fetch('https://uguu.se/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('uguu failed');
    const data = await response.json();
    if (data.success && data.files?.[0]?.url) return data.files[0].url;
    throw new Error('uguu invalid response');
  };

  const uploadTo0x0 = async () => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('https://0x0.st', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('0x0 failed');
    const url = await response.text();
    if (url && url.startsWith('https://')) return url.trim();
    throw new Error('0x0 invalid url');
  };

  // Race all hosts - first success wins
  try {
    const result = await Promise.any([uploadToCatbox(), uploadToUguu(), uploadTo0x0()]);
    return result;
  } catch (error) {
    throw new Error('Failed to upload file to any hosting service');
  }
}

// Create new Airtable record with ALL attachments in one record
async function createAirtableRecord(filesArray) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    fields: {
      "Money Video": filesArray,
      "Status": "Todo"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airtable error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

// Create multiple Airtable records in one batch (up to 10)
async function createAirtableRecordsBatch(recordsData) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    records: recordsData.map(({ files }) => ({
      fields: {
        "Money Video": files,
        "Status": "Todo"
      }
    }))
  };

  console.log(`Creating ${recordsData.length} records in batch...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airtable batch error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
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
