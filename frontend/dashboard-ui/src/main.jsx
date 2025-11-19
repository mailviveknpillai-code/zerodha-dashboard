import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Root from './Root'
// Logger initializes automatically on module load
import './utils/logger'
import { setRealViewportHeight } from './utils/viewport'

// Set real viewport height on app initialization
setRealViewportHeight()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root/>
  </React.StrictMode>
)
