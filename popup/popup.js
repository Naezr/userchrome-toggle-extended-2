'use strict';

this.windowId = undefined;

// main
async function main() {
	await createInputs();
}

// getting current window id
async function getWindowId() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0].windowId;
}

// creating inputs
async function createInputs() {
	const settings = await browser.storage.local.get();
	const storage = await browser.storage.session.get();
	const toggles = storage.perWindowToggles.get(await getWindowId());
	const container = document.getElementById(`toggles-container`);

	for (let i = 0; i < settings.toggles.length; i++) {
		if (settings.toggles[i].enabled) {
			let label = document.createElement('label');
			label.className = 'toggle-label';
			container.appendChild(label);
			
			let input = document.createElement('input');
			input.type = settings.allowMultiple ? 'checkbox' : 'radio';
			input.name = `toggle`;
			input.checked = toggles[i].state;
			input.addEventListener('click', () => { onInputClicked(i); });
			label.appendChild(input);

			let name = document.createElement('span');
			name.textContent = settings.toggles[i].name;
			label.appendChild(name);
		}
	}
}

async function onInputClicked(id) {
	browser.runtime.sendMessage( {
		type: 'toggle',
		name: id + 1
	});
}

document.addEventListener('DOMContentLoaded', main);