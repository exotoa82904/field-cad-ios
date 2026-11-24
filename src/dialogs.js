import dialogPolyfill from 'dialog-polyfill';
import './dialogs.css';
export function ensureDialog(dialog){if(typeof dialog.showModal!=='function'){dialog.classList.add('dialog-fallback');dialogPolyfill.registerDialog(dialog);}return dialog;}
