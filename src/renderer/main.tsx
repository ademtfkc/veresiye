import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Self-host fontlar (offline şartı — CDN YOK, hepsi npm paketi olarak gömülü):
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@phosphor-icons/web/regular/style.css'
import './stil/fonts/cabinet-grotesk.css'

// Tasarım token'ları + genel taban stiller:
import './stil/tokens.css'
import './stil/global.css'

const kokEleman = document.getElementById('root')
if (!kokEleman) {
  throw new Error('Kök eleman (#root) bulunamadı — index.html bozulmuş olabilir.')
}

ReactDOM.createRoot(kokEleman).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
