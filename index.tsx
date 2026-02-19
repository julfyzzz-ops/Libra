
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";

// Initialize drag-and-drop polyfill for mobile
// holdToDrag: 300ms means tap works as click/scroll, hold starts drag
polyfill({
    dragImageCenterOnTouch: true,
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    holdToDrag: 300 
});

// Fix for iOS Safari to prevent scrolling while dragging
window.addEventListener( 'touchmove', function() {}, {passive: false});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
