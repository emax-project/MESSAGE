const { ipcRenderer } = require('electron');

window.addEventListener('click', () => {
  ipcRenderer.send('notification-clicked');
});
