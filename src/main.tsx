import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

console.log('Main.tsx loading...');

const rootElement = document.getElementById("root");
console.log('Root element:', rootElement);

if (!rootElement) {
  document.body.innerHTML = '<div style="color: red; padding: 20px;">ERROR: Could not find root element</div>';
} else {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
