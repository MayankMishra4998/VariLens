const chatForm = document.getElementById('chatForm');
const promptInput = document.getElementById('promptInput');
const chatHistory = document.getElementById('chatHistory');
const auditLog = document.getElementById('auditLog');
const auditEmpty = document.getElementById('auditEmpty');

// Predefined mock conversations to simulate real RAG checks
const scenarios = [
    {
        trigger: "q3 revenue",
        rawOutput: "In Q3 2023, the total revenue was $4.2 million, which represents a 15% increase from the previous quarter. The primary driver was our enterprise software sector.",
        claims: [
            { 
                text: "$4.2 million", 
                type: "STATISTIC", 
                status: "verified", 
                confidence: "0.98", 
                source: "Nibble_page5.txt" 
            },
            { 
                text: "15% increase", 
                type: "STATISTIC", 
                status: "flagged", 
                confidence: "0.42", 
                source: "Nibble_page6.txt", 
                correction: "8% increase" 
            }
        ],
        formattedOutput: "In Q3 2023, the total revenue was <span class='fact-claim fact-verified' data-id='0'>$4.2 million</span>, which represents a <span class='fact-claim fact-flagged' data-id='1'>15% increase</span> from the previous quarter. The primary driver was our enterprise software sector."
    },
    {
        trigger: "remote work policy",
        rawOutput: "Employees are allowed to work fully remotely from anywhere in the world without manager approval, provided they maintain core hours.",
        claims: [
            { 
                text: "fully remotely from anywhere in the world", 
                type: "POLICY", 
                status: "flagged", 
                confidence: "0.19", 
                source: "Nibble_page3.txt",
                correction: "Remote work is allowed only within the contiguous United States"
            },
            { 
                text: "without manager approval", 
                type: "POLICY", 
                status: "blocked", 
                confidence: "0.05", 
                source: "Nibble_page4.txt" 
            }
        ],
        formattedOutput: "Employees are allowed to work <span class='fact-claim fact-flagged' data-id='0'>fully remotely from anywhere in the world</span> <span class='fact-claim fact-blocked' data-id='1'>without manager approval</span>, provided they maintain core hours."
    }
];

const fallbackScenario = {
    rawOutput: "I found multiple documents. The company was founded in April , 2026 by Mayank and NCS.",
    claims: [
        { 
            text: "April , 2026", 
            type: "DATE", 
            status: "verified", 
            confidence: "0.99", 
            source: "Nibble_page1.txt" 
        },
        { 
            text: "Mayank and NCS", 
            type: "ENTITY", 
            status: "verified", 
            confidence: "0.95", 
            source: "Nibble_page2.txt" 
        }
    ],
    formattedOutput: "I found multiple documents. The company was founded in <span class='fact-claim fact-verified' data-id='0'>April , 2026</span> by <span class='fact-claim fact-verified' data-id='1'>Mayank and NCS</span>."
};

// Handle suggestion clicks
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        promptInput.value = chip.innerText;
        chatForm.requestSubmit();
    });
});
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = promptInput.value.trim();
    if (!query) return;

    if (auditEmpty) auditEmpty.style.display = 'none';
    
   
    addUserMessage(query);
    promptInput.value = '';

   
    let scenario = fallbackScenario;
    if (query.toLowerCase().includes('q3')) {
        scenario = scenarios[0];
    } else if (query.toLowerCase().includes('policy') || query.toLowerCase().includes('remote')) {
        scenario = scenarios[1];
    }

    // Proxy Simulation Process
    const msgId = appendLoadingMessage();
    
    await logAudit("info", "Intercepted outgoing request to LLM Provider (OpenAI).", { route: "NCS/VeriLens/Database/library5" });
    await sleep(800);
    
    await logAudit("info", "Received response from LLM. Extracting claims using VectorDB and custom extraction logic.", { rawOutput: scenario.rawOutput });
    await sleep(600);
    
    await logAudit("warning", `Extracted ${scenario.claims.length} claims. Querying VectorDB...`, scenario.claims.map(c => typeof c.text.substring === 'function' ? c.text.substring(0, 15) + '...' : c).slice());
    
    for (let claim of scenario.claims) {
        await sleep(900);
        let logType = claim.status === 'verified' ? 'success' : claim.status === 'flagged' ? 'warning' : 'error';
        let logText = `Verified claim [${claim.type}]: ${claim.status.toUpperCase()} -> ${claim.confidence} confidence.`;
        await logAudit(logType, logText, { source: claim.source });
    }

    await sleep(500);
    await logAudit("success", "Text processing complete. Forwarding annotated text to application layer.");
    
    replaceLoadingWithMessage(msgId, scenario.formattedOutput);
    lucide.createIcons();
    attachTooltipListeners(scenario);
});

function addUserMessage(text) {
    const html = `
        <div class="message user-message">
            <div class="avatar user-avatar">
                <i data-lucide="user"></i>
            </div>
            <div class="content">
                <p>${text}</p>
            </div>
        </div>
    `;
    chatHistory.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
    scrollToBottom(chatHistory);
}

function appendLoadingMessage() {
    const id = "msg_" + Date.now();
    const html = `
        <div class="message system-message" id="${id}">
            <div class="avatar ai-avatar">
                <i data-lucide="bot"></i>
            </div>
            <div class="content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    chatHistory.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
    scrollToBottom(chatHistory);
    return id;
}

function replaceLoadingWithMessage(id, formattedText) {
    const msg = document.getElementById(id);
    msg.querySelector('.content').innerHTML = `<p>${formattedText}</p>`;
    scrollToBottom(chatHistory);
}

async function logAudit(type, text, json = null) {
    const time = new Date().toISOString().split('T')[1].substring(0, 12);
    let jsonHtml = '';
    if (json) {
        jsonHtml = `<div class="log-json">${JSON.stringify(json, null, 2)}</div>`;
    }
    
    const html = `
        <div class="audit-log-item log-${type}">
            <span class="log-time">[${time}]</span>
            <div class="log-text">${text}</div>
            ${jsonHtml}
        </div>
    `;
    auditLog.insertAdjacentHTML('beforeend', html);
    scrollToBottom(auditLog);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
}

// Tooltip Logic
const tooltip = document.getElementById('verificationTooltip');

function attachTooltipListeners(scenario) {
    document.querySelectorAll('.fact-claim:not(.bound)').forEach(el => {
        el.classList.add('bound');
        el.addEventListener('mouseenter', (e) => {
            const index = e.target.getAttribute('data-id');
            const claimData = scenario.claims[index];
            
            // Populate tooltip
            const ttHeader = document.getElementById('ttHeader');
            if (claimData.status === 'verified') {
                ttHeader.className = 'tooltip-header verified';
                ttHeader.innerHTML = '<i data-lucide="check-circle-2"></i><span id="ttTitle">Verified Fact</span>';
            } else if (claimData.status === 'flagged') {
                ttHeader.className = 'tooltip-header flagged';
                ttHeader.innerHTML = '<i data-lucide="alert-triangle"></i><span id="ttTitle">Disputed Claim</span>';
            } else {
                ttHeader.className = 'tooltip-header flagged';
                ttHeader.innerHTML = '<i data-lucide="x-octagon"></i><span id="ttTitle">Blocked Hallucination</span>';
            }
            
            document.getElementById('ttClaim').innerText = claimData.correction || claimData.text;
            document.getElementById('ttConfidence').innerText = (parseFloat(claimData.confidence) * 100).toFixed(1) + "%";
            document.getElementById('ttSource').innerText = claimData.source || 'No evidence found';
            
            lucide.createIcons();
            
            // Position
            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 10) + 'px';
            
            tooltip.classList.add('show');
        });
        
        el.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
    });
}
