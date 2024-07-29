'use strict';

// default settings
this.defaultSettings = {

	// metadata
	initialized: true,
	settingsVer: "2",

	// general
	allowMultiple: false,

	// toggles
	toggles: [
		{
			name: "Style 1",
			enabled: true,
			prefix: '-',
			default_state: true
		},
		{
			name: "Style 2",
			enabled: false,
			prefix: '=',
			default_state: false
		},
		{
			name: "Style 3",
			enabled: false,
			prefix: '+',
			default_state: false
		},
		{
			name: "Style 4",
			enabled: false,
			prefix: '?',
			default_state: false
		},
		{
			name: "Style 5",
			enabled: false,
			prefix: '!',
			default_state: false
		},
		{
			name: "Style 6",
			enabled: false,
			prefix: '/',
			default_state: false
		}
	]
}

// main
async function main() {
	// call functions
	await initSettings();

	// add listeners
	browser.commands.onCommand.addListener(userToggle);    // listen hotkeys
	browser.runtime.onMessage.addListener(handleMessage);  // listen messages

	browser.windows.onCreated.addListener(windowCreated);
	browser.windows.onRemoved.addListener(windowRemoved);
	browser.windows.onFocusChanged.addListener(windowFocusChanged);
}

// settings initialization
async function initSettings() {
	const settings = await browser.storage.local.get();
  
	// reset settings if needed
	if (settings.initialized != true || settings.settingsVer != "2") {
		await browser.storage.local.clear();
		await browser.storage.local.set(defaultSettings);
		console.log('Settings was reset!');
		browser.runtime.openOptionsPage();
	}
	console.log('Settings initialized!');
}

// windows handling
this.perWindowToggles = new Map();
this.lastWindowId = undefined;
this.secondToLastWindowId = undefined;

async function windowCreated(window) {
  globalThis.perWindowToggles.set(window.id, await getToggles());
	await updateTitlePrefixes();
}

async function windowRemoved(windowId) {
	globalThis.perWindowToggles.delete(windowId);
}

async function windowFocusChanged(windowId) {
	if (windowId === browser.windows.WINDOW_ID_NONE) return;

	let toggles = perWindowToggles.get(windowId);

	if (toggles === undefined) 
		globalThis.perWindowToggles.set(windowId, await getToggles());

	globalThis.secondToLastWindowId = lastWindowId;
	globalThis.lastWindowId = windowId;

	await updateTitlePrefixes();
	console.log(`Window ${globalThis.lastWindowId} is focused now. Window ${globalThis.secondToLastWindowId} was focused before it.`)
}

async function getToggles() {
	const settings = await browser.storage.local.get();

	let toggles = [];
  for (let i = 0; i < settings.toggles.length; i++)
    toggles.push({ state: settings.toggles[i].default_state });

	return toggles;
}

// toggling toggles
async function userToggle(name) {
	let toggleId = name - 1;
	let toggles = globalThis.perWindowToggles.get(lastWindowId);
	const settings = await browser.storage.local.get();

	if (settings.toggles[toggleId].enabled) {
		toggles[toggleId].state = !toggles[toggleId].state;

		if (!settings.allowMultiple)
			for (let i = 0; i < toggles.length; i++) {
				if (i != toggleId)
					toggles[i].state = false;
		}

		globalThis.perWindowToggles.set(lastWindowId, toggles);
		console.log(`Toggled style ${name} for window ${lastWindowId}!`);
	}

	await updateTitlePrefixes();
}

// updating prefixes for all windows
async function updateTitlePrefixes() {
	const settings = await browser.storage.local.get();

	globalThis.perWindowToggles.forEach((toggles, windowId) => {
		let titlePrefix = '';

		// Loop through all toggles
		for (let i = 0; i < toggles.length; i++) {
			if (settings.toggles[i].enabled && toggles[i].state) {
				titlePrefix += String(settings.toggles[i].prefix);

				if (!settings.allowMultiple) break;
			}
		}

		browser.windows.update(windowId, {
			titlePreface: titlePrefix
		});
	});
}

// message handling
function handleMessage(message, sender, sendResponse) {

	// handle request to get default settings
	if (message.type == 'getDefaultSettings')
		sendResponse( {
				content: defaultSettings
		});

}

main();