const expDisplay = document.getElementById('expression-display');
const resDisplay = document.getElementById('result-display');
const historyList = document.getElementById('history-list');
const memoryIndicator = document.getElementById('memory-indicator');
const angleIndicator = document.getElementById('angle-indicator');
const angleToggle = document.getElementById('angle-toggle');
const sciToggle = document.getElementById('sci-toggle');
const keypadWrapper = document.querySelector('.keypad-wrapper');

let expression = '';
let isDegree = true;
let memoryValue = 0;
let history = JSON.parse(localStorage.getItem('quantum_calc_history')) || [];

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = `<p style="color:var(--text-muted); font-size:0.82rem; text-align:center; margin-top:24px;">No calculations yet</p>`;
    return;
  }
  historyList.innerHTML = history
    .map(
      item => `
      <div class="hist-item" onclick="reuseResult('${item.result}')">
        <div class="hist-exp">${item.expression} =</div>
        <div class="hist-res">${item.result}</div>
      </div>
    `
    )
    .join('');
}

function reuseResult(val) {
  expression = String(val);
  resDisplay.innerText = expression;
  expDisplay.innerText = 'Reused from history';
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function toRadians(val) {
  return isDegree ? (val * Math.PI) / 180 : val;
}

function evaluateExpression(rawExp) {
  let sanitized = rawExp
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\^/g, '**')
    .replace(/π/g, `(${Math.PI})`)
    .replace(/\be\b/g, `(${Math.E})`);

  // Safe evaluation via Function constructor
  const fn = new Function(`"use strict"; return (${sanitized});`);
  const val = fn();
  if (typeof val !== 'number' || Number.isNaN(val)) throw new Error('Invalid');
  return Math.round(val * 1e10) / 1e10;
}

function updateLivePreview() {
  expDisplay.innerText = expression;
  if (!expression) {
    resDisplay.innerText = '0';
    return;
  }
  try {
    const preview = evaluateExpression(expression);
    if (Number.isFinite(preview)) {
      resDisplay.innerText = preview;
    }
  } catch {
    // Wait until expression is syntactically complete
  }
}

function calculateFinal() {
  if (!expression) return;
  try {
    const result = evaluateExpression(expression);
    if (!Number.isFinite(result)) {
      resDisplay.innerText = 'Math Error';
      return;
    }
    history.unshift({ expression, result });
    if (history.length > 25) history.pop();
    localStorage.setItem('quantum_calc_history', JSON.stringify(history));
    renderHistory();

    expDisplay.innerText = `${expression} =`;
    resDisplay.innerText = result;
    expression = String(result);
  } catch {
    resDisplay.innerText = 'Syntax Error';
  }
}

function applyScientificOp(op) {
  let currentVal;
  try {
    currentVal = expression ? evaluateExpression(expression) : parseFloat(resDisplay.innerText) || 0;
  } catch {
    resDisplay.innerText = 'Syntax Error';
    return;
  }

  let output;
  let label = `${op}(${currentVal})`;

  switch (op) {
    case 'sin':
      output = Math.sin(toRadians(currentVal));
      break;
    case 'cos':
      output = Math.cos(toRadians(currentVal));
      break;
    case 'tan':
      if (isDegree && Math.abs(currentVal % 180) === 90) {
        resDisplay.innerText = 'Undefined';
        return;
      }
      output = Math.tan(toRadians(currentVal));
      break;
    case 'log':
      output = Math.log10(currentVal);
      break;
    case 'ln':
      output = Math.log(currentVal);
      break;
    case 'sqrt':
      output = Math.sqrt(currentVal);
      label = `√(${currentVal})`;
      break;
    case 'sq':
      output = Math.pow(currentVal, 2);
      label = `(${currentVal})²`;
      break;
    case 'fact':
      output = factorial(currentVal);
      label = `${currentVal}!`;
      break;
    case 'inv':
      output = 1 / currentVal;
      label = `1/(${currentVal})`;
      break;
    case 'abs':
      output = Math.abs(currentVal);
      label = `|${currentVal}|`;
      break;
    case 'exp':
      output = Math.exp(currentVal);
      label = `e^(${currentVal})`;
      break;
  }

  if (Number.isNaN(output) || !Number.isFinite(output)) {
    resDisplay.innerText = 'Math Error';
    return;
  }

  output = Math.round(output * 1e10) / 1e10;
  history.unshift({ expression: label, result: output });
  localStorage.setItem('quantum_calc_history', JSON.stringify(history));
  renderHistory();

  expDisplay.innerText = `${label} =`;
  resDisplay.innerText = output;
  expression = String(output);
}

// Button Bindings
document.querySelectorAll('[data-insert]').forEach(btn => {
  btn.addEventListener('click', () => {
    expression += btn.dataset.insert;
    updateLivePreview();
  });
});

document.querySelectorAll('[data-const]').forEach(btn => {
  btn.addEventListener('click', () => {
    expression += btn.dataset.const === 'PI' ? 'π' : 'e';
    updateLivePreview();
  });
});

document.querySelectorAll('[data-sci]').forEach(btn => {
  btn.addEventListener('click', () => applyScientificOp(btn.dataset.sci));
});

document.querySelector('[data-action="clear"]').addEventListener('click', () => {
  expression = '';
  expDisplay.innerText = '';
  resDisplay.innerText = '0';
});

document.querySelector('[data-action="delete"]').addEventListener('click', () => {
  expression = expression.slice(0, -1);
  updateLivePreview();
});

document.querySelector('[data-action="sign"]').addEventListener('click', () => {
  if (!expression) return;
  expression = expression.startsWith('-') ? expression.slice(1) : `-${expression}`;
  updateLivePreview();
});

document.querySelector('[data-action="calculate"]').addEventListener('click', calculateFinal);

// Memory Controls
document.querySelectorAll('[data-mem]').forEach(btn => {
  btn.addEventListener('click', () => {
    const current = parseFloat(resDisplay.innerText) || 0;
    const cmd = btn.dataset.mem;
    if (cmd === 'MC') memoryValue = 0;
    if (cmd === 'MR') {
      expression += String(memoryValue);
      updateLivePreview();
    }
    if (cmd === 'M+') memoryValue += current;
    if (cmd === 'M-') memoryValue -= current;
    memoryIndicator.classList.toggle('hidden', memoryValue === 0);
  });
});

// Toggles & Utilities
angleToggle.addEventListener('click', () => {
  isDegree = !isDegree;
  angleToggle.innerText = isDegree ? 'DEG' : 'RAD';
  angleIndicator.innerText = isDegree ? 'DEG' : 'RAD';
});

sciToggle.addEventListener('click', () => {
  sciToggle.classList.toggle('active');
  keypadWrapper.classList.toggle('standard-only');
});

document.getElementById('theme-toggle').addEventListener('click', e => {
  document.body.classList.toggle('light-theme');
  e.target.innerText = document.body.classList.contains('light-theme') ? '🌙' : '☀';
});

document.getElementById('copy-btn').addEventListener('click', e => {
  navigator.clipboard.writeText(resDisplay.innerText);
  e.target.innerText = '✓ Copied';
  setTimeout(() => (e.target.innerText = '📋 Copy'), 1200);
});

document.getElementById('clear-history').addEventListener('click', () => {
  history = [];
  localStorage.removeItem('quantum_calc_history');
  renderHistory();
});

// Full Keyboard Support
document.addEventListener('keydown', e => {
  if ((e.key >= '0' && e.key <= '9') || ['+', '-', '*', '/', '%', '.', '(', ')', '^'].includes(e.key)) {
    expression += e.key;
    updateLivePreview();
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    calculateFinal();
  } else if (e.key === 'Backspace') {
    expression = expression.slice(0, -1);
    updateLivePreview();
  } else if (e.key === 'Escape') {
    expression = '';
    expDisplay.innerText = '';
    resDisplay.innerText = '0';
  }
});

renderHistory();