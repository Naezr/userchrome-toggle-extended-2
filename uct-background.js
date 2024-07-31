'use strict';

// default settings
this.defaultSettings = {

	// metadata
	initialized: true,
	settingsVer: "2",

	// general
	allowMultiple: false,
	useLastWindowToggles: false,

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
async function windowCreated(window) { // event
	await getSessionStorage();
	await updateIds(window.id);
	
  globalThis.perWindowToggles.set(window.id, await getToggles());
	await updateTitlePrefixes();
	console.log(`Window ${windowId} created!`);
	await saveSessionStorage();
}

async function windowRemoved(windowId) { // event
	await getSessionStorage();
	globalThis.perWindowToggles.delete(windowId);
	await saveSessionStorage();
}

async function windowFocusChanged(windowId) { // event
	if (windowId === browser.windows.WINDOW_ID_NONE) return;
	await getSessionStorage();
	await updateIds(windowId);

	let toggles = perWindowToggles.get(windowId);

	if (toggles === undefined) 
		globalThis.perWindowToggles.set(windowId, await getToggles());

	await updateTitlePrefixes();
	console.log(`Window ${globalThis.lastWindowId} is focused now. Window ${globalThis.secondToLastWindowId} was focused before it.`);
	await saveSessionStorage();
}

// getting toggles from session storage
async function getSessionStorage() {
	let storage = await browser.storage.session.get();

	if (storage.initialized == true) {
		globalThis.perWindowToggles = storage.perWindowToggles;
		globalThis.lastWindowId = storage.lastWindowId;
		globalThis.secondToLastWindowId = storage.secondToLastWindowId;
	} else {
		globalThis.perWindowToggles = new Map();
		globalThis.lastWindowId = undefined;
		globalThis.secondToLastWindowId = undefined;

		console.log('Data initialized!');
	}
}

// saving toggles to session storage
async function saveSessionStorage() {
	let data = {};

	data.initialized = true;
	data.perWindowToggles = globalThis.perWindowToggles;
	data.lastWindowId = globalThis.lastWindowId;
	data.secondToLastWindowId = globalThis.secondToLastWindowId;

	await browser.storage.session.set(data);
}

// getting proper toggles for new window
async function getToggles() {
	const settings = await browser.storage.local.get();

	let toggles = [];
  for (let i = 0; i < settings.toggles.length; i++) {
		if (settings.useLastWindowToggles && secondToLastWindowId != undefined) {
    	toggles.push({ state: globalThis.perWindowToggles.get(secondToLastWindowId)[i].state });
			console.log(`Used toggles from window ${secondToLastWindowId}!`);
		} else {
			toggles.push({ state: settings.toggles[i].default_state });
		}
	}

	return toggles;
}

// updating Ids
async function updateIds(windowId) {
	globalThis.secondToLastWindowId = lastWindowId;
	globalThis.lastWindowId = windowId;
}

// toggling toggles
async function userToggle(name) { // event
	await getSessionStorage();

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
	await saveSessionStorage();
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
function handleMessage(message, sender, sendResponse) { // event

	// handle request to get default settings
	if (message.type == 'getDefaultSettings')
		sendResponse( {
				content: defaultSettings
		});

}

// main

initSettings();

// add listeners
browser.commands.onCommand.addListener(userToggle);    // listen hotkeys
browser.runtime.onMessage.addListener(handleMessage);  // listen messages

browser.windows.onCreated.addListener(windowCreated);
browser.windows.onRemoved.addListener(windowRemoved);
browser.windows.onFocusChanged.addListener(windowFocusChanged);
